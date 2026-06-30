import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { PromptInput, PromptInputTextarea } from '../../src/components/prompt-input';

describe('PromptInput', () => {
  it('renders textarea with placeholder', () => {
    const { container } = render(() => (
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea placeholder="Type here..." />
      </PromptInput>
    ));
    const editable = container.querySelector('[data-kai-composer-editable]') as HTMLElement;
    expect(editable).toBeTruthy();
    expect(editable.getAttribute('data-placeholder')).toBe('Type here...');
  });

  it('calls onSubmit when Enter is pressed without Shift', async () => {
    const onSubmit = vi.fn();
    const { container } = render(() => (
      <PromptInput value="Hello" onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type..." />
      </PromptInput>
    ));
    const editable = container.querySelector('[data-kai-composer-editable]') as HTMLElement;
    await fireEvent.keyDown(editable, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not submit on Shift+Enter', async () => {
    const onSubmit = vi.fn();
    const { container } = render(() => (
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type..." />
      </PromptInput>
    ));
    const editable = container.querySelector('[data-kai-composer-editable]') as HTMLElement;
    await fireEvent.keyDown(editable, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
