import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { DefaultPromptInput } from '../elements/default-input';

// jsdom doesn't implement Element.scrollTo; some inner controls may call it.
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};

afterEach(cleanup);

const noop = () => {};

describe('DefaultPromptInput disabled state', () => {
  it('renders the textarea and send button as disabled', () => {
    const { container } = render(() => (
      <DefaultPromptInput
        value="hello"
        disabled
        onValueChange={noop}
        onSubmit={noop}
        onSuggestionClick={noop}
      />
    ));
    const textarea = container.querySelector('textarea');
    const send = container.querySelector('[data-testid="send"]');
    expect(textarea).toBeDisabled();
    expect(send).toBeDisabled();
  });

  it('does not call onSubmit when the send button is clicked while disabled', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => (
      <DefaultPromptInput
        value="hello"
        disabled
        onValueChange={noop}
        onSubmit={onSubmit}
        onSuggestionClick={noop}
      />
    ));
    const send = container.querySelector('[data-testid="send"]') as HTMLButtonElement;
    fireEvent.click(send);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when Enter is pressed while disabled', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => (
      <DefaultPromptInput
        value="hello"
        disabled
        onValueChange={noop}
        onSubmit={onSubmit}
        onSuggestionClick={noop}
      />
    ));
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reactively disables/enables the textarea when `disabled` changes after mount', () => {
    const [disabled, setDisabled] = createSignal(false);
    const { container } = render(() => (
      <DefaultPromptInput
        value="hi"
        disabled={disabled()}
        onValueChange={noop}
        onSubmit={noop}
        onSuggestionClick={noop}
      />
    ));
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeDisabled();
    setDisabled(true);
    expect(textarea).toBeDisabled(); // fails if PromptInput context captures `disabled` statically
    setDisabled(false);
    expect(textarea).not.toBeDisabled();
  });

  it('still submits via Enter when not disabled (sanity)', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => (
      <DefaultPromptInput
        value="hello"
        onValueChange={noop}
        onSubmit={onSubmit}
        onSuggestionClick={noop}
      />
    ));
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('DefaultPromptInput leading/trailing slots', () => {
  it('renders a leading and trailing named slot', () => {
    const { container } = render(() => (
      <DefaultPromptInput
        value=""
        onValueChange={noop}
        onSubmit={noop}
        onSuggestionClick={noop}
      />
    ));
    expect(container.querySelector('slot[name="leading"]')).toBeTruthy();
    expect(container.querySelector('slot[name="trailing"]')).toBeTruthy();
  });
});
