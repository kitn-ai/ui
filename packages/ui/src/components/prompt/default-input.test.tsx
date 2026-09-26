/**
 * The composer's attach button: its visible HINT is a tooltip and its accessible
 * NAME is still its `aria-label`. Those are two different things, and the failure
 * mode this file exists for is the tooltip becoming the name (a `title` attribute,
 * or a tooltip wrapper that swallows the button's label) — a screen reader then
 * announces the tip instead of the control. The button must also stay keyboard
 * reachable and keep opening the tip on focus, or the hint exists for pointers only.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, within } from '@solidjs/testing-library';
import { DefaultPromptInput } from './default-input';

afterEach(cleanup);

const noop = () => {};
// `onAttachmentsChange` is what makes `canAttach()` true (the attach button and the
// previews are opt-in), so every case here provides it.
const baseProps = {
  value: '',
  onValueChange: noop,
  onSubmit: noop,
  onSuggestionClick: noop,
  onAttachmentsChange: noop,
};

// The tooltip renders through a Portal onto document.body, outside the render
// container.
const tooltip = () => within(document.body).queryByRole('tooltip');

describe('DefaultPromptInput attach button', () => {
  it('carries the tooltip as its hint without the name changing', () => {
    const { getByRole, getByLabelText } = render(() => <DefaultPromptInput {...baseProps} />);
    // The accessible name is the aria-label, unchanged.
    const button = getByRole('button', { name: 'Attach files' });
    expect(button).toHaveAttribute('aria-label', 'Attach files');
    // And it is not hidden behind a title attribute, the hand-rolled version the
    // tooltip replaces.
    expect(button).not.toHaveAttribute('title');
    expect(getByLabelText('Attach files')).toBe(button);

    // Nothing is announced twice: the tip is not in the tree until it is opened.
    expect(tooltip()).not.toBeInTheDocument();
    fireEvent.focusIn(button);
    expect(tooltip()).toHaveTextContent('Attach files');
    // The name is STILL the label with the tip open (the tip is a description).
    expect(getByRole('button', { name: 'Attach files' })).toBe(button);
  });

  it('stays keyboard reachable and opens the tip on focus, not on hover only', () => {
    const { getByRole } = render(() => <DefaultPromptInput {...baseProps} />);
    const button = getByRole('button', { name: 'Attach files' }) as HTMLButtonElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button).not.toHaveAttribute('tabindex', '-1');
    expect(button).not.toBeDisabled();
    expect(button.tabIndex).toBe(0);

    button.focus();
    expect(document.activeElement).toBe(button);
    expect(tooltip()).toHaveTextContent('Attach files');
  });

  it('is still absent when the composer cannot attach at all, wrapper and all', () => {
    const { queryByRole } = render(() => <DefaultPromptInput {...baseProps} attach={false} />);
    expect(queryByRole('button', { name: 'Attach files' })).not.toBeInTheDocument();
  });
});

/**
 * The box's two layouts, by their classes. jsdom measures nothing, so this cannot
 * assert a rendered pixel — which is exactly why the CLASSES are the contract here:
 * the numbers were measured from the reference screenshots (the send button is 28px
 * in each, so they are 1x and real CSS pixels), and "approximately padded" is what
 * the previous attempt at this look shipped. The two layouts are pinned separately
 * because they reach the one shared left edge by different means.
 */
describe('DefaultPromptInput geometry', () => {
  const frame = (c: HTMLElement) => c.querySelector('[data-prompt-input]') as HTMLElement;
  const body = (c: HTMLElement) => c.querySelector('[data-composer-body]') as HTMLElement;
  const editable = (c: HTMLElement) => c.querySelector('[data-kai-composer-editable]') as HTMLElement;

  it('collapsed: one row, on the measured padding, with the frame owning the insets', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    expect(frame(container).className).toContain('flex-row');
    // 10px above and below a 28px control is the measured 48px row; 18px leading,
    // 14px trailing. These are the numbers, not a guess at them.
    expect(frame(container).className).toContain('py-2.5');
    expect(frame(container).className).toContain('pl-4.5');
    expect(frame(container).className).toContain('pr-3.5');
    // The text carries no inset of its own: the frame's padding is the one edge.
    expect(editable(container).className).not.toMatch(/\bpl-/);
    expect(editable(container).className).not.toMatch(/\bpt-/);
    // Collapsed the text shares the row, so it takes the room that is left.
    expect(body(container).className).toContain('flex-1');
  });

  it('expanded: the text takes the whole line and the controls wrap below it', () => {
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} attachments={[{ id: 'a', type: 'file', filename: 'a.pdf' }]} />
    ));
    expect(frame(container).className).toContain('flex-wrap');
    expect(frame(container).className).toContain('pt-3.5');
    expect(frame(container).className).toContain('px-4.5');
    // The mechanism, and it has to sit on the BODY rather than on the editable: the
    // Composer renders the editable inside a `relative` div of its own, so a
    // flex-child class on the editable lands on a nested block and changes nothing.
    // `order-first` lifts the text above the clusters, `basis-full` claims the line.
    expect(body(container).className).toContain('order-first');
    expect(body(container).className).toContain('basis-full');
    // The clusters stay dumb wrappers: they carry no order, so the whole layout
    // decision lives with the resolver rather than being split across three places.
    expect((frame(container).querySelector('[data-cluster="leading"]') as HTMLElement).className).not.toMatch(/\border-/);
    expect((frame(container).querySelector('[data-cluster="trailing"]') as HTMLElement).className).not.toMatch(/\border-/);
  });

  it('keeps the attachment band above the text', () => {
    // The regression this guards: the body's `order-first` is what puts the text on
    // its own line, and it would equally lift the paragraph ABOVE the chips — the
    // opposite of the reference, which puts them on top. The band carries the same
    // order, and comes first in the DOM, so it stays first.
    const { container } = render(() => (
      <DefaultPromptInput {...baseProps} attachments={[{ id: 'a', type: 'file', filename: 'a.pdf' }]} />
    ));
    const band = frame(container).querySelector('[data-composer-band]') as HTMLElement;
    expect(band).toBeTruthy();
    expect(band.className).toContain('order-first');
    expect(band.compareDocumentPosition(editable(container)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
