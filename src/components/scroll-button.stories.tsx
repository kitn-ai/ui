import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Button } from '../ui/button';

const meta: Meta = {
  title: 'Components/ScrollButton',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Visible: Story = {
  render: () => (
    <Button variant="outline" size="sm" class="h-10 w-10 rounded-full">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </Button>
  ),
};

export const InContext: Story = {
  render: () => (
    <div class="relative h-48 w-64 bg-muted/30 rounded-lg overflow-hidden">
      <div class="absolute inset-x-0 bottom-4 flex justify-center">
        <Button variant="outline" size="sm" class="h-10 w-10 rounded-full shadow-md bg-background">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      </div>
    </div>
  ),
};
