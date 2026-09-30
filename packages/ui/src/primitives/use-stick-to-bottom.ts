import { createSignal, onCleanup } from 'solid-js';

const SCROLL_THRESHOLD = 50;

export function useStickToBottom() {
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  let containerEl: HTMLElement | undefined;
  let shouldStick = true;

  function checkIfAtBottom() {
    if (!containerEl) return;
    const { scrollTop, scrollHeight, clientHeight } = containerEl;
    const atBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    setIsAtBottom(atBottom);
    shouldStick = atBottom;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (!containerEl) return;
    if (typeof containerEl.scrollTo === 'function') {
      containerEl.scrollTo({ top: containerEl.scrollHeight, behavior });
    } else {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
    shouldStick = true;
    setIsAtBottom(true);
  }

  let pendingFrame: number | undefined;

  /**
   * `cancelAnimationFrame`, captured at SETUP -- not called bare at cleanup.
   *
   * Cleanup is not guaranteed to run while the page that mounted this
   * primitive is still standing: a host can tear its DOM globals down first
   * (`component-register`'s `disconnectedCallback` defers a microtask; a
   * test environment deletes the globals synchronously right after
   * detaching). A bare `cancelAnimationFrame` there throws, surfacing as an
   * unhandled rejection that fails a run in which every test passed --
   * see tests/components/teardown-without-dom-globals.test.tsx, and the
   * same pattern in create-tween.ts.
   *
   * Guarded because "setup" here is the component body, and a server render
   * executes component bodies too; Node has neither global.
   */
  const cancelFrame = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame.bind(globalThis)
    : () => {};

  function onNewContent() {
    // One pending scroll is enough: a burst of mutations in a frame must not queue a scroll each.
    if (shouldStick && pendingFrame === undefined) {
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = undefined;
        scrollToBottom('instant');
      });
    }
  }

  /**
   * Size, not mutation, covers what the MutationObserver cannot see: rows an app projects
   * through a `<slot>` live in the light DOM, and the text they stream lives in their own
   * shadow roots, so none of it mutates this subtree, yet it moves the scroll height.
   *
   * The ROWS are observed, not the content column: that column is `min-h-full` in a flex
   * scroller and shrinks back to the viewport while its rows overflow, so its own size never
   * changes (measured). A slot has no box, so its assigned elements stand in for it.
   *
   * It pins synchronously: resize callbacks run after layout and before paint, so the scroll
   * lands in the growth's own frame. A rAF would paint one unpinned frame per update.
   */
  function onResize() {
    if (shouldStick) scrollToBottom('instant');
  }

  function ref(el: HTMLElement) {
    containerEl = el;
    el.addEventListener('scroll', checkIfAtBottom, { passive: true });
    const observer = new MutationObserver(() => {
      onNewContent();
      syncObserved();
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : undefined;
    const observed = new Set<Element>();
    /** Everything whose height is the scroller's scroll height: the scroller's children (the
     *  column), the column's children, and, for a slot, the elements assigned to it. */
    function targets(): Set<Element> {
      const out = new Set<Element>();
      const add = (n: Element) => {
        if (n instanceof HTMLSlotElement) for (const a of n.assignedElements({ flatten: true })) out.add(a);
        else out.add(n);
      };
      for (const c of el.children) {
        out.add(c);
        for (const r of c.children) add(r);
      }
      return out;
    }
    function syncObserved() {
      if (!resizer) return;
      const next = targets();
      for (const c of observed) {
        if (!next.has(c)) { resizer.unobserve(c); observed.delete(c); }
      }
      for (const c of next) {
        if (!observed.has(c)) { observed.add(c); resizer.observe(c); }
      }
    }
    // A slot's assignment changes without touching this subtree (an app appends a row to
    // its own light DOM), and `slotchange` is the one signal that says so.
    el.addEventListener('slotchange', syncObserved);
    syncObserved();
    onCleanup(() => {
      el.removeEventListener('scroll', checkIfAtBottom);
      el.removeEventListener('slotchange', syncObserved);
      observer.disconnect();
      resizer?.disconnect();
      if (pendingFrame !== undefined) {
        cancelFrame(pendingFrame);
        pendingFrame = undefined;
      }
    });
  }

  return { ref, isAtBottom, scrollToBottom };
}
