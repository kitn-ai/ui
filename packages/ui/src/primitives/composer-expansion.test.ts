import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveComposerLayout, resolveExpandedProp } from './composer-expansion';
import { resolveLineHeight } from './text-metrics';

const base = { contentHeight: 20, lineHeight: 20, attachmentCount: 0 };

describe('resolveComposerLayout', () => {
  it('derives collapsed for one line and expanded for two', () => {
    expect(resolveComposerLayout(base)).toBe('collapsed');
    expect(resolveComposerLayout({ ...base, contentHeight: 40 })).toBe('expanded');
  });

  it('treats a trailing descender as one line, not two', () => {
    // 1.5x the line height is the threshold: 29px is still one line, 31px is not.
    expect(resolveComposerLayout({ ...base, contentHeight: 29 })).toBe('collapsed');
    expect(resolveComposerLayout({ ...base, contentHeight: 31 })).toBe('expanded');
  });

  it('expands for an attachment even with no text', () => {
    expect(resolveComposerLayout({ ...base, attachmentCount: 1 })).toBe('expanded');
  });

  it('a pin wins over both the content and the attachments', () => {
    expect(resolveComposerLayout({ ...base, pinned: false, contentHeight: 200, attachmentCount: 3 })).toBe('collapsed');
    expect(resolveComposerLayout({ ...base, pinned: true, contentHeight: 20, attachmentCount: 0 })).toBe('expanded');
  });

  it('stays collapsed when no line height could be measured', () => {
    // The last-resort guard, for a caller that hands the resolver a zero directly.
    // It is no longer the path an unstyled editable takes: `resolveLineHeight`
    // recovers a positive number from a `normal` keyword, and the test at the end
    // of this file is what proves THAT path expands.
    expect(resolveComposerLayout({ ...base, lineHeight: 0, contentHeight: 500 })).toBe('collapsed');
  });
});

describe('resolveExpandedProp', () => {
  it('reads true and false from the property', () => {
    expect(resolveExpandedProp(true, false, null)).toBe(true);
    expect(resolveExpandedProp(false, false, null)).toBe(false);
  });

  it('reads the attribute, including an explicit ="false"', () => {
    expect(resolveExpandedProp(undefined, true, '')).toBe(true);
    expect(resolveExpandedProp(undefined, true, 'false')).toBe(false);
  });

  it('is undefined when nothing was set — that is the derive state', () => {
    // `flag()` cannot answer this: resolveFlag returns false for an absent
    // attribute AND for an explicit ="false", collapsing the third state the
    // composer needs.
    expect(resolveExpandedProp(undefined, false, null)).toBeUndefined();
  });
});

describe('the line height the hook feeds the resolver', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('expands for a wrapped line when the editable reports the `normal` keyword', () => {
    // The whole defect, end to end. A `line-height` left at its default reached the
    // resolver as 0, and a zero threshold answers `collapsed` for any content — so
    // the composer could not expand, in any browser, and said nothing about why.
    // jsdom does not resolve the keyword itself, so the computed style is stubbed.
    vi.stubGlobal('getComputedStyle', () => ({ lineHeight: 'normal', fontSize: '20px' }) as unknown as CSSStyleDeclaration);
    const lineHeight = resolveLineHeight(document.createElement('div'));

    expect(lineHeight).toBeGreaterThan(0);
    expect(resolveComposerLayout({ contentHeight: lineHeight * 2, lineHeight, attachmentCount: 0 })).toBe('expanded');
    // And one line still collapses: the recovery must not turn every composer into
    // two rows, which is the failure the guard used to prevent by over-correcting.
    expect(resolveComposerLayout({ contentHeight: lineHeight, lineHeight, attachmentCount: 0 })).toBe('collapsed');
  });
});
