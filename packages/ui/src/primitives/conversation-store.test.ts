import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  localStorageStore,
  fetchStore,
  byRecency,
  orderedSummaries,
  mostRecentSummary,
  isConversationUnread,
  orderedGroups,
} from './conversation-store';
import type { ConversationSummary, ConversationGroup } from '../types';
import type { ChatMessage } from '../web-components/chat/chat-types';

const INDEX_KEY = 'kai:acme-support:threads';
const storedIndex = (): ConversationSummary[] =>
  JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as ConversationSummary[];

const msg = (id: string, text: string): ChatMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
});

beforeEach(() => {
  localStorage.clear();
});

describe('localStorageStore — C-7 migration', () => {
  it('promotes an existing legacy single-thread key into conversation #1 on first list()', async () => {
    // The legacy key shape from codegen.ts's emitHistorySetup: kai:{name}:{userId?}:thread
    localStorage.setItem(
      'kai:acme-support:thread',
      JSON.stringify([msg('u1', 'hello')]),
    );
    const store = localStorageStore('acme-support');
    const summaries = await store.list();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].messageCount).toBe(1);
    const migratedId = summaries[0].id;
    const loaded = await store.load(migratedId);
    expect(loaded).toEqual([msg('u1', 'hello')]);
    // One-way: the legacy key is gone, a second list() sees no second migration.
    expect(localStorage.getItem('kai:acme-support:thread')).toBeNull();
    const again = await store.list();
    expect(again).toHaveLength(1);
    expect(again[0].id).toBe(migratedId);
  });

  it('no legacy key: list() starts empty, nothing fabricated', async () => {
    const store = localStorageStore('acme-support');
    expect(await store.list()).toEqual([]);
  });
});

