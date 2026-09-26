/**
 * The headless conversation controller (P-5): a FAKE ConversationStore driven
 * through the full policy - C-6 mint-on-first-turn, save-per-turn,
 * auto-restore, the three-leg seen rule for markRead (each leg failing
 * INDIVIDUALLY, per the spec's acceptance line), and unread derivation via
 * the public isConversationUnread. Framework-free by construction: nothing
 * here mounts anything - the controller is plain closures, which is what
 * lets it ship on the self-contained dist/stores.js entry.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createConversationController, type ConversationControllerHooks } from './conversation-controller';
import { isConversationUnread, type ConversationStore } from '../primitives/conversation-store';
import type { ConversationSummary } from '../types';
import type { ChatMessage } from '../web-components/chat/chat-types';

const msg = (text: string): ChatMessage => ({
  id: `m-${text}`,
  role: 'user',
  parts: [{ type: 'text', text }],
});

/** In-memory ConversationStore with call recording. `lastReadAt` semantics
 *  mirror localStorageStore: save() never touches it, markRead() is its only
 *  writer. Same for the two list-shape flags, whose only writers are
 *  setPinned()/setArchived(). */
function fakeStore() {
  const threads = new Map<string, ChatMessage[]>();
  const meta = new Map<string, { updatedAt: string; lastReadAt?: string; pinned?: boolean; archived?: boolean; title?: string }>();
  let clock = 1000;
  const now = () => new Date((clock += 1000)).toISOString();
  const calls: string[] = [];
  const store: ConversationStore = {
    async list() {
      calls.push('list');
      return [...threads.keys()].map((id) => ({
        id,
        title: meta.get(id)!.title ?? id,
        messageCount: threads.get(id)!.length,
        updatedAt: meta.get(id)!.updatedAt,
        lastReadAt: meta.get(id)!.lastReadAt,
        pinned: meta.get(id)!.pinned,
        archived: meta.get(id)!.archived,
      })) as ConversationSummary[];
    },
    async load(id) {
      calls.push(`load:${id}`);
      return [...(threads.get(id) ?? [])];
    },
    async save(id, messages) {
      calls.push(`save:${id}:${messages.length}`);
      threads.set(id, [...messages]);
      const prev = meta.get(id);
      meta.set(id, {
        updatedAt: now(),
        lastReadAt: prev?.lastReadAt,
        pinned: prev?.pinned,
        archived: prev?.archived,
        title: prev?.title,
      });
    },
    async markRead(id) {
      calls.push(`markRead:${id}`);
      const m = meta.get(id);
      if (m) m.lastReadAt = now();
    },
    async rename(id, title) {
      calls.push(`rename:${id}:${title}`);
      const m = meta.get(id);
      if (m) m.title = title;
    },
    async setPinned(id, pinned) {
      calls.push(`setPinned:${id}:${pinned}`);
      const m = meta.get(id);
      if (m) m.pinned = pinned ? true : undefined;
    },
    async setArchived(id, archived) {
      calls.push(`setArchived:${id}:${archived}`);
      const m = meta.get(id);
      if (m) m.archived = archived ? true : undefined;
    },
    async remove(id) {
      calls.push(`remove:${id}`);
      threads.delete(id);
      meta.delete(id);
    },
  };
  return { store, calls, threads, meta };
}

