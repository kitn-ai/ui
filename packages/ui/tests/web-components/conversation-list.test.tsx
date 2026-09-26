import '../../src/web-components/conversation/conversation-list';
import '../../src/web-components/conversation/conversation-item';
import type { ConversationGroup, ConversationSummary } from '../../src/types';

const groups: ConversationGroup[] = [{ id: 'g1', name: 'Today', sortOrder: 0, createdAt: '2026-06-01' }];
const conversations: ConversationSummary[] = [{
  id: 'c1', title: 'Hello world', groupId: 'g1', scope: { type: 'document' },
  messageCount: 2, lastMessageAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
}];

test('renders conversations and emits conversationselect', async () => {
  const el = document.createElement('kai-conversations') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[]; activeId?: string;
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hello world');

  let selected: string | null = null;
  el.addEventListener('kai-conversation-select', (e) => (selected = (e as CustomEvent).detail.id));
  const item = el.shadowRoot!.querySelector('[data-conversation-id="c1"]') as HTMLElement;
  item.click();
  expect(selected).toBe('c1');

  el.remove();
});

test('does not emit old "select" event (breaking change)', async () => {
  const el = document.createElement('kai-conversations') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[];
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  let selectFired = false;
  el.addEventListener('kai-select', () => (selectFired = true));
  const item = el.shadowRoot!.querySelector('[data-conversation-id="c1"]') as HTMLElement;
  item.click();
  expect(selectFired).toBe(false);

  el.remove();
});

test('icon-only controls have accessible names (a11y A1)', async () => {
  const el = document.createElement('kai-conversations') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[];
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  const root = el.shadowRoot!;
  const toggle = root.querySelector<HTMLButtonElement>('button[aria-label="Toggle sidebar"]');
  const newChat = root.querySelector<HTMLButtonElement>('button[aria-label="New chat"]');
  const search = root.querySelector<HTMLInputElement>('input[type="text"]');

  expect(toggle).not.toBeNull();
  expect(toggle!.getAttribute('aria-label')).toBe('Toggle sidebar');
  expect(newChat).not.toBeNull();
  expect(newChat!.getAttribute('aria-label')).toBe('New chat');
  expect(search!.getAttribute('aria-label')).toBe('Search chats');

  el.remove();
});

// ── §8 rail collapse ────────────────────────────────────────────────────────

type ConvEl = HTMLElement & {
  groups: ConversationGroup[]; conversations: ConversationSummary[];
  collapsed?: boolean;
  collapse(): void; expand(): void; toggle(): void;
};

function mountConversations(extra?: (el: ConvEl) => void): ConvEl {
  const el = document.createElement('kai-conversations') as ConvEl;
  el.groups = groups;
  el.conversations = conversations;
  extra?.(el);
  document.body.appendChild(el);
  return el;
}

test('collapse() shrinks the rail to a floating reopen button; expand() restores it', async () => {
  const el = mountConversations();
  await Promise.resolve();
  const root = el.shadowRoot!;

  // Expanded by default: the list (and search) render.
  expect(root.textContent).toContain('Hello world');

  el.collapse();
  await Promise.resolve();
  // Collapsed: the list is gone, only the reopen button remains.
  expect(root.textContent).not.toContain('Hello world');
  const reopen = root.querySelector<HTMLButtonElement>('button[aria-label="Open sidebar"]');
  expect(reopen).not.toBeNull();

  el.expand();
  await Promise.resolve();
  expect(root.textContent).toContain('Hello world');
  expect(root.querySelector('button[aria-label="Open sidebar"]')).toBeNull();

  el.remove();
});

test('collapse/expand/toggle fire kai-collapse-toggle with the new state', async () => {
  const el = mountConversations();
  await Promise.resolve();

  const states: boolean[] = [];
  el.addEventListener('kai-collapse-toggle', (e) => states.push((e as CustomEvent).detail.collapsed));

  el.collapse();
  el.expand();
  el.toggle(); // from expanded → collapsed
  await Promise.resolve();

  expect(states).toEqual([true, false, true]);
  el.remove();
});

