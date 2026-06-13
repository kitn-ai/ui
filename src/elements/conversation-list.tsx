import { defineKitnElement } from './define';
import { ConversationList } from '../components/conversation-list';
import type { ConversationGroup, ConversationSummary } from '../types';

interface Props extends Record<string, unknown> {
  /** Pre-bucketed conversation groups (e.g. "Today", "Yesterday"), each with its
   *  own conversations. Use this when you want to control the grouping/headers
   *  yourself; otherwise pass a flat `conversations` array. Set as a JS property. */
  groups: ConversationGroup[];
  /** A flat list of conversation summaries; the component buckets them by recency
   *  for you. Ignored when `groups` is provided. Set as a JS property. */
  conversations: ConversationSummary[];
  /** The id of the currently-open conversation, highlighted in the list. */
  activeId?: string;
}

interface Events {
  /** A conversation was selected. */
  select: { id: string };
  /** The "New chat" button was clicked. */
  newchat: Record<string, never>;
  /** The sidebar toggle was clicked. */
  togglesidebar: Record<string, never>;
}

defineKitnElement<Props, Events>('kitn-conversation-list', {
  groups: [],
  conversations: [],
  activeId: undefined,
}, (props, { dispatch }) => {
  return (
    <ConversationList
      groups={props.groups}
      conversations={props.conversations}
      activeId={props.activeId}
      onSelect={(id) => dispatch('select', { id })}
      onNewChat={() => dispatch('newchat')}
      onToggleSidebar={() => dispatch('togglesidebar')}
    />
  );
});