const controllerWith = (store: ConversationStore, hooks: ConversationControllerHooks = {}) =>
  createConversationController(store, { mintId: () => 'minted-1', ...hooks });

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('C-6 lazy id + save per turn', () => {
  it('mints no id and saves nothing for an empty thread', async () => {
    const { store, calls } = fakeStore();
    const c = controllerWith(store);
    expect(await c.saveTurn([])).toBeUndefined();
    expect(c.activeId()).toBeUndefined();
    expect(calls.filter((x) => x.startsWith('save'))).toEqual([]);
  });

  it('mints the id on the first non-empty turn and keeps it for later turns', async () => {
    const { store, calls } = fakeStore();
    const c = controllerWith(store);
    expect(await c.saveTurn([msg('one')])).toBe('minted-1');
    expect(c.activeId()).toBe('minted-1');
    expect(await c.saveTurn([msg('one'), msg('two')])).toBe('minted-1');
    expect(calls.filter((x) => x.startsWith('save'))).toEqual(['save:minted-1:1', 'save:minted-1:2']);
  });

  it('startNew clears the id and delivers [] so the NEXT turn mints fresh', async () => {
    const { store } = fakeStore();
    const loads: Array<[number, string | undefined]> = [];
    let n = 0;
    const c = createConversationController(store, {
      mintId: () => `id-${++n}`,
      onMessagesLoad: (m, id) => loads.push([m.length, id]),
    });
    await c.saveTurn([msg('a')]);
    c.startNew();
    expect(c.activeId()).toBeUndefined();
    expect(loads).toEqual([[0, undefined]]);
    expect(await c.saveTurn([msg('b')])).toBe('id-2');
  });

  it('a failed save reports loudly and keeps the controller usable', async () => {
    const { store } = fakeStore();
    store.save = async () => {
      throw new Error('disk on fire');
    };
    const onError = vi.fn();
    const c = controllerWith(store, { onError });
    expect(await c.saveTurn([msg('a')])).toBe('minted-1');
    expect(onError).toHaveBeenCalledWith('save', expect.any(Error));
  });
});

describe('select + auto-restore', () => {
  it('select loads, activates, and delivers a FRESH array through onMessagesLoad', async () => {
    const { store, threads, meta } = fakeStore();
    threads.set('c1', [msg('hello')]);
    meta.set('c1', { updatedAt: new Date(5000).toISOString() });
    let delivered: ChatMessage[] | undefined;
    const c = controllerWith(store, { onMessagesLoad: (m) => (delivered = m) });
    await c.select('c1');
    expect(c.activeId()).toBe('c1');
    expect(delivered).toEqual([msg('hello')]);
    expect(delivered).not.toBe(threads.get('c1')); // reactivity contract: new reference
  });

  it('restore picks the most RECENT conversation (byRecency, not insertion order)', async () => {
    const { store, threads, meta } = fakeStore();
    threads.set('old', [msg('old')]);
    meta.set('old', { updatedAt: new Date(1000).toISOString() });
    threads.set('new', [msg('new')]);
    meta.set('new', { updatedAt: new Date(9000).toISOString() });
    const loads: Array<string | undefined> = [];
    const c = controllerWith(store, { onMessagesLoad: (_m, id) => loads.push(id) });
    expect(await c.restore()).toBe(true);
    expect(c.activeId()).toBe('new');
    expect(loads).toEqual(['new']);
  });

  it('restore is a guarded no-op: empty store, and never fights an active conversation', async () => {
    const { store } = fakeStore();
    const c = controllerWith(store);
    expect(await c.restore()).toBe(false); // empty store
    await c.saveTurn([msg('a')]);
    expect(await c.restore()).toBe(false); // already active
    expect(c.activeId()).toBe('minted-1');
  });

  it('a failed load reports and leaves state untouched', async () => {
    const { store } = fakeStore();
    store.load = async () => {
      throw new Error('gone');
    };
    const onError = vi.fn();
    const c = controllerWith(store, { onError });
    await c.select('nope');
    expect(c.activeId()).toBeUndefined();
    expect(onError).toHaveBeenCalledWith('load', expect.any(Error));
  });
});

