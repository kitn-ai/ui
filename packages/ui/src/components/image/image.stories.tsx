import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Image } from './image';
import { componentDescription } from '../../stories/docs/web-component-controls';

const PHOTO_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop';
const ICON_URI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' rx='10' fill='%237c3aed'/><circle cx='16' cy='24' r='4' fill='%23fff'/><circle cx='24' cy='24' r='4' fill='%23fff'/><circle cx='32' cy='24' r='4' fill='%23fff'/></svg>";

const meta = {
  title: 'Components/Image',
  component: Image,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'Displays an image the app already has an address for. Model-produced bytes belong on Image artifact.',
        'Displays an image at a URL: https, a `data:` URI, or an object URL.',
      ]),
    },
  },
  argTypes: {
    src: {
      control: 'text',
      description: 'The image address: `https`, `data:`, or an object URL the caller made.',
    },
    alt: {
      control: 'text',
      description: 'Alternative text. Required: an unnamed image is invisible to a screen reader.',
    },
    loading: {
      control: 'select',
      options: ['eager', 'lazy', 'auto'],
      description: 'Native loading hint. Any other `<img>` attribute passes through too.',
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes, merged with the kit chrome.',
    },
  },
  args: {
    src: PHOTO_URL,
    alt: 'A mountain lake at sunrise',
    class: 'h-48 w-auto',
  },
  render: (args) => <Image {...args} />,
} satisfies Meta<typeof Image>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Image } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: swap the url, the alt, and the sizing classes. */
export const Playground: Story = {
  ...src(`<Image
  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop"
  alt="A mountain lake at sunrise"
  class="h-48 w-auto"
/>`),
};

/** A `data:` URI is a resource like any other address, and needs no `mediaType`. */
export const DataUri: Story = {
  args: { src: ICON_URI, alt: 'A gradient chat icon', class: 'h-12 w-12' },
  ...src(`// A data: URI is a resource like any other address: no mediaType prop exists here.
<Image
  src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'></svg>"
  alt="A gradient chat icon"
  class="h-12 w-12"
/>`),
};

/** `loading="lazy"` is not a prop of its own: every remaining `<img>` attribute passes through. */
export const LazyLoading: Story = {
  args: { loading: 'lazy', class: 'h-48 w-auto' },
  ...src(`<Image
  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop"
  alt="A mountain lake at sunrise"
  loading="lazy"
/>`),
};

export const CustomSize: Story = {
  args: { alt: 'A large preview', class: 'h-64 w-auto rounded-lg' },
  ...src(`<Image
  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop"
  alt="A large preview"
  class="h-64 w-auto rounded-lg"
/>`),
};
