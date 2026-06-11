import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { ConversationItem } from './conversation-item';

const baseConversation = {
  id: '1',
  title: 'How to use SolidJS signals',
  messageCount: 8,
  lastMessageAt: '2026-04-10T12:00:00Z',
  updatedAt: '2026-04-10T12:00:00Z',
  scope: { type: 'document' as const },
};

/**
 * A single selectable row in a conversation/chat list: title plus a message
 * count, with an active (selected) state.
 */
const meta = {
  title: 'Components/ConversationItem',
  component: ConversationItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'A single conversation row — shows the title and message count, truncating long titles, with a highlighted active state.',
          '**When to use:** as the leaf item inside a chat history sidebar. Usually rendered for you by `ConversationList`; use it directly to build a custom list.',
          '**How to use:** pass a `conversation` summary, an `isActive` flag, and an `onSelect(id)` handler fired when the row is clicked.',
          '**Placement:** inside a conversation/chat history sidebar list.',
        ].join('\n\n'),
      },
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    conversation: {
      control: 'object',
      description: 'The conversation summary (id, title, messageCount, scope, timestamps).',
    },
    isActive: {
      control: 'boolean',
      description: 'Whether this row is the currently selected conversation.',
    },
    onSelect: {
      action: 'select',
      description: 'Fired with the conversation id when the row is clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    conversation: baseConversation,
    isActive: false,
    onSelect: fn(),
  },
  render: (args) => (
    <div class="w-64">
      <ConversationItem {...args} />
    </div>
  ),
} satisfies Meta<typeof ConversationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ConversationItem } from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — toggle `isActive` and edit the conversation object. */
export const Playground: Story = {
  ...src(`<ConversationItem conversation={conversation} isActive={false} onSelect={(id) => {}} />`),
};

export const Active: Story = {
  args: { isActive: true },
  ...src(`<ConversationItem conversation={conversation} isActive onSelect={(id) => {}} />`),
};

export const Inactive: Story = {
  args: { isActive: false },
  ...src(`<ConversationItem conversation={conversation} isActive={false} onSelect={(id) => {}} />`),
};

export const LongTitle: Story = {
  args: {
    conversation: {
      ...baseConversation,
      title: 'This is a very long conversation title that should be truncated with an ellipsis',
    },
  },
  ...src(`<ConversationItem
  conversation={{ ...conversation, title: 'A very long title…' }}
  isActive={false}
  onSelect={(id) => {}}
/>`),
};

/** Several items stacked, one active — showcase. */
export const MultipleItems: Story = {
  render: (args: { onSelect: (id: string) => void }) => (
    <div class="w-64 space-y-0.5">
      <ConversationItem
        conversation={{ ...baseConversation, id: '1', title: 'SolidJS reactive primitives' }}
        isActive={true}
        onSelect={args.onSelect}
      />
      <ConversationItem
        conversation={{ ...baseConversation, id: '2', title: 'TypeScript generics guide', messageCount: 12 }}
        isActive={false}
        onSelect={args.onSelect}
      />
      <ConversationItem
        conversation={{ ...baseConversation, id: '3', title: 'Tailwind CSS tips and tricks', messageCount: 3 }}
        isActive={false}
        onSelect={args.onSelect}
      />
    </div>
  ),
  ...src(`<div class="space-y-0.5">
  <ConversationItem conversation={c1} isActive onSelect={onSelect} />
  <ConversationItem conversation={c2} isActive={false} onSelect={onSelect} />
  <ConversationItem conversation={c3} isActive={false} onSelect={onSelect} />
</div>`),
};
