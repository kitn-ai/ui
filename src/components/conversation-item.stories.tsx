import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ConversationItem } from './conversation-item';

const meta: Meta = {
  title: 'Components/ConversationItem',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

const baseConversation = {
  id: '1',
  title: 'How to use SolidJS signals',
  messageCount: 8,
  lastMessageAt: '2026-04-10T12:00:00Z',
  updatedAt: '2026-04-10T12:00:00Z',
  scope: { type: 'document' as const },
};

export const Active: Story = {
  render: () => (
    <div class="w-64">
      <ConversationItem
        conversation={baseConversation}
        isActive={true}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const Inactive: Story = {
  render: () => (
    <div class="w-64">
      <ConversationItem
        conversation={baseConversation}
        isActive={false}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const LongTitle: Story = {
  render: () => (
    <div class="w-64">
      <ConversationItem
        conversation={{
          ...baseConversation,
          title: 'This is a very long conversation title that should be truncated with an ellipsis',
        }}
        isActive={false}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const MultipleItems: Story = {
  render: () => (
    <div class="w-64 space-y-0.5">
      <ConversationItem
        conversation={{ ...baseConversation, id: '1', title: 'SolidJS reactive primitives' }}
        isActive={true}
        onSelect={() => {}}
      />
      <ConversationItem
        conversation={{ ...baseConversation, id: '2', title: 'TypeScript generics guide', messageCount: 12 }}
        isActive={false}
        onSelect={() => {}}
      />
      <ConversationItem
        conversation={{ ...baseConversation, id: '3', title: 'Tailwind CSS tips and tricks', messageCount: 3 }}
        isActive={false}
        onSelect={() => {}}
      />
    </div>
  ),
};
