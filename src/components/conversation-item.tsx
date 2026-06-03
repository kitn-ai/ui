import { splitProps } from 'solid-js';
import { cn } from '../utils/cn';
import { useChatConfig, textClass } from '../primitives/chat-config';
import type { ConversationSummary } from '../types';

export interface ConversationItemProps { conversation: ConversationSummary; isActive: boolean; onSelect: (id: string) => void; class?: string; }

export function ConversationItem(props: ConversationItemProps) {
  const [local] = splitProps(props, ['conversation', 'isActive', 'onSelect', 'class']);
  const config = useChatConfig();
  return (
    <button onClick={() => local.onSelect(local.conversation.id)}
      class={cn('w-full text-left rounded-lg px-2.5 py-2 transition-colors', local.isActive ? 'bg-muted' : 'hover:bg-muted/50', local.class)}>
      <div class={cn('truncate', textClass(config.proseSize()), local.isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>{local.conversation.title}</div>
      <div class={cn('text-muted-foreground/60 truncate mt-0.5', config.proseSize() === 'lg' ? 'text-sm' : config.proseSize() === 'base' ? 'text-xs' : 'text-[11px]')}>{local.conversation.messageCount} messages</div>
    </button>
  );
}
