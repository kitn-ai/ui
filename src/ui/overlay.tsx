import {
  createSignal, createEffect, onCleanup, splitProps, type Accessor, type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  computePosition, autoUpdate, offset, flip, shift, arrow, hide,
  getOverflowAncestors, type Placement,
} from '@floating-ui/dom';

/**
 * Keep a node mounted through its CSS exit animation.
 * Open  -> present=true, state='open'  (enter animation via base classes)
 * Close -> state='closed' (data-closed triggers tw-animate-css animate-out),
 *          then unmount on `animationend`. If no animation is defined
 *          (e.g. jsdom), unmount on the next microtask.
 */
export function createPresence(show: Accessor<boolean>) {
  const [present, setPresent] = createSignal(show());
  const [state, setState] = createSignal<'open' | 'closed'>(show() ? 'open' : 'closed');
  let node: Element | undefined;
  let generation = 0;
  const setRef = (el: Element) => { node = el; };

  createEffect((prev: boolean | undefined) => {
    const visible = show();
    if (visible) {
      generation++;
      setPresent(true);
      setState('open');
    } else if (prev) {
      setState('closed');
      const el = node;
      const hasAnim = el && (() => {
        const cs = getComputedStyle(el);
        return cs.animationName !== 'none' && parseFloat(cs.animationDuration || '0') > 0;
      })();
      if (!el || !hasAnim) {
        const gen = ++generation;
        queueMicrotask(() => { if (gen === generation) setPresent(false); });
        return visible;
      }
      const animEl = el as HTMLElement;
      const onEnd = (e: AnimationEvent) => {
        if (e.target !== animEl) return;
        animEl.removeEventListener('animationend', onEnd);
        setPresent(false);
      };
      animEl.addEventListener('animationend', onEnd);
      onCleanup(() => animEl.removeEventListener('animationend', onEnd));
    }
    return visible;
  });

  return { present, state, setRef };
}

export type AsTag = string | ((props: Record<string, any>) => JSX.Element);

/**
 * Polymorphic element. `as` may be a tag name (default 'span') or a render
 * function that receives the forwarded props (render-prop style `as={fn}`).
 * Uses splitProps (NOT destructuring) so reactive forwarded props such as
 * aria-expanded stay reactive. All extra props (incl. `ref`, event handlers,
 * aria-*) are forwarded. `children` is left in `rest` so it forwards naturally.
 */
export function As(props: { as?: AsTag; children?: JSX.Element; [k: string]: any }) {
  const [local, rest] = splitProps(props, ['as']);
  if (typeof local.as === 'function') return local.as(rest);
  return <Dynamic component={local.as ?? 'span'} {...rest} />;
}

export interface UsePositionOptions {
  placement?: Placement;
  gutter?: number;
  arrowEl?: Accessor<HTMLElement | undefined>;
  /**
   * Fired ONCE when the reference (anchor) element leaves the document, so the
   * caller can close the overlay and unmount its portal instead of leaving it
   * orphaned (anchored to a node that no longer exists). Anchored overlays portal
   * OUT of the trigger's subtree, so Solid's onCleanup does not catch an anchor
   * that is removed independently of the overlay component. Wire this to set the
   * overlay's open state to false.
   */
  onDisconnect?: () => void;
}

/**
 * Watch for the reference element leaving the document and fire `onDisconnect`
 * exactly once. Uses a MutationObserver on BOTH the document and the anchor's
 * root node: the document catches the anchor's host being removed (and light-DOM
 * removals), while the anchor's root node — a ShadowRoot for kai-* elements —
 * catches removals INSIDE the shadow tree, which a document-level observer can't
 * see through encapsulation. After any childList/subtree mutation we re-check
 * `reference.isConnected`. Guarded for environments without MutationObserver.
 * Returns a teardown that disconnects the observer.
 */
function watchAnchorDisconnect(ref: HTMLElement, onDisconnect: () => void): () => void {
  if (typeof MutationObserver !== 'function') return () => {};
  let fired = false;
  // Only fire after the anchor has actually been connected, so a one-off setup
  // while detached can never trigger a false disconnect.
  let everConnected = ref.isConnected;
  const check = () => {
    if (fired) return;
    if (ref.isConnected) { everConnected = true; return; }
    if (!everConnected) return;
    fired = true;
    obs.disconnect();
    onDisconnect();
  };
  const obs = new MutationObserver(check);
  const roots = new Set<Node>();
  if (typeof document !== 'undefined') roots.add(document);
  const rootNode = ref.getRootNode();
  if (rootNode) roots.add(rootNode);
  for (const root of roots) {
    try { obs.observe(root, { childList: true, subtree: true }); } catch { /* unobservable root */ }
  }
  return () => obs.disconnect();
}

