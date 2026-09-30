import { describe, it, expect, afterEach } from 'vitest';
import './conversation-list';
import './conversation-item';

if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
afterEach(() => document.body.replaceChildren());

const tick = () => new Promise((r) => setTimeout(r, 30));
const mount = async (html: string) => {
  document.body.innerHTML = html; // test-authored markup, not model output
  await customElements.whenDefined('kai-conversations');
  await tick();
  return document.querySelector('kai-conversations') as HTMLElement;
};
const bodyOf = (id: string) =>
  document.querySelector(`kai-conversation-item[conversation-id="${id}"]`)!.shadowRoot?.querySelector('[data-kai-item-body]') as HTMLElement | null;
const tabIndexOf = (id: string) => bodyOf(id)?.getAttribute('tabindex') ?? null;

describe('nested rows in item mode', () => {
  it('a row inside an open <details> is a row', async () => {
    await mount(`<kai-conversations active-id="b"><details open><summary>F</summary>
      <kai-conversation-item conversation-id="a">A</kai-conversation-item>
      <kai-conversation-item conversation-id="b">B</kai-conversation-item></details></kai-conversations>`);
    expect(tabIndexOf('b')).toBe('0');
    expect(tabIndexOf('a')).toBe('-1');
  });

  it('rows inside a closed folder are skipped, and closing the active folder moves the tab stop', async () => {
    const el = await mount(`<kai-conversations active-id="b">
      <kai-conversation-item conversation-id="x">X</kai-conversation-item>
      <details open><summary>F</summary><kai-conversation-item conversation-id="b">B</kai-conversation-item></details></kai-conversations>`);
    expect(tabIndexOf('b')).toBe('0');
    const det = el.querySelector('details')!;
    det.open = false;
    det.dispatchEvent(new Event('toggle'));
    await tick();
    expect(tabIndexOf('x')).toBe('0');
    expect(tabIndexOf('b')).not.toBe('0');
  });

  it('opening a folder re-syncs its rows in', async () => {
    const el = await mount(`<kai-conversations active-id="y">
      <kai-conversation-item conversation-id="x">X</kai-conversation-item>
      <details><summary>F</summary><kai-conversation-item conversation-id="y">Y</kai-conversation-item></details></kai-conversations>`);
    expect(tabIndexOf('x')).toBe('0'); // the active row is hidden, so the stop falls back to x
    expect(tabIndexOf('y')).not.toBe('0');
    const det = el.querySelector('details')!;
    det.open = true;
    det.dispatchEvent(new Event('toggle'));
    await tick();
    expect(tabIndexOf('y')).toBe('0');
    expect(tabIndexOf('x')).toBe('-1');
  });

  it('the summary is never stamped as a row', async () => {
    const el = await mount(`<kai-conversations><details open><summary>F</summary>
      <kai-conversation-item conversation-id="a">A</kai-conversation-item></details></kai-conversations>`);
    const s = el.querySelector('summary')!;
    expect(s.hasAttribute('tabindex')).toBe(false);
    expect(s.getAttribute('role')).toBeNull();
  });

  it('an item inside another row’s menu slot is not a row', async () => {
    await mount(`<kai-conversations><kai-conversation-item conversation-id="a">A
      <div slot="menu"><kai-conversation-item conversation-id="p">P</kai-conversation-item></div></kai-conversation-item></kai-conversations>`);
    expect(tabIndexOf('a')).toBe('0');
    // `p` is standalone (it activates itself), not a row of the container: the container
    // does not hear its click as a selection.
    expect(bodyOf('a')?.getAttribute('aria-current')).toBe('false');
    const selected: string[] = [];
    document.querySelector('kai-conversations')!.addEventListener('kai-conversation-select', (e) => selected.push((e as CustomEvent).detail.id));
    bodyOf('p')!.click();
    expect(selected).toEqual([]);
  });
});
