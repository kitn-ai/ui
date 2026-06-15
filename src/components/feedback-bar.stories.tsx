import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { FeedbackBar } from './feedback-bar';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Solid (Advanced)/Elements/FeedbackBar',
  component: FeedbackBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'An inline bar that prompts the user to rate a response, with thumbs-up / thumbs-down actions and a dismiss button.',
        '**When to use:** after an assistant message, to collect quick helpful / not-helpful feedback on the answer.',
        '**How to use:** set a `title`, optionally pass an `icon`, and wire `onFeedback` and `onClose` to capture the rating or hide the bar.',
        '**Placement:** directly beneath a completed assistant message, or in a message action row.',
      ]),
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Prompt text shown next to the rating buttons.',
    },
    icon: {
      control: false,
      description: 'Optional leading icon element shown before the title.',
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the root element.',
    },
    onFeedback: {
      action: 'feedback',
      description: 'Fired with `value: "helpful" | "not-helpful"` when a rating button is clicked.',
      table: { category: 'Events' },
    },
    onClose: {
      action: 'close',
      description: 'Fired when the close (X) button is clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    title: 'Was this response helpful?',
    onFeedback: fn(),
    onClose: fn(),
  },
  render: (args) => <FeedbackBar {...args} />,
} satisfies Meta<typeof FeedbackBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { FeedbackBar } from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — tweak the controls to explore the feedback bar. */
export const Playground: Story = {
  ...src(`<FeedbackBar
  title="Was this response helpful?"
  onFeedback={(value) => console.log('feedback:', value)}
  onClose={() => {}}
/>`),
};

export const CustomTitle: Story = {
  args: { title: 'Rate this answer' },
  ...src(`<FeedbackBar title="Rate this answer" onFeedback={(value) => console.log('feedback:', value)} />`),
};

const SmileyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted-foreground">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

export const WithIcon: Story = {
  args: { title: 'How did I do?', icon: <SmileyIcon /> },
  ...src(`<FeedbackBar
  title="How did I do?"
  icon={<SmileyIcon />}
  onFeedback={(value) => console.log('feedback:', value)}
/>`),
};