/**
 * Position `floating` relative to `reference` using fixed strategy + autoUpdate,
 * so the element tracks the trigger on scroll/resize (fix DD-2). Writes
 * position into the returned `pos` signal; caller applies it as inline style.
 *
 * `options` (placement/gutter) are read at setup time — pass static values;
 * reactive option changes won't reposition until the next autoUpdate tick.
 */
export function usePosition(
  reference: Accessor<HTMLElement | undefined>,
  floating: Accessor<HTMLElement | undefined>,
  options: UsePositionOptions = {},
) {
  const [pos, setPos] = createSignal<{ x: number; y: number; placement: Placement }>(
    { x: 0, y: 0, placement: options.placement ?? 'bottom' },
  );
  const [arrowPos, setArrowPos] = createSignal<{ x?: number; y?: number }>({});
  // True when the trigger has scrolled out of view (clipped by an ancestor or the
  // viewport). Callers should hide the floating node so it doesn't stick to the
  // edge — Floating UI's `hide` middleware. autoUpdate keeps this live on scroll.
  const [hidden, setHidden] = createSignal(false);

  createEffect(() => {
    const ref = reference();
    const float = floating();
    if (!ref || !float) return;
    const update = () => {
      // `hide()` is read last so it reflects the final, shifted/flipped position.
      const middleware = [offset(options.gutter ?? 8), flip(), shift({ padding: 8 })];
      const aEl = options.arrowEl?.();
      if (aEl) middleware.push(arrow({ element: aEl }));
      middleware.push(hide());
      computePosition(ref, float, {
        placement: options.placement ?? 'bottom',
        strategy: 'fixed',
        middleware,
      }).then(({ x, y, placement, middlewareData }) => {
        setPos({ x, y, placement });
        if (middlewareData.arrow) setArrowPos({ x: middlewareData.arrow.x, y: middlewareData.arrow.y });
        setHidden(!!middlewareData.hide?.referenceHidden);
      });
    };
    // autoUpdate tracks scroll, window resize, reference/floating ResizeObserver,
    // and reference layout-shifts (IntersectionObserver). But its `ancestorResize`
    // only listens for DOM `resize` events (which ONLY `window` fires), so an
    // ANCESTOR element resizing (e.g. a sibling resizable sidebar reflowing the
    // anchor's container without resizing the anchor itself) is caught only by the
    // threshold-based layoutShift, which lags during a continuous drag. Add a
    // ResizeObserver across the reference and its overflow ancestors so the
    // floating node follows the anchor on any layout resize. Both are torn down
    // on unmount via onCleanup.
    const cleanup = autoUpdate(ref, float, update);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(update);
      ro.observe(ref);
      for (const ancestor of getOverflowAncestors(ref)) {
        if (ancestor instanceof Element) ro.observe(ancestor);
      }
    }
    // When the anchor leaves the DOM, close the overlay so its portal unmounts
    // instead of floating orphaned. Independent of autoUpdate/ResizeObserver.
    const disconnectWatch = options.onDisconnect
      ? watchAnchorDisconnect(ref, options.onDisconnect)
      : undefined;
    onCleanup(() => {
      cleanup();
      ro?.disconnect();
      disconnectWatch?.();
    });
  });

  return { pos, arrowPos, hidden };
}

export type DismissReason = 'escape' | 'outside';

export interface UseDismissOptions {
  enabled: Accessor<boolean>;
  onDismiss: (reason: DismissReason) => void;
  /** Elements considered "inside" (trigger + content). Pointerdown outside all of them dismisses. */
  refs: () => (HTMLElement | undefined)[];
}

/**
 * Escape key + outside-pointerdown dismissal. Does NOT lock page scroll (fix DD-1).
 *
 * `onDismiss` and `refs` are captured at call time (component setup), which is
 * fine in SolidJS since components don't re-run — ensure they close over mutable
 * variables, not stale values.
 */
export function useDismiss(opts: UseDismissOptions) {
  createEffect(() => {
    if (!opts.enabled()) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') opts.onDismiss('escape'); };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      const inside = opts.refs().some((el) => el && el.contains(target));
      if (!inside) opts.onDismiss('outside');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    onCleanup(() => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    });
  });
}
