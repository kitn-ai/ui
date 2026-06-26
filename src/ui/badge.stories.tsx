import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Badge } from './badge';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A compact pill for status text, counts, or source citations. Set `variant`: `default` (label), `count` (numeric pill), or `citation` (clickable source marker).',
      ]),
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'count', 'citation'],
      description: 'Visual style: neutral label, numeric count pill, or clickable citation marker.',
      table: { defaultValue: { summary: 'default' } },
    },
    children: {
      control: 'text',
      description: 'Badge content, short text or a number.',
    },
  },
  args: {
    variant: 'default',
    children: 'Default badge',
  },
  render: (args) => <Badge {...args} />,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Badge } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: switch the variant and edit the content. */
export const Playground: Story = {
  ...src(`<Badge variant="default">Default badge</Badge>`),
};

export const Default: Story = {
  args: { variant: 'default', children: 'Default badge' },
  ...src(`<Badge variant="default">Default badge</Badge>`),
};

export const Count: Story = {
  args: { variant: 'count', children: '12' },
  ...src(`<Badge variant="count">12</Badge>`),
};

export const Citation: Story = {
  args: { variant: 'citation', children: '1' },
  ...src(`<Badge variant="citation">1</Badge>`),
};

/** All variants side by side (showcase, not driven by controls). */
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
  ...src(`<div class="flex items-center gap-3">
  <Badge variant="default">Default</Badge>
  <Badge variant="count">5</Badge>
  <Badge variant="citation">1</Badge>
  <Badge variant="citation">2</Badge>
  <Badge variant="citation">3</Badge>
</div>`),
};
