import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-sources': JSX.HTMLAttributes<HTMLElement>;
      'kai-source': JSX.HTMLAttributes<HTMLElement> & { href?: string; label?: string; headline?: string; description?: string; 'show-favicon'?: boolean | '' };
    }
  }
}

interface SourceItem {
  href: string;
  title?: string;
  description?: string;
  label?: string;
  showFavicon?: boolean;
}

const sampleSources: SourceItem[] = [
  { href: 'https://kitn.dev', title: 'kitn — the kit', description: 'Composable SolidJS + web-component chat UI.', showFavicon: true },
  { href: 'https://solidjs.com', title: 'SolidJS', description: 'A reactive UI library.', showFavicon: true },
];

/** Render the actual `<kai-sources>` custom element with a `sources` property. */
function SourceListElement() {
  let el: (HTMLElement & { sources?: SourceItem[] }) | undefined;
  onMount(() => {
    if (el) el.sources = sampleSources;
  });
  return (
    <kai-sources ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-sources id="srcs" show-favicon></kai-sources>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const srcs = document.getElementById('srcs');
  srcs.sources = [
    { href: 'https://kitn.dev', title: 'kitn — the kit', description: 'Composable chat UI.' },
    { href: 'https://solidjs.com', title: 'SolidJS', description: 'A reactive UI library.' },
  ];
</script>`;

const meta = {
  title: 'Components/Sources',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-sources'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-sources', [
          '`<kai-sources>` is the framework-agnostic **web component** for a wrapped row of citation links (each with its own hover-card preview), isolated in **Shadow DOM**.',
          '**When to use:** showing the sources behind an assistant answer in a non-Solid app. For a single citation, use `<kai-source>`; in SolidJS, compose `SourceList` + `Source`.',
          '**Placement:** below an assistant message, above the prompt input — rendered as a wrapping row of citation chips that spans the full message column width.',
          "**How to use:** register once with `import '@kitn.ai/ui/elements'`, set the data via the `sources` **property** (each item: `href`, `title`, `description`, `label`, `showFavicon`), and set `show-favicon` to enable favicons for all items (a per-item `showFavicon` overrides it).",
          '**Anatomy:** a wrapping flex row of **citation chips** — each chip is a `<kai-source>` (or a `sources`-property item): a **trigger button** (domain label or `numbered` index, optional favicon) + a **hover-card** (headline + description, shown on hover/focus). Declarative `<kai-source href="…" headline="…">` children are invisible data carriers merged after the `sources` property list.',
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Two citations rendered as a wrapped list with favicons. */
export const Default: Story = {
  render: () => <SourceListElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS wiring needed -->
<kai-sources show-favicon>
  <kai-source
    href="https://kitn.dev"
    label="kitn"
    headline="kitn — the kit"
    description="Composable SolidJS + web-component chat UI."
    show-favicon
  ></kai-source>
  <kai-source
    href="https://solidjs.com"
    headline="SolidJS"
    description="A reactive UI library."
    show-favicon
  ></kai-source>
</kai-sources>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements
</script>`;

/** Declarative sources — `<kai-source>` light-DOM children instead of a `sources`
 *  property. Each child carries `href`, `label`, `headline`, `description`, and the
 *  `show-favicon` flag as HTML attributes. Great for plain HTML with no JS wiring. */
export const DeclarativeSources: Story = {
  name: 'Declarative Sources (kai-source)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.setAttribute('show-favicon', '');
    });
    return (
      <kai-sources
        ref={(e) => (el = e as HTMLElement)}
        style={{ display: 'block', padding: '16px', 'max-width': '720px' }}
      >
        <kai-source
          href="https://kitn.dev"
          label="kitn"
          headline="kitn — the kit"
          description="Composable SolidJS + web-component chat UI."
          show-favicon
        ></kai-source>
        <kai-source
          href="https://solidjs.com"
          headline="SolidJS"
          description="A reactive UI library."
          show-favicon
        ></kai-source>
      </kai-sources>
    );
  },
  parameters: {
    docs: {
      source: {
        code: DECLARATIVE_HTML_SNIPPET,
        language: 'html',
      },
    },
  },
};
