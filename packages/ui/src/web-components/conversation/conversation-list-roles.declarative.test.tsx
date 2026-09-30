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
const region = (el: HTMLElement) => el.shadowRoot!.querySelector('[part="items"]') as HTMLElement;
const role = (id: string) => document.querySelector(`kai-conversation-item[conversation-id="${id}"]`)!.getAttribute('role');

describe('item-mode ARIA follows the arrangement', () => {
  it('flat rows keep the list and its listitems', async () => {
    const el = await mount(`<kai-conversations>
      <kai-conversation-item conversation-id="a">A</kai-conversation-item>
      <kai-conversation-item conversation-id="b">B</kai-conversation-item></kai-conversations>`);
    expect(region(el).getAttribute('role')).toBe('list');
    expect(role('a')).toBe('listitem');
  });

  it('rows inside folders drop the list, so no listitem is left without a list parent', async () => {
    const el = await mount(`<kai-conversations>
      <kai-conversation-item conversation-id="x">X</kai-conversation-item>
      <details open><summary>F</summary><kai-conversation-item conversation-id="a">A</kai-conversation-item></details></kai-conversations>`);
    expect(region(el).getAttribute('role')).toBe('group');
    expect(role('a')).toBeNull();
    expect(role('x')).toBeNull();
  });

  it('an authored role is never removed', async () => {
    await mount(`<kai-conversations>
      <details open><summary>F</summary><kai-conversation-item conversation-id="a" role="listitem">A</kai-conversation-item></details></kai-conversations>`);
    expect(role('a')).toBe('listitem');
  });

  it('returning to flat rows restores the list', async () => {
    const el = await mount(`<kai-conversations>
      <kai-conversation-item conversation-id="x">X</kai-conversation-item>
      <details open><summary>F</summary><kai-conversation-item conversation-id="a">A</kai-conversation-item></details></kai-conversations>`);
    el.querySelector('details')!.remove();
    await tick();
    expect(region(el).getAttribute('role')).toBe('list');
    expect(role('x')).toBe('listitem');
  });
});
