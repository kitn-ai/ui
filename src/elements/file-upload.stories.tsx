import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-file-upload': JSX.HTMLAttributes<HTMLElement> & {
        multiple?: boolean | string;
        accept?: string;
        disabled?: boolean | string;
        label?: string;
        'on:filesadded'?: (e: CustomEvent<{ files: File[] }>) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-file-upload accept="image/*" label="Drop images here"></kc-file-upload>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  document.querySelector('kc-file-upload')
    .addEventListener('filesadded', (e) =>
      console.log(e.detail.files.map((f) => f.name)));
</script>`;

const meta = {
  title: 'Web Components/kc-file-upload',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-file-upload'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-file-upload', [
          '`<kc-file-upload>` is the framework-agnostic **web component** for a click / drag-and-drop file dropzone — isolated in **Shadow DOM**.',
          '**When to use:** accepting file or image uploads in a non-Solid app. In SolidJS, compose the `FileUpload` primitives.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set the `accept` / `multiple` / `label` attributes, and listen for the `filesadded` **CustomEvent** (`e.detail.files` is a `File[]`). The default dropzone label can be replaced with your own markup via the default `<slot>`.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A dropzone accepting any files. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kc-file-upload
        on:filesadded={(e: CustomEvent<{ files: File[] }>) =>
          console.log(e.detail.files.map((f) => f.name))}
      />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Restricted to images, single file, with a custom label. */
export const ImagesOnly: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kc-file-upload accept="image/*" multiple={false} label="Click or drop an image" />
    </div>
  ),
};

/** A disabled dropzone (non-interactive). */
export const Disabled: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kc-file-upload disabled label="Uploads are disabled" />
    </div>
  ),
};