describe('conversation operations (rename / pin / archive / delete)', () => {
  /** Two saved conversations, the later one active, with the recorder cleared. */
  async function seeded(over: ConversationControllerHooks = {}) {
    const f = fakeStore();
    f.threads.set('c1', [msg('first')]);
    f.meta.set('c1', { updatedAt: new Date(1000).toISOString() });
    f.threads.set('c2', [msg('second')]);
    f.meta.set('c2', { updatedAt: new Date(9000).toISOString() });
    const c = controllerWith(f.store, over);
    await c.refresh();
    f.calls.length = 0;
    return { ...f, c };
  }

  it('rename() delegates, then refreshes so the cached title is the stored one', async () => {
    const { c, calls } = await seeded();
    await c.rename('c1', 'Renamed');
    expect(calls).toEqual(['rename:c1:Renamed', 'list']);
    expect(c.summaries().find((s) => s.id === 'c1')?.title).toBe('Renamed');
  });

  it('setPinned(true) delegates and the row moves to the front of summaries()', async () => {
    const { c, calls } = await seeded();
    expect(c.summaries().map((s) => s.id)).toEqual(['c2', 'c1']);
    await c.setPinned('c1', true);
    expect(calls).toEqual(['setPinned:c1:true', 'list']);
    expect(c.summaries().map((s) => s.id)).toEqual(['c1', 'c2']);
    await c.setPinned('c1', false);
    expect(c.summaries().map((s) => s.id)).toEqual(['c2', 'c1']);
  });

  it('setArchived(true) takes the conversation out of summaries() without deleting it', async () => {
    const { c, threads } = await seeded();
    await c.setArchived('c1', true);
    expect(c.summaries().map((s) => s.id)).toEqual(['c2']);
    expect(threads.get('c1')).toEqual([msg('first')]); // still stored, just unlisted
  });

  it('restore() skips an archived conversation and never picks a pinned-old one over the newest', async () => {
    const f = fakeStore();
    f.threads.set('pinned-old', [msg('old')]);
    f.meta.set('pinned-old', { updatedAt: new Date(1000).toISOString(), pinned: true });
    f.threads.set('archived-newest', [msg('archived')]);
    f.meta.set('archived-newest', { updatedAt: new Date(9000).toISOString(), archived: true });
    f.threads.set('newest-visible', [msg('recent')]);
    f.meta.set('newest-visible', { updatedAt: new Date(5000).toISOString() });
    const c = controllerWith(f.store);
    expect(await c.restore()).toBe(true);
    expect(c.activeId()).toBe('newest-visible');
  });

  it('remove() of the ACTIVE conversation clears the active id and delivers the empty thread', async () => {
    const loads: Array<[number, string | undefined]> = [];
    const f = fakeStore();
    f.threads.set('c1', [msg('first')]);
    f.meta.set('c1', { updatedAt: new Date(1000).toISOString() });
    const c = controllerWith(f.store, { onMessagesLoad: (m, id) => loads.push([m.length, id]) });
    await c.select('c1');
    loads.length = 0;
    f.calls.length = 0;
    await c.remove('c1');
    expect(c.activeId()).toBeUndefined();
    expect(loads).toEqual([[0, undefined]]);
    expect(f.calls).toEqual(['remove:c1', 'list']);
    expect(c.summaries()).toEqual([]);
  });

  it('remove() of a BACKGROUND conversation leaves the active thread alone', async () => {
    const loads: Array<[number, string | undefined]> = [];
    const { c } = await seeded({ onMessagesLoad: (m, id) => loads.push([m.length, id]) });
    await c.select('c2');
    loads.length = 0;
    await c.remove('c1');
    expect(c.activeId()).toBe('c2');
    expect(loads).toEqual([]);
  });

  it('setArchived(true) on the ACTIVE conversation clears the active id and delivers the empty thread', async () => {
    const loads: Array<[number, string | undefined]> = [];
    const { c, threads } = await seeded({ onMessagesLoad: (m, id) => loads.push([m.length, id]) });
    await c.select('c2');
    loads.length = 0;
    await c.setArchived('c2', true);
    expect(c.activeId()).toBeUndefined();
    expect(loads).toEqual([[0, undefined]]);
    expect(c.summaries().map((s) => s.id)).toEqual(['c1']);
    // Archiving is not deleting: the stored thread is untouched, only the active
    // pointer and the delivered thread changed.
    expect(threads.get('c2')).toEqual([msg('second')]);
  });

  it('setArchived(true) of a BACKGROUND conversation leaves the active thread alone', async () => {
    const loads: Array<[number, string | undefined]> = [];
    const { c } = await seeded({ onMessagesLoad: (m, id) => loads.push([m.length, id]) });
    await c.select('c2');
    loads.length = 0;
    await c.setArchived('c1', true);
    expect(c.activeId()).toBe('c2');
    expect(loads).toEqual([]);
  });

  it('unarchiving does not resurrect an active id', async () => {
    const loads: Array<[number, string | undefined]> = [];
    const { c } = await seeded({ onMessagesLoad: (m, id) => loads.push([m.length, id]) });
    await c.select('c2');
    await c.setArchived('c2', true); // the clearing step
    loads.length = 0;
    await c.setArchived('c2', false);
    expect(c.activeId()).toBeUndefined();
    expect(loads).toEqual([]);
    // Back in the list, but not back as the open thread.
    expect(c.summaries().map((s) => s.id)).toEqual(['c2', 'c1']);
  });

  it('a store without the op REFUSES LOUDLY for each of the four — a reported error, never a silent no-op', async () => {
    const onError = vi.fn();
    const f = fakeStore();
    f.threads.set('c1', [msg('first')]);
    f.meta.set('c1', { updatedAt: new Date(1000).toISOString() });
    delete (f.store as { rename?: unknown }).rename;
    delete (f.store as { setPinned?: unknown }).setPinned;
    delete (f.store as { setArchived?: unknown }).setArchived;
    delete (f.store as { remove?: unknown }).remove;
    const c = controllerWith(f.store, { onError });
    await c.rename('c1', 'Renamed');
    await c.setPinned('c1', true);
    await c.setArchived('c1', true);
    await c.remove('c1');
    expect(onError.mock.calls.map(([op]) => op)).toEqual(['rename', 'setPinned', 'setArchived', 'remove']);
    // Nothing was written, and the refusal changed no state: the caller keeps a
    // usable controller and an honest view of what happened.
    expect(f.calls).toEqual([]);
    expect(c.activeId()).toBeUndefined();
  });

  it('a store WITHOUT onError still reports the refusal on the console rather than vanishing', async () => {
    const f = fakeStore();
    delete (f.store as { rename?: unknown }).rename;
    const c = controllerWith(f.store);
    await c.rename('c1', 'Renamed');
    expect(errorSpy).toHaveBeenCalledWith(
      '[conversation-controller] rename failed.',
      expect.any(Error),
    );
  });

  it('a failed write reports its own op and leaves the cache as it was', async () => {
    const f = fakeStore();
    f.threads.set('c1', [msg('first')]);
    f.meta.set('c1', { updatedAt: new Date(1000).toISOString() });
    f.store.setPinned = async () => {
      throw new Error('disk on fire');
    };
    const onError = vi.fn();
    const c = controllerWith(f.store, { onError });
    await c.refresh();
    await c.setPinned('c1', true);
    expect(onError).toHaveBeenCalledWith('setPinned', expect.any(Error));
    expect(c.summaries().map((s) => s.id)).toEqual(['c1']);
  });
});

