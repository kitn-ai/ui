import { createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
import { readSlots, CONVERSATIONS_SLOTS } from './slots';
import { ConversationList, type ConversationListController } from '../components/conversation-list';
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
  /** The built-in search box query changed (typing, or a programmatic `clear()`
   *  which fires it with `''`). Lets a consumer mirror or server-side the filter. */
  'kai-search': { query: string };
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
export function parseKaiConversationElement(n: Element): ConversationSummary {
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
}, (props, { dispatch, element, expose }) => {
  // Read declarative <kai-conversation> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedConversations, setSlottedConversations] = createSignal<ConversationSummary[]>([]);
  // Which composition slots (header/empty/footer) the consumer has filled.
  const [slots, setSlots] = createSignal<Record<string, boolean>>({});
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-conversation')];
      setSlottedConversations(nodes.map(parseKaiConversationElement));
      setSlots(readSlots(element, CONVERSATIONS_SLOTS));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Prop conversations take precedence; slotted children are appended after.
  const allConversations = () => [...(props.conversations ?? []), ...slottedConversations()];

  // ── Imperative API (instance methods on the host) ──────────────────────────
  // The search box's query lives inside ConversationList; we capture its
  // controller (Pattern C) to focus / clear it from the facade.
  let controller: ConversationListController | undefined;
  expose({
    /** Focus the built-in search input inside the shadow root. */
    focus: (options?: FocusOptions) => {
      // Prefer the captured controller; fall back to a shadow query (the search
      // box only renders when there are conversations).
      if (controller) controller.focus(options);
      else element.shadowRoot?.querySelector<HTMLInputElement>('input')?.focus(options);
    },
    /** Clear the internal search query (resets the list filter) and fire
     *  kai-search with an empty string. */
    clear: () => controller?.clearSearch(),
    /** Programmatically select a conversation by id — mirror of the
     *  kai-conversation-select event (a convenience over driving `activeId`). */
    select: (id: string) => dispatch('kai-conversation-select', { id }),
  });

  return (
    <ConversationList
      groups={props.groups}
      conversations={allConversations()}
      activeId={props.activeId}
      onSelect={(id) => dispatch('kai-conversation-select', { id })}
      onNewChat={() => dispatch('kai-new-chat')}
      onToggleSidebar={() => dispatch('kai-toggle-sidebar')}
      onSearchChange={(query) => dispatch('kai-search', { query })}
      controllerRef={(c) => (controller = c)}
      header={slots().header ? <slot name="header" /> : undefined}
      footer={slots().footer ? <slot name="footer" /> : undefined}
      empty={slots().empty ? <slot name="empty" /> : undefined}
    />
  );
});
