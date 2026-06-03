import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Separator } from './separator';

const meta: Meta = {
  title: 'UI/Separator',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Horizontal: Story = {
  render: () => (
    <div class="w-64 p-4">
      <p class="text-sm text-foreground mb-3">Above</p>
      <Separator />
      <p class="text-sm text-foreground mt-3">Below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div class="flex items-center gap-3 p-4">
      <span class="text-sm text-foreground">Left</span>
      <div class="h-6">
        <Separator orientation="vertical" />
      </div>
      <span class="text-sm text-foreground">Right</span>
    </div>
  ),
};
