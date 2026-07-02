import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Thread } from './thread';
import { ChatConfig } from '../primitives/chat-config';
import { componentDescription } from '../stories/docs/element-controls';
import type { ChatMessage } from '../elements/chat-types';

const conversation: ChatMessage[] = [
  { id: 'u1', role: 'user', content: 'What is SolidJS in one line?' },
  {
    id: 'a1',
    role: 'assistant',
    content:
      '**SolidJS** is a reactive UI library that compiles your components away and updates the DOM with fine-grained signals — no virtual DOM.',
    actions: ['copy', 'like', 'dislike'],
  },
  { id: 'u2', role: 'user', content: 'Show me a signal.' },
  {
    id: 'a2',
    role: 'assistant',
    content: `Here's a counter:

\`\`\`tsx
import { createSignal } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count()}</button>;
}
\`\`\`

\`count\` is a getter — reading it inside JSX subscribes just that node.`,
    reasoning: { text: 'The user wants the smallest possible signal example, so keep it to a counter.' },
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  },
];

const meta = {
  title: 'Components/Elements/Thread',
  component: Thread,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      controls: { exclude: ['use:eventListener', 'messages', 'empty', 'controllerRef', 'onMessageAction'] },
      description: componentDescription([
        'The message-list slice of a chat, standalone: the scrolling list of messages with per-message markdown, code highlight, reasoning + tool panels, avatars, and the action row — plus stick-to-bottom scroll, a scroll-to-bottom button, an optional typing indicator, and an empty state.',
        'No composer, header, suggestions, or sidebar — compose it with `kai-prompt-input` and your own layout, or use the batteries-included `kai-chat`. Fills the height its parent gives it (`h-full`) and scrolls internally. This is the SolidJS component behind the `<kai-thread>` web component.',
      ]),
    },
  },
  argTypes: {
    loading: { control: 'boolean', description: 'Show a typing indicator on the pending assistant turn.' },
    proseSize: { control: 'select', options: ['xs', 'sm', 'base', 'lg'], description: 'Body/prose font scale for markdown.' },
    actionsReveal: { control: 'inline-radio', options: ['always', 'hover'], description: 'Keep each action bar visible, or reveal it on row hover.' },
    scrollButton: { control: 'boolean', description: 'Show the scroll-to-bottom button.' },
  },
  render: (args) => (
    <div style={{ height: '520px' }} class="overflow-hidden rounded-lg border border-border">
      <Thread {...args} />
    </div>
  ),
} satisfies Meta<typeof Thread>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Thread } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** A full conversation: user + assistant turns, markdown, a code block, reasoning,
 *  and per-message action bars. Tweak `proseSize` / `actionsReveal` via controls. */
export const Playground: Story = {
  args: { messages: conversation, actionsReveal: 'always', proseSize: 'sm', scrollButton: true, loading: false },
  ...src(`<div style={{ height: '520px' }}>
  <Thread messages={messages} />
</div>`),
};

/** The pending assistant turn: `loading` renders a typing indicator at the end. */
export const Loading: Story = {
  args: { messages: conversation, loading: true },
  ...src(`<Thread messages={messages} loading />`),
};

/** Empty thread: the built-in zero-state renders when there are no messages. */
export const EmptyDefault: Story = {
  args: { messages: [] },
  ...src(`<Thread messages={[]} />`),
};

/** Custom zero-state via the `empty` prop (the `<kai-thread>` `slot="empty"`). */
export const EmptyCustom: Story = {
  args: {
    messages: [],
    empty: (
      <div class="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <div class="text-2xl">💬</div>
        <p class="text-sm font-medium text-foreground">Ask me anything</p>
        <p class="text-xs text-muted-foreground">Your conversation will show up here.</p>
      </div>
    ),
  },
  ...src(`<Thread messages={[]} empty={<YourZeroState />} />`),
};

/** Avatars: entries with an `avatar` render an avatar rail beside the body. */
export const WithAvatars: Story = {
  args: {
    messages: [
      { id: 'u1', role: 'user', content: 'Morning — any blockers?', avatar: { fallback: 'RT' } },
      { id: 'a1', role: 'assistant', content: 'None. The build is green and the release is queued.', avatar: { fallback: 'AI' }, actions: ['copy'] },
    ],
  },
  ...src(`<Thread messages={messagesWithAvatars} />`),
};

/** Streaming: hand the thread a NEW array reference per chunk and it sticks to the
 *  bottom. Click to simulate a token stream. */
export const Streaming: Story = {
  render: () => {
    const base: ChatMessage[] = [{ id: 'u1', role: 'user', content: 'Stream a reply.' }];
    const full = 'Streaming works by handing the thread a brand-new messages array on every chunk. Mutating the same array in place would not re-render — a fresh reference does, and the list auto-scrolls to follow.';
    const [messages, setMessages] = createSignal<ChatMessage[]>(base);
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) return;
      let i = 0;
      timer = setInterval(() => {
        i += 4;
        setMessages([...base, { id: 'a1', role: 'assistant', content: full.slice(0, i) }]);
        if (i >= full.length) { clearInterval(timer); timer = undefined; }
      }, 40);
    };
    return (
      <ChatConfig>
        <div style={{ height: '420px' }} class="flex flex-col overflow-hidden rounded-lg border border-border">
          <div class="shrink-0 border-b border-border p-2">
            <button type="button" class="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={start}>
              Simulate stream
            </button>
          </div>
          <Thread messages={messages()} loading={messages().length === 1} />
        </div>
      </ChatConfig>
    );
  },
  ...src(`const [messages, setMessages] = createSignal(base);
// per chunk: setMessages([...base, { id: 'a1', role: 'assistant', content: next }]);
<Thread messages={messages()} />`),
};
