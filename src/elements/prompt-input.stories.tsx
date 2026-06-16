import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kc-chat>, <kc-conversations>, <kc-prompt-input>
import type { AttachmentData } from '../components/attachments';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-prompt-input': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleSuggestions: string[] = [
  'Summarize this thread',
  'Draft a reply',
  'Explain like I am five',
];

function imgData(fill: string, glyph: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="12" fill="${fill}"/><text x="48" y="60" font-size="42" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const sampleAttachments: AttachmentData[] = [
  { id: 'a1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: imgData('#7c3aed', '◆') },
  { id: 'a2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
];

interface PromptInputEl extends HTMLElement {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
  search?: boolean;
  voice?: boolean;
  attachments?: AttachmentData[];
}

/** Live demo of the actual `<kc-prompt-input>` custom element (Shadow DOM and all). */
function PromptInputElement(props: { search?: boolean; voice?: boolean; attachments?: AttachmentData[]; args?: Record<string, unknown> }) {
  let el: PromptInputEl | undefined;
  onMount(() => {
    if (!el) return;
    // Default fixed data
    el.placeholder = 'Ask anything...';
    el.suggestions = sampleSuggestions;
    if (props.search) el.setAttribute('search', '');
    if (props.voice) el.setAttribute('voice', '');
    if (props.attachments) el.attachments = props.attachments;
    // Scalar args from Controls
    const args = props.args;
    if (args) {
      const scalarNames = [
        'value', 'placeholder', 'disabled', 'loading', 'suggestionMode',
        'slashCompact', 'search', 'voice',
      ];
      for (const name of scalarNames) {
        if (name in args) (el as unknown as Record<string, unknown>)[name] = args[name];
      }
    }
    el.addEventListener('kc-search', () => console.log('search clicked'));
    el.addEventListener('kc-voice', () => console.log('voice clicked'));
  });
  return (
    <kc-prompt-input
      ref={(e) => (el = e as PromptInputEl)}
      style={{ display: 'block', width: '100%', padding: '16px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-prompt-input id="input" style="display:block; width:100%;"></kc-prompt-input>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  const input = document.getElementById('input');
  input.placeholder = 'Ask anything...';
  input.suggestions = ['Summarize this thread', 'Draft a reply'];
  // input.loading = true;   // shows the busy state while a response streams
  // input.disabled = true;  // blocks typing and submit

  // events are CustomEvents on the element (they do not bubble)
  input.addEventListener('kc-submit', (e) => console.log('send:', e.detail.value));
  input.addEventListener('kc-value-change', (e) => console.log('typing:', e.detail.value));
  input.addEventListener('kc-suggestion-click', (e) => console.log('picked:', e.detail.value));
</script>`;

const SOLID_SNIPPET = `import '@kitn.ai/chat/elements'; // registers the custom elements
import { onMount } from 'solid-js';

function Composer() {
  let el: HTMLElement & {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    suggestions?: string[];
  };
  onMount(() => {
    el.placeholder = 'Ask anything...';
    el.suggestions = ['Summarize this thread', 'Draft a reply'];
  });
  return (
    <kc-prompt-input
      ref={el}
      style={{ display: 'block', width: '100%' }}
      on:kc-submit={(e) => console.log('send:', e.detail.value)}
      on:kc-value-change={(e) => console.log('typing:', e.detail.value)}
      on:kc-suggestion-click={(e) => console.log('picked:', e.detail.value)}
    />
  );
}`;

const meta = {
  title: 'Components/PromptInput',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-prompt-input'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-prompt-input', [
          '`<kc-prompt-input>` is the framework-agnostic **web component** version of the chat composer — an auto-resizing textarea with a send button and optional suggestion chips, isolated in **Shadow DOM** so the host page\'s CSS can\'t leak in and the kit\'s styles can\'t leak out. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** adding a message composer to a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts. If you *are* in SolidJS and want fine-grained control, compose the `PromptInput` primitives instead.',
          '**How to use:** register once with `import \'@kitn.ai/chat/elements\'`, configure it with JS **properties** (`placeholder`, `value`, `disabled`, `loading`, `suggestions`, `attachments`) and flag attributes (`search`, `voice` to show the Globe/Mic toolbar buttons), and listen for **CustomEvents** (`kc-submit`, `kc-value-change`, `kc-suggestion-click`, `kc-search`, `kc-voice`) directly on the element. Leave `value` unset to let the element manage its own input state; seed `attachments` to pre-populate staged files.',
          '**Placement:** pinned to the bottom of a chat surface, full width. Set `loading` while a response streams to show the busy state, and `disabled` to block input entirely.',
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
    disabled: false,
    loading: false,
    suggestionMode: 'submit',
    slashCompact: false,
    search: false,
    voice: false,
  },
  render: (args: Record<string, unknown>) => <PromptInputElement args={args} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref`, events via `on:`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <PromptInputElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};

const TOOLBAR_SNIPPET = `<!-- show the Search (Globe) + Voice (Mic) toolbar buttons -->
<kc-prompt-input id="input" search voice></kc-prompt-input>

<script type="module">
  import '@kitn.ai/chat/elements';
  const input = document.getElementById('input');
  input.addEventListener('kc-search', () => console.log('search clicked'));
  input.addEventListener('kc-voice', () => console.log('voice clicked'));
</script>`;

/** With the **microphone** (and search) toolbar buttons enabled via the `voice`
 *  and `search` flags. Clicking them fires `kc-voice` / `kc-search` CustomEvents. */
export const WithVoiceAndSearch: Story = {
  name: 'With Voice & Search',
  render: () => <PromptInputElement search voice />,
  parameters: { docs: { source: { code: TOOLBAR_SNIPPET, language: 'html' } } },
};

const ATTACHMENTS_SNIPPET = `<!-- seed staged attachments without an upload -->
<kc-prompt-input id="input" voice></kc-prompt-input>

<script type="module">
  import '@kitn.ai/chat/elements';
  const input = document.getElementById('input');
  input.attachments = [
    { id: 'a1', type: 'file', filename: 'architecture.png',
      mediaType: 'image/png', url: 'data:image/svg+xml;utf8,...' },
    { id: 'a2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  ];
</script>`;

/** Pre-populated with a couple of **attachments** (an image + a file) via the
 *  `attachments` property, with the mic shown too. The paperclip still adds
 *  more, and each chip can be removed. */
export const WithAttachments: Story = {
  name: 'With Attachments',
  render: () => <PromptInputElement voice attachments={sampleAttachments} />,
  parameters: { docs: { source: { code: ATTACHMENTS_SNIPPET, language: 'html' } } },
};

