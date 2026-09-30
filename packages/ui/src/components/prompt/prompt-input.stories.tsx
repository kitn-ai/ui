import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal } from 'solid-js';
import { Square } from 'lucide-solid';
import { PromptInput, PromptInputTextarea, PromptInputActions } from './prompt-input';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/PromptInput',
  component: PromptInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    // Compose `PromptInputActions` for the send/stop controls. `onSubmit` fires on Enter without Shift,
    // and `isLoading` / `disabled` cover the in-flight and read-only states.
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'An auto-resizing text area for writing a chat message.',
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
      description: 'Composer contents, usually a textarea plus an actions row.',
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
          <Button size="icon-sm" class="rounded-full" aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  ),
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// The event callbacks our custom-render stories route to the Actions panel.
type EventArgs = { onValueChange?: (value: string) => void; onSubmit?: () => void };

const IMPORT = `import { PromptInput, PromptInputTextarea, PromptInputActions, Button } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: toggle loading/disabled and edit the value via controls. */
export const Playground: Story = {
  ...src(`<PromptInput value={value()} onValueChange={setValue} onSubmit={send}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions>
    <Button size="icon-sm" class="rounded-full" aria-label="Send message">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
      </svg>
    </Button>
  </PromptInputActions>
</PromptInput>`),
};

/** Empty composer with a Send button disabled until there is text. */
export const Default: Story = {
  render: (args: EventArgs) => {
    const [value, setValue] = createSignal('');
    const handleChange = (v: string) => { setValue(v); args.onValueChange?.(v); };
    return (
      <div class="max-w-xl">
        <PromptInput value={value()} onValueChange={handleChange} onSubmit={args.onSubmit}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions>
            <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled={!value()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
  ...src(`<PromptInput value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions>
    <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled={!value()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
      </svg>
    </Button>
  </PromptInputActions>
</PromptInput>`),
};

/** Pre-filled with a prompt. */
export const WithContent: Story = {
  render: (args: EventArgs) => {
    const [value, setValue] = createSignal('Tell me about SolidJS reactive primitives');
    const handleChange = (v: string) => { setValue(v); args.onValueChange?.(v); };
    return (
      <div class="max-w-xl">
        <PromptInput value={value()} onValueChange={handleChange} onSubmit={args.onSubmit}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions>
            <Button size="icon-sm" class="rounded-full" aria-label="Send message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
  ...src(`<PromptInput value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions>
    <Button size="icon-sm" class="rounded-full" aria-label="Send message">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
      </svg>
    </Button>
  </PromptInputActions>
</PromptInput>`),
};

/** Read-only composer: `disabled` dims it and blocks input. */
export const Disabled: Story = {
  render: (args: EventArgs) => (
    <div class="max-w-xl">
      <PromptInput disabled value="" onValueChange={args.onValueChange} onSubmit={args.onSubmit}>
        <PromptInputTextarea placeholder="Chat is disabled..." />
        <PromptInputActions>
          <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  ),
  ...src(`<PromptInput disabled value="" onValueChange={setValue}>
  <PromptInputTextarea placeholder="Chat is disabled..." />
  <PromptInputActions>
    <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
      </svg>
    </Button>
  </PromptInputActions>
</PromptInput>`),
};

/** In-flight: `isLoading` typically pairs with a Stop action. */
export const Loading: Story = {
  render: (args: EventArgs) => (
    <div class="max-w-xl">
      <PromptInput isLoading value="" onValueChange={args.onValueChange} onSubmit={args.onSubmit}>
        <PromptInputTextarea placeholder="Generating response..." />
        <PromptInputActions>
          <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Stop">
            <Square class="size-3" />
          </Button>
        </PromptInputActions>
      </PromptInput>
    </div>
  ),
  ...src(`import { Square } from 'lucide-solid';

<PromptInput isLoading value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Generating response..." />
  <PromptInputActions>
    <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Stop">
      <Square class="size-3" />
    </Button>
  </PromptInputActions>
</PromptInput>`),
};

/** A split actions row: a leading icon control and a trailing Send (showcase).
 *
 *  `expanded` is pinned here, and that is what the prop is for. The frame derives its
 *  layout (one row until the text wraps), so with an empty value this composition would
 *  render both controls on the text's own row, packed together, and `justify-between`
 *  would have nothing to distribute. Pinning it open is how a host says "always two rows",
 *  and that is the arrangement demonstrated here. */
export const WithMultipleActions: Story = {
  render: (args: EventArgs) => {
    const [value, setValue] = createSignal('');
    const handleChange = (v: string) => { setValue(v); args.onValueChange?.(v); };
    return (
      <div class="max-w-xl">
        <PromptInput expanded value={value()} onValueChange={handleChange} onSubmit={args.onSubmit}>
          <PromptInputTextarea placeholder="Ask anything..." />
          <PromptInputActions class="justify-between">
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Attach file">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </Button>
            </div>
            <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled={!value()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    );
  },
  ...src(`<PromptInput value={value()} onValueChange={setValue}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputActions class="justify-between">
    <Button variant="ghost" size="icon-sm"><AttachIcon /></Button>
    <Button size="icon-sm" class="rounded-full" aria-label="Send message" disabled={!value()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
      </svg>
    </Button>
  </PromptInputActions>
</PromptInput>`),
};
