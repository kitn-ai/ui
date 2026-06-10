import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { Button } from './button';

/**
 * Convention exemplar — every component story should follow this shape:
 * `component`, a description, `argTypes` (controls), `args` (defaults incl.
 * `fn()` for events), a `Playground` story rendered from args, plus showcase
 * stories for notable variations.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'A clickable button with style **variants** and **sizes**, built on a native `<button>` (all standard button attributes pass through).',
          '**When to use:** any user-triggered action — submitting input, toolbar/icon actions, confirming or dismissing. Use `default` for the primary action, `ghost`/`outline` for secondary or low-emphasis actions.',
          '**How to use:** set `variant` and `size`, pass label or an icon as children, and wire `onClick`. For icon-only buttons use `size="icon"` / `"icon-sm"` and include an `aria-label`.',
          '**Placement:** prompt action bars, message action rows, dialogs, toolbars, and empty-state CTAs.',
        ].join('\n\n'),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'ghost', 'outline'],
      description: 'Visual emphasis of the button.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon', 'icon-sm'],
      description: 'Height/padding preset. `icon` / `icon-sm` are square for icon-only buttons.',
      table: { defaultValue: { summary: 'md' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interaction and dims the button.',
    },
    children: {
      control: 'text',
      description: 'Button content — text or an icon element.',
    },
    onClick: {
      action: 'click',
      description: 'Fired when the button is clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    variant: 'default',
    size: 'md',
    disabled: false,
    children: 'Click me',
    onClick: fn(),
  },
  render: (args) => <Button {...args} />,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive playground — tweak the controls to explore every combination. */
export const Playground: Story = {};

export const Ghost: Story = { args: { variant: 'ghost', children: 'Ghost' } };

export const Outline: Story = { args: { variant: 'outline', children: 'Outline' } };

export const Small: Story = { args: { size: 'sm', children: 'Small' } };

export const Large: Story = { args: { size: 'lg', children: 'Large' } };

export const Disabled: Story = { args: { disabled: true, children: 'Disabled' } };

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const Icon: Story = {
  args: { size: 'icon', children: <PlusIcon />, 'aria-label': 'Add' } as never,
};

/** All variants and sizes side by side (showcase — not driven by controls). */
export const AllVariants: Story = {
  render: () => (
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="default">Default</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="default" size="sm">Small</Button>
      <Button variant="default" size="lg">Large</Button>
      <Button variant="default" size="icon" aria-label="Add"><PlusIcon /></Button>
    </div>
  ),
};
