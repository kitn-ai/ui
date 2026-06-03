import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Button } from './button';

const meta: Meta = {
  title: 'UI/Button',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <Button variant="default" size="md">Click me</Button>,
};

export const Ghost: Story = {
  render: () => <Button variant="ghost">Ghost</Button>,
};

export const Outline: Story = {
  render: () => <Button variant="outline">Outline</Button>,
};

export const Small: Story = {
  render: () => <Button size="sm">Small</Button>,
};

export const Large: Story = {
  render: () => <Button size="lg">Large</Button>,
};

export const Icon: Story = {
  render: () => (
    <Button size="icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </Button>
  ),
};

export const IconSmall: Story = {
  render: () => (
    <Button size="icon-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </Button>
  ),
};

export const Disabled: Story = {
  render: () => <Button disabled>Disabled</Button>,
};

export const AllVariants: Story = {
  render: () => (
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="default">Default</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="default" size="sm">Small</Button>
      <Button variant="default" size="lg">Large</Button>
      <Button variant="default" size="icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Button>
    </div>
  ),
};
