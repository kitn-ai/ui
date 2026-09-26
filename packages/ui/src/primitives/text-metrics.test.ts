/**
 * The line-height lookup two primitives share.
 *
 * WHY THIS FILE EXISTS. `getComputedStyle` resolves `line-height: normal` to the
 * literal string `"normal"`, which `parseFloat` reads as `NaN`, not a length. The
 * autosizing hook recovered from that and the composer's expansion rule did not, so
 * one of them read a perfectly ordinary editable as having a line height of ZERO —
 * and zero is not a small threshold, it is the absence of one: the resolver answers
 * `collapsed` for any amount of text and the composer can never expand, with
 * nothing to say why. These tests pin the recovery, and the zero case in particular.
 *
 * jsdom does not resolve the keyword the way a browser does, and reports an empty
 * string for a font size it cannot compute, so the computed style is stubbed
 * directly — the same trade `use-auto-resize.test.ts` makes when it stubs
 * `ResizeObserver`, which jsdom also does not ship.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveLineHeight } from './text-metrics';

afterEach(() => vi.unstubAllGlobals());

/** Stand in for `getComputedStyle`, which is otherwise a cascade jsdom never runs. */
function computedStyle(styles: Record<string, string>) {
  vi.stubGlobal('getComputedStyle', () => styles as unknown as CSSStyleDeclaration);
}

const el = () => document.createElement('div');

describe('resolveLineHeight', () => {
  it('reads a resolved length as it is', () => {
    computedStyle({ lineHeight: '20px', fontSize: '16px' });
    expect(resolveLineHeight(el())).toBe(20);
  });

  it('recovers the `normal` keyword as 1.2x the font size', () => {
    computedStyle({ lineHeight: 'normal', fontSize: '16px' });
    expect(resolveLineHeight(el())).toBeCloseTo(19.2);
  });

  it('recovers an empty computed line height the same way', () => {
    // Some environments report '' rather than the keyword for the same fact.
    // Both mean "the keyword", and neither is a length.
    computedStyle({ lineHeight: '', fontSize: '20px' });
    expect(resolveLineHeight(el())).toBeCloseTo(24);
  });

  it('falls back to the kit prose default when the font size is unreadable too', () => {
    computedStyle({ lineHeight: 'normal', fontSize: '' });
    expect(resolveLineHeight(el())).toBeCloseTo(14 * 1.2);
  });

  it('recovers rather than reporting zero when the line height cannot be read', () => {
    // The regression, at its smallest: a caller that receives 0 here stops
    // responding to content entirely, because every comparison against a zero
    // threshold has the same answer.
    computedStyle({});
    expect(resolveLineHeight(el())).toBeGreaterThan(0);
  });

  it('passes an explicit zero line height through, because that is a length', () => {
    // NOT the same thing as the keyword. An element that computes a zero line height
    // asked for one, and a font-size guess would invent a length its author rejected.
    // What a non-positive height MEANS is the caller's call: the composer's expansion
    // rule fails closed on it, which is the documented last resort.
    computedStyle({ lineHeight: '0px', fontSize: '16px' });
    expect(resolveLineHeight(el())).toBe(0);
  });
});
