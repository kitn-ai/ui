/**
 * Unit tests for Tooltip.
 *
 * Tooltips open on hover/focus and close on pointer-leave/blur. But when the
 * trigger is an action button (copy / 👍 / 👎), clicking it never fires a
 * pointer-leave, so the tooltip lingers over the thing you just acted on. The
 * trigger therefore dismisses on click/pointerdown by default, and resets its
 * internal hover/focus flags so it stays closed until a genuine new hover/focus.
 * `dismissOnClick={false}` opts out.
 *
 * `content` also takes JSX. The bubble re-states the muted/border/background tokens on itself
 * (it is painted with the foreground colour), which is what lets a composed cap such as `Kbd`
 * stay legible inside it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, within } from '@solidjs/testing-library';
import { Tooltip } from './tooltip';
import { Kbd } from '../kbd/kbd';

afterEach(cleanup);

// createPresence unmounts on a microtask when there is no exit animation (jsdom),
// so flush the queue before asserting the tooltip node has left the DOM.
const tick = () => new Promise((r) => setTimeout(r, 0));

// The tooltip content renders through a Portal mounted onto document.body — a
// *sibling* of the render container — so the render result's container-scoped
// queries can't see it. Query the whole document instead.
const tooltip = () => within(document.body).queryByRole('tooltip');

describe('Tooltip', () => {
  it('shows the tooltip on hover and hides it on pointer-leave', async () => {
    const { getByText } = render(() => (
      <Tooltip content="Copy">
        <button>Copy</button>
      </Tooltip>
    ));
    const trigger = getByText('Copy');
    expect(tooltip()).not.toBeInTheDocument();

    // openDelay defaults to 600ms on pointer-enter — focus opens immediately.
    fireEvent.focusIn(trigger);
    expect(tooltip()).toBeInTheDocument();

    fireEvent.focusOut(trigger, { relatedTarget: document.body });
    await tick();
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('dismisses on trigger click by default', async () => {
    const { getByText } = render(() => (
      <Tooltip content="Copy">
        <button>Copy</button>
      </Tooltip>
    ));
    const trigger = getByText('Copy');
    const triggerSpan = trigger.parentElement!; // <As as="span"> carries the aria + handlers

    fireEvent.focusIn(trigger);
    expect(tooltip()).toBeInTheDocument();

    fireEvent.click(trigger);
    // click closes open() synchronously — aria-describedby is the reliable signal
    // (the portal node lingers one microtask via createPresence's exit handling).
    expect(triggerSpan).not.toHaveAttribute('aria-describedby');
    await tick();
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('dismisses on trigger pointerdown by default', () => {
    const { getByText } = render(() => (
      <Tooltip content="Copy">
        <button>Copy</button>
      </Tooltip>
    ));
    const trigger = getByText('Copy');
    const triggerSpan = trigger.parentElement!;

    fireEvent.focusIn(trigger);
    expect(triggerSpan).toHaveAttribute('aria-describedby');

    fireEvent.pointerDown(trigger);
    expect(triggerSpan).not.toHaveAttribute('aria-describedby');
  });

  it('clicking while still focused fully closes it (resets the focus-inside flag)', async () => {
    // The trigger keeps focus through the click, so maybeHide() would normally
    // be vetoed by focusInside. dismiss() resets that flag and force-closes, so
    // open() reaches false — observable via aria-describedby clearing.
    const { getByText } = render(() => (
      <Tooltip content="Copy">
        <button>Copy</button>
      </Tooltip>
    ));
    const trigger = getByText('Copy');
    const triggerSpan = trigger.parentElement!; // <As as="span"> carries the aria + handlers

    fireEvent.focusIn(trigger);
    expect(triggerSpan).toHaveAttribute('aria-describedby');
    expect(tooltip()).toBeInTheDocument();

    fireEvent.click(trigger);
    await tick();
    // Without the flag reset, focusInside would keep open() true here.
    expect(triggerSpan).not.toHaveAttribute('aria-describedby');
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('keeps the tooltip open on click/pointerdown when dismissOnClick={false}', () => {
    const { getByText } = render(() => (
      <Tooltip content="Copy" dismissOnClick={false}>
        <button>Copy</button>
      </Tooltip>
    ));
    const trigger = getByText('Copy');
    const triggerSpan = trigger.parentElement!; // <As as="span"> carries the aria link

    fireEvent.focusIn(trigger);
    expect(triggerSpan).toHaveAttribute('aria-describedby');
    expect(tooltip()).toBeInTheDocument();

    // Opted out — open() stays true through click and pointerdown. aria-describedby
    // is the reliable open() signal (the portal node's exit timing is animation-driven).
    fireEvent.click(trigger);
    expect(triggerSpan).toHaveAttribute('aria-describedby');
    fireEvent.pointerDown(trigger);
    expect(triggerSpan).toHaveAttribute('aria-describedby');
    expect(tooltip()).toBeInTheDocument();
  });

  it('renders a plain string content as text', () => {
    // The string path the union widened around: content stays a bare text node, with no
    // wrapper element introduced between the bubble and the hint.
    const { getByText } = render(() => (
      <Tooltip content="Copy">
        <button>Copy</button>
      </Tooltip>
    ));
    fireEvent.focusIn(getByText('Copy'));
    const tip = tooltip()!;
    expect(tip.textContent).toBe('Copy');
    expect(tip.children).toHaveLength(0);
  });

  it('renders JSX content inside the bubble', () => {
    // content={<span>…<Kbd />…</span>} is the composition the bubble's token overrides exist
    // for: the cap glyphs have to reach the node carrying role="tooltip".
    const { getByText } = render(() => (
      <Tooltip content={<span>Save changes <Kbd keys="Mod+S" platform="mac" /></span>}>
        <button>Save</button>
      </Tooltip>
    ));
    fireEvent.focusIn(getByText('Save'));
    const tip = tooltip()!;
    expect(tip.textContent).toContain('Save changes');
    // one glyph per token: Mod -> ⌘ on mac, S -> S
    expect(within(tip).getByText('⌘')).toBeInTheDocument();
    expect(within(tip).getByText('S')).toBeInTheDocument();
  });

  it('re-expresses the muted/background tokens on the inverted bubble', () => {
    const { getByText } = render(() => (
      <Tooltip content={<Kbd keys="Mod+S" platform="mac" />}>
        <button>Save</button>
      </Tooltip>
    ));
    fireEvent.focusIn(getByText('Save'));
    const tip = tooltip()!;
    // bg-foreground/text-background is the bubble's own paint and must survive the overrides.
    expect(tip).toHaveClass('bg-foreground', 'text-background');
    // Tailwind v4 emits `.bg-muted{background-color:var(--color-muted)}` etc., so the composed
    // cap resolves these instead of the page's light tokens. Read off the inline style, which
    // is where the overrides live (Solid sets dash-prefixed names through style.setProperty).
    expect(tip.style.getPropertyValue('--color-muted')).toBe('color-mix(in oklab, var(--color-background) 20%, transparent)');
    expect(tip.style.getPropertyValue('--color-muted-foreground')).toBe('var(--color-background)');
    expect(tip.style.getPropertyValue('--color-border')).toBe('color-mix(in oklab, var(--color-background) 25%, transparent)');
  });
});
