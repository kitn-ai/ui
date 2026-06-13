import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-source': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

/** Render the actual `<kitn-source>` custom element configured by attributes. */
function SourceElement(props: {
  href: string;
  label?: string;
  headline?: string;
  description?: string;
  showFavicon?: boolean;
}) {
  let el: HTMLElement | undefined;
  onMount(() => {
    if (!el) return;
    el.setAttribute('href', props.href);
    if (props.label) el.setAttribute('label', props.label);
    if (props.headline) el.setAttribute('headline', props.headline);
    if (props.description) el.setAttribute('description', props.description);
    if (props.showFavicon) el.setAttribute('show-favicon', '');
  });
  return <kitn-source ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '16px' }} />;
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-source
  href="https://kitn.dev"
  label="kitn"
  headline="kitn — the kit"
  description="Composable SolidJS + web-component chat UI."
  show-favicon
></kitn-source>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements
</script>`;

const meta = {
  title: 'Web Components/kitn-source',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      // Render in its own iframe in the docs page so the docs wrapper's
      // transform+overflow doesn't trap/clip this element's shadow-DOM overlay.
      story: { inline: false, height: '360px' },
      description: {
        component: [
          '`<kitn-source>` is the framework-agnostic **web component** for a single citation link with a hover-card preview, isolated in **Shadow DOM**.',
          '**When to use:** inlining a single source citation in a non-Solid app. For multiple sources, use `<kitn-source-list>`; in SolidJS, compose the `Source` primitives.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, then set `href` (the link, also the default label/favicon source), `label`, `headline` (the hover headline — note `headline`, not `title`), `description`, and the `show-favicon` flag via attributes.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A citation with a custom label, hover headline/description, and favicon. */
export const Default: Story = {
  render: () => (
    <SourceElement
      href="https://kitn.dev"
      label="kitn"
      headline="kitn — the kit"
      description="Composable SolidJS + web-component chat UI."
      showFavicon
    />
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** With no `label`, the trigger falls back to the domain. */
export const DomainLabel: Story = {
  name: 'Domain Label',
  render: () => <SourceElement href="https://solidjs.com" description="A reactive UI library." />,
};
