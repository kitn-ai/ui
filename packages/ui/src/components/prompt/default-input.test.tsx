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
 * The box's horizontal insets. jsdom cannot measure a rendered inset, so this
 * asserts the CLASSES — honest here because the defect WAS two different values
 * typed into one box: the text sat at `pl-4` (16px) while the toolbar row and the
 * attachment row under/above it were `px-3` (12px), so the paragraph and the
 * buttons beneath it started on different edges. Pinning the equality is what
 * stops the next edit from reintroducing a second left inset.
 */
describe('DefaultPromptInput horizontal inset', () => {
  /** The class list of the row the toolbar buttons live in. The send button is
   *  the one stable hook inside it (`data-testid`), two levels down: its right
   *  cluster, then the row. */
  function toolbarRowClass(container: HTMLElement): string {
    const send = container.querySelector('[data-testid="send"]') as HTMLElement;
    return send.parentElement!.parentElement!.className;
  }

  it('starts the text on the same left edge as the toolbar row', () => {
    const { container } = render(() => <DefaultPromptInput {...baseProps} />);
    const text = container.querySelector('[data-kai-composer-editable]') as HTMLElement;

    expect(text.className).toContain('pl-3');
    expect(text.className).not.toContain('pl-4');
    expect(toolbarRowClass(container)).toContain('px-3');
  });
});
