import { splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import type { ConversationSummary } from '../types';

export interface ConversationItemProps { conversation: ConversationSummary; isActive: boolean; onSelect: (id: string) => void; class?: string; }

export function ConversationItem(props: ConversationItemProps) {
  const [local] = splitProps(props, ['conversation', 'isActive', 'onSelect', 'class']);
  return (
    <button data-conversation-id={local.conversation.id} onClick={() => local.onSelect(local.conversation.id)}
      class={cn('w-full text-left rounded-lg px-2.5 py-2 transition-colors', local.isActive ? 'bg-muted' : 'hover:bg-muted/50', local.class)}>
      <div class={cn('truncate text-sm', local.isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>{local.conversation.title}</div>
      <div class="text-muted-foreground truncate mt-0.5 text-xs">{local.conversation.messageCount} messages</div>
    </button>
  );
}
