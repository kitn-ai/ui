/**
 * The conversations data contract: a JS-property interface, never REST/events
 * baked into the format. The kit owns the interface, the
 * payload types (ConversationSummary/ConversationGroup from ../types,
 * ChatMessage from ../web-components/chat/chat-types, reused, never duplicated), and
 * the lifecycle (list() on mount + list-view open, load() on row select,
 * save() on message-array change). The dev owns invocation, retrieval,
 * transport, auth, retention.
 *
 * Two built-ins ship: localStorageStore (auto-wired for history: local) and
 * fetchStore (the recast of codegen.ts's emitHistorySetup endpoint behavior:
 * same key shapes, same x-kai-user-id header, same decide-loudly failure
 * mode, now reusable instead of inlined per-construct).
 *
 * Reachable two ways, deliberately: the package root (bundler consumers) and
 * the self-contained `@kitn.ai/ui/stores` entry (dist/stores.js, zero bare
 * imports) for no-bundler/CDN pages, which cannot load the solid-importing
 * root bundle, see src/stores/index.ts for the decision record.
 */
import type { ConversationSummary } from '../types';
import type { ChatMessage } from '../web-components/chat/chat-types';

export interface ConversationStore {
  // `list()`/`load()` implementations MUST return a fresh array (and, for any
  // item whose content actually differs, a fresh object) on every call —
  // `ChatThread`'s conversation list and the message array it hands back
  // through `onConversationLoad` are both reference-keyed `<For>`s, and a
  // reused array/object reads as "nothing changed" (kai- contract).
  list(): Promise<ConversationSummary[]>;
  load(id: string): Promise<ChatMessage[]>;
  save(id: string, messages: ChatMessage[]): Promise<void>;
  // Persist `ConversationSummary.lastReadAt` for `id`, called by `ChatThread` whenever that
  // conversation counts as seen: it is the active conversation, the chat view (not the
  // list) is showing, and the host is open: on the select/restore transition into that
  // state AND on every new message arriving while it holds (see `ChatThread`'s `hostOpen`
  // prop doc for the third leg, which `ChatThread` cannot know on its own).
  //
  // OPT-IN, not a nice-to-have: omit it and no summary gets a `lastReadAt`, so every
  // unread computation reads "not unread" (that field's absent-means-not-unread default)
  // for every conversation, always. That is a deliberate decide-loudly default, not a
  // gap: a store that never implements `markRead` is read as not supporting the concept,
  // and the UI goes quiet about it rather than guessing "probably unread" from a
  // comparison it has no real signal for. `localStorageStore` implements it below;
  // `fetchStore` deliberately does not (see its own doc) and passes through whatever
  // `lastReadAt` the backend's summaries carry, like every other `ConversationSummary`
  // field, rather than assuming a mark-read endpoint the contract never defined.
  /** Post the conversation's seen timestamp; omit it and the kit never marks anything read. */
  markRead?(id: string): Promise<void>;
  // The five conversation operations an app's own list chrome needs (rename / pin /
  // archive / group / delete). Same OPT-IN terms as `markRead` above, for the same reason: a store
  // that does not implement one is read as not supporting the concept, and
  // `ConversationController` REFUSES LOUDLY (a reported error) rather than pretending the
  // write landed, so the surface that offered the action can say why it did nothing.
  // `localStorageStore` implements all five below; `fetchStore` deliberately implements
  // none (see its own doc) rather than inventing request shapes the contract never
  // defined, and its summaries pass through whatever `pinned`/`archived`/`groupId` the
  // backend already sends.
  /** Retitle `id`, overriding the title `save()` derived from the first message. */
  rename?(id: string, title: string): Promise<void>;
  /** Persist `ConversationSummary.pinned` for `id`; the list order moves on the next `list()`. */
  setPinned?(id: string, pinned: boolean): Promise<void>;
  /** Persist `ConversationSummary.archived` for `id`; an archived conversation leaves every list, keeping its messages. */
  setArchived?(id: string, archived: boolean): Promise<void>;
  // `setGroup` joins them on the same terms, and its optionality is doing real work here:
  // a store that cannot group — one whose summaries it does not own, like `fetchStore` —
  // says so with the method's ABSENCE rather than accepting the call and dropping it, and
  // a consumer who already implemented this interface keeps compiling. What the absent
  // case should do is the CALLER's to handle, never a silent success: the controller
  // refuses loudly with the missing method named (its `refuse` step), and a consumer who
  // calls the store directly has to check for it first, exactly as for `rename`.
  /** File `id` under the group whose `id` is `groupId`; `undefined` unfiles it. */
  setGroup?(id: string, groupId: string | undefined): Promise<void>;
  /** Delete `id` and everything stored under it. */
  remove?(id: string): Promise<void>;
}

