import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import type { ChatMessage } from './chat-types';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-message': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const assistantMessage: ChatMessage = {
  id: 'm-a',
  role: 'assistant',
  content:
    "Here's the plan, with a quick code sample:\n\n```js\nconst kit = useChat();\n```\n\nThat wires the kit into your component.",
  reasoning: { text: 'The user wants X, so I should do Y then Z.', label: 'Reasoning' },
  tools: [{ type: 'search', state: 'output-available', input: { query: 'kitn docs' }, output: { hits: 3 } }],
  attachments: [
    {
      id: '1',
      type: 'file',
      filename: 'architecture.png',
      mediaType: 'image/png',
      url:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="12" fill="#7c3aed"/><text x="48" y="60" font-size="42" text-anchor="middle" fill="white">◆</text></svg>',
        ),
    },
  ],
  actions: ['copy', 'like', 'dislike', 'regenerate'],
};

const userMessage: ChatMessage = {
  id: 'm-u',
  role: 'user',
  content: 'How do I compose these myself?',
};

/** Render the actual `<kc-message>` custom element with a `message` property. */
function MessageElement(props: { message: ChatMessage }) {
  let el: (HTMLElement & { message?: ChatMessage }) | undefined;
  onMount(() => {
    if (el) el.message = props.message;
  });
  return (
    <kc-message ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-message id="msg" style="display:block;"></kc-message>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm-a', role: 'assistant',
    content: "Here's the plan:\\n\\n\\\`\\\`\\\`js\\nconst kit = useChat();\\n\\\`\\\`\\\`",
    reasoning: { text: 'The user wants X, so I should do Y.' },
    tools: [{ type: 'search', state: 'output-available', output: { hits: 3 } }],
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };

  // events are CustomEvents on the element (they do not bubble)
  msg.addEventListener('messageaction', (e) => console.log(e.detail.action, e.detail.messageId));
</script>`;

const meta = {
  title: 'Web Components/kc-message',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-message'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-message', [
          '`<kc-message>` is the framework-agnostic **web component** for a single message row — markdown/plain content, an optional reasoning block, tool calls, attachments, and action buttons — all rendered from one `message` object (the same shape `<kc-chat>` uses per message). It is the keystone of the "compose your own message list" pattern, isolated in **Shadow DOM**.',
          "**When to use:** building a custom message thread in a non-Solid app, or anywhere you want to lay out the list yourself but keep the kit's rich message rendering. In SolidJS, compose the `Message` primitives for finer control.",
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the whole row via the `message` **property** (`el.message = {...}`), and listen for the `messageaction` **CustomEvent** for action-button clicks. For simple cases, set `role` + `content` attributes instead of a full object.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A rich assistant message: markdown, reasoning, a tool call, an attachment, and actions. */
export const Assistant: Story = {
  render: () => <MessageElement message={assistantMessage} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A plain user message (markdown defaults off for the user role). */
export const User: Story = {
  render: () => <MessageElement message={userMessage} />,
};
