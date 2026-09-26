/**
 * A2 — the parent-item contract (spec 2026-08-20 § 2a), jsdom half; the focus
 * order and slotchange timing halves live in real-Chromium probes
 * (scripts/probe-conversation-item-focus-order.mjs / -slotchange.mjs).
 *
 * Also carries C2 / F-04 (routed here per the plan): a search query matching no
 * conversation must render a VISIBLE no-match state, distinct from the
 * zero-conversations empty state.
 *
 * The controller half tests `createConversationItemsController` against plain
 * stand-in nodes on purpose: the contract is pure DOM (properties, attributes,
 * composed paths), so it must hold regardless of which custom element hosts it —
 * that is what lets the facade layer survive ratification renames.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent, within } from '@solidjs/testing-library';
import {
  ConversationList,
  createConversationItemsController,
  readConversationItemId,
} from './conversation-list';
import type { ConversationSummary } from '../../types';

afterEach(cleanup);

const conv = (id: string, title: string): ConversationSummary => ({
  id, title, scope: { type: 'collection' }, messageCount: 1,
  lastMessageAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z',
});

const rowIds = (container: HTMLElement): (string | null)[] =>
  [...container.querySelectorAll('[data-conversation-id]')].map((el) => el.getAttribute('data-conversation-id'));

const noop = () => {};
const baseProps = { groups: [], onSelect: noop, onNewChat: noop };

/** A light-DOM stand-in for a kai-conversation-item host. */
function makeItem(id: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('conversation-id', id);
  document.body.appendChild(el);
  return el;
}

/**
 * The REAL item shape: a host (the row listitem) whose SHADOW body holds the
 * activation semantics and a `<slot>` for the consumer's default-slot content.
 * A bare stand-in cannot tell body and host apart, and the controller's guard
 * compares the two, so at least one case has to use the split shape.
 */
function makeShadowItem(id: string): { host: HTMLElement; body: HTMLElement } {
  const host = makeItem(id);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<div data-kai-item-body role="button"><slot></slot></div>';
  return { host, body: shadow.querySelector('[data-kai-item-body]') as HTMLElement };
}

/**
 * A real key press. jsdom implements NO text insertion, so the platform's own
 * default is applied here — and applied ONLY when the keydown was not
 * default-prevented, which is the exact contract the swallowed-space defect
 * broke (preventDefault() ate the character before the field ever saw it).
 * Without this line a swallowed space and a typed space would both leave the
 * value empty and the test could not tell them apart.
 */
function pressKey(el: HTMLElement, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(e);
  if (!e.defaultPrevented && key.length === 1 && el instanceof HTMLInputElement) el.value += key;
  return e;
}

describe('children mode wins over the conversations prop', () => {
  it('renders NO data rows when items are provided, even with conversations set', () => {
    const { container } = render(() => (
      <ConversationList
        {...baseProps}
        conversations={[conv('c1', 'Data row one'), conv('c2', 'Data row two')]}
        items={<div data-t="slotted-item">My own row</div>}
      />
    ));
    // No batteries rows...
    expect(container.querySelector('[data-conversation-id]')).toBeNull();
    expect(container.textContent).not.toContain('Data row one');
    // ...the consumer's items render inside a list region instead.
    const list = container.querySelector('[role="list"]');
    expect(list).not.toBeNull();
    expect(list!.querySelector('[data-t="slotted-item"]')).not.toBeNull();
  });

  it('keeps the chrome in items mode: search box renders and still reports queries', () => {
    let query: string | undefined;
    const { container } = render(() => (
      <ConversationList
        {...baseProps}
        conversations={[]}
        items={<div>row</div>}
        onSearchChange={(q) => (query = q)}
      />
    ));
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search chats"]');
    expect(input).not.toBeNull();
    fireEvent.input(input!, { target: { value: 'billing' } });
    expect(query).toBe('billing');
    // The consumer's loop owns filtering: the slotted row is untouched.
    expect(container.querySelector('[role="list"]')!.textContent).toContain('row');
    // And no built-in empty state competes with the consumer's items.
    expect(container.textContent).not.toContain('No conversations yet');
  });

  it('searchable={false} removes the search box; default keeps it (both modes)', () => {
    // Hidden in item mode (the widget-box case the prop exists for)...
    const hidden = render(() => (
      <ConversationList {...baseProps} conversations={[]} items={<div>row</div>} searchable={false} />
    ));
    expect(hidden.container.querySelector('input[aria-label="Search chats"]')).toBeNull();
    // ...and in data mode with rows present.
    const hiddenData = render(() => (
      <ConversationList {...baseProps} conversations={[conv('c1', 'One')]} searchable={false} />
    ));
    expect(hiddenData.container.querySelector('input[aria-label="Search chats"]')).toBeNull();
    // Unset stays ON — the default must not flip under existing consumers.
    const shown = render(() => (
      <ConversationList {...baseProps} conversations={[conv('c1', 'One')]} />
    ));
    expect(shown.container.querySelector('input[aria-label="Search chats"]')).not.toBeNull();
  });
});

