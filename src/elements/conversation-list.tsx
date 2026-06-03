import { defineKitnElement } from './define';
import { ConversationList } from '../components/conversation-list';
import type { ConversationGroup, ConversationSummary } from '../types';

interface Props extends Record<string, unknown> {
  groups: ConversationGroup[];
  conversations: ConversationSummary[];
  activeId?: string;
}

defineKitnElement<Props>('kitn-conversation-list', {
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