describe('localStorageStore — save/load/list round trip', () => {
  it('save() creates an index entry with a real messageCount and updatedAt; load() round-trips messages', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi'), msg('a1', 'hello there')]);
    const [summary] = await store.list();
    expect(summary.id).toBe('c1');
    expect(summary.messageCount).toBe(2);
    expect(typeof summary.updatedAt).toBe('string');
    expect(await store.load('c1')).toEqual([msg('u1', 'hi'), msg('a1', 'hello there')]);
  });

  it('per-userId namespacing keeps two users\' stores disjoint', async () => {
    const alice = localStorageStore('acme-support', 'alice');
    const bob = localStorageStore('acme-support', 'bob');
    await alice.save('c1', [msg('u1', 'alice msg')]);
    expect(await bob.list()).toEqual([]);
  });

  it('decide loudly: a corrupt index entry does not throw — list() drops it and warns', async () => {
    localStorage.setItem('kai:acme-support:threads', '{not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = localStorageStore('acme-support');
    expect(await store.list()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('decide loudly: a thread record that parses but is not an array warns and returns []', async () => {
    const store = localStorageStore('acme-support');
    localStorage.setItem('kai:acme-support:thread:c1', JSON.stringify({ not: 'an array' }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await store.load('c1')).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('happy path load() stays warn-free', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await store.load('c1')).toEqual([msg('u1', 'hi')]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// Widget-box list view (owner rework, 2026-08-26): the row preview reuses
// ConversationSummary.trailing rather than widening the type — derived from
// the LAST message's text part on every save(), truncated to ~80 chars.
describe('localStorageStore — trailing (widget-box list-view last-message preview)', () => {
  it('save() sets trailing to the last message text when it fits within ~80 chars', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi there')]);
    const [summary] = await store.list();
    expect(summary.trailing).toBe('hi there');
  });

  it('trailing tracks the LATEST message, unlike title which is fixed from the first', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'first question')]);
    await store.save('c1', [msg('u1', 'first question'), msg('a1', 'first answer')]);
    const [summary] = await store.list();
    expect(summary.title).toBe('first question');
    expect(summary.trailing).toBe('first answer');
  });

  it('a last message longer than 80 chars is truncated with a trailing ellipsis', async () => {
    const store = localStorageStore('acme-support');
    const long = 'x'.repeat(120);
    await store.save('c1', [msg('u1', long)]);
    const [summary] = await store.list();
    expect(summary.trailing).toHaveLength(81); // 80 chars + the ellipsis char
    expect(summary.trailing?.endsWith('…')).toBe(true);
    expect(summary.trailing?.startsWith('x'.repeat(80))).toBe(true);
  });

  it('a save() with no text part (e.g. only a card/tool part) leaves the previous trailing untouched', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi there')]);
    const nonText: ChatMessage = { id: 'a1', role: 'assistant', parts: [{ type: 'tool', tool: { type: 'search', state: 'input-available' } }] };
    await store.save('c1', [msg('u1', 'hi there'), nonText]);
    const [summary] = await store.list();
    expect(summary.trailing).toBe('hi there');
  });
});

// Unread indicators (owner round, 2026-08-26). isConversationUnread
// (conversation-item.tsx) owns the pure "updatedAt > lastReadAt" comparison
// (its own test file pins that); this describes ONLY the adapter's
// persistence half — markRead() actually writing lastReadAt, and save() no
// longer wiping it out.
describe('localStorageStore — markRead (unread indicators persistence)', () => {
  it('markRead() sets lastReadAt on the index entry', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi there')]);
    await store.markRead!('c1');
    const [summary] = await store.list();
    expect(typeof summary.lastReadAt).toBe('string');
    expect(Number.isNaN(Date.parse(summary.lastReadAt!))).toBe(false);
  });

  it('a conversation with no lastReadAt yet (never marked read) has none — the decide-loudly default applies until markRead() runs', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi there')]);
    const [summary] = await store.list();
    expect(summary.lastReadAt).toBeUndefined();
  });

  it('markRead() on an id with no index entry yet is a harmless no-op (never throws, never creates a phantom entry)', async () => {
    const store = localStorageStore('acme-support');
    await expect(store.markRead!('never-saved')).resolves.toBeUndefined();
    expect(await store.list()).toEqual([]);
  });

  it('save() carries lastReadAt forward — a message arriving to a conversation nobody is looking at must not silently wipe its read state', async () => {
    const store = localStorageStore('acme-support');
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));
      await store.save('c1', [msg('u1', 'hi there')]);
      await store.markRead!('c1');
      const [{ lastReadAt: markedAt }] = await store.list();
      // A second save (as if a new message just landed LATER) — the exact
      // scenario unread indicators exist for: it must NOT reset lastReadAt
      // to undefined.
      vi.setSystemTime(new Date('2026-08-26T12:05:00.000Z'));
      await store.save('c1', [msg('u1', 'hi there'), msg('a1', 'a reply')]);
      const [summary] = await store.list();
      expect(summary.lastReadAt).toBe(markedAt);
      // And the derivation now correctly reads this as unread (a real message
      // arrived after the last time anyone saw it).
      expect(isConversationUnread(summary)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('markRead() after that later save() clears the unread state (updatedAt no longer newer than lastReadAt)', async () => {
    const store = localStorageStore('acme-support');
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));
      await store.save('c1', [msg('u1', 'hi there')]);
      await store.markRead!('c1');
      vi.setSystemTime(new Date('2026-08-26T12:05:00.000Z'));
      await store.save('c1', [msg('u1', 'hi there'), msg('a1', 'a reply')]);
      vi.setSystemTime(new Date('2026-08-26T12:06:00.000Z'));
      await store.markRead!('c1');
      const [summary] = await store.list();
      expect(isConversationUnread(summary)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('fetchStore', () => {
  it('has no markRead of its own — it passes through whatever lastReadAt the backend already sends, never invents a write endpoint', () => {
    const store = fetchStore('/api/conversations');
    expect(store.markRead).toBeUndefined();
  });

  it('implements none of rename/setPinned/setArchived/setGroup/remove/listGroups/saveGroup/removeGroup — the recast contract has no such endpoints, so the omission surfaces at the controller instead of as a silent no-op', () => {
    const store = fetchStore('/api/conversations');
    expect(store.rename).toBeUndefined();
    expect(store.setPinned).toBeUndefined();
    expect(store.setArchived).toBeUndefined();
    expect(store.setGroup).toBeUndefined();
    expect(store.remove).toBeUndefined();
    expect(store.listGroups).toBeUndefined();
    expect(store.saveGroup).toBeUndefined();
    expect(store.removeGroup).toBeUndefined();
  });

  it('list() GETs the index endpoint with the x-kai-user-id header when userId is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'c1', title: 'Order help', messageCount: 3, updatedAt: '2026-08-26T00:00:00Z' }],
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = fetchStore('/api/conversations', 'user_123');
    const out = await store.list();
    expect(out).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations',
      expect.objectContaining({ headers: expect.objectContaining({ 'x-kai-user-id': 'user_123' }) }),
    );
    vi.unstubAllGlobals();
  });

  it('decide loudly: a rejected list() fetch propagates (never swallowed to [])', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const store = fetchStore('/api/conversations');
    await expect(store.list()).rejects.toThrow('offline');
    vi.unstubAllGlobals();
  });

  it('save() PUTs to /:id with JSON.stringify\'d messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const store = fetchStore('/api/conversations');
    await store.save('c1', [msg('u1', 'hi')]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/c1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ messages: [msg('u1', 'hi')] }) }),
    );
    vi.unstubAllGlobals();
  });
});

