import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions } from './prompt-input';
import { Button } from '../ui/button';

const meta: Meta = {
  title: 'Components/PromptInput',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [value, setValue] = createSignal('');
    return (
      <div class="max-w-xl">
        <PromptInput value={value()} onValueChange={setValue}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions>
            <Button variant="default" size="sm" disabled={!value()}>
              Send
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};

export const WithContent: Story = {
  render: () => {
    const [value, setValue] = createSignal('Tell me about SolidJS reactive primitives');
    return (
      <div class="max-w-xl">
        <PromptInput value={value()} onValueChange={setValue}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions>
            <Button variant="default" size="sm">Send</Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div class="max-w-xl">
      <PromptInput disabled value="" onValueChange={() => {}}>
        <PromptInputTextarea placeholder="Chat is disabled..." />
        <PromptInputActions>
          <Button variant="default" size="sm" disabled>Send</Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div class="max-w-xl">
      <PromptInput isLoading value="" onValueChange={() => {}}>
        <PromptInputTextarea placeholder="Generating response..." />
        <PromptInputActions>
          <Button variant="outline" size="sm">
            Stop
          </Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  ),
};

export const WithMultipleActions: Story = {
  render: () => {
    const [value, setValue] = createSignal('');
    return (
      <div class="max-w-xl">
        <PromptInput value={value()} onValueChange={setValue}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions class="justify-between w-full px-2 pb-1">
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </Button>
            </div>
            <Button variant="default" size="sm" disabled={!value()}>
              Send
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
};
