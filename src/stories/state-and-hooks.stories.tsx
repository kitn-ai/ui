import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount, createEffect } from 'solid-js';
import '../elements/register'; // side effect: registers <kai-chat>
import { Button, createKaiChat } from '../index';
import type { ChatMessage } from '../elements/chat-types';

// <kai-chat> is a custom DOM element — declare the tag for Solid JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-chat': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const meta: Meta = {
  title: 'Examples/State & Hooks',
  parameters: {
    docs: {
      description: {
        component:
          'The elements stay controlled — you own the data. `createKaiChat` (Solid) ' +
          'and `useKaiChat` (React) own that state for you and drive a spreadable `bind`; ' +
          'under the hood both run on `@kitn.ai/ui/state` (immutable helpers + the ' +
          '`createAssistantStream` handle). This demo wires the Solid store to a live ' +
          '`<kai-chat>`; the source tab shows the React and vanilla paths.',
      },
      source: { language: 'tsx', code: undefined },
    },
  },
};
export default meta;
type Story = StoryObj;

type ChatEl = HTMLElement & { messages?: ChatMessage[]; loading?: boolean };

const REPLY = `Sure — here is the short version:

**Server-Sent Events (SSE)** stream tokens from the server over a single HTTP
connection. The browser's \`EventSource\` reconnects for you, and each chunk is
appended to the in-flight assistant message.

\`\`\`ts
const s = createAssistantStream(setMessages);
for await (const tok of backend(prompt)) s.appendText(tok);
s.done();
\`\`\`

Because every helper returns a **new array reference**, the element re-renders on
each chunk with zero hand-rolled immutable updates.`;

/** Split into word-ish tokens so the reply streams in visibly. */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Live demo: a Solid `createKaiChat` store driving the controlled `<kai-chat>`. */
function StateHooksDemo() {
  let el: ChatEl | undefined;

  const chat = createKaiChat({
    initialMessages: [
      {
        id: 'seed',
        role: 'assistant',
        content: 'Ask me anything below, or press **Stream a demo reply**.',
      },
    ],
    onSubmit: ({ value }) => void streamReply(value),
  });

  async function streamReply(prompt: string) {
    chat.append({ id: crypto.randomUUID(), role: 'user', content: prompt });
    const s = chat.streamAssistant();
    s.appendReasoning('Deciding how to answer the question…', 'Reasoning');
    for (const tok of tokenize(REPLY)) {
      await delay(26);
      s.appendText(tok);
    }
    s.done();
  }

  onMount(() => {
    // Submit comes OUT as a non-bubbling kai-submit CustomEvent; hand it to the store.
    el?.addEventListener('kai-submit', chat.handleSubmit as EventListener);
  });

  // Push the consumer-owned state onto the controlled element as JS properties.
  // A new array reference per change (guaranteed by the helpers) makes it re-render.
  createEffect(() => {
    if (!el) return;
    el.messages = chat.messages();
    el.loading = chat.loading();
  });

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px', height: '600px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={() => void streamReply('Explain server-sent events')} disabled={chat.loading()}>
          Stream a demo reply
        </Button>
        <Button variant="outline" onClick={() => chat.setMessages(() => [])}>
          Clear
        </Button>
      </div>
      <kai-chat
        ref={(e) => (el = e as ChatEl)}
        style={{ display: 'block', flex: '1', 'min-height': '0' }}
      />
    </div>
  );
}

const REACT_SNIPPET = `import { Chat, useKaiChat } from '@kitn.ai/ui/react';

function App() {
  const chat = useKaiChat({
    async onSubmit({ value }) {
      chat.append({ id: crypto.randomUUID(), role: 'user', content: value });
      const s = chat.streamAssistant();        // loading flips true → false on done()
      for await (const tok of backend(value)) s.appendText(tok);
      s.done();
    },
  });

  // bind spreads messages, loading, suggestions, and the kai-submit handler.
  return <Chat {...chat.bind} />;
}`;

const VANILLA_SNIPPET = `import { createAssistantStream, appendMessage } from '@kitn.ai/ui/state';

const el = document.querySelector('kai-chat');
// The universal contract: a functional-updater setter, (prev) => next.
const setMessages = (fn) => { el.messages = fn(el.messages ?? []); };

setMessages((m) => appendMessage(m, { id: crypto.randomUUID(), role: 'user', content: prompt }));
const s = createAssistantStream(setMessages);
for await (const tok of backend(prompt)) s.appendText(tok);
s.done();`;

/** The live Solid store ↔ `<kai-chat>` demo. */
export const LiveDemo: Story = {
  name: 'Live Demo (Solid createKaiChat)',
  render: () => <StateHooksDemo />,
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code:
          `// React — useKaiChat owns the state for you\n` +
          REACT_SNIPPET +
          `\n\n// Vanilla — the same core, one-line setter adapter\n` +
          VANILLA_SNIPPET,
      },
    },
  },
};
