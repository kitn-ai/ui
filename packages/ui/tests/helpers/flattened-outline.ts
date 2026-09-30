/**
 * The flattened outline of an element: what a reader gets after slots are filled and shadow
 * roots are entered, reduced to the parts that carry meaning (roles, names, controls, text).
 *
 * `preset-parity.ts` compares two SHADOW ROOTS, which is right when both modes render the same
 * nodes. A composed element renders the app's children through a `<slot>`, so its shadow root
 * holds a slot where the preset holds the body, and the two can never be byte-equal. What
 * composing must preserve is the flattened result, and this is the smallest faithful
 * reduction of it: structural wrappers (a `div` with no role and no name) disappear, and a
 * generated id is never read.
 */
const SKIP = new Set(['STYLE', 'SCRIPT', 'TEMPLATE']);

const isMeaningful = (e: Element) =>
  e.hasAttribute('role') || e.hasAttribute('aria-label') || ['BUTTON', 'A', 'INPUT', 'IMG'].includes(e.tagName);

const label = (e: Element) => {
  const role = e.getAttribute('role') ?? e.tagName.toLowerCase();
  const name = e.getAttribute('aria-label');
  return name ? `${role} "${name}"` : role;
};

/** The children a reader traverses: a slot's assigned nodes, or a host's shadow root, or its own children. */
function traversed(n: Node): Node[] {
  if (n instanceof HTMLSlotElement) {
    const assigned = n.assignedNodes({ flatten: true });
    return assigned.length ? assigned : [...n.childNodes];
  }
  if (n instanceof Element && n.shadowRoot) return [...n.shadowRoot.childNodes];
  return [...n.childNodes];
}

export function flattenedOutline(root: Node, depth = 0, out: string[] = []): string[] {
  for (const n of traversed(root)) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t) out.push(`${'  '.repeat(depth)}${JSON.stringify(t)}`);
      continue;
    }
    if (!(n instanceof Element) || SKIP.has(n.tagName)) continue;
    if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('hidden')) continue;
    if (isMeaningful(n)) {
      out.push(`${'  '.repeat(depth)}${label(n)}`);
      // A control is its name: whether that name is an aria-label on an icon or visible text,
      // what a reader hears is the same, so its inner text is not a second entry.
      if (n.tagName !== 'BUTTON') flattenedOutline(n, depth + 1, out);
    } else {
      flattenedOutline(n, depth, out);
    }
  }
  return out;
}
