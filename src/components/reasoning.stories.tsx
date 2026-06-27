import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { action } from 'storybook/actions';
import { createSignal } from 'solid-js';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Elements/Reasoning',
  component: Reasoning,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A collapsible disclosure for an assistant\'s chain-of-thought. Compose `Reasoning` (root) with `ReasoningTrigger` (the toggle) and `ReasoningContent` (the body; pass `markdown` to render a markdown string). Leave it uncontrolled or drive it with `open` + `onOpenChange`; `isStreaming` auto-opens during generation and closes when it ends.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controlled open state. Omit for uncontrolled behavior.',
    },
    isStreaming: {
      control: 'boolean',
      description: 'When true, auto-opens the disclosure; auto-closes when it returns to false.',
      table: { defaultValue: { summary: 'false' } },
    },
    onOpenChange: {
      action: 'openChange',
      description: 'Fired with the next open state when the trigger is toggled.',
      table: { category: 'Events' },
    },
    children: { control: false, description: 'Trigger and content composition.' },
  },
  args: {
    isStreaming: false,
    onOpenChange: fn(),
  },
  render: (args) => (
    <Reasoning {...args}>
      <ReasoningTrigger>View reasoning</ReasoningTrigger>
      <ReasoningContent>
        <p>The user is asking about reactive programming. Let me break down the key concepts of signals, effects, and memos in SolidJS.</p>
      </ReasoningContent>
    </Reasoning>
  ),
} satisfies Meta<typeof Reasoning>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Reasoning, ReasoningTrigger, ReasoningContent } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: toggle `open` / `isStreaming` via the controls. */
export const Playground: Story = {
  ...src(`<Reasoning>
  <ReasoningTrigger>View reasoning</ReasoningTrigger>
  <ReasoningContent>
    <p>Let me break down signals, effects, and memos in SolidJS.</p>
  </ReasoningContent>
</Reasoning>`),
};

/** Content rendered from a markdown string. */
export const WithMarkdown: Story = {
  render: (args: Parameters<NonNullable<Story['render']>>[0]) => (
    <Reasoning {...args}>
      <ReasoningTrigger>View reasoning</ReasoningTrigger>
      <ReasoningContent markdown>
        {'The user wants to understand **reactive primitives**.\n\n- `createSignal` for state\n- `createEffect` for side effects\n- `createMemo` for derived values'}
      </ReasoningContent>
    </Reasoning>
  ),
  ...src(`<Reasoning>
  <ReasoningTrigger>View reasoning</ReasoningTrigger>
  <ReasoningContent markdown>
    {'The user wants **reactive primitives**.\\n\\n- \`createSignal\`\\n- \`createEffect\`\\n- \`createMemo\`'}
  </ReasoningContent>
</Reasoning>`),
};

/** Controlled via `open` + `onOpenChange`, starting open (showcase). */
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = createSignal(true);
    const onOpenChange = (next: boolean) => {
      action('openChange')(next);
      setOpen(next);
    };
    return (
      <Reasoning open={open()} onOpenChange={onOpenChange}>
        <ReasoningTrigger>Thinking process</ReasoningTrigger>
        <ReasoningContent>
          <p>This is a controlled reasoning component that starts open.</p>
        </ReasoningContent>
      </Reasoning>
    );
  },
  ...src(`const [open, setOpen] = createSignal(true);

<Reasoning open={open()} onOpenChange={setOpen}>
  <ReasoningTrigger>Thinking process</ReasoningTrigger>
  <ReasoningContent>
    <p>This is a controlled reasoning component that starts open.</p>
  </ReasoningContent>
</Reasoning>`),
};

/** Auto-opens while streaming, auto-closes when it ends (showcase). */
export const Streaming: Story = {
  render: () => {
    const [streaming, setStreaming] = createSignal(true);
    return (
      <div class="space-y-4">
        <button
          class="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
          onClick={() => setStreaming((s) => !s)}
        >
          {streaming() ? 'Stop streaming' : 'Start streaming'}
        </button>
        <Reasoning isStreaming={streaming()} onOpenChange={action('openChange')}>
          <ReasoningTrigger>Thinking...</ReasoningTrigger>
          <ReasoningContent>
            <p>Auto-opens during streaming and auto-closes when streaming ends.</p>
          </ReasoningContent>
        </Reasoning>
      </div>
    );
  },
  ...src(`<Reasoning isStreaming={streaming()}>
  <ReasoningTrigger>Thinking...</ReasoningTrigger>
  <ReasoningContent>
    <p>Auto-opens during streaming and auto-closes when streaming ends.</p>
  </ReasoningContent>
</Reasoning>`),
};
