import { expect } from 'vitest';

/**
 * Mounts a preset and its composed equivalent and asserts their shadow DOM is the
 * same once generated ids and their references are stripped. B, C and D each add
 * one parity test per preset.
 */
export async function expectPresetParity(
  preset: () => HTMLElement,
  composed: () => HTMLElement,
  // Attributes whose value is a per-instance generated string, beyond the id references. A preset that
  // names a radio group (`name`) with a generated id passes `name` and `for`; the default stays as it was.
  generated: RegExp = /^(id|aria-controls|aria-labelledby|aria-describedby|data-solid.*)$/,
): Promise<void> {
  const a = preset();
  const b = composed();
  document.body.append(a, b);
  await new Promise((r) => setTimeout(r, 0));
  const norm = (root: ShadowRoot | null) => {
    // A ShadowRoot itself is not clonable (jsdom and browsers both throw), so copy its children.
    const div = document.createElement('div');
    div.append(...[...root!.childNodes].map((n) => n.cloneNode(true)));
    div.querySelectorAll('*').forEach((n) => {
      for (const attr of [...n.attributes]) {
        if (generated.test(attr.name)) n.removeAttribute(attr.name);
      }
    });
    return div.innerHTML.replace(/\s+/g, ' ');
  };
  try {
    expect(norm(b.shadowRoot)).toBe(norm(a.shadowRoot));
  } finally {
    a.remove();
    b.remove();
  }
}
