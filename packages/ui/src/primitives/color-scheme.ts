import { createSignal, onCleanup, type Accessor } from 'solid-js';

export type ResolvedColorScheme = 'light' | 'dark';

/**
 * The colour scheme `el` actually renders in, as a reactive accessor, for the few consumers that cannot
 * read a CSS custom property (a WebGL shader, a cross-frame `CardContext`, a Shiki theme name).
 *
 * The CSS contract is `--kai-color-scheme: light | dark`, inherited: `.dark` / `.light` on the page root
 * or any ancestor, or `theme="light" | "dark"` on an element, set it, and every colour token resolves
 * through `light-dark()` against it. This reads that same property off `el`, so the JS answer and the
 * painted answer are one fact. Unset (or any other value) falls to the OS `prefers-color-scheme`,
 * which is what `color-scheme: light dark` does in CSS.
 *
 * It re-reads when the OS preference changes and when a `class` / `style` / `data-theme` attribute
 * changes on `el`, on any ancestor (walking out through shadow hosts), or on `<html>` / `<body>`.
 * Ancestors are captured at creation: an element moved to a different subtree later keeps watching
 * the old chain. Cleans up with `onCleanup`. Inert (always `'light'`) without a DOM.
 */
export function createResolvedColorScheme(el: HTMLElement): Accessor<ResolvedColorScheme> {
  const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
  const mq = hasDom && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const read = (): ResolvedColorScheme => {
    if (!hasDom) return 'light';
    const knob = getComputedStyle(el).getPropertyValue('--kai-color-scheme').trim();
    if (knob === 'light' || knob === 'dark') return knob;
    return mq?.matches ? 'dark' : 'light';
  };

  const [scheme, setScheme] = createSignal<ResolvedColorScheme>(read());
  if (!hasDom) return scheme;
  const refresh = () => setScheme(read());

  if (mq) {
    mq.addEventListener('change', refresh);
    onCleanup(() => mq.removeEventListener('change', refresh));
  }

  if (typeof MutationObserver !== 'undefined') {
    const targets = new Set<Node>([el, document.documentElement]);
    if (document.body) targets.add(document.body);
    let node: Node | null = el;
    while (node) {
      targets.add(node);
      const parent: Node | null = node.parentNode;
      node = parent instanceof ShadowRoot ? parent.host : parent;
      if (node === document) break;
    }
    const observer = new MutationObserver(refresh);
    for (const t of targets) observer.observe(t, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    onCleanup(() => observer.disconnect());
  }

  return scheme;
}
