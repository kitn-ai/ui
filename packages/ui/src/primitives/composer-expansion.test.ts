import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { resolveComposerLayout, resolveExpandedProp, useComposerExpansion } from './composer-expansion';
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

  it('is undefined when nothing was set -- that is the derive state', () => {
    // `flag()` cannot answer this: resolveFlag returns false for an absent
    // attribute AND for an explicit ="false", collapsing the third state the
    // composer needs.
    expect(resolveExpandedProp(undefined, false, null)).toBeUndefined();
  });
});

/**
 * The line height the expansion rule READS -- the regression for the defect that
 * left the composer unable to expand at all.
 *
 * This block calls `resolveLineHeight` and composes it with `resolveComposerLayout`
 * by hand. The hook that wires the two together is covered by the
 * `useComposerExpansion` block below it, which does not need real layout: the line
 * height is stubbed, the observer is driven by hand, and the element is mounted by
 * nothing.
 *
 * What neither block can show is the PIXELS: a real font change moving a real box,
 * and the row the user then sees. jsdom neither lays out nor resolves a line height,
 * so that half is the browser probe's, and it stays out of here on purpose rather
 * than by omission.
 */
describe('the line height the expansion rule reads', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('expands for a wrapped line when the editable reports the `normal` keyword', () => {
    // The whole defect, end to end. A `line-height` left at its default reached the
    // resolver as 0, and a zero threshold answers `collapsed` for any content -- so
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

/**
 * The hook, not the rule: does it read the element it was handed, keep reading it,
 * and let go of an element it is no longer watching?
 *
 * WHY THIS EXISTS. The rule below is pure and fully tested; the wiring around it was
 * not, and a defect lived there. The line height was read once per element, so a
 * prose-size change left a threshold that no longer matched the text in the box, and
 * a single line rendered as two rows. Nothing caught it: the pure tests cannot reach
 * the wiring, and the browser probe that measures the geometry is a script somebody
 * runs rather than a gate. A defect that escapes through a coverage gap argues for
 * closing the gap, so this is the automated pin on that wiring.
 *
 * WHAT IT CANNOT DO. jsdom lays nothing out and resolves no line height, so the
 * numbers here are all stubbed and the OBSERVER is driven by hand. These tests pin
 * the decisions; the pixels stay the probe's job.
 */
describe('useComposerExpansion', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A `ResizeObserver` that reports a content height when told to, and remembers
   *  every instance's `disconnect` so a test can assert the DROPPED element's
   *  observer let go of it. jsdom ships no implementation at all, so nothing here
   *  fires on its own.
   *
   *  Same shape as `use-auto-resize.test.ts`'s stub, with one difference that file
   *  does not need: the callback is called WITH entries, because `observeContentHeight`
   *  reads the last entry's content-box height rather than calling back bare. */
  function stubResizeObserver() {
    const observers: { cb: (entries: unknown) => void; observe: Mock; disconnect: Mock }[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        cb: (entries: unknown) => void;
        /** THIS instance's record, so each method drives the observer it belongs to.
         *  Recording through `observers[observers.length - 1]` instead made every
         *  instance share the newest one: two live observers in a test would both
         *  report against the second, so a `disconnect` assertion could pass on
         *  cleanup order rather than on the observer it names. */
        record: { cb: (entries: unknown) => void; observe: Mock; disconnect: Mock };
        constructor(cb: (entries: unknown) => void) {
          this.cb = cb;
          this.record = { cb, observe: vi.fn(), disconnect: vi.fn() };
          observers.push(this.record);
        }
        observe(el: Element) {
          this.record.observe(el);
        }
        disconnect() {
          this.record.disconnect();
        }
      },
    );
    return {
      observers,
      /** Report a content-box height as if the element had resized to it. */
      emit: (index: number, contentHeight: number) =>
        observers[index]!.cb([{ contentRect: { height: contentHeight } }]),
    };
  }

  /** A computed style the test can MOVE while the element stays mounted, which is the
   *  whole point: a font change remounts nothing. */
  function stubComputedStyle(lineHeight: string) {
    const style = { lineHeight, fontSize: '16px' };
    vi.stubGlobal('getComputedStyle', () => style as unknown as CSSStyleDeclaration);
    return style;
  }

  function mount(editable: () => HTMLElement | undefined) {
    return createRoot((dispose) => ({
      layout: useComposerExpansion({ editable, pinned: () => undefined, attachmentCount: () => 0 }),
      dispose,
    }));
  }

  it('follows a GROWN line height, so one line does not become two rows', () => {
    const style = stubComputedStyle('20px');
    const ro = stubResizeObserver();
    const { layout, dispose } = mount(() => document.createElement('div'));

    ro.emit(0, 20);
    expect(layout()).toBe('collapsed');

    // The font grows under a live composer: one line is now 60px tall. A line height
    // read once per element still says 20, and 60 > 20 x 1.5 reads as TWO rows: a
    // two-row box under a single line of text, which is the reported defect.
    style.lineHeight = '60px';
    ro.emit(0, 60);
    expect(layout()).toBe('collapsed');

    // And the threshold moved rather than the composer sticking: two lines at the
    // new size still expand, so the case above is not passing because nothing can.
    ro.emit(0, 120);
    expect(layout()).toBe('expanded');

    dispose();
  });

  it('follows a SHRUNK line height, so two lines do not become one row', () => {
    const style = stubComputedStyle('20px');
    const ro = stubResizeObserver();
    const { layout, dispose } = mount(() => document.createElement('div'));

    ro.emit(0, 20);
    expect(layout()).toBe('collapsed');

    // The font shrinks, so the height that used to be one line now holds two. NO new
    // resize arrives, because nothing about the box's size has to change for the meaning of
    // that size to change, so this only passes if the line height is read per
    // evaluation rather than remembered.
    style.lineHeight = '10px';
    expect(layout()).toBe('expanded');

    dispose();
  });

  it('re-observes a replaced editable and disconnects the one it drops', () => {
    stubComputedStyle('20px');
    const ro = stubResizeObserver();
    const [el, setEl] = createSignal<HTMLElement | undefined>(document.createElement('div'));
    const { layout, dispose } = mount(el);

    expect(ro.observers).toHaveLength(1);
    ro.emit(0, 20);
    expect(layout()).toBe('collapsed');

    setEl(document.createElement('div'));

    // The new element is observed, and the old observer is disconnected rather than
    // left watching a node that has left the tree: a ResizeObserver on a detached
    // element never fires again, so the composer would silently stop responding.
    expect(ro.observers).toHaveLength(2);
    expect(ro.observers[0]!.disconnect).toHaveBeenCalled();

    ro.emit(1, 100);
    expect(layout()).toBe('expanded');

    dispose();
    expect(ro.observers[1]!.disconnect).toHaveBeenCalled();
  });
});
