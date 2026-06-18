import { createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
import { ConversationList } from '../components/conversation-list';
import type { ConversationGroup, ConversationSummary, ConversationScope } from '../types';

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
  'kai-conversation-select': { id: string };
  /** The "New chat" button was clicked. */
  'kai-new-chat': Record<string, never>;
  /** The sidebar toggle was clicked. */
  'kai-toggle-sidebar': Record<string, never>;
}

/** Parse a single light-DOM `<kai-conversation>` element into a `ConversationSummary`.
 *  Attribute mapping:
 *   - `id`       → ConversationSummary.id
 *   - `group-id` → ConversationSummary.groupId (optional)
 *   - textContent → ConversationSummary.title
 *  Required fields not expressible as HTML attributes (`scope`, `messageCount`,
 *  `lastMessageAt`, `updatedAt`) receive safe defaults so the rendered list item
 *  is fully functional with just `id` + title text.
 */
export function parseKcConversationElement(n: Element): ConversationSummary {
  return {
    id: n.getAttribute('id') ?? '',
    title: n.textContent?.trim() ?? '',
    groupId: n.getAttribute('group-id') ?? undefined,
    scope: { type: 'collection' } as ConversationScope,
    messageCount: 0,
    lastMessageAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

defineWebComponent<Props, Events>('kai-conversations', {
  groups: [],
  conversations: [],
  activeId: undefined,
}, (props, { dispatch, element }) => {
  // Read declarative <kai-conversation> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedConversations, setSlottedConversations] = createSignal<ConversationSummary[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-conversation')];
      setSlottedConversations(nodes.map(parseKcConversationElement));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Prop conversations take precedence; slotted children are appended after.
  const allConversations = () => [...(props.conversations ?? []), ...slottedConversations()];

  return (
    <ConversationList
      groups={props.groups}
      conversations={allConversations()}
      activeId={props.activeId}
      onSelect={(id) => dispatch('kai-conversation-select', { id })}
      onNewChat={() => dispatch('kai-new-chat')}
      onToggleSidebar={() => dispatch('kai-toggle-sidebar')}
    />
  );
});
