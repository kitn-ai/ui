import { Conversations } from '@kitn.ai/ui/react';
import type { Theme } from '../App';
import type { Conversation } from '../chat-data';

interface SidebarProps {
  theme: Theme;
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onToggle: () => void;
}

/**
 * The conversation rail — a thin wrapper over `<kai-conversations>`. The `.sidebar`
 * div owns the shell's right border (kept OFF the element so it follows the shell's
 * light/dark tokens, not the element's own re-scoped ones). Collapse is owned by
 * the parent `<ResizableItem collapsed>`; the rail's own toggle just reports the
 * intent up via `onToggle`, so there's a single source of truth for collapsed.
 */
export function Sidebar({ theme, conversations, activeId, onSelect, onNewChat, onToggle }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Conversations
        theme={theme}
        groups={[]} /* flat list: the element buckets `conversations` by recency itself */
        conversations={conversations}
        activeId={activeId}
        onConversationSelect={(e) => onSelect(e.detail.id)}
        onNewChat={onNewChat}
        onToggleSidebar={onToggle}
      />
    </aside>
  );
}
