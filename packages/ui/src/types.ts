// Types the chat kit components reference. Extracted from the kit's origin
// project (@tab-zen/shared) so the kit is self-contained. Only the types the
// components actually import are kept; the RAG/document/adapter types are dropped.

export interface ModelOption {
  id: string;
  name: string;
  provider?: string;
  /** A short subtitle shown under the name (e.g. "Flagship model"). Takes
   *  precedence over `provider` for the row subtitle when both are set. */
  description?: string;
  /** Optional group name. Models sharing a `group` are collected under a
   *  collapsible section (e.g. "Legacy models"); ungrouped models list first. */
  group?: string;
}

export interface SearchFilters {
  tags?: string[];
  authors?: string[];
  contentType?: 'transcript' | 'markdown';
  dateRange?: { from: string; to: string };
}

export interface ConversationScope {
  type: 'document' | 'collection';
  documentId?: string;
  filters?: SearchFilters;
}

export interface ConversationSummary {
  id: string;
  title: string;
  groupId?: string;
  /** Only meaningful to scope-aware consumers; the list never reads it. */
  scope?: ConversationScope;
  messageCount: number;
  /** Fallback for the auto relative time when updatedAt is absent. */
  lastMessageAt?: string;
  updatedAt: string;
  // Read differently by the two built-in list surfaces (one field, two renderings): the
  // desktop `ConversationList`/`ConversationItem` renders it right-aligned as a
  // count/status/"days ago", and when it is absent derives a short relative time from
  // `updatedAt` (falling back to `lastMessageAt`); the widget-box panel's list view
  // renders it as the one-line last-message preview under the title and always computes
  // its own right-aligned relative time from `updatedAt` separately, since a box that
  // size has no room for a third line. `localStorageStore` writes it as the ~80-char
  // truncated last-message preview on every save (`primitives/conversation-store.ts`).
  /** Trailing text for the row: a count or status on the desktop list, the last-message preview in the widget list. */
  trailing?: string;
  // Unread means `updatedAt` is later than this. Written by `ConversationStore.markRead`,
  // which documents exactly when and what an absent value means: "not unread", never
  // "definitely unread", so a store that does not implement the concept shows no indicator
  // rather than guessing. Round-tripped through `list()`/`save()`; never authored by hand.
  /** ISO timestamp of when this conversation was last seen by the visitor. */
  lastReadAt?: string;
  // Pinned and archived are the two list-shape flags, and the ONLY rule that reads them is
  // `orderedSummaries` (primitives/conversation-store.ts): archived rows are excluded from
  // every list surface, pinned rows sort above the recency order. Absent means false for
  // both, so a record written before these fields existed (every record already on a
  // visitor's machine) still reads as unpinned and unarchived, and a store that implements
  // neither reads as a plain list rather than guessing. Written by
  // ConversationStore.setPinned/setArchived, round-tripped through list(), and carried
  // forward by save() the way lastReadAt is (a content event must not wipe a decision).
  /** True to hold this row above the recency order in every list; absent or false to leave it in place. */
  pinned?: boolean;
  /** True to keep this row out of every list without deleting it; absent or false to show it. */
  archived?: boolean;
}

export interface ConversationGroup {
  id: string;
  userId?: string;
  teamId?: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

/** One row in a `HomeConfig.links` list, a "docs" / "talk to sales" style
 *  entry. `href` is optional: with it, the row renders as a link (subject to
 *  `isSafeUrl`); without it, the row is a button that emits itself via
 *  `HomePanelProps.onLink`. `icon` is either a `renderIcon` name or a safe
 *  URL, same resolution `renderIcon` already does for every other icon prop
 *  in the kit. */
export interface HomeLinkEntry {
  label: string;
  href?: string;
  description?: string;
  icon?: string;
}

/** The widget home screen's JSON-shaped config (Intercom-pattern home tab).
 *  Consumed by `ChatThread`'s `home` prop, which wires it into `HomePanel`/
 *  `WidgetTabBar` and, from there, into `<kai-chat>`'s own `home` property. */
export interface HomeConfig {
  greeting?: { title?: string; subtitle?: string };
  recentConversation?: boolean;
  newConversation?: { label?: string };
  links?: HomeLinkEntry[];
}
