import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { ConversationList, type ConversationListProps } from './conversation-list';
import type { ConversationSummary, ConversationGroup } from '../types';
import { componentDescription } from '../stories/docs/element-controls';

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

/**
 * The conversation/chat history sidebar: a header with new-chat action, a search
 * box, and grouped, collapsible lists of `ConversationItem`s.
 */
const meta = {
  title: 'Components/Elements/ConversationList',
  component: ConversationList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The chat-history sidebar: a header (sidebar toggle + new chat), a search box that filters by title, and conversations bucketed into collapsible, count-badged groups.',
        'Pass `groups` and `conversations`, the `activeId`, and handlers `onSelect(id)` / `onNewChat()` (plus optional `onToggleSidebar()`); give it a sized, overflow-hidden container.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    groups: {
      control: 'object',
      description: 'Conversation groups (buckets) to render as collapsible sections.',
    },
    conversations: {
      control: 'object',
      description: 'Conversation summaries; placed into groups by their `groupId`.',
    },
    activeId: {
      control: 'text',
      description: 'Id of the currently selected conversation.',
    },
    onSelect: {
      action: 'select',
      description: 'Fired with the conversation id when a row is clicked.',
      table: { category: 'Events' },
    },
    onNewChat: {
      action: 'newChat',
      description: 'Fired when the new-chat (+) button is clicked.',
      table: { category: 'Events' },
    },
    onToggleSidebar: {
      action: 'toggleSidebar',
      description: 'Fired when the sidebar-toggle (menu) button is clicked.',
      table: { category: 'Events' },
    },
    onSearchChange: {
      action: 'searchChange',
      description: 'Fired with the current query whenever the built-in search box changes.',
      table: { category: 'Events' },
    },
  },
  args: {
    groups,
    conversations,
    activeId: '1',
    onSelect: fn(),
    onNewChat: fn(),
    onToggleSidebar: fn(),
    onSearchChange: fn(),
  },
  render: (args) => (
    <div class="h-[500px] w-72 border border-border rounded-lg overflow-hidden">
      <ConversationList {...args} />
    </div>
  ),
} satisfies Meta<typeof ConversationList>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ConversationList } from '@kitn.ai/ui';
import type { ConversationGroup, ConversationSummary } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const usage = `// Groups are the collapsible buckets; conversations land in a group by groupId.
const groups: ConversationGroup[] = [
  { id: 'today', name: 'Today', sortOrder: 0, createdAt: '2026-04-10' },
  { id: 'yesterday', name: 'Yesterday', sortOrder: 1, createdAt: '2026-04-09' },
];

const conversations: ConversationSummary[] = [
  { id: '1', title: 'SolidJS signals explained', groupId: 'today',
    scope: { type: 'document' }, messageCount: 5,
    lastMessageAt: '2026-04-10T14:00:00Z', updatedAt: '2026-04-10T14:00:00Z' },
  { id: '2', title: 'CSS Grid vs Flexbox', groupId: 'yesterday',
    scope: { type: 'document' }, messageCount: 8,
    lastMessageAt: '2026-04-09T16:00:00Z', updatedAt: '2026-04-09T16:00:00Z' },
  // …
];

const [activeId, setActiveId] = createSignal('1');

<div class="h-[500px] w-72 overflow-hidden rounded-lg border">
  <ConversationList
    groups={groups}
    conversations={conversations}
    activeId={activeId()}
    onSelect={setActiveId}
    onNewChat={() => startNewChat()}
    onSearchChange={(q) => console.log('search', q)}
  />
</div>`;

/** Interactive playground: edit the groups/conversations arrays and active id via controls. */
export const Playground: Story = {
  ...src(usage),
};

/** Conversations bucketed into Today / Yesterday / This Week. */
export const WithGroups: Story = {
  ...src(usage),
};

/** No conversations: the list renders just its header and search box. */
export const EmptyState: Story = {
  args: { groups: [], conversations: [], activeId: undefined },
  render: (args: ConversationListProps) => (
    <div class="h-[400px] w-72 border border-border rounded-lg overflow-hidden">
      <ConversationList {...args} />
    </div>
  ),
  ...src(`<ConversationList
  groups={[]}
  conversations={[]}
  onSelect={() => {}}
  onNewChat={() => {}}
/>`),
};

/** Type in the built-in search box to filter conversations by title. */
export const WithSearch: Story = {
  ...src(usage),
};
