import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { FeedbackBar } from './feedback-bar';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Elements/FeedbackBar',
  component: FeedbackBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'An inline helpful / not-helpful rating bar for an assistant message. It owns the whole flow: it asks, optionally collects a category and comment on a not-helpful vote, then confirms with a thank-you, all in place. It does not disappear on a vote (only the close button dismisses it).',
        'The vote fires `onFeedback` immediately; set `collectDetail` plus `categories` for the detail step (fires `onSubmitDetail`).',
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
    collectDetail: {
      control: 'boolean',
      description: 'When on, a not-helpful vote opens an optional detail form (category chips + comment) before the thank-you.',
    },
    categories: {
      control: 'object',
      description: 'Category chips offered in the detail form.',
    },
    thanksMessage: {
      control: 'text',
      description: 'Confirmation copy shown after a vote/submit.',
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the root element.',
    },
    onFeedback: {
      action: 'feedback',
      description: 'Fired with `value: "helpful" | "not-helpful"` immediately when a rating button is clicked (the vote is recorded even if the detail form is skipped).',
      table: { category: 'Events' },
    },
    onSubmitDetail: {
      action: 'submitDetail',
      description: 'Fired with `{ value, category?, comment? }` when the optional detail form is submitted.',
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
    onSubmitDetail: fn(),
    onClose: fn(),
  },
  render: (args) => <FeedbackBar {...args} />,
} satisfies Meta<typeof FeedbackBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { FeedbackBar } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: tweak the controls to explore the feedback bar. */
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

/** The full flow: a not-helpful vote opens an optional detail form (category
 *  chips + comment) before the thank-you. A helpful vote skips straight to thanks.
 *  Click 👎 to see the detail step. */
export const WithDetail: Story = {
  args: {
    title: 'Was this response helpful?',
    collectDetail: true,
    categories: ['Inaccurate', 'Not helpful', 'Unsafe', 'Other'],
  },
  ...src(`<FeedbackBar
  title="Was this response helpful?"
  collectDetail
  categories={['Inaccurate', 'Not helpful', 'Unsafe', 'Other']}
  onFeedback={(value) => console.log('vote:', value)}
  onSubmitDetail={(d) => console.log('detail:', d)} // { value, category?, comment? }
/>`),
};

/** A custom confirmation message shown after the vote. */
export const CustomThanks: Story = {
  args: { title: 'Rate this answer', thanksMessage: 'Got it, thanks for helping us improve!' },
  ...src(`<FeedbackBar
  title="Rate this answer"
  thanksMessage="Got it, thanks for helping us improve!"
  onFeedback={(value) => console.log('feedback:', value)}
/>`),
};
