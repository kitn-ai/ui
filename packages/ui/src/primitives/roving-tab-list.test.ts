/**
 * The primitive's own contract, independent of any element or row component: the rail
 * (`ConversationList` / `<kai-conversations>`) depends on these properties, and tests here
 * are what hold them when the rail changes. Rows are plain nodes and a row is whatever
 * `getRows()` returns, which is exactly how a consumer arranges its own list.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRovingTabList, type RovingTabListOptions } from './roving-tab-list';

afterEach(() => { document.body.innerHTML = ''; });

/**
 * A container holding three rows with a non-row child in front of them and another between
 * the first and second — the arrangement a consumer's own list produces (a section heading
 * beside rows). `getRows` is a consumer predicate over `[data-row]`, so anything else in
 * the container is not a row.
 */
function makeFixture() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const nonRows: HTMLElement[] = [];
  const addNonRow = (text: string) => {
    const el = document.createElement('div');
    el.className = 'heading';
    el.textContent = text;
    container.appendChild(el);
    nonRows.push(el);
    return el;
  };
  addNonRow('Today');
  const rows = ['a', 'b', 'c'].map((id) => {
    const row = document.createElement('div');
    row.dataset.row = id;
    container.appendChild(row);
    if (id === 'a') addNonRow('Yesterday');
    return row;
  });
  const ids = (elements: HTMLElement[]) => elements.map((el) => el.dataset.row);
  return { container, rows, nonRows, ids };
}

type Fixture = ReturnType<typeof makeFixture>;

/** Mount a primitive over the fixture with REAL listeners on the container (the shape a
 *  consumer's list region has): `composedPath()` is only populated while an event is
 *  dispatching, so a handler called after the fact would pass activation cases vacuously. */
function mount(
  fixture: Fixture,
  overrides: Partial<RovingTabListOptions> = {},
) {
  const activated: string[] = [];
  const list = createRovingTabList({
    getRows: () => [...fixture.container.querySelectorAll<HTMLElement>('[data-row]')],
    onActivate: (row) => activated.push(row.dataset.row!),
    ...overrides,
  });
  fixture.container.addEventListener('click', (e) => list.handleClick(e));
  fixture.container.addEventListener('keydown', (e) => list.handleKeyDown(e));
  list.sync();
  return { activated, list, ids: fixture.ids };
}

function pressKey(el: HTMLElement, key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
}

const tabStops = (rows: HTMLElement[]) => rows.map((row) => row.getAttribute('tabindex'));
const focusedId = () => (document.activeElement as HTMLElement | null)?.dataset?.row;

