import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Badge } from './badge';

const meta: Meta = {
  title: 'UI/Badge',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <Badge variant="default">Default badge</Badge>,
};

export const Count: Story = {
  render: () => <Badge variant="count">12</Badge>,
};

export const Citation: Story = {
  render: () => <Badge variant="citation">1</Badge>,
};

export const AllVariants: Story = {
  render: () => (
    <div class="flex items-center gap-3">
      <Badge variant="default">Default</Badge>
      <Badge variant="count">5</Badge>
      <Badge variant="citation">1</Badge>
      <Badge variant="citation">2</Badge>
      <Badge variant="citation">3</Badge>
    </div>
  ),
};
