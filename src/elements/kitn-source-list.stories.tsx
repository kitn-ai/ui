import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { ElementSpec } from '../stories/docs/element-spec';
import { argTypesFor } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-source-list': JSX.HTMLAttributes<HTMLElement>;
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

/** Render the actual `<kitn-source-list>` custom element with a `sources` property. */
function SourceListElement() {
  let el: (HTMLElement & { sources?: SourceItem[] }) | undefined;
  onMount(() => {
    if (el) el.sources = sampleSources;
  });
  return (
    <kitn-source-list ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-source-list id="srcs" show-favicon></kitn-source-list>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const srcs = document.getElementById('srcs');
  srcs.sources = [
    { href: 'https://kitn.dev', title: 'kitn — the kit', description: 'Composable chat UI.' },
    { href: 'https://solidjs.com', title: 'SolidJS', description: 'A reactive UI library.' },
  ];
</script>`;

const meta = {
  title: 'Web Components/kitn-source-list',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-source-list'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-source-list>` is the framework-agnostic **web component** for a wrapped row of citation links (each with its own hover-card preview), isolated in **Shadow DOM**.',
          '**When to use:** showing the sources behind an assistant answer in a non-Solid app. For a single citation, use `<kitn-source>`; in SolidJS, compose `SourceList` + `Source`.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the data via the `sources` **property** (each item: `href`, `title`, `description`, `label`, `showFavicon`), and set `show-favicon` to enable favicons for all items (a per-item `showFavicon` overrides it).",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Full generated API reference — properties, events, tokens, and composed-from. */
export const API: Story = {
  render: () => <ElementSpec tag="kitn-source-list" />,
  parameters: { layout: 'padded' },
};

/** Two citations rendered as a wrapped list with favicons. */
export const Default: Story = {
  render: () => <SourceListElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
