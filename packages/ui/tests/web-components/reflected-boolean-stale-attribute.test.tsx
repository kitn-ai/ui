/**
 * GUARD — a boolean prop's host attribute must follow the property in BOTH directions.
 *
 * THE DEFECT. `kai-button` read `disabled` through `flag()` but never reflected it.
 * `<kai-button disabled>` and then `el.disabled = false` enabled the inner button while
 * the host kept its `disabled` attribute, so anything keyed on the attribute (a host
 * `[disabled]` selector, a test, a serializer, `outerHTML`) still saw a disabled button.
 * `full` had the mirror image: `:host([full])` is the rule that makes the host a block,
 * and `el.full = true` never wrote the attribute, so the rule never matched.
 *
 * Both directions are asserted per prop, and the seed direction (attribute first, then a
 * property write) is the one that goes stale.
 */
import '../../src/web-components/button/button';
import '../../src/web-components/dropdown/dropdown';
import '../../src/web-components/menu/menu';
import { afterEach, describe, expect, test } from 'vitest';

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(tag: string, attrs: string[] = []): Promise<HTMLElement & Record<string, unknown>> {
  const el = document.createElement(tag) as HTMLElement & Record<string, unknown>;
  for (const a of attrs) el.setAttribute(a, '');
  document.body.appendChild(el);
  await flush();
  return el;
}

const CASES: Array<[tag: string, prop: string]> = [
  ['kai-button', 'disabled'],
  ['kai-button', 'full'],
  ['kai-dropdown', 'full'],
  ['kai-dropdown', 'disabled'],
  ['kai-menu', 'full'],
  ['kai-menu', 'disabled'],
];

describe.each(CASES)('%s.%s reflects both ways', (tag, prop) => {
  test('a bare attribute, then prop = false, removes the attribute', async () => {
    const el = await mount(tag, [prop]);
    expect(el.hasAttribute(prop)).toBe(true);
    el[prop] = false;
    await flush();
    expect(el.hasAttribute(prop), 'stale attribute after prop = false').toBe(false);
    expect(el[prop]).toBe(false);
  });

  test('prop = true writes the attribute and reads back true', async () => {
    const el = await mount(tag);
    el[prop] = true;
    await flush();
    expect(el.hasAttribute(prop)).toBe(true);
    expect(el[prop]).toBe(true);
  });

  test('true then false round-trips', async () => {
    const el = await mount(tag);
    el[prop] = true;
    await flush();
    el[prop] = false;
    await flush();
    expect(el.hasAttribute(prop)).toBe(false);
    expect(el[prop]).toBe(false);
  });
});

test('kai-button: the inner control follows the property, not just the attribute', async () => {
  const el = await mount('kai-button', ['disabled']);
  const inner = () => el.shadowRoot!.querySelector('button')!;
  expect(inner().disabled).toBe(true);
  el.disabled = false;
  await flush();
  expect(inner().disabled).toBe(false);
});