describe('the three-leg seen rule for markRead', () => {
  /** Seed one saved active conversation with all three legs about to hold. */
  async function seeded(over: ConversationControllerHooks = {}) {
    const f = fakeStore();
    const c = controllerWith(f.store, over);
    await c.saveTurn([msg('a')]); // open=true, view='chat', active -> seen
    f.calls.length = 0;
    return { ...f, c };
  }

  it('all three legs holding: a turn arriving while seen marks read', async () => {
    const { c, calls } = await seeded();
    await c.saveTurn([msg('a'), msg('b')]);
    expect(calls).toContain('markRead:minted-1');
    expect(c.seen()).toBe(true);
  });

  it('leg 1 fails alone - host closed: no markRead, other legs intact', async () => {
    const { c, calls } = await seeded();
    await c.setOpen(false);
    calls.length = 0;
    await c.saveTurn([msg('a'), msg('b')]);
    expect(c.view()).toBe('chat');
    expect(c.activeId()).toBe('minted-1');
    expect(c.seen()).toBe(false);
    expect(calls.filter((x) => x.startsWith('markRead'))).toEqual([]);
  });

  it('leg 2 fails alone - not the chat view: no markRead, other legs intact', async () => {
    const { c, calls } = await seeded();
    await c.setView('list');
    calls.length = 0;
    await c.saveTurn([msg('a'), msg('b')]);
    expect(c.open()).toBe(true);
    expect(c.activeId()).toBe('minted-1');
    expect(c.seen()).toBe(false);
    expect(calls.filter((x) => x.startsWith('markRead'))).toEqual([]);
  });

  it('leg 3 fails alone - no active conversation: no markRead', async () => {
    const f = fakeStore();
    const c = controllerWith(f.store);
    await c.setOpen(true);
    await c.setView('chat');
    expect(c.seen()).toBe(false);
    expect(f.calls.filter((x) => x.startsWith('markRead'))).toEqual([]);
  });

  it('the TRANSITION into seen fires markRead: reopening the host', async () => {
    const { c, calls } = await seeded();
    await c.setOpen(false);
    calls.length = 0;
    await c.setOpen(true);
    expect(calls).toContain('markRead:minted-1');
  });

  it('the TRANSITION into seen fires markRead: returning to the chat view', async () => {
    const { c, calls } = await seeded();
    await c.setView('list');
    calls.length = 0;
    await c.setView('chat');
    expect(calls).toContain('markRead:minted-1');
  });

  it('a store with no markRead (the opt-in switch off) is never called and never crashes', async () => {
    const f = fakeStore();
    delete (f.store as { markRead?: unknown }).markRead;
    const c = controllerWith(f.store);
    await c.saveTurn([msg('a')]);
    await c.setOpen(false);
    await c.setOpen(true);
    expect(f.calls.filter((x) => x.startsWith('markRead'))).toEqual([]);
  });
});

