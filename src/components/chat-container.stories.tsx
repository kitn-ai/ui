import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For } from 'solid-js';
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from './chat-container';
import { Message, MessageAvatar, MessageContent } from './message';

const sampleMessages = [
  { role: 'user', content: 'What is SolidJS?' },
  { role: 'assistant', content: '**SolidJS** is a declarative, efficient, and flexible JavaScript library for building user interfaces. Unlike React, it uses fine-grained reactivity with no Virtual DOM, resulting in excellent performance.' },
  { role: 'user', content: 'How does reactivity work in SolidJS?' },
  { role: 'assistant', content: `SolidJS uses **signals** as its core reactive primitive. Here's how it works:

1. **Signals** -- Store reactive values that track their dependencies
2. **Effects** -- Side effects that re-run when their signal dependencies change
3. **Memos** -- Derived values that cache their results

Unlike React's useState, SolidJS signals are getter/setter pairs that update only the specific DOM nodes that depend on them.` },
  { role: 'user', content: 'Can you show me an example?' },
  { role: 'assistant', content: `Here's a simple counter example:

\`\`\`typescript
import { createSignal } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
}
\`\`\`

Notice that \`count\` is called as a function -- this is how SolidJS tracks which parts of the UI depend on which signals.` },
];

const meta = {
  title: 'Components/ChatContainer',
  component: ChatContainerRoot,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'A scrollable message viewport that automatically sticks to the bottom as new content streams in. Composed of `ChatContainerRoot` (the scroll region), `ChatContainerContent` (the message stack), and `ChatContainerScrollAnchor` (the stick-to-bottom target).',
          '**When to use:** as the conversation transcript region of a chat UI, where messages append over time and the view should follow the latest output unless the user scrolls up.',
          '**How to use:** wrap your message list in `ChatContainerRoot`, place messages inside `ChatContainerContent`, and end with `ChatContainerScrollAnchor`. Give the root a fixed height so it can scroll.',
          '**Placement:** the central pane of a chat layout, between the header and the prompt input.',
        ].join('\n\n'),
      },
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    children: {
      control: false,
      description: 'The container content — typically `ChatContainerContent` with messages.',
    },
    class: {
      control: 'text',
      description: 'Extra classes for the scroll region (set a height so it can scroll).',
    },
  },
  args: {
    class: 'h-full flex-col p-4',
  },
  render: (args) => (
    <div class="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <ChatContainerRoot {...args}>
        <ChatContainerContent class="space-y-4">
          <For each={sampleMessages}>
            {(msg) => (
              <Message>
                <MessageAvatar src="" fallback={msg.role === 'user' ? 'U' : 'AI'} alt={msg.role} />
                <MessageContent markdown={msg.role === 'assistant'}>{msg.content}</MessageContent>
              </Message>
            )}
          </For>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  ),
} satisfies Meta<typeof ChatContainerRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import {
  ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent,
} from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — a full transcript inside the stick-to-bottom container. */
export const Playground: Story = {
  ...src(`<div class="h-[500px]">
  <ChatContainerRoot class="h-full flex-col p-4">
    <ChatContainerContent class="space-y-4">
      <For each={messages}>
        {(msg) => (
          <Message>
            <MessageAvatar src="" fallback={msg.role === 'user' ? 'U' : 'AI'} alt={msg.role} />
            <MessageContent markdown={msg.role === 'assistant'}>{msg.content}</MessageContent>
          </Message>
        )}
      </For>
      <ChatContainerScrollAnchor />
    </ChatContainerContent>
  </ChatContainerRoot>
</div>`),
};

export const FullChat: Story = {
  render: () => (
    <div class="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <ChatContainerRoot class="h-full flex-col p-4">
        <ChatContainerContent class="space-y-4">
          <For each={sampleMessages}>
            {(msg) => (
              <Message>
                <MessageAvatar src="" fallback={msg.role === 'user' ? 'U' : 'AI'} alt={msg.role} />
                <MessageContent markdown={msg.role === 'assistant'}>{msg.content}</MessageContent>
              </Message>
            )}
          </For>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  ),
  ...src(`<ChatContainerRoot class="h-full flex-col p-4">
  <ChatContainerContent class="space-y-4">
    <For each={messages}>
      {(msg) => (
        <Message>
          <MessageAvatar src="" fallback={msg.role === 'user' ? 'U' : 'AI'} alt={msg.role} />
          <MessageContent markdown={msg.role === 'assistant'}>{msg.content}</MessageContent>
        </Message>
      )}
    </For>
    <ChatContainerScrollAnchor />
  </ChatContainerContent>
</ChatContainerRoot>`),
};

export const LongConversation: Story = {
  render: () => {
    const manyMessages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: i % 2 === 0
        ? `This is user message number ${Math.floor(i / 2) + 1}. It asks a question about the topic.`
        : `This is the assistant's response to message ${Math.floor(i / 2) + 1}. It provides a detailed explanation with relevant examples and context.`,
    }));
    return (
      <div class="h-[400px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <ChatContainerRoot class="h-full flex-col p-4">
          <ChatContainerContent class="space-y-4">
            <For each={manyMessages}>
              {(msg) => (
                <Message>
                  <MessageAvatar src="" fallback={msg.role === 'user' ? 'U' : 'AI'} alt={msg.role} />
                  <MessageContent>{msg.content}</MessageContent>
                </Message>
              )}
            </For>
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainerRoot>
      </div>
    );
  },
  ...src(`<ChatContainerRoot class="h-full flex-col p-4">
  <ChatContainerContent class="space-y-4">
    <For each={manyMessages}>
      {(msg) => (
        <Message>
          <MessageAvatar src="" fallback={msg.role === 'user' ? 'U' : 'AI'} alt={msg.role} />
          <MessageContent>{msg.content}</MessageContent>
        </Message>
      )}
    </For>
    <ChatContainerScrollAnchor />
  </ChatContainerContent>
</ChatContainerRoot>`),
};
