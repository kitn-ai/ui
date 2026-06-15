import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-empty': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-empty
  empty-title="No conversations yet"
  description="Start a new chat to see it appear here."
>
  <!-- Route 2 slots: your own icon and actions -->
  <svg slot="media" width="28" height="28" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>

  <!-- Slotted actions are light DOM, so style them with your own page CSS
       (a ghost button with a + icon, here styled inline for portability). -->
  <button
    style="display:inline-flex; align-items:center; gap:.45rem;
           font:500 13.5px/1 system-ui,sans-serif; padding:.5rem .85rem;
           border-radius:9px; border:1px solid var(--color-border, #e5e5e5);
           background:transparent; color:inherit; cursor:pointer;"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
    New chat
  </button>
</kc-empty>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements
</script>`;

const meta = {
  title: 'Components/Empty',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-empty'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-empty', [
          '`<kc-empty>` is the framework-agnostic **web component** for an empty-state block — an icon, a title, a description, and actions — isolated in **Shadow DOM**.',
          '**When to use:** placeholder UI for an empty list/thread in a non-Solid app. In SolidJS, compose the `Empty*` primitives.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set `empty-title` (note `empty-title`, not `title`) and `description` via attributes, and use the **slots** (\"Route 2\") to project your own icon (`slot=\"media\"`) and actions (the default slot).",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Render the actual `<kc-empty>` custom element with slotted children. */
function EmptyElement() {
  let el: HTMLElement | undefined;
  onMount(() => {
    if (!el) return;
    el.setAttribute('empty-title', 'No conversations yet');
    el.setAttribute('description', 'Start a new chat to see it appear here.');
  });
  return (
    <kc-empty ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '24px' }}>
      <svg slot="media" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {/* Slotted actions are light DOM — style them with the host page's own
          CSS. Here a ghost "+ New chat" button, styled inline so it renders
          correctly in any context (mirrors the composable example's pill-btn). */}
      <button
        style={{
          display: 'inline-flex',
          'align-items': 'center',
          gap: '0.45rem',
          font: '500 13.5px/1 system-ui, sans-serif',
          padding: '0.5rem 0.85rem',
          'border-radius': '9px',
          border: '1px solid var(--color-border, #e5e5e5)',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14" /><path d="M12 5v14" />
        </svg>
        New chat
      </button>
    </kc-empty>
  );
}

/** An empty state with a slotted icon and an action button. */
export const Default: Story = {
  render: () => <EmptyElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
