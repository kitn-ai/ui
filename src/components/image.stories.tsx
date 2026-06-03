import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Image } from './image';

const meta: Meta = {
  title: 'Components/Image',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

// Compact SVG chat typing icon as base64
const chatIconBase64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMCIgZmlsbD0iIzdjM2FlZCIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjQiIHI9IjQiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSI0IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iNCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';

export const Basic: Story = {
  render: () => (
    <div class="flex flex-col items-center gap-4 p-4">
      <Image
        base64={chatIconBase64}
        mediaType="image/svg+xml"
        alt="Compact gradient chat icon"
        class="h-24 w-24 rounded-md"
      />
      <span class="text-muted-foreground text-xs">
        Compact SVG chat icon
      </span>
    </div>
  ),
};

export const CustomSize: Story = {
  render: () => (
    <div class="flex flex-col items-center gap-4 p-4">
      <Image
        base64={chatIconBase64}
        mediaType="image/svg+xml"
        alt="Large preview"
        class="h-64 w-64 rounded-lg"
      />
      <span class="text-muted-foreground text-xs">
        Large preview
      </span>
    </div>
  ),
};