describe('the one list-order rule (pinned first, archived out)', () => {
  const dated = (id: string, updatedAt: string, flags: Partial<ConversationSummary> = {}): ConversationSummary =>
    ({ ...conv(id, id), updatedAt, ...flags });

  const ROWS = [
    dated('newest', '2026-08-05T00:00:00Z'),
    dated('pinned-old', '2026-08-01T00:00:00Z', { pinned: true }),
    dated('archived', '2026-08-06T00:00:00Z', { archived: true }),
    dated('older', '2026-08-02T00:00:00Z'),
  ];

  it('renders pinned rows first, then recency, and never the archived one', () => {
    const { container } = render(() => (
      <ConversationList {...baseProps} conversations={ROWS} searchable={false} />
    ));
    expect(rowIds(container)).toEqual(['pinned-old', 'newest', 'older']);
  });

  it('a set that is entirely archived reads as the empty state, not as a list of nothing', () => {
    const { container } = render(() => (
      <ConversationList {...baseProps} conversations={[dated('only', '2026-08-05T00:00:00Z', { archived: true })]} searchable={false} />
    ));
    expect(rowIds(container)).toEqual([]);
    expect(container.textContent).toContain('No conversations yet');
  });

  it('a LEGACY summary (no flags at all) keeps the plain recency order', () => {
    const { container } = render(() => (
      <ConversationList
        {...baseProps}
        conversations={[conv('a', 'A'), conv('b', 'B'), conv('c', 'C')]}
        searchable={false}
      />
    ));
    // Same updatedAt on all three: the sort is stable, so declaration order survives.
    expect(rowIds(container)).toEqual(['a', 'b', 'c']);
  });

  it('the search box filters the SAME ordered, archived-free set', () => {
    const { container } = render(() => (
      <ConversationList {...baseProps} conversations={ROWS} />
    ));
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search chats"]')!;
    fireEvent.input(input, { target: { value: 'older' } });
    expect(rowIds(container)).toEqual(['older']);
  });
});

describe('readConversationItemId', () => {
  it('prefers the conversationId property, then the conversation-id attribute, then host id', () => {
    const el = makeItem('attr-id');
    expect(readConversationItemId(el)).toBe('attr-id');
    (el as HTMLElement & { conversationId?: string }).conversationId = 'prop-id';
    expect(readConversationItemId(el)).toBe('prop-id');
    const bare = document.createElement('div');
    bare.id = 'host-id';
    expect(readConversationItemId(bare)).toBe('host-id');
  });
});

