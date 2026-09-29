import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import type { JSX } from 'solid-js';
import { fn } from 'storybook/test';
import { ConversationPanel, type ConversationPanelProps } from './conversation-panel';
import { componentDescription } from '../../stories/docs/web-component-controls';
import type { ConversationSummary } from '../../types';

// Fixed offsets from render time so the derived relative time reads the same on
// every open ("5m ago", "3h ago") rather than drifting with the clock.
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const conversations: ConversationSummary[] = [
  {
    id: 'c1',
    title: 'Where is my order?',
    messageCount: 3,
    updatedAt: ago(5),
    lastMessageAt: ago(5),
    trailing: 'Order KAI-1042 shipped with DHL',
  },
  {
    id: 'c2',
    title: 'Refund for the duplicate charge',
    messageCount: 8,
    updatedAt: ago(180),
    lastMessageAt: ago(180),
    trailing: 'We have issued the refund',
  },
  {
    id: 'c3',
    title: 'Update the shipping address',
    messageCount: 2,
    updatedAt: ago(1500),
    lastMessageAt: ago(1500),
    trailing: 'Anything else I can help with?',
  },
];

/**
 * The widget-box list view: a full-height list of conversations and the one
 * floating new-conversation pill. No search box, no group headers, no per-row
 * menu.
 */
const meta = {
  title: 'Components/ConversationPanel',
  component: ConversationPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The widget-box conversation list, plus its new-conversation pill.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    conversations: {
      control: 'object',
      description: 'The conversation summaries to list; archived ones are left out and pinned ones lead.',
    },
    activeId: {
      control: 'text',
      description: 'Id of the currently open conversation, highlighted in the list.',
    },
    newChatLabel: {
      control: 'text',
      description: 'Wording for the floating new-conversation pill.',
    },
    showTrailing: {
      control: 'boolean',
      description: 'Paint each row\'s trailing edge (the derived relative time), or leave the edge empty. On by default.',
    },
    onSelect: {
      action: 'select',
      description: 'Fired with the conversation id when a row is clicked.',
      table: { category: 'Events' },
    },
    onNewChat: {
      action: 'newChat',
      description: 'Fired when the floating new-conversation pill is clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    conversations,
    activeId: 'c1',
    onSelect: fn(),
    onNewChat: fn(),
  },
} satisfies Meta<typeof ConversationPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ConversationPanel } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

// `showTrailing={false}` cannot be written as JSX text (its braces are read as an
// expression), so this label is a plain string.
const OFF_LABEL = 'showTrailing={false}: the edge left empty';

const frame = (children: JSX.Element) => (
  <div class="flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
    {children}
  </div>
);

/** The list as it ships: three conversations, the middle one open, the derived
 *  relative time on every row's trailing edge. */
export const Conversations: Story = {
  render: (args: ConversationPanelProps) => frame(<ConversationPanel {...args} />),
  ...src(`const conversations = [
  { id: 'c1', title: 'Where is my order?', messageCount: 3, updatedAt: '2026-09-27T10:00:00Z', trailing: 'Order KAI-1042 shipped with DHL' },
  { id: 'c2', title: 'Refund for the duplicate charge', messageCount: 8, updatedAt: '2026-09-27T06:00:00Z', trailing: 'We have issued the refund' },
];

<ConversationPanel
  conversations={conversations}
  activeId="c1"
  onSelect={(id) => openConversation(id)}
  onNewChat={() => startNewConversation()}
/>`),
};

/** The trailing edge, both ways, side by side. The right-hand panel sets
 *  `showTrailing={false}`: no relative time on any row, because the edge holds a
 *  time this component derives and a consumer cannot otherwise remove it. The
 *  preview line under each title is not the trailing edge and stays either way. */
export const TrailingEdge: Story = {
  render: (args: ConversationPanelProps) => (
    <div class="flex flex-wrap items-start gap-6">
      <div class="flex flex-col gap-2">
        <div class="text-xs font-medium text-muted-foreground">default: the derived time on the trailing edge</div>
        {frame(<ConversationPanel {...args} />)}
      </div>
      <div class="flex flex-col gap-2">
        <div class="text-xs font-medium text-muted-foreground">{OFF_LABEL}</div>
        {frame(<ConversationPanel {...args} showTrailing={false} />)}
      </div>
    </div>
  ),
  ...src(`const conversations = [
  { id: 'c1', title: 'Where is my order?', messageCount: 3, updatedAt: '2026-09-27T10:00:00Z', trailing: 'Order KAI-1042 shipped with DHL' },
];

{/* default: each row derives a relative time for its trailing edge */}
<ConversationPanel conversations={conversations} activeId="c1" ... />

{/* showTrailing={false}: no time on the edge; the preview line stays */}
<ConversationPanel conversations={conversations} activeId="c1" showTrailing={false} ... />`),
};
