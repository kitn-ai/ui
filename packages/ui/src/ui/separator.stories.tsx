import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Separator } from './separator';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A `role="separator"` divider line. Set `orientation`: `horizontal` (full-width) or `vertical` (full-height; the parent needs a height).',
      ]),
    },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Direction of the divider line.',
      table: { defaultValue: { summary: 'horizontal' } },
    },
  },
  args: {
    orientation: 'horizontal',
  },
  render: (args) => (
    <div class="w-64 p-4">
      <p class="text-sm text-foreground mb-3">Above</p>
      <Separator {...args} />
      <p class="text-sm text-foreground mt-3">Below</p>
    </div>
  ),
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Separator } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: flip the orientation. */
export const Playground: Story = {
  ...src(`<Separator orientation="horizontal" />`),
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  ...src(`<div class="w-64 p-4">
  <p class="text-sm mb-3">Above</p>
  <Separator />
  <p class="text-sm mt-3">Below</p>
</div>`),
};

/** Vertical divider, needs a parent with a fixed height (showcase). */
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
  ...src(`<div class="flex items-center gap-3 p-4">
  <span class="text-sm">Left</span>
  <div class="h-6">
    <Separator orientation="vertical" />
  </div>
  <span class="text-sm">Right</span>
</div>`),
};