describe('unread derivation (via the public isConversationUnread)', () => {
  it('a message landing on a background conversation raises anyUnread; selecting it clears it', async () => {
    const { store, threads, meta } = fakeStore();
    // Two conversations: "other" got a message after it was last read.
    threads.set('other', [msg('x')]);
    meta.set('other', {
      updatedAt: new Date(9000).toISOString(),
      lastReadAt: new Date(2000).toISOString(),
    });
    const unreadEdges: boolean[] = [];
    const c = controllerWith(store, { onUnreadChange: (u) => unreadEdges.push(u) });
    await c.refresh();
    // Sanity: the derivation IS the public primitive, not a restatement.
    expect(c.summaries().some(isConversationUnread)).toBe(true);
    expect(c.anyUnread()).toBe(true);
    expect(unreadEdges).toEqual([true]);
    // Selecting it while open+chat marks it read and the flag falls.
    await c.select('other');
    expect(c.anyUnread()).toBe(false);
    expect(unreadEdges).toEqual([true, false]);
  });

  it('the active conversation is unread-eligible while the host is CLOSED (the agent-replied-while-shut case)', async () => {
    const f = fakeStore();
    const c = controllerWith(f.store);
    await c.saveTurn([msg('a')]); // seen -> marked read
    await c.setOpen(false);
    // A new turn lands while closed: save fires (markRead correctly does not),
    // so updatedAt moves past lastReadAt.
    await c.saveTurn([msg('a'), msg('b')]);
    expect(c.anyUnread()).toBe(true);
    // Reopen: the seen transition marks it read and the badge falls.
    await c.setOpen(true);
    expect(c.anyUnread()).toBe(false);
  });
});
