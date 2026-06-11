import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kitn-chat>, <kitn-conversation-list>, <kitn-prompt-input>

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-prompt-input': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleSuggestions: string[] = [
  'Summarize this thread',
  'Draft a reply',
  'Explain like I am five',
];

/** Live demo of the actual `<kitn-prompt-input>` custom element (Shadow DOM and all). */
function PromptInputElement() {
  let el:
    | (HTMLElement & {
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        loading?: boolean;
        suggestions?: string[];
      })
    | undefined;
  onMount(() => {
    if (el) {
      el.placeholder = 'Ask anything...';
      el.suggestions = sampleSuggestions;
    }
  });
  return (
    <kitn-prompt-input
      ref={(e) => (el = e as HTMLElement)}
      style={{ display: 'block', width: '100%', padding: '16px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-prompt-input id="input" style="display:block; width:100%;"></kitn-prompt-input>

<script type="module">
  import '@kitn-ai/chat/elements';   // registers the custom elements

  const input = document.getElementById('input');
  input.placeholder = 'Ask anything...';
  input.suggestions = ['Summarize this thread', 'Draft a reply'];
  // input.loading = true;   // shows the busy state while a response streams
  // input.disabled = true;  // blocks typing and submit

  // events are CustomEvents on the element (they do not bubble)
  input.addEventListener('submit', (e) => console.log('send:', e.detail.value));
  input.addEventListener('valuechange', (e) => console.log('typing:', e.detail.value));
  input.addEventListener('suggestionclick', (e) => console.log('picked:', e.detail.value));
</script>`;

const SOLID_SNIPPET = `import '@kitn-ai/chat/elements'; // registers the custom elements
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
    <kitn-prompt-input
      ref={el}
      style={{ display: 'block', width: '100%' }}
      on:submit={(e) => console.log('send:', e.detail.value)}
      on:valuechange={(e) => console.log('typing:', e.detail.value)}
      on:suggestionclick={(e) => console.log('picked:', e.detail.value)}
    />
  );
}`;

const meta = {
  title: 'Web Components/kitn-prompt-input',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-prompt-input>` is the framework-agnostic **web component** version of the chat composer — an auto-resizing textarea with a send button and optional suggestion chips, isolated in **Shadow DOM** so the host page\'s CSS can\'t leak in and the kit\'s styles can\'t leak out. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** adding a message composer to a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts. If you *are* in SolidJS and want fine-grained control, compose the `PromptInput` primitives instead.',
          '**How to use:** register once with `import \'@kitn-ai/chat/elements\'`, configure it with JS **properties** (`placeholder`, `value`, `disabled`, `loading`, `suggestions`), and listen for **CustomEvents** (`submit`, `valuechange`, `suggestionclick`) directly on the element. Leave `value` unset to let the element manage its own input state.',
          '**Placement:** pinned to the bottom of a chat surface, full width. Set `loading` while a response streams to show the busy state, and `disabled` to block input entirely.',
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
  render: () => <PromptInputElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref`, events via `on:`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <PromptInputElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};
