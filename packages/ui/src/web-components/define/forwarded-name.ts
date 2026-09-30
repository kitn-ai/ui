import { createSignal, onCleanup, onMount } from 'solid-js';

/**
 * The accessible name a consumer put on the HOST (`<kai-input aria-label="Address">`),
 * as a string the facade can hand to the inner control.
 *
 * WHY THIS EXISTS. The native control lives in a shadow root, and the host is a generic
 * element: an `aria-label` on it names nothing the browser exposes as a textbox, so the
 * inner `<input>` was unnamed and axe failed `label` on a control the author had labelled.
 *
 * WHY `aria-labelledby` IS RESOLVED TO TEXT. An ID reference resolves inside ONE tree. The
 * inner control cannot point at an id in the host's light DOM, so forwarding the attribute
 * verbatim would leave a dangling reference. The text of the referenced elements is what
 * the reference was for, so that text becomes the inner `aria-label`.
 *
 * PRECEDENCE follows the accessible-name algorithm: `aria-labelledby` (when at least one
 * id resolves to text) beats `aria-label`. Returns `undefined` when neither yields a name,
 * so the caller's own fallback (a `label` prop) can apply.
 *
 * Live: re-resolved when either attribute changes and when a referenced element's text
 * changes. Call it once, synchronously, in the facade body.
 */
export function createForwardedName(element: HTMLElement): () => string | undefined {
  const resolve = (): string | undefined => {
    const ids = element.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
    if (ids.length > 0) {
      const root = element.getRootNode() as Document | ShadowRoot;
      const parts: string[] = [];
      for (const id of ids) {
        const target = root.getElementById?.(id) ?? null;
        const text = (target?.getAttribute('aria-label') ?? target?.textContent ?? '').trim();
        if (text) parts.push(text);
      }
      if (parts.length > 0) return parts.join(' ');
    }
    const own = element.getAttribute('aria-label')?.trim();
    return own || undefined;
  };

  const [name, setName] = createSignal<string | undefined>(resolve());
  const update = () => {
    const next = resolve();
    if (next !== name()) setName(next);
  };

  onMount(() => {
    update(); // the host may not be attached (or its root known) when the body ran
    const attrs = new MutationObserver(update);
    attrs.observe(element, { attributes: true, attributeFilter: ['aria-label', 'aria-labelledby'] });
    // Text of the referenced elements. Watched on the whole root, filtered cheaply, because the
    // ids can be added or renamed after this runs and per-node observers would go stale.
    const root = element.getRootNode();
    const text = new MutationObserver(() => {
      if (element.hasAttribute('aria-labelledby')) update();
    });
    text.observe(root, { subtree: true, childList: true, characterData: true });
    onCleanup(() => {
      attrs.disconnect();
      text.disconnect();
    });
  });

  return name;
}
