import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from './chat-container';
import { Message, MessageAvatar, MessageContent } from './message';
import { For } from 'solid-js';

const meta: Meta = {
  title: 'Components/ChatContainer',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

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

export const FullChat: Story = {
  render: () => (
    <div class="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <ChatContainerRoot class="h-full flex-col p-4">
        <ChatContainerContent class="space-y-4">
          <For each={sampleMessages}>
            {(msg) => (
              <Message>
                <MessageAvatar
                  src=""
                  fallback={msg.role === 'user' ? 'U' : 'AI'}
                  alt={msg.role}
                />
                <MessageContent markdown={msg.role === 'assistant'}>
                  {msg.content}
                </MessageContent>
              </Message>
            )}
          </For>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  ),
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
                  <MessageAvatar
                    src=""
                    fallback={msg.role === 'user' ? 'U' : 'AI'}
                    alt={msg.role}
                  />
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
};
