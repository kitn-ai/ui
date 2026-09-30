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
   * SIZE, not mutation, is what this watches for content the MutationObserver cannot see.
   *
   * The observer below covers the scroller's own subtree. Rows an app projects through a
   * `<slot>` (a `<kai-thread>` with `<kai-message>` children) live in the LIGHT DOM, and the
   * text they stream lives in their own shadow roots, so none of it is a mutation of this
   * subtree. It is still a change to the height of the row that holds it, and that is the
   * thing the pin depends on. A ResizeObserver on the ROWS sees it whatever the projection,
   * and also catches what mutations never did in either mode: an image that finishes
   * loading, a code block that highlights taller.
   *
   * The ROWS, not the content column: that column is `min-h-full` inside a flex scroller,
   * so it is free to shrink back to the viewport height while its rows overflow it, and its
   * own size then never changes however much the rows grow (measured: it reports nothing
   * while the scroller's scrollHeight moves by 100px). A slot has no box of its own, so its
   * assigned elements are observed in its place.
   *
   * It pins SYNCHRONOUSLY. Resize callbacks run after layout and before paint, so a scroll
   * here lands in the same frame as the growth; deferring to a rAF the way the mutation path
   * does would paint one frame of unpinned content per update, which at 30 updates a second
   * is a visible shimmy. A scroll offset write does not invalidate layout, so it cannot
   * feed the observer a loop.
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
