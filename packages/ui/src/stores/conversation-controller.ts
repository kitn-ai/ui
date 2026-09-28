/**
 * The headless conversation controller: the drift-prone glue every composed app used to
 * rewire by hand around a `ConversationStore` — active-id tracking, mint-id-on-first-turn,
 * save-per-turn, auto-restore, and the three-leg "seen" rule for `markRead` — shipped ONCE,
 * framework-free, so `kai-chat` and every block run the SAME policy instead of copies.
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
 * excluding the active conversation only while it is seen; the five list operations
 * (rename / pin / archive / group / delete) delegating to the store or refusing loudly; the
 * group list (read / save / remove) on the same terms; and a failed store call reported
 * rather than swallowed. */
import type { ConversationSummary, ConversationGroup } from '../types';
import type { ChatMessage } from '../web-components/chat/chat-types';
import {
  mostRecentSummary,
  orderedSummaries,
  isConversationUnread,
  type ConversationStore,
} from '../primitives/conversation-store';

/** The named store operations `onError` reports on. */
export type ConversationControllerOp =
  | 'list'
  | 'load'
  | 'save'
  | 'markRead'
  | 'rename'
  | 'setPinned'
  | 'setArchived'
  | 'setGroup'
  | 'listGroups'
  | 'saveGroup'
  | 'removeGroup'
  | 'remove';

export interface ConversationControllerHooks {
  // Fires on `select` (a row tap), `restore` (auto-restore) and `startNew` (an empty array
  // with `id === undefined`). The fresh reference is the kai- reactivity contract,
  // satisfied at this boundary.
  /** Receives loaded messages whenever the controller changes what the thread should
   *  show, with a fresh array reference every call. */
  onMessagesLoad?: (messages: ChatMessage[], id: string | undefined) => void;
  /** Fires after every summary-cache refresh with the fresh array, in the one
   *  list order (archived out, pinned first) - the render feed. */
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
  /** The cached summaries from the last refresh, in the one list order:
   *  archived excluded, pinned first, then recency. */
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
  /** Re-fetch `store.list()` into the summary cache (in the one list order) and
   *  re-derive the unread flag. A failure reports and keeps the old cache. */
  refresh(): Promise<void>;
  /** Retitle a conversation and refresh the cache; the new title lands on the
   *  next `refresh()`. Refuses loudly when the store implements no `rename`. */
  rename(id: string, title: string): Promise<void>;
  /** Pin or unpin a conversation, then refresh; the row moves in the list order.
   *  Refuses loudly when the store implements no `setPinned`. */
  setPinned(id: string, pinned: boolean): Promise<void>;
  /** Archive or unarchive a conversation, then refresh; archiving unlists it
   *  without deleting it. Refuses loudly on a store with no `setArchived`. */
  setArchived(id: string, archived: boolean): Promise<void>;
  /** File a conversation under `groupId` (`undefined` unfiles it), then
   *  refresh; refuses loudly when the store implements no `setGroup`. */
  setGroup(id: string, groupId: string | undefined): Promise<void>;
  /** The store's groups in the one group order, or `[]`; refuses loudly when the
   *  store implements no `listGroups`. Not cached: nothing here derives from them. */
  listGroups(): Promise<ConversationGroup[]>;
  /** Create or update a group record; refuses loudly when the store implements
   *  no `saveGroup`. No refresh follows, see the note below. */
  saveGroup(group: ConversationGroup): Promise<void>;
  /** Delete a group, unfiling its conversations and refreshing; refuses loudly
   *  when the store implements no `removeGroup`. */
  removeGroup(id: string): Promise<void>;
  // Archiving is not deleting, so the stored thread is untouched: what changes is the active
  // pointer and the delivered thread, through the same step `remove()` uses, because an
  // archived row leaves every list and a thread still claiming to show it cannot be navigated
  // back to. Unarchiving does not set the pointer back.
  // Delivers `[]` through `onMessagesLoad` when the deleted conversation was the active
  // one, so no dangling id outlives the delete.
  /** Delete a conversation, clear the active id when it was the active one, and
   *  refresh. Refuses loudly when the store implements no `remove`. */
  remove(id: string): Promise<void>;
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