describe('localStorageStore — rename / setPinned / setArchived / setGroup / remove (opt-in conversation ops)', () => {
  it('rename() retitles the index entry and leaves the messages alone', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'book a demo')]);
    await store.rename!('c1', 'Demo booking');
    const [summary] = await store.list();
    expect(summary.title).toBe('Demo booking');
    expect(await store.load('c1')).toEqual([msg('u1', 'book a demo')]);
  });

  it('rename() survives the next save() — a turn arriving later must not put the derived title back', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'book a demo')]);
    await store.rename!('c1', 'Demo booking');
    await store.save('c1', [msg('u1', 'book a demo'), msg('a1', 'sure')]);
    const [summary] = await store.list();
    expect(summary.title).toBe('Demo booking');
  });

  it('setPinned() round-trips true, and unpinning clears the field rather than storing a false', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    await store.setPinned!('c1', true);
    expect((await store.list())[0].pinned).toBe(true);
    await store.setPinned!('c1', false);
    const [summary] = await store.list();
    expect(summary.pinned).toBeUndefined();
    // Absent, not `false`: one spelling per state, so a stored record reads the
    // same whatever wrote it.
    expect(storedIndex()[0].pinned).toBeUndefined();
  });

  it('setArchived() round-trips true, and unarchiving clears the field', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    await store.setArchived!('c1', true);
    expect((await store.list())[0].archived).toBe(true);
    await store.setArchived!('c1', false);
    const [summary] = await store.list();
    expect(summary.archived).toBeUndefined();
    expect(storedIndex()[0].archived).toBeUndefined();
  });

  it('setGroup() files the row under a group, and clearing it drops the field rather than storing an empty one', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    await store.setGroup!('c1', 'today');
    expect((await store.list())[0].groupId).toBe('today');
    await store.setGroup!('c1', undefined);
    const [summary] = await store.list();
    expect(summary.groupId).toBeUndefined();
    // Absent, not '': one spelling per state, the same rule setPinned() follows.
    expect(storedIndex()[0].groupId).toBeUndefined();
  });

  it('a group survives a save() — the consumer story: file a conversation, send it a message, it is still filed', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'book a demo')]);
    await store.setGroup!('c1', 'today');
    await store.save('c1', [msg('u1', 'book a demo'), msg('a1', 'sure')]);
    expect((await store.list())[0].groupId).toBe('today');
  });

  it('save() carries pinned and archived forward — the same reason it carries lastReadAt: a content event must not undo a decision', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    await store.setPinned!('c1', true);
    await store.setArchived!('c1', true);
    await store.save('c1', [msg('u1', 'hi'), msg('a1', 'hello')]);
    const [summary] = await store.list();
    expect(summary.pinned).toBe(true);
    expect(summary.archived).toBe(true);
  });

  it('remove() drops both the index entry and the stored thread', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    await store.save('c2', [msg('u1', 'other')]);
    await store.remove!('c1');
    expect((await store.list()).map((s) => s.id)).toEqual(['c2']);
    expect(await store.load('c1')).toEqual([]);
    expect(localStorage.getItem('kai:acme-support:thread:c1')).toBeNull();
  });

  it('an op on an id with no index entry is a harmless no-op — never throws, never creates a phantom entry', async () => {
    const store = localStorageStore('acme-support');
    await expect(store.rename!('never-saved', 'x')).resolves.toBeUndefined();
    await expect(store.setPinned!('never-saved', true)).resolves.toBeUndefined();
    await expect(store.setArchived!('never-saved', true)).resolves.toBeUndefined();
    await expect(store.setGroup!('never-saved', 'today')).resolves.toBeUndefined();
    await expect(store.remove!('never-saved')).resolves.toBeUndefined();
    expect(await store.list()).toEqual([]);
  });

  it('a record stored BEFORE these fields existed loads unchanged and reads as unpinned and unarchived', async () => {
    // The exact data already on users' machines: an index written by the version
    // that had no pin/archive concept.
    localStorage.setItem(
      INDEX_KEY,
      JSON.stringify([
        { id: 'c1', title: 'Older conversation', messageCount: 2, updatedAt: '2026-08-01T00:00:00.000Z' },
      ]),
    );
    const [summary] = await localStorageStore('acme-support').list();
    expect(summary.pinned).toBeUndefined();
    expect(summary.archived).toBeUndefined();
    // Which is what the one list-order rule reads as false for both flags.
    expect(orderedSummaries([summary]).map((s) => s.id)).toEqual(['c1']);
  });
});