export const LEGACY_THREAD_MIGRATED_TITLE = 'Conversation 1';

/** Newest-first ordering over `updatedAt`; rows with a missing or unparsable
 *  timestamp sort last (stable, so ties keep declaration order). The ONE
 *  recency rule: the list panel, ChatThread's restore pick, and the home
 *  screen's recent card all sort with this. */
export function byRecency(
  a: Pick<ConversationSummary, 'updatedAt'>,
  b: Pick<ConversationSummary, 'updatedAt'>,
): number {
  const at = Date.parse(a.updatedAt ?? '');
  const bt = Date.parse(b.updatedAt ?? '');
  return (Number.isNaN(bt) ? -Infinity : bt) - (Number.isNaN(at) ? -Infinity : at);
}

/** Pinned first, then `byRecency`; the comparator half of the one list-order rule.
 *  Stable, so the recency order is untouched inside each of the two halves. */
export function byPinnedThenRecency(
  a: Pick<ConversationSummary, 'pinned' | 'updatedAt'>,
  b: Pick<ConversationSummary, 'pinned' | 'updatedAt'>,
): number {
  const pinned = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  return pinned !== 0 ? pinned : byRecency(a, b);
}

/**
 * The ONE list-order rule, and the reason it is a function rather than a comparison
 * each surface repeats: archived conversations are EXCLUDED (not deleted, and not
 * dimmed: nothing in the kit renders an archived row), pinned ones sort above the
 * recency order, and `byRecency` keeps its usual place below (missing/unparsable
 * `updatedAt` last, stable). `ConversationController.summaries()` and both built-in
 * list surfaces order with this, so a pinned row lands in the same place wherever it is
 * rendered. Returns a fresh array; never mutates the caller's.
 *
 * The two flags default false when absent (see `ConversationSummary`), so a summary
 * stored before they existed sorts exactly as it did before.
 */
export function orderedSummaries(summaries: readonly ConversationSummary[]): ConversationSummary[] {
  return summaries.filter((c) => !c.archived).sort(byPinnedThenRecency);
}

/**
 * The most recent conversation that is still visible (archived ones excluded), or
 * `undefined`. NOT `orderedSummaries(...)[0]`: that array is pinned-first, so a pinned
 * conversation the visitor has not touched in weeks would win the auto-restore pick and
 * the home screen's recent card. Both mean "where they left off", which the pinned-first
 * LIST order is a display decision and this is not.
 */
export function mostRecentSummary(
  summaries: readonly ConversationSummary[],
): ConversationSummary | undefined {
  let newest: ConversationSummary | undefined;
  for (const summary of summaries) {
    if (summary.archived) continue;
    if (newest === undefined || byRecency(summary, newest) < 0) newest = summary;
  }
  return newest;
}

/**
 * Whether a conversation should show an unread indicator. `lastReadAt`'s own doc
 * (`types.ts`) has the full contract; this is the one place that reads it, so every
 * surface (the list row, the widget panel, the home screen's recent card, ChatThread's
 * own badge report, any consumer-composed launcher) derives it identically rather than
 * each restating the comparison. Headless data logic, so it lives here beside the
 * `ConversationStore` contract and is re-exported from the package root.
 *
 * Absent `lastReadAt` reads as NOT unread: the decide-loudly default for a store that
 * never implements `markRead` (every summary it returns leaves the field undefined, so
 * this always returns `false`) rather than guessing "probably unread" from a signal the
 * store never provided. Defensive `Date.parse`, same as `byRecency`: an unparsable date
 * reads as not unread rather than throwing.
 */
export function isConversationUnread(conv: Pick<ConversationSummary, 'updatedAt' | 'lastReadAt'>): boolean {
  if (!conv.lastReadAt) return false;
  const updated = Date.parse(conv.updatedAt);
  const read = Date.parse(conv.lastReadAt);
  if (Number.isNaN(updated) || Number.isNaN(read)) return false;
  return updated > read;
}

function threadKey(name: string, userId: string | undefined, id: string): string {
  return userId ? `kai:${name}:${userId}:thread:${id}` : `kai:${name}:thread:${id}`;
}

function indexKey(name: string, userId: string | undefined): string {
  return userId ? `kai:${name}:${userId}:threads` : `kai:${name}:threads`;
}

