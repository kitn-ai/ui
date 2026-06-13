import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-image': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

// A small inline SVG, base64-encoded — the same trick the composable example uses.
const sampleSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="16" fill="#7c3aed"/><text x="48" y="62" font-size="44" text-anchor="middle" fill="white">★</text></svg>';
const sampleBase64 = btoa(unescape(encodeURIComponent(sampleSvg)));

/** Render the actual `<kitn-image>` custom element with base64 + media-type. */
function ImageElement() {
  let el: (HTMLElement & { base64?: string; alt?: string }) | undefined;
  onMount(() => {
    if (el) {
      el.base64 = sampleBase64;
      el.alt = 'A purple star';
      el.setAttribute('media-type', 'image/svg+xml');
    }
  });
  return <kitn-image ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '16px' }} />;
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-image id="img" media-type="image/png" alt="A chart"></kitn-image>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const img = document.getElementById('img');
  img.base64 = '<...base64 image data...>';
  // or set raw bytes as a property:
  // img.bytes = new Uint8Array([...]);
</script>`;

const meta = {
  title: 'Web Components/kitn-image',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-image'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kitn-image', [
          '`<kitn-image>` is the framework-agnostic **web component** that renders a base64 or byte-array image, showing a skeleton fallback while it resolves, isolated in **Shadow DOM**.',
          '**When to use:** displaying model-generated or in-memory images (without a hosted URL) in a non-Solid app. In SolidJS, use the `Image` primitive directly.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set `base64` (paired with the `media-type` attribute) or set raw `bytes` as a **property**, and add `alt` text.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A base64-encoded SVG with a media type and alt text. */
export const Default: Story = {
  render: () => <ImageElement />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
