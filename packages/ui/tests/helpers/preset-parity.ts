import { expect } from 'vitest';

/**
 * Mounts a preset and its composed equivalent and asserts their shadow DOM is the
 * same once generated ids and their references are stripped. B, C and D each add
 * one parity test per preset.
 */
export async function expectPresetParity(preset: () => HTMLElement, composed: () => HTMLElement): Promise<void> {
  const a = preset();
  const b = composed();
  document.body.append(a, b);
  await new Promise((r) => setTimeout(r, 0));
  const norm = (root: ShadowRoot | null) => {
    const clone = root!.cloneNode(true) as DocumentFragment;
    clone.querySelectorAll('*').forEach((n) => {
      for (const attr of [...n.attributes]) {
        if (/^(id|aria-controls|aria-labelledby|aria-describedby|data-solid.*)$/.test(attr.name)) n.removeAttribute(attr.name);
      }
    });
    const div = document.createElement('div');
    div.append(clone);
    return div.innerHTML.replace(/\s+/g, ' ');
  };
  try {
    expect(norm(b.shadowRoot)).toBe(norm(a.shadowRoot));
  } finally {
    a.remove();
    b.remove();
  }
}
