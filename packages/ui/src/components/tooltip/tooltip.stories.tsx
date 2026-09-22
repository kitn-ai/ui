import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Tooltip } from './tooltip';
import { Button } from '../button/button';
import { Kbd } from '../kbd/kbd';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A small floating label on hover/focus of its trigger. Wrap a single interactive `children` element (it becomes the trigger) and set `content` to the hint, as text or as JSX.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    content: {
      control: 'text',
      description: 'Hint shown inside the bubble. A plain string renders as text; JSX composes a richer tip (see RichContent).',
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
const IMPORT_RICH = `import { Tooltip, Button } from '@kitn.ai/ui';
import { Kbd } from '@kitn.ai/ui/solid';`;
// `imports` is a parameter, not a second helper: the snippet is read by somebody who has the
// snippet and nothing else, so a story naming a kit export its import line omits (RichContent
// names Kbd) hands the reader code that does not compile. Keeping the composed text inside this
// function also keeps it the single body the docs-source-code chain reads.
const src = (code: string, imports: string = IMPORT) => ({
  parameters: { docs: { source: { code: `${imports}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: set the tooltip text and hover the trigger. */
export const Playground: Story = {
  ...src(`<Tooltip content="This is a tooltip">
  <Button variant="outline">Hover me</Button>
</Tooltip>`),
};

/** A composed tip: `content` also takes JSX, so a `Kbd` (or any kit component) can sit inside
 *  the bubble. Built in `render`, never in `args` -- see the meta note on the
 *  manager/preview boundary. */
export const RichContent: Story = {
  render: () => (
    <Tooltip content={<span>Save changes <Kbd keys="Mod+S" platform="mac" /></span>}>
      <Button variant="outline">Save</Button>
    </Tooltip>
  ),
  ...src(`<Tooltip content={<span>Save changes <Kbd keys="Mod+S" platform="mac" /></span>}>
  <Button variant="outline">Save</Button>
</Tooltip>`, IMPORT_RICH),
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
