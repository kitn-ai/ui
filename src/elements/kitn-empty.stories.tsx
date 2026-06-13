import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-empty': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-empty
  empty-title="No conversations yet"
  description="Start a new chat to see it appear here."
>
  <!-- Route 2 slots: your own icon and actions -->
  <svg slot="media" width="28" height="28" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
  <button>New chat</button>
</kitn-empty>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements
</script>`;

const meta = {
  title: 'Web Components/kitn-empty',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-empty>` is the framework-agnostic **web component** for an empty-state block — an icon, a title, a description, and actions — isolated in **Shadow DOM**.',
          '**When to use:** placeholder UI for an empty list/thread in a non-Solid app. In SolidJS, compose the `Empty*` primitives.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set `empty-title` (note `empty-title`, not `title`) and `description` via attributes, and use the **slots** (\"Route 2\") to project your own icon (`slot=\"media\"`) and actions (the default slot).",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Render the actual `<kitn-empty>` custom element with slotted children. */
function EmptyElement() {
  let el: HTMLElement | undefined;
  onMount(() => {
    if (!el) return;
    el.setAttribute('empty-title', 'No conversations yet');
    el.setAttribute('description', 'Start a new chat to see it appear here.');
  });
  return (
    <kitn-empty ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '24px' }}>
      <svg slot="media" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <button>New chat</button>
    </kitn-empty>
  );
}

/** An empty state with a slotted icon and an action button. */
export const Default: Story = {
  render: () => <EmptyElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
