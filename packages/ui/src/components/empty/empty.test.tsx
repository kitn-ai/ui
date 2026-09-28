/**
 * The empty state's centring MECHANISM.
 *
 * WHY THIS CANNOT BE A BEHAVIOUR TEST. What makes `justify-center` wrong is what it does
 * when its content is TALLER than its box: it splits the overflow in both directions, so
 * the first child sits above the box with no scroll that reaches it. jsdom lays nothing
 * out, so a behaviour test here would pass on both implementations and prove neither —
 * the same shape of vacuous check this repo's probe suite exists to avoid.
 *
 * The behaviour is measured in a real chromium by `scripts/probe-empty-state.mjs`. This
 * file pins the mechanism, because the two are indistinguishable from inside a unit test
 * and a future tidy-up that restores `justify-center` would otherwise be silent.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { Empty, EmptyContent } from './empty';

afterEach(cleanup);

const root = (c: HTMLElement) => c.querySelector('[data-slot="empty"]') as HTMLElement;
const content = (c: HTMLElement) => c.querySelector('[data-slot="empty-content"]') as HTMLElement;

describe('Empty centring', () => {
  it('centres with an auto margin rather than justify-center', () => {
    const { container } = render(() => <Empty>content</Empty>);
    const el = root(container);

    // The mechanism, present.
    expect(el.className, 'the auto margin that collapses on overflow').toContain(
      '[&>*:first-child]:mt-auto',
    );
    expect(el.className).toContain('[&>*:last-child]:mb-auto');
    // And the one it replaces, absent — the whole point of the change.
    expect(el.className, 'justify-center clips tall content').not.toContain('justify-center');
  });

  it('keeps the group centred rather than spreading its children', () => {
    const { container } = render(() => (
      <Empty>
        <div data-testid="header">header</div>
        <div data-testid="content">content</div>
      </Empty>
    ));
    const el = root(container);
    // `my-auto` on EVERY child would put free space between them too, so a header would
    // drift away from the content it belongs to. Only the outer pair takes a margin, and
    // the gaps stay `gap-*`'s job.
    //
    // The assertions NAME that pair rather than asserting the absence of a string the
    // component has never contained: `[&>*]:my-auto` does not appear in any version of
    // this class list, so a `not.toContain` on it passed whatever the code said. Shape is
    // what makes it falsifiable — swapping the pair for a per-child margin yields ONE
    // arbitrary child selector that names no child, and both assertions below fail.
    const childSelectors = [...el.className.matchAll(/\[&>\*[^\]]*\]/g)].map((m) => m[0]);
    expect(childSelectors, 'the outer pair, and nothing per-child').toHaveLength(2);
    for (const sel of childSelectors) {
      expect(sel, 'each margin names an OUTER child, so the group stays together').toMatch(
        /^\[&>\*:(first|last)-child\]$/,
      );
    }
    expect(el.className).toContain('gap-6');
    expect(el.querySelectorAll('[data-testid]')).toHaveLength(2);
  });

  it('still centres its children as boxes horizontally', () => {
    const { container } = render(() => <Empty>content</Empty>);
    // The vertical change must not take the horizontal centring with it: text centring
    // lives on EmptyTitle/EmptyDescription, but the BOXES are centred by the root.
    expect(root(container).className).toContain('items-center');
  });
});

/**
 * THE CONTENT WIDTH SEAM, pinned as a mechanism for the same reason the centring above
 * is: jsdom lays nothing out, so a test here cannot see that a child no longer paints
 * outside its slotted parent. What it CAN pin is that `EmptyContent` reads the
 * `--kai-empty-content-width` hook at all and that the fallback is the old `max-w-sm`
 * measure - the two facts a future tidy-up would drop while every box still looked right
 * in the wide screenshots (`scripts/probe-empty-state.mjs` measures the behaviour in a
 * real chromium, and the assistant block's own driver state is the second reader).
 */
describe('EmptyContent content width', () => {
  it('takes its width from --kai-empty-content-width, defaulting to the prose measure', () => {
    const { container } = render(() => (
      <Empty>
        <EmptyContent>content</EmptyContent>
      </Empty>
    ));
    const el = content(container);

    // The hook, read with its default. `24rem` is `max-w-sm`'s own value, so an unset
    // variable is byte-for-byte the old behaviour. A literal fallback is the shape every
    // other knob in the kit documents itself with (`--kai-dock-launcher-size, 56px`).
    expect(el.className, 'the width hook and its prose default').toContain(
      'max-w-[var(--kai-empty-content-width,24rem)]',
    );
    // And the hard cap it replaces is gone: while `max-w-sm` is still in the class list
    // the variable has nothing to move, which is the failure this assertion catches.
    expect(el.className, 'max-w-sm would beat the hook with a second max-width').not.toContain(
      'max-w-sm',
    );
  });
});
