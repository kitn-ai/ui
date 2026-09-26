/**
 * The headless conversation controller: the drift-prone glue every composed app used to
 * rewire by hand around a `ConversationStore` — active-id tracking, mint-id-on-first-turn,
 * save-per-turn, auto-restore, and the three-leg "seen" rule for `markRead` — shipped ONCE,
 * framework-free, so `kai-chat` and every block run the SAME policy instead of copies.
 *
 * Plain JS closures over that contract: no solid, no DOM, no framework, so `dist/stores.js`
 * stays loadable raw off a CDN (`verify:cdn-entries` fails the build on a bare import).
 *
 * THE POLICY, in short (each behavior is pinned by its own unit test): a lazy id minted by
 * the first non-empty `saveTurn`; `saveTurn` refreshing the summary cache and marking the
 * active conversation read while it is seen; `restore()` loading the most recent
 * conversation (the one recency rule) and handing its messages to `onMessagesLoad`, as a
 * no-op when something is already active; seen only while the host is open, the chat view
 * shows AND it is the active conversation, so any missing leg suppresses `markRead`;
 * `anyUnread()` folding the one public read of `lastReadAt` over the cached summaries,
 * excluding the active conversation only while it is seen; and a failed store call
 * reported rather than swallowed, degrading without throwing into the caller's turn loop.
 */
import type { ConversationSummary } from '../types';
import type { ChatMessage } from '../web-components/chat/chat-types';
import { byRecency, isConversationUnread, type ConversationStore } from '../primitives/conversation-store';

/** The named store operations `onError` reports on. */
export type ConversationControllerOp = 'list' | 'load' | 'save' | 'markRead';

export interface ConversationControllerHooks {
  // Fires on `select` (a row tap), `restore` (auto-restore) and `startNew` (an empty array
  // with `id === undefined`). The fresh reference is the kai- reactivity contract,
  // satisfied at this boundary.
  /** Receives loaded messages whenever the controller changes what the thread should
   *  show, with a fresh array reference every call. */
  onMessagesLoad?: (messages: ChatMessage[], id: string | undefined) => void;
  /** Fires after every summary-cache refresh with the fresh, recency-sorted
   *  array - the list panel / recent-card render feed. */
  onSummariesChange?: (summaries: ConversationSummary[]) => void;
  /** Fires whenever the derived unread flag CHANGES (edge, not level) - the
   *  launcher-badge feed, mirroring ChatThread's `onUnreadChange`. */
  onUnreadChange?: (anyUnread: boolean) => void;
  /** Failure tap, replacing the default console reporting. The controller has already
   *  degraded safely by the time this fires. */
  onError?: (op: ConversationControllerOp, error: unknown) => void;
  /** Override the id mint (defaults to `crypto.randomUUID()`). */
  mintId?: () => string;
  /** The view the controller starts in (default `'chat'`). Only `'chat'` satisfies the
   *  chat-view leg of the seen rule. */
  initialView?: string;
  /** Whether the host starts open (default `true` - a full-page app has no
   *  closed state, matching ChatThread's `hostOpen !== false` default). */
  initialOpen?: boolean;
}

export interface ConversationController {
  /** The active conversation id, or `undefined` before the first turn of a
   *  new conversation mints one. */
  activeId(): string | undefined;
  /** The current view name (seen rule leg: only `'chat'` counts). */
  view(): string;
  /** Whether the host is open (seen rule leg). */
  open(): boolean;
  /** The cached summaries from the last refresh, recency-sorted. */
  summaries(): readonly ConversationSummary[];
  /** All three seen legs hold right now. */
  seen(): boolean;
  /** Any cached conversation is unread, excluding the active one only while
   *  it is seen. */
  anyUnread(): boolean;
  /** Flip the host-open leg; entering the seen state marks the active
   *  conversation read. */
  setOpen(open: boolean): Promise<void>;
  /** Set the current view; entering `'chat'` while open with an active
   *  conversation marks it read. */
  setView(view: string): Promise<void>;
  /** Load a conversation and make it active, then mark it read if now seen. A failed load
   *  leaves the current state untouched. */
  select(id: string): Promise<void>;
  /** Start a fresh conversation: clears the active id and delivers `[]`
   *  through `onMessagesLoad`. No id exists until the first `saveTurn`. */
  startNew(): void;
  /** Auto-restore the most recent conversation. No-op when something is
   *  already active or the store is empty. Returns `true` when a
   *  conversation was restored. */
  restore(): Promise<boolean>;
  // Mints the id on the first non-empty save, saves, marks read while seen, and
  // refreshes the summary cache.
  /** Persist the thread after a turn and return the active id; an empty array is a no-op
   *  that returns `undefined`. */
  saveTurn(messages: ChatMessage[]): Promise<string | undefined>;
  /** Re-fetch `store.list()` into the summary cache (recency-sorted) and
   *  re-derive the unread flag. A failure reports and keeps the old cache. */
  refresh(): Promise<void>;
}

