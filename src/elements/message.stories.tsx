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
      'kai-message': JSX.HTMLAttributes<HTMLElement>;
      'kai-action': JSX.HTMLAttributes<HTMLElement> & { icon?: string; tooltip?: string };
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

const AVATAR_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#10b981"/><text x="32" y="42" font-size="28" text-anchor="middle" fill="white">K</text></svg>',
  );

/** An assistant message with an avatar (from `message.avatar`) plus custom + built-in actions. */
const avatarMessage: ChatMessage = {
  id: 'm-av',
  role: 'assistant',
  content: 'I have an avatar, a custom **Share** action, and the built-in copy/like actions.',
  avatar: { src: AVATAR_SVG, alt: 'Kitn', fallback: 'K' },
  actions: ['copy', 'like', { id: 'share', label: 'Share', icon: 'share' }],
};

/** Render the actual `<kai-message>` custom element with a `message` property and optional attrs. */
function MessageElement(props: { message: ChatMessage; actionsReveal?: 'always' | 'hover' }) {
  let el: (HTMLElement & { message?: ChatMessage }) | undefined;
  onMount(() => {
    if (!el) return;
    if (props.actionsReveal) el.setAttribute('actions-reveal', props.actionsReveal);
    el.message = props.message;
    el.addEventListener('kai-message-action', (e) =>
      console.log('kai-message-action', (e as CustomEvent).detail.action),
    );
  });
  return (
    <kai-message ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-message id="msg" style="display:block;"></kai-message>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm-a', role: 'assistant',
    content: "Here's the plan:\\n\\n\\\`\\\`\\\`js\\nconst kit = useChat();\\n\\\`\\\`\\\`",
    reasoning: { text: 'The user wants X, so I should do Y.' },
    tools: [{ type: 'search', state: 'output-available', output: { hits: 3 } }],
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };

  // events are CustomEvents on the element (they do not bubble)
  msg.addEventListener('kai-message-action', (e) => console.log(e.detail.action, e.detail.messageId));
</script>`;

const meta = {
  title: 'Components/Message',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-message'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-message', [
          '`<kai-message>` is the framework-agnostic **web component** for a single message row — markdown/plain content, an optional reasoning block, tool calls, attachments, and action buttons — all rendered from one `message` object (the same shape `<kai-chat>` uses per message). It is the keystone of the "compose your own message list" pattern, isolated in **Shadow DOM**.',
          "**When to use:** building a custom message thread in a non-Solid app, or anywhere you want to lay out the list yourself but keep the kit's rich message rendering. In SolidJS, compose the `Message` primitives for finer control.",
          "**How to use:** register once with `import '@kitn.ai/ui/elements'`, set the whole row via the `message` **property** (`el.message = {...}`), and listen for the `kai-message-action` **CustomEvent** for action-button clicks. For simple cases, set `role` + `content` attributes instead of a full object.",
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

/** An avatar (from `message.avatar`) laid out beside the content column, with a
 *  custom **Share** action (curated `icon`) alongside the built-in copy/like. */
export const WithAvatarAndCustomAction: Story = {
  name: 'Avatar + Custom Action',
  render: () => <MessageElement message={avatarMessage} />,
  parameters: {
    docs: {
      source: {
        code: `<kai-message id="msg" style="display:block;"></kai-message>
<script type="module">
  import '@kitn.ai/ui/elements';
  const msg = document.getElementById('msg');
  msg.message = {
    id: 'm-av', role: 'assistant', content: 'I have an avatar and a custom Share action.',
    avatar: { src: '/k.png', alt: 'Kitn', fallback: 'K' },
    // built-in names AND custom { id, label, icon } descriptors:
    actions: ['copy', 'like', { id: 'share', label: 'Share', icon: 'share' }],
  };
  msg.addEventListener('kai-message-action', (e) => console.log(e.detail.action)); // 'copy' | 'like' | 'share'
</script>`,
        language: 'html',
      },
    },
  },
};

/** Declarative actions — `<kai-action>` light-DOM children instead of a
 *  `message.actions` array. Each carries `id`, a curated `icon`, an optional
 *  `tooltip`, and optional text (the accessible label). Great for plain HTML. */
export const DeclarativeActions: Story = {
  name: 'Declarative Actions (kai-action)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.setAttribute('avatar-fallback', 'AI');
      el.setAttribute(
        'content',
        'Declare each button as a `<kai-action>` child — no `message` object or JS wiring needed.',
      );
      el.addEventListener('kai-message-action', (e) =>
        console.log('kai-message-action', (e as CustomEvent).detail.action),
      );
    });
    return (
      <kai-message
        ref={(e) => (el = e as HTMLElement)}
        style={{ display: 'block', padding: '16px', 'max-width': '720px' }}
      >
        <kai-action id="copy" icon="copy" tooltip="Copy"></kai-action>
        <kai-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kai-action>
        <kai-action id="share" icon="share" tooltip="Share">Share</kai-action>
        <kai-action id="bookmark" icon="bookmark" tooltip="Bookmark">Bookmark</kai-action>
      </kai-message>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `<kai-message role="assistant" avatar-fallback="AI" content="..." style="display:block;">
  <kai-action id="copy" icon="copy" tooltip="Copy"></kai-action>
  <kai-action id="regenerate" icon="regenerate" tooltip="Regenerate"></kai-action>
  <kai-action id="share" icon="share" tooltip="Share">Share</kai-action>
  <kai-action id="bookmark" icon="bookmark" tooltip="Bookmark">Bookmark</kai-action>
</kai-message>

<script type="module">
  import '@kitn.ai/ui/elements';
  document.querySelector('kai-message')
    .addEventListener('kai-message-action', (e) => console.log(e.detail.action)); // 'copy' | 'share' | …
</script>`,
        language: 'html',
      },
    },
  },
};

/** `actions-reveal="hover"` — the action bar is hidden until you hover the row. */
export const ActionsRevealOnHover: Story = {
  name: 'Actions Reveal on Hover',
  render: () => <MessageElement message={avatarMessage} actionsReveal="hover" />,
  parameters: {
    docs: {
      source: {
        code: `<!-- actions-reveal: 'always' (default) | 'hover' -->
<kai-message actions-reveal="hover" id="msg" style="display:block;"></kai-message>`,
        language: 'html',
      },
    },
  },
};