  /**
   * Refuse LOUDLY. A store that does not implement `method` is read as not supporting the
   * concept (the opt-in contract `ConversationStore` documents), and the one thing this
   * controller must never do is let a surface believe a write landed when nothing was
   * written. A reported error is the surface's signal to explain itself.
   */
  const refuse = (op: ConversationControllerOp, method: string): void => {
    report(op, new Error(`this ConversationStore does not implement ${method}(); nothing was written`));
  };

  /**
   * Drop the active pointer when it points at `id`, delivering the empty thread through the
   * one load path `startNew()` uses. Both operations that take a conversation out of reach
   * call it: `remove()` (the thread is gone) and `setArchived(id, true)` (the stored thread is
   * untouched, but an archived row leaves every list, so a thread still claiming to show it is
   * a state the reader cannot navigate back to). A dangling id would also let the next
   * `saveTurn()` write the conversation straight back. Unarchiving does NOT restore the
   * pointer: this step is one-way, exactly as it is for `remove()`.
   */
  const clearActive = (id: string): void => {
    if (activeId !== id) return;
    activeId = undefined;
    hooks.onMessagesLoad?.([], undefined);
  };

  const refresh = async (): Promise<void> => {
    try {
      summaries = orderedSummaries(await store.list());
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
      // Not `summaries[0]`: that array is pinned-first (the display order), while
      // auto-restore means where the visitor LEFT OFF, which a weeks-old pinned
      // conversation must not win.
      const newest = mostRecentSummary(summaries);
      if (newest === undefined) return false;
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

    async rename(id, title) {
      if (!store.rename) return refuse('rename', 'rename');
      try {
        await store.rename(id, title);
      } catch (err) {
        report('rename', err);
        return;
      }
      await refresh();
    },

    async setPinned(id, pinned) {
      if (!store.setPinned) return refuse('setPinned', 'setPinned');
      try {
        await store.setPinned(id, pinned);
      } catch (err) {
        report('setPinned', err);
        return;
      }
      await refresh();
    },

    async setArchived(id, archived) {
      if (!store.setArchived) return refuse('setArchived', 'setArchived');
      try {
        await store.setArchived(id, archived);
      } catch (err) {
        report('setArchived', err);
        return;
      }
      // Only archiving clears the pointer: unarchiving unlists nothing, so there is no
      // unreachable state to walk out of, and a visitor who archived a conversation is not
      // handed it back as their open thread.
      if (archived) clearActive(id);
      await refresh();
    },

    async setGroup(id, groupId) {
      if (!store.setGroup) return refuse('setGroup', 'setGroup');
      try {
        await store.setGroup(id, groupId);
      } catch (err) {
        report('setGroup', err);
        return;
      }
      // No pointer work, unlike archiving: refiling a row leaves it in the list, so
      // there is no unreachable state to walk out of and nothing to hand back.
      await refresh();
    },

    // A store without the group list refuses on the read as well as the two writes: a
    // consumer that ASKS rather than assuming gets an answer either way, and `[]` plus a
    // reported error is the loud version of "this store keeps no groups" (never a quiet
    // empty rail that reads as "you have not made one").
    async listGroups() {
      if (!store.listGroups) {
        refuse('listGroups', 'listGroups');
        return [];
      }
      try {
        return await store.listGroups();
      } catch (err) {
        report('listGroups', err);
        return [];
      }
    },

    async saveGroup(group) {
      if (!store.saveGroup) return refuse('saveGroup', 'saveGroup');
      try {
        await store.saveGroup(group);
      } catch (err) {
        report('saveGroup', err);
      }
      // NO refresh, unlike every other write here: no field of a `ConversationSummary` is
      // a group's own, so a group record cannot move the cached summaries. The caller's
      // own `listGroups()` is where the new record comes back.
    },

    async removeGroup(id) {
      if (!store.removeGroup) return refuse('removeGroup', 'removeGroup');
      try {
        await store.removeGroup(id);
      } catch (err) {
        report('removeGroup', err);
        return;
      }
      // A refresh, unlike saveGroup: removal UNFILES every conversation filed under the
      // group, so the cached summaries' `groupId`s move and the rail re-projects those rows
      // onto the ungrouped remainder. No pointer work, the reasoning setGroup() carries:
      // an unfiled row stays in the list, so there is no unreachable state and nothing to
      // hand back.
      await refresh();
    },

    async remove(id) {
      if (!store.remove) return refuse('remove', 'remove');
      try {
        await store.remove(id);
      } catch (err) {
        report('remove', err);
        return;
      }
      clearActive(id);
      await refresh();
    },
  };
}