const GROUPS_KEY = 'kai:acme-support:groups';

// The group list, designed from the consumer that needs it: a created group has to
// have somewhere canonical to live, or the app keeps it in a key of its own and says
// so in the UI.
describe('localStorageStore — groups (listGroups / saveGroup / removeGroup)', () => {
  const group = (id: string, name: string, sortOrder: number): ConversationGroup => ({
    id,
    name,
    sortOrder,
    createdAt: '2026-09-27T00:00:00.000Z',
  });

  it('saveGroup() creates a group and listGroups() hands it back — a created group survives list()', async () => {
    const store = localStorageStore('acme-support');
    await store.saveGroup!(group('g1', 'Release notes', 0));
    expect(await store.listGroups!()).toEqual([group('g1', 'Release notes', 0)]);
    // Its own key, not smuggled into the conversation index: the two lists are
    // entities with different shapes and one must not be read as the other.
    expect(JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '[]')).toEqual([group('g1', 'Release notes', 0)]);
  });

  it('listGroups() is the one group order — sortOrder ascending, ties keeping the order they were saved in', async () => {
    // Saved deliberately NOT in sortOrder, so an accidental declaration-order
    // pass cannot cover for a missing sort.
    const store = localStorageStore('acme-support');
    await store.saveGroup!(group('g-late', 'Zulu', 20));
    await store.saveGroup!(group('g-tie-b', 'Second of the tie', 10));
    await store.saveGroup!(group('g-tie-a', 'First of the tie', 10));
    expect((await store.listGroups!()).map((g) => g.id)).toEqual(['g-tie-b', 'g-tie-a', 'g-late']);
  });

  it('saveGroup() on an existing id REPLACES it — create-or-update keyed on the id, never a second entry', async () => {
    const store = localStorageStore('acme-support');
    await store.saveGroup!(group('g1', 'Draft', 0));
    await store.saveGroup!(group('g1', 'Release notes', 5));
    expect(await store.listGroups!()).toEqual([group('g1', 'Release notes', 5)]);
  });

  it('removeGroup() deletes the group and UNFILES the conversations filed under it — no conversation is deleted', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'filed here')]);
    await store.setGroup!('c1', 'g1');
    await store.saveGroup!(group('g1', 'Release notes', 0));
    await store.removeGroup!('g1');
    expect(await store.listGroups!()).toEqual([]);
    // The conversation survives, whole: unfiled, not gone.
    const [summary] = await store.list();
    expect(summary.id).toBe('c1');
    expect(summary.groupId).toBeUndefined();
    expect(await store.load('c1')).toEqual([msg('u1', 'filed here')]);
  });

  it('removeGroup() of an id nobody created is a no-op — a conversation filed by hand keeps its filing', async () => {
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi')]);
    await store.setGroup!('c1', 'g-typed-by-hand');
    await expect(store.removeGroup!('g-missing')).resolves.toBeUndefined();
    expect((await store.list())[0].groupId).toBe('g-typed-by-hand');
  });

  it('per-userId namespacing keeps two users\' group lists disjoint', async () => {
    const alice = localStorageStore('acme-support', 'alice');
    const bob = localStorageStore('acme-support', 'bob');
    await alice.saveGroup!(group('g1', 'Alice only', 0));
    expect(await bob.listGroups!()).toEqual([]);
  });

  it('decide loudly: a corrupt group list does not throw — listGroups() drops it and warns', async () => {
    localStorage.setItem(GROUPS_KEY, '{not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = localStorageStore('acme-support');
    expect(await store.listGroups!()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('orderedGroups() is the exported one group order: a fresh array, the caller\'s never mutated', () => {
    const given: ConversationGroup[] = [group('b', 'B', 1), group('a', 'A', 0)];
    expect(orderedGroups(given).map((g) => g.id)).toEqual(['a', 'b']);
    expect(given.map((g) => g.id)).toEqual(['b', 'a']);
  });
});

// One seam, every field a save() must not decide on the visitor's behalf: the
// read state, the two list-shape flags, and where the conversation is filed.
describe('localStorageStore — save() carries the visitor\'s own fields forward', () => {
  it('save() carries groupId and scope forward — where a conversation is filed is the visitor\'s decision, same as a pin', async () => {
    // The index is the only door for these two: nothing on this store writes
    // them, so a summary that carries them was seeded by the consumer that owns
    // the filing.
    localStorage.setItem(
      INDEX_KEY,
      JSON.stringify([
        {
          id: 'c1',
          title: 'Filing',
          groupId: 'today',
          scope: { type: 'document', documentId: 'doc-1' },
          messageCount: 1,
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ]),
    );
    const store = localStorageStore('acme-support');
    await store.save('c1', [msg('u1', 'hi there'), msg('a1', 'a reply')]);
    const [summary] = await store.list();
    expect(summary.groupId).toBe('today');
    expect(summary.scope).toEqual({ type: 'document', documentId: 'doc-1' });
  });

  it('the carries do not compete — a filed, scoped, pinned, archived, marked-read conversation survives the same save()', async () => {
    localStorage.setItem(
      INDEX_KEY,
      JSON.stringify([
        { id: 'c1', title: 'Filing', groupId: 'today', scope: { type: 'document' }, messageCount: 1, updatedAt: '2026-08-01T00:00:00.000Z' },
      ]),
    );
    const store = localStorageStore('acme-support');
    await store.setPinned!('c1', true);
    await store.setArchived!('c1', true);
    await store.markRead!('c1');
    const [{ lastReadAt: markedAt }] = await store.list();
    await store.save('c1', [msg('u1', 'hi there'), msg('a1', 'a reply')]);
    const [summary] = await store.list();
    expect(summary.groupId).toBe('today');
    expect(summary.scope).toEqual({ type: 'document' });
    expect(summary.pinned).toBe(true);
    expect(summary.archived).toBe(true);
    expect(summary.lastReadAt).toBe(markedAt);
  });
});

describe('orderedSummaries / mostRecentSummary (the one list-order rule)', () => {
  const conv = (
    id: string,
    updatedAt: string,
    flags: { pinned?: boolean; archived?: boolean } = {},
  ): ConversationSummary => ({ id, title: id, messageCount: 1, updatedAt, ...flags });

  it('excludes archived rows, hoists pinned ones, and keeps recency inside each half', () => {
    const rows = [
      conv('newest', '2026-08-05T00:00:00Z'),
      conv('archived', '2026-08-04T00:00:00Z', { archived: true }),
      conv('pinned-old', '2026-08-01T00:00:00Z', { pinned: true }),
      conv('oldest', '2026-08-02T00:00:00Z'),
      conv('pinned-new', '2026-08-03T00:00:00Z', { pinned: true }),
    ];
    expect(orderedSummaries(rows).map((r) => r.id)).toEqual([
      'pinned-new',
      'pinned-old',
      'newest',
      'oldest',
    ]);
  });

  it('returns a fresh array and never reorders the caller\'s', () => {
    const rows = [conv('a', '2026-08-01T00:00:00Z'), conv('b', '2026-08-05T00:00:00Z', { pinned: true })];
    const ordered = orderedSummaries(rows);
    expect(ordered).not.toBe(rows);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('a rows set with no flags at all is exactly byRecency (the pre-pin behaviour, unchanged)', () => {
    const rows = [conv('a', '2026-08-01T00:00:00Z'), conv('b', 'not-a-date'), conv('c', '2026-08-05T00:00:00Z')];
    expect(orderedSummaries(rows).map((r) => r.id)).toEqual([...rows].sort(byRecency).map((r) => r.id));
  });

  it('mostRecentSummary() is the newest VISIBLE row — a pin does not win it, an archived row is not eligible', () => {
    const rows = [
      conv('pinned-old', '2026-08-01T00:00:00Z', { pinned: true }),
      conv('newest-archived', '2026-08-09T00:00:00Z', { archived: true }),
      conv('newest-visible', '2026-08-05T00:00:00Z'),
    ];
    expect(mostRecentSummary(rows)?.id).toBe('newest-visible');
    expect(mostRecentSummary(rows.filter((r) => r.archived))).toBeUndefined();
  });
});

describe('byRecency (shared comparator, issue #335)', () => {
  it('sorts newest first and pushes invalid/missing updatedAt to the end', () => {
    const rows = [
      { id: 'a', updatedAt: '2026-08-01T00:00:00Z' },
      { id: 'b', updatedAt: 'not-a-date' },
      { id: 'c', updatedAt: '2026-08-27T00:00:00Z' },
      { id: 'd', updatedAt: undefined as unknown as string },
    ];
    expect([...rows].sort(byRecency).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd']);
  });
});
