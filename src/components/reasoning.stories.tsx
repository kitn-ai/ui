import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';

const meta: Meta = {
  title: 'Components/Reasoning',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Reasoning>
      <ReasoningTrigger>View reasoning</ReasoningTrigger>
      <ReasoningContent>
        <p>The user is asking about reactive programming. Let me break down the key concepts of signals, effects, and memos in SolidJS.</p>
      </ReasoningContent>
    </Reasoning>
  ),
};

export const WithMarkdown: Story = {
  render: () => (
    <Reasoning>
      <ReasoningTrigger>View reasoning</ReasoningTrigger>
      <ReasoningContent markdown>
        {"The user wants to understand **reactive primitives**.\n\n- `createSignal` for state\n- `createEffect` for side effects\n- `createMemo` for derived values"}
      </ReasoningContent>
    </Reasoning>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = createSignal(true);
    return (
      <Reasoning open={open()} onOpenChange={setOpen}>
        <ReasoningTrigger>Thinking process</ReasoningTrigger>
        <ReasoningContent>
          <p>This is a controlled reasoning component that starts open.</p>
        </ReasoningContent>
      </Reasoning>
    );
  },
};

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
        <Reasoning isStreaming={streaming()}>
          <ReasoningTrigger>Thinking...</ReasoningTrigger>
          <ReasoningContent>
            <p>Auto-opens during streaming and auto-closes when streaming ends.</p>
          </ReasoningContent>
        </Reasoning>
      </div>
    );
  },
};
