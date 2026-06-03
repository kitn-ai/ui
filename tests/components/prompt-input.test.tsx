import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { PromptInput, PromptInputTextarea } from '../../src/components/prompt-input';

describe('PromptInput', () => {
  it('renders textarea with placeholder', () => {
    render(() => (
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea placeholder="Type here..." />
      </PromptInput>
    ));
    expect(screen.getByPlaceholderText('Type here...')).toBeTruthy();
  });

  it('calls onSubmit when Enter is pressed without Shift', async () => {
    const onSubmit = vi.fn();
    render(() => (
      <PromptInput value="Hello" onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type..." />
      </PromptInput>
    ));
    const textarea = screen.getByPlaceholderText('Type...');
    await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not submit on Shift+Enter', async () => {
    const onSubmit = vi.fn();
    render(() => (
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type..." />
      </PromptInput>
    ));
    const textarea = screen.getByPlaceholderText('Type...');
    await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
