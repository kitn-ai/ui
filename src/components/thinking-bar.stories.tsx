import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { ThinkingBar } from './thinking-bar';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/ThinkingBar',
  component: ThinkingBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A status row that shows a shimmering "thinking" label, optionally clickable to expand reasoning, with an optional stop/cancel action.',
        '**When to use:** while the assistant is generating or reasoning, to show live activity and give the user a way to interrupt or to open the reasoning trace.',
        '**How to use:** set `text` for the label. Pass `onClick` to make the label a button (adds a chevron) — typically to toggle a reasoning panel. Pass `onStop` (with optional `stopLabel`) to render the interrupt action.',
        '**Placement:** above or in place of a streaming message, or at the top of a reasoning/chain-of-thought block.',
      ]),
    },
  },
  argTypes: {
    text: {
      control: 'text',
      description: 'Label shown with the shimmer effect.',
      table: { defaultValue: { summary: 'Thinking' } },
    },
    stopLabel: {
      control: 'text',
      description: 'Label for the stop/cancel action (only shown when `onStop` is set).',
      table: { defaultValue: { summary: 'Answer now' } },
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the container.',
    },
    onClick: {
      action: 'click',
      description: 'When set, the label becomes a button (with chevron) and this fires on click.',
      table: { category: 'Events' },
    },
    onStop: {
      action: 'stop',
      description: 'When set, renders the stop action and fires when it is clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    text: 'Thinking',
    stopLabel: 'Answer now',
    onStop: fn(),
  },
  render: (args) => <ThinkingBar {...args} />,
} satisfies Meta<typeof ThinkingBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ThinkingBar } from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — tweak the controls to explore the thinking bar. */
export const Playground: Story = {
  ...src(`<ThinkingBar text="Thinking" onStop={() => stop()} />`),
};

export const Default: Story = {
  args: { onStop: undefined } as never,
  ...src(`<ThinkingBar />`),
};

export const WithStopButton: Story = {
  args: { onStop: fn() },
  ...src(`<ThinkingBar onStop={() => stopGeneration()} />`),
};

export const CustomText: Story = {
  args: { text: 'Analyzing documents', stopLabel: 'Cancel', onStop: fn() },
  ...src(`<ThinkingBar text="Analyzing documents" stopLabel="Cancel" onStop={() => cancel()} />`),
};

export const Clickable: Story = {
  args: { text: 'Reasoning', onClick: fn(), onStop: fn() },
  ...src(`<ThinkingBar\n  text="Reasoning"\n  onClick={() => toggleReasoning()}\n  onStop={() => stop()}\n/>`),
};
