import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal } from 'solid-js';
import { PromptInput, PromptInputTextarea, PromptInputActions } from './prompt-input';
import { Button } from '../ui/button';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/PromptInput',
  component: PromptInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A composer shell that hosts an auto-resizing `PromptInputTextarea` and a `PromptInputActions` toolbar, with controlled or uncontrolled value, loading, and disabled states.',
        '**When to use:** as the message input at the bottom of any chat surface, wherever the user types and submits a prompt.',
        '**How to use:** control text via `value` + `onValueChange` (or leave uncontrolled), wire `onSubmit` (also fired on Enter without Shift), and place your send/stop controls inside `PromptInputActions`. Toggle `isLoading` / `disabled` for in-flight and read-only states.',
        '**Placement:** pinned at the bottom of the chat column, below the message transcript.',
      ]),
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Controlled text value of the textarea.',
    },
    isLoading: {
      control: 'boolean',
      description: 'Marks a response as in-flight (e.g. to show a Stop action).',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the textarea and dims the composer.',
      table: { defaultValue: { summary: 'false' } },
    },
    maxHeight: {
      control: 'number',
      description: 'Max auto-resize height in px (or a CSS length string) before the textarea scrolls.',
      table: { defaultValue: { summary: '240' } },
    },
    onValueChange: {
      action: 'valueChange',
      description: 'Fired with the new text whenever the textarea value changes.',
      table: { category: 'Events' },
    },
    onSubmit: {
      action: 'submit',
      description: 'Fired on Enter (without Shift), and wherever you call it from an action.',
      table: { category: 'Events' },
    },
    children: {
      control: false,
      description: 'Composer contents — usually a textarea plus an actions row.',
    },
    class: {
      control: 'text',
      description: 'Extra classes for the composer shell.',
    },
  },
  args: {
    value: '',
    isLoading: false,
    disabled: false,
    maxHeight: 240,
    onValueChange: fn(),
    onSubmit: fn(),
  },
  render: (args) => (
    <div class="max-w-xl">
      <PromptInput {...args}>
        <PromptInputTextarea placeholder="Ask anything..." />
        <PromptInputActions>
          <Button variant="default" size="sm">Send</Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  ),
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { PromptInput, PromptInputTextarea, PromptInputActions, Button } from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — toggle loading/disabled and edit the value via controls. */
export const Playground: Story = {
  ...src(`<PromptInput value={value()} onValueChange={setValue} onSubmit={send}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions>
    <Button variant="default" size="sm">Send</Button>
  </PromptInputActions>
</PromptInput>`),
};

/** Empty composer with a Send button disabled until there is text. */
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
  ...src(`<PromptInput value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions>
    <Button variant="default" size="sm" disabled={!value()}>Send</Button>
  </PromptInputActions>
</PromptInput>`),
};

/** Pre-filled with a prompt. */
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
  ...src(`<PromptInput value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions>
    <Button variant="default" size="sm">Send</Button>
  </PromptInputActions>
</PromptInput>`),
};

/** Read-only composer — `disabled` dims it and blocks input. */
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
  ...src(`<PromptInput disabled value="" onValueChange={setValue}>
  <PromptInputTextarea placeholder="Chat is disabled..." />
  <PromptInputActions>
    <Button variant="default" size="sm" disabled>Send</Button>
  </PromptInputActions>
</PromptInput>`),
};

/** In-flight — `isLoading` typically pairs with a Stop action. */
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
  ...src(`<PromptInput isLoading value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Generating response..." />
  <PromptInputActions>
    <Button variant="outline" size="sm">Stop</Button>
  </PromptInputActions>
</PromptInput>`),
};

/** A split actions row — a leading icon control and a trailing Send (showcase). */
export const WithMultipleActions: Story = {
  render: () => {
    const [value, setValue] = createSignal('');
    return (
      <div class="max-w-xl">
        <PromptInput value={value()} onValueChange={setValue}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions class="justify-between w-full px-2 pb-1">
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Attach file">
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
  ...src(`<PromptInput value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions class="justify-between w-full px-2 pb-1">
    <Button variant="ghost" size="icon-sm"><AttachIcon /></Button>
    <Button variant="default" size="sm" disabled={!value()}>Send</Button>
  </PromptInputActions>
</PromptInput>`),
};