describe('createConversationItemsController', () => {
  function setup(ids: string[], activeId?: string) {
    // The handlers are attached as REAL listeners on a wrapper (the shape the
    // facade uses: a listbox region above the slot), because `composedPath()` is
    // only populated while an event is dispatching — calling the handler after
    // the fact hands it an empty path and every activation test passes vacuously.
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const items = ids.map((id) => {
      const el = makeItem(id);
      wrapper.appendChild(el);
      return el;
    });
    const selected: string[] = [];
    let active = activeId;
    const controller = createConversationItemsController({
      getItems: () => items.filter((i) => i.isConnected),
      getActiveId: () => active,
      onSelect: (id) => selected.push(id),
    });
    wrapper.addEventListener('click', (e) => controller.handleClick(e));
    wrapper.addEventListener('keydown', (e) => controller.handleKeyDown(e));
    controller.sync();
    return { items, selected, controller, setActive: (id?: string) => { active = id; controller.sync(); } };
  }

  afterEach(() => { document.body.innerHTML = ''; });

  it('selection flows container to item: exactly one item is aria-current="true"', () => {
    const { items, setActive } = setup(['a', 'b', 'c'], 'b');
    expect(items.map((i) => i.getAttribute('aria-current'))).toEqual(['false', 'true', 'false']);
    // And the active property is driven for the facade's styling hook.
    expect((items[1] as HTMLElement & { active?: boolean }).active).toBe(true);
    setActive('c');
    expect(items.map((i) => i.getAttribute('aria-current'))).toEqual(['false', 'false', 'true']);
  });

  it('gives items role="button" when they carry none, and leaves an authored role alone', () => {
    const authored = makeItem('x');
    authored.setAttribute('role', 'treeitem');
    const { items } = setup(['a']);
    expect(items[0].getAttribute('role')).toBe('button');
    const controller = createConversationItemsController({
      getItems: () => [authored], getActiveId: () => undefined, onSelect: noop,
    });
    controller.sync();
    expect(authored.getAttribute('role')).toBe('treeitem');
  });

  it('roving tabindex: exactly one item tabindex="0" (the active one), the rest -1', () => {
    const { items, setActive } = setup(['a', 'b', 'c'], 'b');
    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    setActive(undefined);
    // No active item: the first item is the entry point.
    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('re-derives roving tabindex when items are added or removed (the slotchange path)', () => {
    const { items, controller } = setup(['a', 'b'], 'a');
    items[0].remove();
    controller.sync();
    const rest = items.filter((i) => i.isConnected);
    expect(rest.map((i) => i.getAttribute('tabindex'))).toEqual(['0']);
    const added = makeItem('c');
    const withAdded = [...rest, added];
    const c2 = createConversationItemsController({
      getItems: () => withAdded, getActiveId: () => 'b', onSelect: noop,
    });
    c2.sync();
    expect(withAdded.map((i) => i.getAttribute('tabindex'))).toEqual(['0', '-1']);
  });

  it('click activates: onSelect fires with the item id', () => {
    const { items, selected } = setup(['a', 'b'], 'a');
    items[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['b']);
  });

  it('Enter and Space activate; Space does not scroll (default prevented)', () => {
    const { items, selected } = setup(['a', 'b'], 'a');
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true, cancelable: true });
    items[1].dispatchEvent(space);
    expect(selected).toEqual(['a', 'b']);
    expect(space.defaultPrevented).toBe(true);
  });

  it('activation is suppressed when the composed path crosses the menu region', () => {
    const { items, selected } = setup(['a'], 'a');
    // Non-vacuity first: a plain click on the row DOES select.
    items[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
    // A click through the shadow menu wrapper does not.
    const menu = document.createElement('span');
    menu.setAttribute('data-kai-item-menu', '');
    const button = document.createElement('button');
    menu.appendChild(button);
    items[0].appendChild(menu);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
    // Same for light-DOM slot="menu" content (the element-mode shape).
    menu.remove();
    const slotted = document.createElement('button');
    slotted.setAttribute('slot', 'menu');
    items[0].appendChild(slotted);
    slotted.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
  });

  it('ArrowDown / ArrowUp move focus item-to-item and the roving tabindex follows', () => {
    const { items } = setup(['a', 'b', 'c'], 'a');
    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }));
    expect(document.activeElement).toBe(items[1]);
    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true, cancelable: true }));
    expect(document.activeElement).toBe(items[0]);
    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('Home and End jump to the first and last item', () => {
    const { items } = setup(['a', 'b', 'c'], 'b');
    items[1].focus();
    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true, cancelable: true }));
    expect(document.activeElement).toBe(items[2]);
    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true, cancelable: true }));
    expect(document.activeElement).toBe(items[0]);
  });
});

