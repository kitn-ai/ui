import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Separator } from './separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: {
        component: [
          'A thin **divider** line (a `role="separator"` element) that visually splits content either horizontally or vertically.',
          '**When to use:** to separate stacked sections, group items in a menu/list, or divide inline controls in a toolbar.',
          '**How to use:** set `orientation` to `horizontal` (full-width line) or `vertical` (full-height line). For a vertical separator, give the parent a height so the line has something to fill.',
          '**Placement:** between message groups, in dropdown/menu sections, header toolbars, and between sidebar regions.',
        ].join('\n\n'),
      },
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

const IMPORT = `import { Separator } from '@kitn-ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — flip the orientation. */
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

/** Vertical divider — needs a parent with a fixed height (showcase). */
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
