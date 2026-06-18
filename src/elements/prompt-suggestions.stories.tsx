import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

type Item = string | { label: string; value?: string };

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-suggestions': JSX.HTMLAttributes<HTMLElement> & {
        variant?: string;
        size?: string;
        block?: boolean | string;
        highlight?: string;
      };
      /** Light-DOM data carrier for declarative suggestion chips inside `<kai-suggestions>`. */
      'kai-suggestion': JSX.HTMLAttributes<HTMLElement> & {
        value?: string;
      };
    }
  }
}

const suggestions: Item[] = [
  'Explain the architecture',
  'Show me a code example',
  "What's deferred?",
];

/** Render `<kai-suggestions>` with `suggestions` set as a property. */
function SuggestionsElement(props: { suggestions: Item[]; variant?: string; size?: string; block?: boolean; highlight?: string }) {
  let el: (HTMLElement & { suggestions?: Item[] }) | undefined;
  onMount(() => {
    if (!el) return;
    el.suggestions = props.suggestions;
    el.addEventListener('kai-select', (e) => {
      const ev = e as CustomEvent<{ value: string }>;
      console.log('kai-select', ev.detail.value);
    });
  });
  return (
    <kai-suggestions
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
<kai-suggestions id="suggs" variant="outline"></kai-suggestions>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const suggs = document.getElementById('suggs');
  suggs.suggestions = ['Explain the architecture', 'Show me a code example'];
  suggs.addEventListener('kai-select', (e) => console.log(e.detail.value));
</script>`;

const meta = {
  title: 'Components/Suggestions',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-suggestions'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-suggestions', [
          '`<kai-suggestions>` is the framework-agnostic **web component** for a row (or list) of clickable suggestion chips — starter prompts or follow-ups — isolated in **Shadow DOM**.',
          '**When to use:** offering the user quick prompts to click instead of type, usually above an input. In SolidJS, use the `PromptSuggestion` primitive.',
          '**Placement:** above the prompt input in the empty/welcome state, or below the last assistant message as follow-up chips; it is a `block` element and takes the full width of its container.',
          "**How to use:** register once with `import '@kitn.ai/ui/elements'`, set the `suggestions` **property** (strings, or `{ label, value }` when the displayed text differs from the emitted value), choose a `variant` and `size` (`sm` | `md` | `lg`; pills default to `lg`), optionally add the `block` flag for full-width rows or a `highlight` substring to emphasize, and listen for the `kai-select` **CustomEvent**.",
          'See the **Code** tab for HTML usage.',
        ]),
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
        code: `<kai-suggestions id="suggs" highlight="Solid"></kai-suggestions>

<script type="module">
  import '@kitn.ai/ui/elements';
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
<kai-suggestions variant="outline"></kai-suggestions>
<!-- smaller pill -->
<kai-suggestions variant="outline" size="sm"></kai-suggestions>`,
        language: 'html',
      },
    },
  },
};

const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS property assignment needed -->
<kai-suggestions id="suggs" variant="outline">
  <kai-suggestion value="explain">Explain the architecture</kai-suggestion>
  <kai-suggestion value="example">Show me a code example</kai-suggestion>
  <kai-suggestion value="deferred">What's deferred?</kai-suggestion>
</kai-suggestions>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  document.getElementById('suggs').addEventListener('kai-select', (e) => {
    console.log('kai-select', e.detail.value);
  });
</script>`;

/**
 * Declare each suggestion as a `<kai-suggestion>` child element — no `suggestions`
 * property or JS array wiring needed. The `value` attribute sets the emitted
 * value; `textContent` is the displayed label. Children are light-DOM data
 * carriers hidden by the Shadow DOM — pure data, no visible output of their own.
 * Mix with the `suggestions` prop: prop items render first, declarative children after.
 */
export const DeclarativeSuggestions: Story = {
  name: 'Declarative Suggestions (kai-suggestion)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.addEventListener('kai-select', (e) =>
        console.log('kai-select', (e as CustomEvent<{ value: string }>).detail.value),
      );
    });
    return (
      <kai-suggestions
        ref={(e) => (el = e as HTMLElement)}
        variant="outline"
        style={{ display: 'block', padding: '24px', 'max-width': '560px' }}
      >
        <kai-suggestion value="explain">Explain the architecture</kai-suggestion>
        <kai-suggestion value="example">Show me a code example</kai-suggestion>
        <kai-suggestion value="deferred">What's deferred?</kai-suggestion>
      </kai-suggestions>
    );
  },
  parameters: {
    docs: {
      source: { code: DECLARATIVE_HTML_SNIPPET, language: 'html' },
    },
  },
};
