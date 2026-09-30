import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/web-components/conversation/conversation-list';
import '../../src/web-components/conversation/conversation-item';

/**
 * Nested rows in item mode, driven by real keys in real Chromium: folders are native
 * `<details>`, and rows inside them are rows of the `kai-conversations` container.
 *
 * jsdom cannot settle these: a closed `<details>` hides its content only under real layout,
 * `focus()` only lands on a rendered node, and the tab stop is a claim about `document`'s
 * focus order. So this asserts on `document.activeElement` and the composed focus target
 * after each key, not on attributes alone.
 */
afterEach(() => document.body.replaceChildren());

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const bodyOf = (id: string) =>
  document.querySelector(`kai-conversation-item[conversation-id="${id}"]`)!.shadowRoot!.querySelector('[data-kai-item-body]') as HTMLElement;
/** The id of the row that owns real focus, resolved through the shadow root. */
const focusedRow = (): string | null => {
  const host = document.activeElement?.closest?.('kai-conversation-item') ?? null;
  return host?.getAttribute('conversation-id') ?? null;
};

const mount = async () => {
  document.body.innerHTML = `<kai-conversations active-id="a" style="display:block;width:280px">
    <kai-conversation-item conversation-id="a">A</kai-conversation-item>
    <details open><summary>Work</summary>
      <kai-conversation-item conversation-id="w1">W1</kai-conversation-item>
      <kai-conversation-item conversation-id="w2">W2
        <div slot="menu"><kai-conversation-item conversation-id="preview">Preview</kai-conversation-item></div>
      </kai-conversation-item>
    </details>
    <details><summary>Archive</summary>
      <kai-conversation-item conversation-id="z1">Z1</kai-conversation-item>
    </details>
    <kai-conversation-item conversation-id="e">E</kai-conversation-item>
  </kai-conversations>`; // test-authored markup, not model output
  await customElements.whenDefined('kai-conversations');
  await customElements.whenDefined('kai-conversation-item');
  await tick();
  return document.querySelector('kai-conversations') as HTMLElement;
};

describe('nested rows: keyboard in real Chromium', () => {
  it('has exactly one tab stop across every rendered row', async () => {
    await mount();
    // `preview` (inside a row's menu) is standalone and activates itself, so it is its own
    // control by design and is not one of the container's rows; it is left out of the count.
    const stops = ['a', 'w1', 'w2', 'z1', 'e'].filter((id) => bodyOf(id).getAttribute('tabindex') === '0');
    expect(stops).toEqual(['a']);
  });

  it('ArrowDown/ArrowUp walk into the open folder, skip the closed one, and ignore a menu preview', async () => {
    await mount();
    bodyOf('a').focus();
    expect(focusedRow()).toBe('a');
    await userEvent.keyboard('{ArrowDown}');
    expect(focusedRow()).toBe('w1');
    await userEvent.keyboard('{ArrowDown}');
    expect(focusedRow()).toBe('w2');
    await userEvent.keyboard('{ArrowDown}');
    expect(focusedRow()).toBe('e'); // z1 (closed) and preview (in a menu) are skipped
    await userEvent.keyboard('{ArrowUp}');
    expect(focusedRow()).toBe('w2');
    expect(bodyOf('w2').getAttribute('tabindex')).toBe('0');
    expect(bodyOf('a').getAttribute('tabindex')).toBe('-1');
  });

  it('Home and End jump to the ends', async () => {
    await mount();
    bodyOf('w1').focus();
    await userEvent.keyboard('{End}');
    expect(focusedRow()).toBe('e');
    await userEvent.keyboard('{Home}');
    expect(focusedRow()).toBe('a');
  });

  it('opening a closed folder brings its rows into the traversal', async () => {
    const el = await mount();
    const archive = el.querySelectorAll('details')[1];
    archive.querySelector('summary')!.click(); // a real toggle: the browser fires `toggle`
    await tick();
    expect(archive.open).toBe(true);
    bodyOf('e').focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(focusedRow()).toBe('z1');
  });

  it('closing the folder holding the tab stop moves it to a visible row', async () => {
    const el = await mount();
    const work = el.querySelector('details')!;
    bodyOf('w1').focus();
    await userEvent.keyboard('{ArrowDown}'); // stop is on w2, inside Work
    expect(bodyOf('w2').getAttribute('tabindex')).toBe('0');
    work.querySelector('summary')!.click();
    await tick();
    expect(work.open).toBe(false);
    const stops = ['a', 'w1', 'w2', 'z1', 'e'].filter((id) => bodyOf(id).getAttribute('tabindex') === '0');
    expect(stops).toEqual(['a']); // active-id="a": the active row is visible, so it takes the stop back
  });

  it('the summary keeps its native Enter toggle and is not a row', async () => {
    const el = await mount();
    const archive = el.querySelectorAll('details')[1];
    const summary = archive.querySelector('summary')!;
    const selected: string[] = [];
    el.addEventListener('kai-conversation-select', (e) => selected.push((e as CustomEvent).detail.id));
    summary.focus();
    await userEvent.keyboard('{Enter}');
    await tick();
    expect(archive.open).toBe(true);
    expect(selected).toEqual([]);
    expect(summary.hasAttribute('role')).toBe(false);
  });

  it('Enter on a nested row fires kai-conversation-select with its id', async () => {
    const el = await mount();
    const selected: string[] = [];
    el.addEventListener('kai-conversation-select', (e) => selected.push((e as CustomEvent).detail.id));
    bodyOf('a').focus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(selected).toEqual(['w1']);
    await userEvent.keyboard(' ');
    expect(selected).toEqual(['w1', 'w1']);
  });
});