test('the floating reopen button expands the rail and fires kai-collapse-toggle', async () => {
  const el = mountConversations((e) => (e.collapsed = undefined));
  el.collapsed = undefined;
  await Promise.resolve();
  el.collapse();
  await Promise.resolve();

  let lastCollapsed: boolean | null = null;
  el.addEventListener('kai-collapse-toggle', (e) => (lastCollapsed = (e as CustomEvent).detail.collapsed));

  const reopen = el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Open sidebar"]')!;
  reopen.click();
  await Promise.resolve();

  expect(lastCollapsed).toBe(false);
  expect(el.shadowRoot!.textContent).toContain('Hello world');
  el.remove();
});

test('default-collapsed seeds the rail collapsed (uncontrolled)', async () => {
  const el = document.createElement('kai-conversations') as ConvEl;
  el.setAttribute('default-collapsed', '');
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  const root = el.shadowRoot!;
  expect(root.querySelector('button[aria-label="Open sidebar"]')).not.toBeNull();
  expect(root.textContent).not.toContain('Hello world');
  el.remove();
});

test('controlled collapsed prop wins over an internal toggle', async () => {
  const el = mountConversations((e) => (e.collapsed = true));
  await Promise.resolve();
  const root = el.shadowRoot!;
  // Controlled-collapsed: shows the reopen button.
  expect(root.querySelector('button[aria-label="Open sidebar"]')).not.toBeNull();

  // expand() writes the internal value (masked while controlled) + still fires the
  // event, so a controlling app can react — but the view stays collapsed.
  let fired = false;
  el.addEventListener('kai-collapse-toggle', () => (fired = true));
  el.expand();
  await Promise.resolve();
  expect(fired).toBe(true);
  expect(root.querySelector('button[aria-label="Open sidebar"]')).not.toBeNull();
  el.remove();
});

// ── compact (row density, the old kai-workspace `compact` maps here) ────────
// Both orders per the kai-tool upgrade class: the attribute present in MARKUP
// before properties are assigned, and the property assigned on a bare element.
// The compact row drops the "N messages" line; the default row keeps it — the
// default case is the non-vacuity pair for the compact assertions.

test('compact via markup attribute renders dense rows (no message-count line)', async () => {
  document.body.innerHTML = '<kai-conversations compact></kai-conversations>';
  const el = document.body.querySelector('kai-conversations') as ConvEl;
  el.groups = groups;
  el.conversations = conversations;
  await Promise.resolve();

  // Scoped to the ROW node: the shadow root's textContent includes the inline
  // <style> fallback, whose CSS happens to contain the word "messages".
  const row = el.shadowRoot!.querySelector('[data-conversation-id="c1"]')!;
  expect(row.textContent).toContain('Hello world');
  expect(row.textContent).not.toContain('messages');
  document.body.innerHTML = '';
});

test('compact via property assignment renders dense rows; default keeps the count line', async () => {
  // Default first: the count line renders, so its absence below means something.
  const plain = mountConversations();
  await Promise.resolve();
  expect(plain.shadowRoot!.querySelector('[data-conversation-id="c1"]')!.textContent).toContain('2 messages');
  plain.remove();

  const el = document.createElement('kai-conversations') as ConvEl & { compact?: boolean };
  el.compact = true;
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  const row = el.shadowRoot!.querySelector('[data-conversation-id="c1"]')!;
  expect(row.textContent).toContain('Hello world');
  expect(row.textContent).not.toContain('messages');
  // The property reads back what was set (#294 read-back class).
  expect(el.compact).toBe(true);
  el.remove();
});

// ── item mode: a control inside the row owns its own keys and clicks ────────
//
// The swallowed-space defect at the level the consumer hits it. An inline editor in
// the row's DEFAULT SLOT — the documented place for the title — typed `Renamed by
// keyboard` and the store received `Renamedbykeyboard`, because the container's
// controller treated Enter/Space from anywhere inside the row as row activation:
// `preventDefault()` on every SPACE, plus a re-selection of the conversation. Enter
// committed nothing and the arrows roved instead of moving the caret. Both tests run
// through the REAL facades (host + shadow body + slotted content), so what they pin
// is the contract a consumer meets, not a stand-in.

