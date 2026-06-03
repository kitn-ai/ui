import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Avatar } from './avatar';

const meta: Meta = {
  title: 'UI/Avatar',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const WithFallback: Story = {
  render: () => <Avatar fallback="JD" size="md" />,
};

export const WithImage: Story = {
  render: () => (
    <Avatar
      src="https://api.dicebear.com/7.x/initials/svg?seed=JD"
      alt="John Doe"
      fallback="JD"
    />
  ),
};

export const Small: Story = {
  render: () => <Avatar size="sm" fallback="S" />,
};

export const Large: Story = {
  render: () => <Avatar size="lg" fallback="LG" />,
};

export const AllSizes: Story = {
  render: () => (
    <div class="flex items-center gap-3">
      <Avatar size="sm" fallback="SM" />
      <Avatar size="md" fallback="MD" />
      <Avatar size="lg" fallback="LG" />
    </div>
  ),
};
