import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ImageArtifact } from './image-artifact';
import { componentDescription } from '../../stories/docs/web-component-controls';

// A 48x48 gradient chat icon, base64 of an SVG.
const ICON_BASE64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMCIgZmlsbD0iIzdjM2FlZCIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjQiIHI9IjQiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSI0IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iNCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';
// A 1x1 PNG, the bytes path's sample payload.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const meta = {
  title: 'Components/Image Artifact',
  component: ImageArtifact,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'Displays an image the model produced, as base64 or raw bytes. Image is for an address the app already has.',
      ]),
    },
  },
  argTypes: {
    data: {
      control: 'text',
      description: 'The payload: BARE base64 (no `data:` prefix). Raw bytes are a value for `render`, not an args control.',
    },
    mediaType: {
      control: 'text',
      description: 'MIME type of `data`, e.g. `image/png` or `image/svg+xml`. Required.',
    },
    alt: {
      control: 'text',
      description: "Alternative text, also the placeholder's accessible name.",
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes, merged with the kit chrome.',
    },
  },
  args: {
    data: ICON_BASE64,
    mediaType: 'image/svg+xml',
    alt: 'A gradient chat icon',
    class: 'h-24 w-24',
  },
  render: (args) => <ImageArtifact {...args} />,
} satisfies Meta<typeof ImageArtifact>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ImageArtifact } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: swap the base64, the media type, and the sizing class. */
export const Playground: Story = {
  ...src(`// base64: your own payload, trimmed to a prefix here.
<ImageArtifact
  data="PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIg…"
  mediaType="image/svg+xml"
  alt="A gradient chat icon"
  class="h-24 w-24"
/>`),
};

/**
 * Raw bytes (`{ uint8Array }` from an AI SDK, say) become a Blob and an object URL,
 * which the component revokes on cleanup. Bytes cannot cross the args boundary, so
 * this story builds them in `render`.
 */
export const RawBytes: Story = {
  render: () => {
    const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), (char) => char.charCodeAt(0));
    return <ImageArtifact data={bytes} mediaType="image/png" alt="A 1x1 PNG payload" class="h-24 w-24" />;
  },
  ...src(`const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (char) => char.charCodeAt(0));

<ImageArtifact data={bytes} mediaType="image/png" alt="A 1x1 PNG payload" class="h-24 w-24" />`),
};

/** No `data` yet: the placeholder (named by `alt`) stands in until the model produces a payload. */
export const Placeholder: Story = {
  render: () => <ImageArtifact mediaType="image/png" alt="Image pending" class="h-24 w-24" />,
  ...src(`<ImageArtifact mediaType="image/png" alt="Image pending" class="h-24 w-24" />`),
};
