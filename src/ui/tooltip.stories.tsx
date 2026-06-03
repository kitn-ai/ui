import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Tooltip } from './tooltip';
import { Button } from './button';

const meta: Meta = {
  title: 'UI/Tooltip',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Tooltip content="This is a tooltip">
      <Button variant="outline">Hover me</Button>
    </Tooltip>
  ),
};

export const OnIconButton: Story = {
  render: () => (
    <Tooltip content="Add new item">
      <Button variant="ghost" size="icon-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Button>
    </Tooltip>
  ),
};
