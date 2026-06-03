import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { ConversationList } from './conversation-list';
import type { ConversationSummary, ConversationGroup } from '../types';

const meta: Meta = {
  title: 'Components/ConversationList',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

const scope = { type: 'document' as const };

const groups: ConversationGroup[] = [
  { id: 'today', name: 'Today', sortOrder: 0, createdAt: '2026-04-10' },
  { id: 'yesterday', name: 'Yesterday', sortOrder: 1, createdAt: '2026-04-09' },
  { id: 'week', name: 'This Week', sortOrder: 2, createdAt: '2026-04-07' },
];

const conversations: ConversationSummary[] = [
  { id: '1', title: 'SolidJS signals explained', groupId: 'today', scope, messageCount: 5, lastMessageAt: '2026-04-10T14:00:00Z', updatedAt: '2026-04-10T14:00:00Z' },
  { id: '2', title: 'TypeScript generics deep dive', groupId: 'today', scope, messageCount: 12, lastMessageAt: '2026-04-10T10:00:00Z', updatedAt: '2026-04-10T10:00:00Z' },
  { id: '3', title: 'CSS Grid vs Flexbox', groupId: 'yesterday', scope, messageCount: 8, lastMessageAt: '2026-04-09T16:00:00Z', updatedAt: '2026-04-09T16:00:00Z' },
  { id: '4', title: 'Setting up Storybook', groupId: 'yesterday', scope, messageCount: 3, lastMessageAt: '2026-04-09T11:00:00Z', updatedAt: '2026-04-09T11:00:00Z' },
  { id: '5', title: 'Vite configuration tips', groupId: 'week', scope, messageCount: 7, lastMessageAt: '2026-04-08T09:00:00Z', updatedAt: '2026-04-08T09:00:00Z' },
  { id: '6', title: 'Chrome extension manifest v3', groupId: 'week', scope, messageCount: 15, lastMessageAt: '2026-04-07T14:00:00Z', updatedAt: '2026-04-07T14:00:00Z' },
];

export const WithGroups: Story = {
  render: () => {
    const [active, setActive] = createSignal('1');
    return (
      <div class="h-[500px] w-72 border border-border rounded-lg overflow-hidden">
        <ConversationList
          groups={groups}
          conversations={conversations}
          activeId={active()}
          onSelect={setActive}
          onNewChat={() => {}}
        />
      </div>
    );
  },
};

export const EmptyState: Story = {
  render: () => (
    <div class="h-[400px] w-72 border border-border rounded-lg overflow-hidden">
      <ConversationList
        groups={[]}
        conversations={[]}
        onSelect={() => {}}
        onNewChat={() => {}}
      />
    </div>
  ),
};

export const WithSearch: Story = {
  render: () => {
    const [active, setActive] = createSignal('1');
    return (
      <div class="h-[500px] w-72 border border-border rounded-lg overflow-hidden">
        <ConversationList
          groups={groups}
          conversations={conversations}
          activeId={active()}
          onSelect={setActive}
          onNewChat={() => {}}
        />
      </div>
    );
  },
};
