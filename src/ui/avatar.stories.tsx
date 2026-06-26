import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Avatar } from './avatar';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A small, rounded **avatar** that renders an image when `src` is provided and falls back to short initials otherwise.',
        '**When to use:** to identify the author of a message, a conversation participant, or the current user in a header or list.',
        '**How to use:** always pass a `fallback` (1–2 initials) and a `size`. Provide `src`/`alt` when you have an image; if the image is missing or fails, the `fallback` text shows instead.',
        '**Placement:** message rows (next to assistant/user content), conversation list items, account menus, and headers.',
      ]),
    },
  },
  argTypes: {
    src: {
      control: 'text',
      description: 'Image URL. When omitted, the `fallback` initials are shown.',
    },
    alt: {
      control: 'text',
      description: 'Alt text for the image. Defaults to `fallback` when not set.',
    },
    fallback: {
      control: 'text',
      description: 'Initials shown when there is no image (required).',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Avatar diameter preset.',
      table: { defaultValue: { summary: 'md' } },
    },
  },
  args: {
    fallback: 'JD',
    size: 'md',
  },
  render: (args) => <Avatar {...args} />,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Avatar } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — tweak the controls to explore image vs. fallback and sizes. */
export const Playground: Story = {
  ...src(`<Avatar fallback="JD" size="md" />`),
};

export const WithFallback: Story = {
  args: { fallback: 'JD', size: 'md' },
  ...src(`<Avatar fallback="JD" size="md" />`),
};

export const WithImage: Story = {
  args: {
    src: 'https://api.dicebear.com/7.x/initials/svg?seed=JD',
    alt: 'John Doe',
    fallback: 'JD',
  },
  ...src(`<Avatar
  src="https://api.dicebear.com/7.x/initials/svg?seed=JD"
  alt="John Doe"
  fallback="JD"
/>`),
};

export const Small: Story = {
  args: { size: 'sm', fallback: 'S' },
  ...src(`<Avatar size="sm" fallback="S" />`),
};

export const Large: Story = {
  args: { size: 'lg', fallback: 'LG' },
  ...src(`<Avatar size="lg" fallback="LG" />`),
};

/** Every size side by side (showcase — not driven by controls). */
export const AllSizes: Story = {
  render: () => (
    <div class="flex items-center gap-3">
      <Avatar size="sm" fallback="SM" />
      <Avatar size="md" fallback="MD" />
      <Avatar size="lg" fallback="LG" />
    </div>
  ),
  ...src(`<div class="flex items-center gap-3">
  <Avatar size="sm" fallback="SM" />
  <Avatar size="md" fallback="MD" />
  <Avatar size="lg" fallback="LG" />
</div>`),
};
