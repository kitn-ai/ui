/**
 * GUARD — an `aria-label` / `aria-labelledby` on a form facade's HOST names the control
 * inside its shadow root.
 *
 * THE DEFECT. `<kai-input aria-label="Address">` kept the attribute on the host, a generic
 * element, and rendered an unnamed `<input>`: axe `label` failed on a control the author
 * had labelled. The same held for every facade that wraps a native control. `aria-labelledby`
 * cannot be forwarded verbatim (an id reference resolves inside one tree), so the referenced
 * text is resolved and forwarded as the inner `aria-label`.
 *
 * Each case names the INNER control by the selector that finds it, and asserts the name on
 * that node, so a facade that forwards to the wrong node (a wrapper, the host) stays red.
 */
import '../../src/web-components/input/input';
import '../../src/web-components/search/search';
import '../../src/web-components/select/select';
import '../../src/web-components/slider/slider';
import '../../src/web-components/checkbox/checkbox';
import '../../src/web-components/checkbox/checkbox-group';
import '../../src/web-components/switch/switch';
import '../../src/web-components/radio/radio-group';
import '../../src/web-components/segmented/segmented';
import { afterEach, describe, expect, test } from 'vitest';

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.body.replaceChildren();
});

/** tag, then the selector of the node that must carry the name. */
const CASES: Array<[tag: string, inner: string]> = [
  ['kai-input', 'input'],
  ['kai-search', 'input'],
  ['kai-select', 'select'],
  ['kai-slider', 'input[type="range"]'],
  ['kai-checkbox', 'input[type="checkbox"], [role="checkbox"]'],
  ['kai-switch', 'button[role="switch"]'],
  ['kai-radio-group', '[role="radiogroup"]'],
  ['kai-checkbox-group', '[role="group"]'],
  ['kai-segmented', '[role="group"]'],
];

async function mount(tag: string, attrs: Record<string, string> = {}) {
  const el = document.createElement(tag) as HTMLElement & Record<string, unknown>;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await flush();
  return el;
}
const innerOf = (el: HTMLElement, sel: string) => el.shadowRoot!.querySelector<HTMLElement>(sel);

describe.each(CASES)('%s', (tag, inner) => {
  test('host aria-label reaches the inner control', async () => {
    const el = await mount(tag, { 'aria-label': 'Address' });
    expect(el.getAttribute('aria-label')).toBe('Address'); // the host keeps it
    expect(innerOf(el, inner)?.getAttribute('aria-label')).toBe('Address');
  });

  test('aria-label set after mount is picked up, and removal clears it', async () => {
    const el = await mount(tag);
    expect(innerOf(el, inner)?.getAttribute('aria-label') ?? null).toBe(null);
    el.setAttribute('aria-label', 'Later');
    await flush();
    expect(innerOf(el, inner)?.getAttribute('aria-label')).toBe('Later');
    el.removeAttribute('aria-label');
    await flush();
    expect(innerOf(el, inner)?.getAttribute('aria-label') ?? null).toBe(null);
  });

  test('aria-labelledby is resolved to the referenced text, and outranks aria-label', async () => {
    const heading = document.createElement('span');
    heading.id = `h-${tag}`;
    heading.textContent = 'Shipping address';
    document.body.appendChild(heading);
    const el = await mount(tag, { 'aria-labelledby': heading.id, 'aria-label': 'ignored' });
    expect(innerOf(el, inner)?.getAttribute('aria-label')).toBe('Shipping address');
    // Live: the reference follows the text it points at.
    heading.textContent = 'Billing address';
    await flush();
    expect(innerOf(el, inner)?.getAttribute('aria-label')).toBe('Billing address');
  });

  test('an unresolvable aria-labelledby falls back to aria-label', async () => {
    const el = await mount(tag, { 'aria-labelledby': 'no-such-id', 'aria-label': 'Fallback' });
    expect(innerOf(el, inner)?.getAttribute('aria-label')).toBe('Fallback');
  });
});

describe('the label prop stays the fallback where it already named the control', () => {
  test.each([
    ['kai-select', 'select'],
    ['kai-slider', 'input[type="range"]'],
    ['kai-switch', 'button[role="switch"]'],
  ])('%s: `label` names it when the host carries no aria attribute', async (tag, inner) => {
    const el = await mount(tag, { label: 'From prop' });
    expect(innerOf(el, inner)?.getAttribute('aria-label')).toBe('From prop');
  });

  test('a host aria-label outranks `label`', async () => {
    const el = await mount('kai-select', { label: 'From prop', 'aria-label': 'From host' });
    expect(innerOf(el, 'select')?.getAttribute('aria-label')).toBe('From host');
  });
});