/** The legacy pre-conversations single-thread key (codegen.ts's emitHistorySetup). */
function legacyKey(name: string, userId: string | undefined): string {
  return userId ? `kai:${name}:${userId}:thread` : `kai:${name}:thread`;
}

/** ~80-char truncation for the row preview (`ConversationSummary.trailing`,
 *  widget-box list-view reading), an ellipsis appended only when text was
 *  actually cut. Mask nothing: the preview is the model/user's own text,
 *  same trust boundary as the rest of the thread. */
const PREVIEW_LENGTH = 80;
function truncatePreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= PREVIEW_LENGTH) return trimmed;
  return `${trimmed.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
}

export function localStorageStore(name: string, userId?: string): ConversationStore {
  const idxKey = indexKey(name, userId);

  function readIndex(): ConversationSummary[] {
    const raw = localStorage.getItem(idxKey);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('index was not an array');
      return parsed as ConversationSummary[];
    } catch {
      console.warn(`[${idxKey}] stored conversation index was corrupt; ignoring and starting fresh`);
      return [];
    }
  }

  function writeIndex(entries: ConversationSummary[]): void {
    try {
      localStorage.setItem(idxKey, JSON.stringify(entries));
    } catch {
      /* storage unavailable: this browser session runs without persistence */
    }
  }

  /** Merge `patch` into the index entry for `id`. A field patched to `undefined` is
   *  DROPPED by `JSON.stringify`, which is what keeps the stored shape honest with
   *  "absent means false" for the two list-shape flags and "absent means unfiled" for
   *  `groupId`. An id with no entry is a harmless no-op: a write can race ahead of
   *  `save()`'s first index write. */
  function patchEntry(id: string, patch: Partial<ConversationSummary>): void {
    try {
      const entries = readIndex();
      const idx = entries.findIndex((e) => e.id === id);
      if (idx === -1) return;
      const next = [...entries];
      next[idx] = { ...next[idx], ...patch };
      writeIndex(next);
    } catch {
      /* storage unavailable: run in-memory for this tab's lifetime */
    }
  }

  /** C-7, one-way: an existing legacy single-thread key becomes conversation
   *  #1 in the index. Runs at most once, the legacy key is deleted after a
   *  successful migration, so nobody's thread disappears on upgrade and no
   *  second migration can ever fire. */
  function migrateLegacyThread(): void {
    const legacy = legacyKey(name, userId);
    const raw = localStorage.getItem(legacy);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('legacy thread was not an array');
      const messages = parsed as ChatMessage[];
      const id = crypto.randomUUID();
      localStorage.setItem(threadKey(name, userId, id), raw);
      writeIndex([
        ...readIndex(),
        {
          id,
          title: LEGACY_THREAD_MIGRATED_TITLE,
          messageCount: messages.length,
          updatedAt: new Date().toISOString(),
        },
      ]);
      localStorage.removeItem(legacy);
    } catch {
      console.warn(`[${legacy}] legacy thread was corrupt; leaving it in place, unmigrated`);
    }
  }

  return {
    async list() {
      migrateLegacyThread();
      return readIndex();
    },
    async load(id) {
      const raw = localStorage.getItem(threadKey(name, userId, id));
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('stored thread was not an array');
        return parsed as ChatMessage[];
      } catch {
        console.warn(`[${threadKey(name, userId, id)}] stored thread was corrupt; starting empty`);
        return [];
      }
    },
    async save(id, messages) {
      try {
        localStorage.setItem(threadKey(name, userId, id), JSON.stringify(messages));
        const entries = readIndex();
        const now = new Date().toISOString();
        const existing = entries.find((e) => e.id === id);
        const lastText = messages.length
          ? (messages[messages.length - 1].parts.find((p) => p.type === 'text') as { text?: string } | undefined)?.text
          : undefined;
        const next: ConversationSummary = {
          id,
          title: existing?.title ?? lastText?.slice(0, 60) ?? 'New conversation',
          messageCount: messages.length,
          updatedAt: now,
          // The widget-box list view's one-line preview (Task rework,
          // 2026-08-26): unlike `title`, re-derived on EVERY save from the
          // latest message so the preview always reflects where the
          // conversation actually is, not just where it started.
          trailing: lastText ? truncatePreview(lastText) : existing?.trailing,
          // Carried forward unconditionally — save() is a CONTENT event, not
          // a viewing event, so it must never touch lastReadAt itself. Without
          // this, every save() (including one for a conversation the visitor
          // isn't even looking at) would silently wipe its lastReadAt back to
          // undefined, which reads as "not unread" (see that field's own
          // doc) — permanently hiding the exact case unread indicators exist
          // for: a message landing in a conversation nobody is currently
          // seeing. markRead() below is the only writer of this field.
          lastReadAt: existing?.lastReadAt,
          // Carried forward for the same reason, one concept over: a pin or an archive
          // decision is the visitor's, and a turn landing in that conversation (or in
          // any other one) must not quietly undo it. setPinned()/setArchived() are the
          // only writers of these two fields.
          pinned: existing?.pinned,
          archived: existing?.archived,
          // The same argument once more, and the reason neither of these is a field
          // save() may rebuild: which group a conversation is filed under and what it
          // was scoped to are filing decisions the visitor made, exactly like a pin,
          // and a turn arriving later must not quietly ungroup it or drop it back to
          // unscoped (the absent-means-unscoped reading `ConversationSummary.scope`
          // documents). setGroup() is the only writer of groupId; nothing on this store
          // writes scope — a consumer that owns its own scoping seeds it in the index it
          // hands over, and this carry is what keeps that seed alive across the first
          // save().
          groupId: existing?.groupId,
          scope: existing?.scope,
        };
        writeIndex([...entries.filter((e) => e.id !== id), next]);
      } catch {
        /* storage unavailable: run in-memory for this tab's lifetime */
      }
    },
    async markRead(id) {
      patchEntry(id, { lastReadAt: new Date().toISOString() });
    },
    async rename(id, title) {
      patchEntry(id, { title });
    },
    async setPinned(id, pinned) {
      // `false` clears the field rather than storing it: absent already means false, and
      // one spelling per state keeps a stored record readable by the type's own doc.
      patchEntry(id, { pinned: pinned ? true : undefined });
    },
    async setArchived(id, archived) {
      patchEntry(id, { archived: archived ? true : undefined });
    },
    async setGroup(id, groupId) {
      // `undefined` clears the field, the rule setPinned() states one field over: absent
      // already means unfiled (which is the bucket `ConversationList` gives a row with no
      // `groupId`), and one spelling per state keeps a stored record readable by the type's
      // own doc. Any other value is stored verbatim — deciding that `''` means unfiled is
      // not this step's call to make quietly.
      patchEntry(id, { groupId });
    },
    async remove(id) {
      try {
        localStorage.removeItem(threadKey(name, userId, id));
        writeIndex(readIndex().filter((e) => e.id !== id));
      } catch {
        /* storage unavailable: run in-memory for this tab's lifetime */
      }
    },
  };
}

/** The recast of codegen.ts's emitHistorySetup endpoint behavior: the
 *  consumer's own conversation routes. GET {url} -> ConversationSummary[];
 *  GET {url}/:id -> ChatMessage[]; PUT {url}/:id with { messages } -> stored.
 *  x-kai-user-id carries userId on every request, matching the header
 *  codegen.ts already emits for the endpoint provider and the endpoint
 *  history persistence mode. Decide loudly: no request here catches its own
 *  rejection, a caller (ChatThread's lifecycle, Task 2) decides how to
 *  degrade, exactly as the spec's degradation section requires.
 *
 *  No `markRead`, and none of `rename`/`setPinned`/`setArchived`/`setGroup`/`remove`: the
 *  recast contract above has no such endpoints, and inventing request shapes
 *  here would be this adapter deciding a backend behavior rather than passing
 *  one through. `list()`/`load()` already forward whatever `lastReadAt`,
 *  `pinned`, `archived` and `groupId` the backend's own summaries carry, same as any other
 *  `ConversationSummary` field, so a consumer who wants any of these writes
 *  needs their own store (or their own endpoint plus a thin wrapper), same as
 *  any other capability this recast doesn't cover. The caller hears about the
 *  omission rather than discovering it as a silent no-op:
 *  `ConversationController` reports an error for each of these when the store
 *  does not implement it, `setGroup` included — a PUT of `{ messages }` cannot
 *  refile a row whose summary the server owns. */
export function fetchStore(url: string, userId?: string): ConversationStore {
  const headers: Record<string, string> = userId ? { 'x-kai-user-id': userId } : {};
  return {
    async list() {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`GET ${url} responded ${res.status}`);
      return (await res.json()) as ConversationSummary[];
    },
    async load(id) {
      const res = await fetch(`${url}/${id}`, { headers });
      if (!res.ok) throw new Error(`GET ${url}/${id} responded ${res.status}`);
      return (await res.json()) as ChatMessage[];
    },
    async save(id, messages) {
      const res = await fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error(`PUT ${url}/${id} responded ${res.status}`);
    },
  };
}