/**
 * The ROW YIELDS to a control inside it.
 *
 * Repro behind these: an inline editor in the row's default slot — the documented
 * place for the title — typed `Renamed by keyboard`, and the store received
 * `Renamedbykeyboard`: the controller's Enter/Space branch matched ANY node in the
 * row, so it ran `preventDefault()` on every SPACE (the character never reached the
 * field) and re-selected the conversation. Enter committed nothing. The
 * Arrow/Home/End branch had the same hole and `handleClick` the same shape.
 *
 * The rule is one sentence: the key and the click belong to the control the user is
 * in. Every negative assertion below is paired with the row's own body doing the
 * same thing, so it cannot pass by the row simply going inert.
 */
describe('a nested control keeps its own keys and clicks', () => {
  /** Rows in the shape the documented usage produces: a title AND an inline
   *  editor (`<input>`) inside the row, the editor being the keyboard-reachable
   *  control. */
  function setupWithEditor(ids: string[] = ['a', 'b']) {
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const inputs: HTMLInputElement[] = [];
    const titles: HTMLElement[] = [];
    const items = ids.map((id) => {
      const el = makeItem(id);
      wrapper.appendChild(el);
      const title = document.createElement('span');
      title.textContent = id;
      el.appendChild(title);
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'Rename');
      el.appendChild(input);
      titles.push(title);
      inputs.push(input);
      return el;
    });
    const selected: string[] = [];
    const controller = createConversationItemsController({
      getItems: () => items.filter((i) => i.isConnected),
      getActiveId: () => undefined,
      onSelect: (id) => selected.push(id),
    });
    wrapper.addEventListener('click', (e) => controller.handleClick(e));
    wrapper.addEventListener('keydown', (e) => controller.handleKeyDown(e));
    controller.sync();
    return { items, titles, inputs, selected, controller };
  }

  afterEach(() => { document.body.innerHTML = ''; });

  it('a typed title keeps every SPACE and selects nothing', () => {
    const { inputs, selected } = setupWithEditor();
    inputs[0].focus();
    for (const ch of 'Renamed by keyboard') pressKey(inputs[0], ch);
    expect(inputs[0].value).toBe('Renamed by keyboard');
    expect(selected).toEqual([]);
  });

  it('Enter inside the editor does not select the row (and is not prevented)', () => {
    const { inputs, selected } = setupWithEditor();
    expect(pressKey(inputs[0], 'Enter').defaultPrevented).toBe(false);
    expect(selected).toEqual([]);
  });

  it('ArrowDown / ArrowUp inside the editor move the caret, not the roving tabindex', () => {
    const { items, inputs } = setupWithEditor();
    inputs[0].focus();
    const before = items.map((i) => i.getAttribute('tabindex'));
    expect(pressKey(inputs[0], 'ArrowDown').defaultPrevented).toBe(false);
    expect(pressKey(inputs[0], 'ArrowUp').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(inputs[0]);
    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(before);
  });

  it('Home / End inside the editor do not jump to the ends of the list', () => {
    const { inputs } = setupWithEditor();
    inputs[1].focus();
    expect(pressKey(inputs[1], 'End').defaultPrevented).toBe(false);
    expect(pressKey(inputs[1], 'Home').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('a click inside the editor does not select the row', () => {
    const { inputs, selected } = setupWithEditor();
    inputs[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual([]);
  });

  it('the row itself still activates: Enter/Space on the body, and a click on the title', () => {
    const { items, titles, selected } = setupWithEditor(['a']);
    expect(pressKey(items[0], 'Enter').defaultPrevented).toBe(true);
    expect(pressKey(items[0], ' ').defaultPrevented).toBe(true);
    expect(selected).toEqual(['a', 'a']);
    // A click on the row's own inert content (the title span, no control in its
    // path but the body) is still the row speaking.
    titles[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a', 'a', 'a']);
  });

  it('the row itself still roves: arrows from the body walk the sibling rows', () => {
    const { items } = setupWithEditor();
    pressKey(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '0']);
    pressKey(items[1], 'ArrowUp');
    expect(document.activeElement).toBe(items[0]);
  });

  it('the menu path still activates as before', () => {
    const { items, selected } = setupWithEditor(['a']);
    // Non-vacuity: a plain click on the row does select.
    items[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
    // A click on the NON-focusable menu wrapper is suppressed by menuInPath alone
    // (no control in that path for the nested-control guard to see)...
    const menu = document.createElement('span');
    menu.setAttribute('data-kai-item-menu', '');
    items[0].appendChild(menu);
    menu.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
    // ...and a click / key on the tabbable control inside it by the guard.
    const button = document.createElement('button');
    menu.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(pressKey(button, 'Enter').defaultPrevented).toBe(false);
    expect(selected).toEqual(['a']);
  });

  it('a tabindex ABOVE the row does not silence it (the scan stops at the row)', () => {
    // The region the rows live in is itself keyboard-reachable — `ScrollArea`
    // renders its viewport with `tabindex="0"`. Matching that as "the control the
    // user is in" turns row activation off entirely; measured on the first version
    // of this guard, a plain click on the item stopped selecting it.
    const wrapper = document.createElement('div');
    wrapper.setAttribute('tabindex', '0');
    document.body.appendChild(wrapper);
    const item = makeItem('a');
    wrapper.appendChild(item);
    const selected: string[] = [];
    const controller = createConversationItemsController({
      getItems: () => [item], getActiveId: () => undefined, onSelect: (id) => selected.push(id),
    });
    wrapper.addEventListener('click', (e) => controller.handleClick(e));
    wrapper.addEventListener('keydown', (e) => controller.handleKeyDown(e));
    controller.sync();
    item.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
    expect(pressKey(item, 'Enter').defaultPrevented).toBe(true);
    expect(selected).toEqual(['a', 'a']);
  });

  it('the guard compares against the SHADOW body, not the host it was handed', () => {
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const { host, body } = makeShadowItem('s1');
    wrapper.appendChild(host);
    const title = document.createElement('span');
    title.textContent = 'Renamed';
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Rename');
    host.append(title, input);
    const selected: string[] = [];
    const controller = createConversationItemsController({
      getItems: () => [host], getActiveId: () => undefined, onSelect: (id) => selected.push(id),
    });
    wrapper.addEventListener('click', (e) => controller.handleClick(e));
    wrapper.addEventListener('keydown', (e) => controller.handleKeyDown(e));
    controller.sync();
    expect(body.getAttribute('tabindex')).toBe('0');
    // The slotted editor keeps its keys...
    for (const ch of 'a b') pressKey(input, ch);
    expect(input.value).toBe('a b');
    expect(selected).toEqual([]);
    // ...and the slotted TITLE still resolves to the shadow body, i.e. the row is
    // not inert — the body is a different node from the host the guard was handed.
    title.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['s1']);
    expect(pressKey(title, 'Enter').defaultPrevented).toBe(true);
    expect(selected).toEqual(['s1', 's1']);
  });

  it('a control in the consumer\'s menu region keeps its own keys — the arrows included', () => {
    // The menu is the body's SIBLING (the sibling restructure), so it sits OUTSIDE the
    // boundary the nested-control guard stops at; the region check is what suppresses its
    // keys instead. Without that, ArrowDown inside a consumer's popover starts roving the
    // rows — which is why the region check covers the Arrow/Home/End branch too.
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const a = makeShadowItem('a');
    const b = makeShadowItem('b');
    wrapper.append(a.host, b.host);
    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'Actions';
    menuBtn.setAttribute('slot', 'menu'); // the element-mode spelling of a menu control
    a.host.appendChild(menuBtn);
    const selected: string[] = [];
    const controller = createConversationItemsController({
      getItems: () => [a.host, b.host], getActiveId: () => undefined, onSelect: (id) => selected.push(id),
    });
    wrapper.addEventListener('click', (e) => controller.handleClick(e));
    wrapper.addEventListener('keydown', (e) => controller.handleKeyDown(e));
    controller.sync();
    // Non-vacuity: the row BODY still roves and still selects. jsdom does not
    // report a shadow child as `document.activeElement` (the HOST is what it names),
    // so the rove is read off the tabindex the controller re-derives.
    const tabindexes = () => [a.body.getAttribute('tabindex'), b.body.getAttribute('tabindex')];
    pressKey(a.body, 'ArrowDown');
    expect(tabindexes()).toEqual(['-1', '0']);
    pressKey(b.body, 'ArrowUp');
    expect(tabindexes()).toEqual(['0', '-1']);
    pressKey(a.body, 'Enter');
    expect(selected).toEqual(['a']);
    // ...the menu control does neither: no rove on an arrow, no select on Enter or click.
    menuBtn.focus();
    expect(pressKey(menuBtn, 'ArrowDown').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(menuBtn);
    expect(tabindexes()).toEqual(['0', '-1']);
    expect(pressKey(menuBtn, 'Enter').defaultPrevented).toBe(false);
    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual(['a']);
  });
});

// C2 / F-04 — the no-match state (decide loudly), routed to this lane per the plan.
// The built-in title bar's "New chat" affordance is an ICON in the element's
// shadow root, so its hint has to come from the kit: a consumer cannot reach the
// button to put a `title` on it, and a `title` would be a NAME rather than a
// description anyway. What the tip must never do is replace the button's own
// accessible name supplied by `aria-label`.
describe('the built-in header tooltip (New chat)', () => {
  const renderHeader = () => render(() => <ConversationList {...baseProps} conversations={[]} />);

  it('opens on focus and is a description, not the button\'s accessible name', () => {
    const { container } = renderHeader();
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="New chat"]')!;
    // Still a real, focusable button element -- the tip wraps it, it does not replace it.
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button).not.toHaveAttribute('title');

    // No pointer in jsdom: focus is the observable alias for keyboard focus, and
    // this is the requirement that the tip opens on focus as well as hover.
    fireEvent.focusIn(button);
    // The bubble portals onto document.body (a sibling of the render container).
    const tip = within(document.body).queryByRole('tooltip');
    expect(tip).not.toBeNull();
    expect(tip).toHaveTextContent('New chat');

    // The name is unchanged with the tip OPEN: `aria-describedby` lives on the
    // trigger wrapper, so the label is still what names the button.
    expect(button).toHaveAccessibleName('New chat');
    expect(container.querySelector('[title]')).toBeNull();
  });
});

describe('search no-match state (F-04)', () => {
  it('conversations present + a query matching none renders a visible no-match state', () => {
    const { container } = render(() => (
      <ConversationList {...baseProps} conversations={[conv('c1', 'Budget planning')]} />
    ));
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search chats"]')!;
    fireEvent.input(input, { target: { value: 'zzz-no-such-thing' } });
    expect(container.textContent).toContain('No conversations match your search');
    // Distinct from the zero-conversations empty state.
    expect(container.textContent).not.toContain('No conversations yet');
    // And the rows really are filtered out.
    expect(container.querySelector('[data-conversation-id]')).toBeNull();
  });

  it('clearing the query restores the rows (the no-match state is not sticky)', () => {
    const { container } = render(() => (
      <ConversationList {...baseProps} conversations={[conv('c1', 'Budget planning')]} />
    ));
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search chats"]')!;
    fireEvent.input(input, { target: { value: 'zzz' } });
    expect(container.textContent).toContain('No conversations match your search');
    fireEvent.input(input, { target: { value: '' } });
    expect(container.textContent).not.toContain('No conversations match your search');
    expect(container.textContent).toContain('Budget planning');
  });

  it('the zero-conversations empty state (and the empty override) still keys off the unfiltered list', () => {
    const { container } = render(() => (
      <ConversationList {...baseProps} conversations={[]} empty={<div data-t="custom-empty">Nothing here</div>} />
    ));
    expect(container.querySelector('[data-t="custom-empty"]')).not.toBeNull();
    expect(container.textContent).not.toContain('No conversations match your search');
  });
});
