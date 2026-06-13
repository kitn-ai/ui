import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

type Item = string | { label: string; value?: string };

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-prompt-suggestions': JSX.HTMLAttributes<HTMLElement> & {
        variant?: string;
        size?: string;
        block?: boolean | string;
        highlight?: string;
      };
    }
  }
}

const suggestions: Item[] = [
  'Explain the architecture',
  'Show me a code example',
  "What's deferred?",
];

/** Render `<kitn-prompt-suggestions>` with `suggestions` set as a property. */
function SuggestionsElement(props: { suggestions: Item[]; variant?: string; size?: string; block?: boolean; highlight?: string }) {
  let el: (HTMLElement & { suggestions?: Item[] }) | undefined;
  onMount(() => {
    if (!el) return;
    el.suggestions = props.suggestions;
    el.addEventListener('select', (e) => {
      const ev = e as CustomEvent<{ value: string }>;
      console.log('select', ev.detail.value);
    });
  });
  return (
    <kitn-prompt-suggestions
      ref={(e) => (el = e as HTMLElement)}
      variant={props.variant}
      size={props.size}
      block={props.block ? true : undefined}
      highlight={props.highlight}
      style={{ display: 'block', padding: '24px', 'max-width': '560px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-prompt-suggestions id="suggs" variant="outline"></kitn-prompt-suggestions>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const suggs = document.getElementById('suggs');
  suggs.suggestions = ['Explain the architecture', 'Show me a code example'];
  suggs.addEventListener('select', (e) => console.log(e.detail.value));
</script>`;

const meta = {
  title: 'Web Components/kitn-prompt-suggestions',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-prompt-suggestions>` is the framework-agnostic **web component** for a row (or list) of clickable suggestion chips — starter prompts or follow-ups — isolated in **Shadow DOM**.',
          '**When to use:** offering the user quick prompts to click instead of type, usually above an input. In SolidJS, use the `PromptSuggestion` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the `suggestions` **property** (strings, or `{ label, value }` when the displayed text differs from the emitted value), choose a `variant` and `size` (`sm` | `md` | `lg`; pills default to `lg`), optionally add the `block` flag for full-width rows or a `highlight` substring to emphasize, and listen for the `select` **CustomEvent**.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Default outline pills, wrapping in a row. */
export const Default: Story = {
  render: () => <SuggestionsElement suggestions={suggestions} variant="outline" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Ghost variant. */
export const Ghost: Story = {
  render: () => <SuggestionsElement suggestions={suggestions} variant="ghost" />,
};

/** Full-width left-aligned rows via the `block` flag. */
export const Block: Story = {
  render: () => <SuggestionsElement suggestions={suggestions} variant="outline" block />,
};

const searchSuggestions: Item[] = [
  'How does SolidJS handle reactivity?',
  'What makes SolidJS fast?',
  'SolidJS vs Svelte comparison',
];

/** Filtered-search list: each row highlights the matched substring via the
 *  `highlight` attribute (which forces the list-row layout). */
export const WithHighlightedSearch: Story = {
  name: 'With Highlighted Search',
  render: () => (
    <SuggestionsElement suggestions={searchSuggestions} highlight="Solid" />
  ),
  parameters: {
    docs: {
      source: {
        code: `<kitn-prompt-suggestions id="suggs" highlight="Solid"></kitn-prompt-suggestions>

<script type="module">
  import '@kitnai/chat/elements';
  const suggs = document.getElementById('suggs');
  suggs.suggestions = [
    'How does SolidJS handle reactivity?',
    'What makes SolidJS fast?',
    'SolidJS vs Svelte comparison',
  ];
</script>`,
        language: 'html',
      },
    },
  },
};

/** Sizes side by side — the default pill (`lg`) vs the smaller `sm` pill. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', padding: '24px' }}>
      <div>
        <div style={{ 'font-size': '12px', opacity: '0.6', margin: '0 0 4px' }}>Default (lg)</div>
        <SuggestionsElement suggestions={suggestions} variant="outline" />
      </div>
      <div>
        <div style={{ 'font-size': '12px', opacity: '0.6', margin: '0 0 4px' }}>Small (sm)</div>
        <SuggestionsElement suggestions={suggestions} variant="outline" size="sm" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      source: {
        code: `<!-- default pill -->
<kitn-prompt-suggestions variant="outline"></kitn-prompt-suggestions>
<!-- smaller pill -->
<kitn-prompt-suggestions variant="outline" size="sm"></kitn-prompt-suggestions>`,
        language: 'html',
      },
    },
  },
};
