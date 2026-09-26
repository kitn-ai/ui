import { describe, it, expect } from 'vitest';
import { resolveComposerLayout, resolveExpandedProp } from './composer-expansion';

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
    // Never expand on a measurement we could not take: an unreadable
    // line-height would otherwise read as an infinite number of lines.
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
