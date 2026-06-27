import { Show, splitProps } from 'solid-js';
import { Circle } from 'lucide-solid';
import { cn } from '../utils/cn';
import type { ConversationSummary } from '../types';

export interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  /** Dense single-line row: a leading dot + title, no message count. */
  compact?: boolean;
  class?: string;
}

export function ConversationItem(props: ConversationItemProps) {
  const [local] = splitProps(props, ['conversation', 'isActive', 'onSelect', 'compact', 'class']);
  return (
    <button
      data-conversation-id={local.conversation.id}
      onClick={() => local.onSelect(local.conversation.id)}
      class={cn(
        'w-full rounded-lg text-left transition-colors',
        local.compact ? 'px-2.5 py-1.5' : 'px-2.5 py-2',
        local.isActive ? 'bg-muted' : 'hover:bg-muted/50',
        local.class,
      )}
    >
      <Show
        when={local.compact}
        fallback={
          <>
            <div class={cn('truncate text-sm', local.isActive ? 'font-medium text-foreground' : 'text-foreground/80')}>{local.conversation.title}</div>
            <div class={cn('mt-0.5 truncate text-xs', local.isActive ? 'text-foreground/70' : 'text-muted-foreground')}>{local.conversation.messageCount} messages</div>
          </>
        }
      >
        <div class="flex items-center gap-2.5">
          <Circle class={cn('size-3.5 shrink-0', local.isActive ? 'text-foreground' : 'text-muted-foreground')} />
          <span class={cn('truncate text-sm', local.isActive ? 'font-medium text-foreground' : 'text-foreground/80')}>{local.conversation.title}</span>
        </div>
      </Show>
    </button>
  );
}
