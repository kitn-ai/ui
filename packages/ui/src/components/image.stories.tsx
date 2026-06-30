import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Image } from './image';
import { componentDescription } from '../stories/docs/element-controls';

// Compact SVG chat typing icon as base64
const chatIconBase64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMCIgZmlsbD0iIzdjM2FlZCIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjQiIHI9IjQiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSI0IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iNCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';

const meta = {
  title: 'Components/Elements/Image',
  component: Image,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'Renders a model-generated or attached image from raw bytes rather than a URL: pass `base64` or `uint8Array` plus `mediaType`, and it builds the data/object URL for you.',
        'Shows a pulsing placeholder until a source is available. Always set `alt`.',
      ]),
    },
  },
  argTypes: {
    base64: {
      control: 'text',
      description: 'Base64-encoded image data. Combined with `mediaType` to form a data URL.',
    },
    uint8Array: {
      control: 'object',
      description: 'Raw image bytes. Combined with `mediaType` to form an object URL.',
    },
    mediaType: {
      control: 'text',
      description: 'MIME type of the image data, e.g. `image/png` or `image/svg+xml`.',
      table: { defaultValue: { summary: 'image/png' } },
    },
    alt: {
      control: 'text',
      description: 'Alternative text describing the image (also used on the placeholder).',
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the image / placeholder element.',
    },
  },
  args: {
    base64: chatIconBase64,
    mediaType: 'image/svg+xml',
    alt: 'Compact gradient chat icon',
    class: 'h-24 w-24 rounded-md',
  },
  render: (args) => <Image {...args} />,
} satisfies Meta<typeof Image>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Image } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: swap the base64 data, media type, and sizing classes. */
export const Playground: Story = {
  ...src(`<Image
  base64={chatIconBase64}
  mediaType="image/svg+xml"
  alt="Compact gradient chat icon"
  class="h-24 w-24 rounded-md"
/>`),
};

export const Basic: Story = {
  args: { class: 'h-24 w-24 rounded-md' },
  ...src(`<Image base64={chatIconBase64} mediaType="image/svg+xml" alt="Compact gradient chat icon" class="h-24 w-24 rounded-md" />`),
};

export const CustomSize: Story = {
  args: { alt: 'Large preview', class: 'h-64 w-64 rounded-lg' },
  ...src(`<Image base64={chatIconBase64} mediaType="image/svg+xml" alt="Large preview" class="h-64 w-64 rounded-lg" />`),
};

/** Placeholder state shown while no `base64`/`uint8Array` source is available (showcase). */
export const Placeholder: Story = {
  render: () => <Image alt="Loading image" class="h-24 w-24 rounded-md" />,
  ...src(`<Image alt="Loading image" class="h-24 w-24 rounded-md" />`),
};