describe('createRovingTabList', () => {
  it('keeps exactly one tab stop: the active row, else the first row', () => {
    const fixture = makeFixture();
    const { list } = mount(fixture, {
      getActiveRow: () => fixture.rows.find((r) => r.dataset.row === 'b'),
    });
    expect(tabStops(fixture.rows)).toEqual(['-1', '0', '-1']);
    // The non-row children are not rows and carry no tab stop at all.
    expect(fixture.nonRows.map((el) => el.getAttribute('tabindex'))).toEqual([null, null]);
    list.sync();
    expect(tabStops(fixture.rows)).toEqual(['-1', '0', '-1']);
  });

  it('with no active row the first row is the entry point, and the stop re-derives', () => {
    const fixture = makeFixture();
    let active: string | undefined;
    const { list } = mount(fixture, {
      getActiveRow: () => fixture.rows.find((r) => r.dataset.row === active),
    });
    expect(tabStops(fixture.rows)).toEqual(['0', '-1', '-1']);
    active = 'c';
    list.sync();
    expect(tabStops(fixture.rows)).toEqual(['-1', '-1', '0']);
    // An active row that is gone must not leave the list with no tab stop.
    fixture.rows[2].remove();
    list.sync();
    expect(tabStops(fixture.rows.slice(0, 2))).toEqual(['0', '-1']);
  });

  it('arrows reach every row in DOM order and skip the non-row child between them', () => {
    const fixture = makeFixture();
    mount(fixture);
    fixture.rows[0].focus();
    const visited = [focusedId()];
    for (let i = 0; i < 2; i++) { pressKey(document.activeElement as HTMLElement, 'ArrowDown'); visited.push(focusedId()); }
    expect(visited).toEqual(['a', 'b', 'c']);
    // The stop followed the focus, still exactly one.
    expect(tabStops(fixture.rows).filter((v) => v === '0')).toHaveLength(1);
    expect(tabStops(fixture.rows)).toEqual(['-1', '-1', '0']);
    pressKey(fixture.rows[2], 'ArrowUp');
    expect(focusedId()).toBe('b');
    expect(tabStops(fixture.rows)).toEqual(['-1', '0', '-1']);
  });

  it('Home and End jump to the first and last row', () => {
    const fixture = makeFixture();
    mount(fixture);
    fixture.rows[1].focus();
    pressKey(fixture.rows[1], 'End');
    expect(focusedId()).toBe('c');
    pressKey(fixture.rows[2], 'Home');
    expect(focusedId()).toBe('a');
    // Only the four traversal keys are claimed: a horizontal arrow is left alone.
    const right = pressKey(fixture.rows[0], 'ArrowRight');
    expect(right.defaultPrevented).toBe(false);
    expect(focusedId()).toBe('a');
  });

  it('activation reaches the row the event happened in, click and keys alike', () => {
    const fixture = makeFixture();
    const { activated } = mount(fixture);
    // A click on something INSIDE the row still resolves to the row (composed path).
    const inner = document.createElement('span');
    fixture.rows[1].appendChild(inner);
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(activated).toEqual(['b']);
    pressKey(fixture.rows[0], 'Enter');
    const space = pressKey(fixture.rows[2], ' ');
    expect(activated).toEqual(['b', 'a', 'c']);
    expect(space.defaultPrevented).toBe(true);
    // The non-row child is inert: clicking it activates nothing.
    fixture.nonRows[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(activated).toEqual(['b', 'a', 'c']);
  });

  it('a control inside the row keeps its own keys and clicks', () => {
    const fixture = makeFixture();
    const editor = document.createElement('input');
    editor.setAttribute('aria-label', 'Rename');
    fixture.rows[0].appendChild(editor);
    // The predicate a row with a nested editor passes: the key belongs to the editor.
    const { activated } = mount(fixture, {
      yieldsToRow: (row, e) =>
        e.composedPath().slice(0, e.composedPath().indexOf(row)).some(
          (n) => n instanceof HTMLElement && n.tagName === 'INPUT',
        ),
    });
    fixture.rows[0].focus();
    const spaceOnEditor = pressKey(editor, ' ');
    expect(spaceOnEditor.defaultPrevented).toBe(false);
    expect(activated).toEqual([]);
    expect(focusedId()).toBe('a');
    editor.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(activated).toEqual([]);
    // Non-vacuity: the same keys and click on the row body itself DO act.
    pressKey(fixture.rows[0], ' ');
    expect(activated).toEqual(['a']);
    fixture.rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(activated).toEqual(['a', 'b']);
    // And a row that yields to nothing still traverses.
    pressKey(fixture.rows[1], 'ArrowDown');
    expect(focusedId()).toBe('c');
  });

  it('leaves rows alone until they are ready, then picks them up', () => {
    const fixture = makeFixture();
    // A row that has not rendered yet: the consumer says so rather than the primitive
    // guessing, because stamping it would write onto the row host where the writes stick.
    let ready = false;
    const list = createRovingTabList({
      getRows: () => [...fixture.container.querySelectorAll<HTMLElement>('[data-row]')],
      getActiveRow: () => fixture.rows[0],
      isReady: (row) => ready || row !== fixture.rows[0],
      targetOf: (row) => (row.shadowRoot?.querySelector('span') as HTMLElement | null) ?? row,
      onActivate: () => {},
    });
    list.sync();
    expect(fixture.rows[0].getAttribute('tabindex')).toBeNull();
    // The first ready row takes the stop while the active one is unrendered.
    expect(tabStops(fixture.rows)).toEqual([null, '0', '-1']);
    ready = true;
    list.sync();
    expect(tabStops(fixture.rows)).toEqual(['0', '-1', '-1']);
  });

  it('writes on change only, so a re-sync cannot feed an observer', () => {
    const fixture = makeFixture();
    // The callback carries the same rule: the primitive cannot speak for writes it did not
    // make, and a consumer re-syncing from a MutationObserver would feed itself on either.
    const setAttr = (el: Element, name: string, value: string) => {
      if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    };
    let active: string | undefined = 'b';
    const { list } = mount(fixture, {
      getActiveRow: () => fixture.rows.find((r) => r.dataset.row === active),
      onRowSynced: (row, isActive) => setAttr(row, 'aria-current', String(isActive)),
    });
    const seen: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const r of records) seen.push(r.attributeName ?? '');
    });
    observer.observe(fixture.container, { attributes: true, subtree: true });
    list.sync();
    expect(observer.takeRecords()).toEqual([]);
    // Non-vacuity: a real change does write, so "no records" means unchanged, not inert.
    active = 'c';
    list.sync();
    expect(observer.takeRecords().map((r) => r.attributeName)).toEqual(
      ['aria-current', 'aria-current', 'tabindex', 'tabindex'],
    );
    expect(seen).toEqual([]);
    observer.disconnect();
  });
});
