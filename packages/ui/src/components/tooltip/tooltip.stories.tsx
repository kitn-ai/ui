import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Tooltip } from './tooltip';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A small floating label on hover/focus of its trigger. Wrap a single interactive `children` element (it becomes the trigger) and set `content` to the hint text.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    content: {
      control: 'text',
      description: 'Text shown inside the tooltip bubble.',
    },
    children: {
      control: false,
      description: 'The trigger element the tooltip is attached to.',
    },
    class: {
      control: 'text',
      description: 'Extra classes applied to the tooltip content bubble.',
    },
  },
  args: {
    content: 'This is a tooltip',
  },
  // The trigger is built HERE, not passed through `args`. A JSX element in `args` cannot be
  // serialized across Storybook's manager/preview boundary, so the Docs page's primary preview
  // re-renders from empty args and shows an empty canvas while the story itself (which runs with
  // the live args) looks right. Keep everything in `args` serializable: scalars, arrays, `fn()`.
  render: (args) => (
    <Tooltip content={args.content} class={args.class}>
      <Button variant="outline">Hover me</Button>
    </Tooltip>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Tooltip, Button } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: set the tooltip text and hover the trigger. */
export const Playground: Story = {
  ...src(`<Tooltip content="This is a tooltip">
  <Button variant="outline">Hover me</Button>
</Tooltip>`),
};

export const OnIconButton: Story = {
  render: () => (
    <Tooltip content="Add new item">
      <Button variant="ghost" size="icon-sm" aria-label="Add new item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Button>
    </Tooltip>
  ),
  ...src(`<Tooltip content="Add new item">
  <Button variant="ghost" size="icon-sm">
    <PlusIcon />
  </Button>
</Tooltip>`),
};
