import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kitn-chat>, <kitn-conversation-list>, <kitn-prompt-input>
import type { ChatMessage } from './chat-types';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-chat': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleMessages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'How do I center a div?' },
  {
    id: '2',
    role: 'assistant',
    content:
      'The modern way is a grid:\n\n```css\n.box {\n  display: grid;\n  place-items: center;\n}\n```\n\nThat centers the child on both axes.',
    actions: ['copy', 'like', 'dislike'],
  },
];

/** Live demo of the actual `<kitn-chat>` custom element (Shadow DOM and all). */
function ChatElement() {
  let el: (HTMLElement & { messages?: ChatMessage[] }) | undefined;
  onMount(() => {
    if (el) el.messages = sampleMessages;
  });
  return <kitn-chat ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', height: '560px' }} />;
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-chat id="chat" style="display:block; height:100vh;"></kitn-chat>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const chat = document.getElementById('chat');
  chat.messages = [
    { id: '1', role: 'user', content: 'How do I center a div?' },
    { id: '2', role: 'assistant', content: 'Use \`display: grid; place-items: center;\`' },
  ];

  // events are CustomEvents on the element (they do not bubble)
  chat.addEventListener('submit', (e) => console.log('user sent:', e.detail.value));
</script>`;

const SOLID_SNIPPET = `import '@kitnai/chat/elements'; // registers the custom elements
import { onMount } from 'solid-js';
import type { ChatMessage } from '@kitnai/chat/elements';

function Chat() {
  let el: HTMLElement & { messages?: ChatMessage[] };
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'How do I center a div?' },
    { id: '2', role: 'assistant', content: 'Use \`display: grid; place-items: center;\`' },
  ];
  onMount(() => { el.messages = messages; });
  return (
    <kitn-chat
      ref={el}
      style={{ display: 'block', height: '100vh' }}
      on:submit={(e) => console.log('user sent:', e.detail.value)}
    />
  );
}`;

const meta = {
  title: 'Web Components/kitn-chat',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-chat>` is the framework-agnostic **web component** version of the chat UI — a complete message thread plus prompt input, isolated in **Shadow DOM** so the host page\'s CSS can\'t leak in and the kit\'s styles can\'t leak out. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** dropping a full chat into a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts. If you *are* in SolidJS and want fine-grained control, compose the primitives (`ChatContainer`, `Message`, `PromptInput`) instead.',
          '**How to use:** register once with `import \'@kitnai/chat/elements\'`, set rich data as JS **properties** (`el.messages = [...]`), and listen for **CustomEvents** (`submit`, `messageaction`, `valuechange`) directly on the element.',
          '**Placement:** as a top-level panel or full-page surface. Give it an explicit height (e.g. `height: 100vh`).',
          'See the **Code** tab below for the HTML usage; the *SolidJS* story shows the same element inside a Solid component.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The element used the plain-HTML / any-framework way. */
export const Default: Story = {
  render: () => <ChatElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref`, events via `on:`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <ChatElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};