type ItemEl = HTMLElement & { conversationId?: string; active?: boolean };

const tick = () => new Promise((r) => setTimeout(r, 0));

/** The item's activation node, the shadow body the controller targets. */
const bodyOf = (item: HTMLElement) =>
  item.shadowRoot!.querySelector('[data-kai-item-body]') as HTMLElement;

/**
 * A real key press. jsdom implements NO text insertion, so the platform's own
 * default is applied here — and applied ONLY when the keydown was not
 * default-prevented, which is exactly the contract the defect broke. Without this a
 * swallowed space and a typed space would both leave the value empty.
 */
function pressKey(el: HTMLElement, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(e);
  if (!e.defaultPrevented && key.length === 1 && el instanceof HTMLInputElement) el.value += key;
  return e;
}

/** Item mode with an inline editor in each row's default slot. */
function mountItemModeWithEditors(ids: string[]) {
  const el = document.createElement('kai-conversations') as ConvEl;
  el.groups = groups;
  const items: ItemEl[] = [];
  const editors: HTMLInputElement[] = [];
  for (const id of ids) {
    const item = document.createElement('kai-conversation-item') as ItemEl;
    item.setAttribute('conversation-id', id);
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Rename');
    input.value = id;
    item.appendChild(input);
    items.push(item);
    editors.push(input);
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return { el, items, editors, selected: [] as string[] };
}

test('item mode: an inline editor in a row default slot keeps its SPACE, Enter and arrows', async () => {
  const { el, items, editors, selected } = mountItemModeWithEditors(['x1', 'x2']);
  await tick();
  el.addEventListener('kai-conversation-select', (e) => selected.push((e as CustomEvent).detail.id));

  const editor = editors[0];
  editor.value = '';
  editor.focus();
  for (const ch of 'Renamed by keyboard') pressKey(editor, ch);
  expect(editor.value).toBe('Renamed by keyboard');
  expect(selected).toEqual([]);

  // Enter commits in the field, it does not open the conversation.
  expect(pressKey(editor, 'Enter').defaultPrevented).toBe(false);
  expect(selected).toEqual([]);

  // Arrows move the caret: focus stays in the editor and the roving tabindex does not move.
  const tabsBefore = items.map((i) => bodyOf(i).getAttribute('tabindex'));
  expect(pressKey(editor, 'ArrowDown').defaultPrevented).toBe(false);
  expect(pressKey(editor, 'ArrowUp').defaultPrevented).toBe(false);
  expect(document.activeElement).toBe(editor);
  expect(items.map((i) => bodyOf(i).getAttribute('tabindex'))).toEqual(tabsBefore);

  // A click into the editor is the editor's too.
  editor.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  expect(selected).toEqual([]);

  el.remove();
});

test('item mode: the row body still activates and roves (the guard is not a blanket mute)', async () => {
  const { el, items, selected } = mountItemModeWithEditors(['x1', 'x2']);
  await tick();
  el.addEventListener('kai-conversation-select', (e) => selected.push((e as CustomEvent).detail.id));

  const bodies = items.map(bodyOf);
  expect(bodies.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1']);

  // Enter and Space on the body still select (Space still does not scroll).
  expect(pressKey(bodies[0], 'Enter').defaultPrevented).toBe(true);
  expect(pressKey(bodies[0], ' ').defaultPrevented).toBe(true);
  expect(selected).toEqual(['x1', 'x1']);

  // ...and the arrows still rove, focus and tabindex following.
  pressKey(bodies[0], 'ArrowDown');
  expect(items[1].shadowRoot!.activeElement).toBe(bodies[1]);
  expect(bodies.map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0']);
  pressKey(bodies[1], 'ArrowUp');
  expect(items[0].shadowRoot!.activeElement).toBe(bodies[0]);
  expect(bodies.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1']);

  el.remove();
});
