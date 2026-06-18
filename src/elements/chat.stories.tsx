import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kc-chat>, <kc-conversations>, <kc-prompt-input>
import type { ChatMessage } from './chat-types';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-chat': JSX.HTMLAttributes<HTMLElement>;
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

type ChatEl = HTMLElement & {
  messages?: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  suggestionMode?: string;
  proseSize?: string;
  codeTheme?: string;
  codeHighlight?: boolean;
  chatTitle?: string;
  currentModel?: string;
  scrollButton?: boolean;
  search?: boolean;
  voice?: boolean;
  slashCompact?: boolean;
};

/** Live demo of the actual `<kc-chat>` custom element (Shadow DOM and all). */
function ChatElement(props: { args?: Record<string, unknown> }) {
  let el: ChatEl | undefined;
  onMount(() => {
    if (el) {
      // Fixed array data
      el.messages = sampleMessages;
      // Scalar args from Controls
      const args = props.args;
      if (args) {
        const scalarNames = [
          'value', 'placeholder', 'loading', 'suggestionMode', 'proseSize',
          'codeTheme', 'codeHighlight', 'chatTitle', 'currentModel',
          'scrollButton', 'search', 'voice', 'slashCompact',
        ];
        for (const name of scalarNames) {
          if (name in args) (el as unknown as Record<string, unknown>)[name] = args[name];
        }
      }
    }
  });
  return <kc-chat ref={(e) => (el = e as ChatEl)} style={{ display: 'block', height: '560px' }} />;
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-chat id="chat" style="display:block; height:100vh;"></kc-chat>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const chat = document.getElementById('chat');
  chat.messages = [
    { id: '1', role: 'user', content: 'How do I center a div?' },
    { id: '2', role: 'assistant', content: 'Use \`display: grid; place-items: center;\`' },
  ];

  // events are CustomEvents on the element (they do not bubble)
  chat.addEventListener('kc-submit', (e) => console.log('user sent:', e.detail.value));
</script>`;

const SOLID_SNIPPET = `import '@kitn.ai/ui/elements'; // registers the custom elements
import { onMount } from 'solid-js';
import type { ChatMessage } from '@kitn.ai/ui/elements';

function Chat() {
  let el: HTMLElement & { messages?: ChatMessage[] };
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'How do I center a div?' },
    { id: '2', role: 'assistant', content: 'Use \`display: grid; place-items: center;\`' },
  ];
  onMount(() => { el.messages = messages; });
  return (
    <kc-chat
      ref={el}
      style={{ display: 'block', height: '100vh' }}
      on:kc-submit={(e) => console.log('user sent:', e.detail.value)}
    />
  );
}`;

const meta = {
  title: 'Components/Chat',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-chat'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-chat', [
          '`<kc-chat>` is the framework-agnostic **web component** version of the chat UI — a complete message thread plus prompt input, isolated in **Shadow DOM** so the host page\'s CSS can\'t leak in and the kit\'s styles can\'t leak out. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** dropping a full chat into a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts. If you *are* in SolidJS and want fine-grained control, compose the primitives (`ChatContainer`, `Message`, `PromptInput`) instead.',
          '**How to use:** register once with `import \'@kitn.ai/ui/elements\'`, set rich data as JS **properties** (`el.messages = [...]`), and listen for **CustomEvents** (`kc-submit`, `kc-message-action`, `kc-value-change`) directly on the element.',
          '**Anatomy:** **header** (model switcher + context-meter, shown when `models`/`context` props are set) → **message list** (scrollable thread of `<Message>` rows, each rendered per `role`; a scroll-to-bottom button appears when scrolled up) → **prompt composer** (`<PromptInput>`: textarea + toolbar with suggestions, slash-command palette, voice/search buttons, and optional attachment area).',
          '**Placement:** as a top-level panel or full-page surface. Give it an explicit height (e.g. `height: 100vh`).',
          'See the **Code** tab below for the HTML usage; the *SolidJS* story shows the same element inside a Solid component.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The element used the plain-HTML / any-framework way. */
export const Default: Story = {
  args: {
    placeholder: 'Send a message...',
    loading: false,
    suggestionMode: 'submit',
    proseSize: 'sm',
    codeTheme: 'github-dark-dimmed',
    codeHighlight: true,
    scrollButton: true,
    search: false,
    voice: false,
    slashCompact: false,
  },
  render: (args: Record<string, unknown>) => <ChatElement args={args} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref`, events via `on:`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <ChatElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};