export function createConversationController(
  store: ConversationStore,
  hooks: ConversationControllerHooks = {},
): ConversationController {
  let activeId: string | undefined;
  let view = hooks.initialView ?? 'chat';
  let open = hooks.initialOpen ?? true;
  let summaries: ConversationSummary[] = [];
  let lastUnread: boolean | undefined;

  const report = (op: ConversationControllerOp, error: unknown): void => {
    if (hooks.onError) hooks.onError(op, error);
    else console.error(`[conversation-controller] ${op} failed.`, error);
  };

  const mintId = hooks.mintId ?? (() => crypto.randomUUID());

  const seen = (): boolean => activeId !== undefined && view === 'chat' && open;

  const anyUnread = (): boolean =>
    summaries.some((c) => c.id !== (seen() ? activeId : undefined) && isConversationUnread(c));

  /** Edge-fire the unread hook. Called after every state change that can move
   *  the derivation (summaries, the seen legs, the active id). */
  const notifyUnread = (): void => {
    const next = anyUnread();
    if (next !== lastUnread) {
      lastUnread = next;
      hooks.onUnreadChange?.(next);
    }
  };

  const refresh = async (): Promise<void> => {
    try {
      summaries = (await store.list()).slice().sort(byRecency);
      hooks.onSummariesChange?.(summaries);
    } catch (err) {
      report('list', err);
      // Degrade: keep the previous cache rather than blanking the list.
    }
    notifyUnread();
  };

  /** Fire `markRead` when (and only when) all three legs hold, then refresh
   *  so the cached `lastReadAt` moves with the persisted one. */
  const markReadIfSeen = async (): Promise<void> => {
    if (!seen() || !store.markRead) {
      notifyUnread();
      return;
    }
    const id = activeId as string;
    try {
      await store.markRead(id);
      await refresh();
    } catch (err) {
      // Degrades to "unread never clears for this conversation", not a crash.
      report('markRead', err);
      notifyUnread();
    }
  };

  const select = async (id: string): Promise<void> => {
    let messages: ChatMessage[];
    try {
      messages = await store.load(id);
    } catch (err) {
      report('load', err);
      return;
    }
    activeId = id;
    // Fresh array at the boundary (reactivity contract) - never the
    // store's own reference handed through.
    hooks.onMessagesLoad?.([...messages], id);
    await markReadIfSeen();
  };

  return {
    activeId: () => activeId,
    view: () => view,
    open: () => open,
    summaries: () => summaries,
    seen,
    anyUnread,
    select,

    async setOpen(next) {
      open = next;
      await markReadIfSeen();
    },

    async setView(next) {
      view = next;
      await markReadIfSeen();
    },

    startNew() {
      // C-6: clearing the id and the thread is enough; the id itself is
      // minted by the first non-empty saveTurn.
      activeId = undefined;
      hooks.onMessagesLoad?.([], undefined);
      notifyUnread();
    },

    async restore() {
      if (activeId !== undefined) return false;
      await refresh();
      if (summaries.length === 0) return false;
      const newest = summaries[0]; // refresh() already sorted byRecency
      await select(newest.id);
      return activeId === newest.id;
    },

    async saveTurn(messages) {
      if (messages.length === 0) return undefined; // C-6: nothing persists before the first message
      if (activeId === undefined) activeId = mintId();
      const id = activeId;
      try {
        await store.save(id, messages);
      } catch (err) {
        // The thread stays usable; this change is simply not persisted.
        report('save', err);
        notifyUnread();
        return id;
      }
      await markReadIfSeen();
      await refresh();
      return id;
    },

    refresh,
  };
}
