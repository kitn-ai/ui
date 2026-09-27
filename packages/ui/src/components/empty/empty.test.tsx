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
import { Empty } from './empty';

afterEach(cleanup);

const root = (c: HTMLElement) => c.querySelector('[data-slot="empty"]') as HTMLElement;

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
    expect(el.className).not.toContain('[&>*]:my-auto');
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
