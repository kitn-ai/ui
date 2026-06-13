import {
  createSignal, createEffect, onCleanup, splitProps, type Accessor, type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  computePosition, autoUpdate, offset, flip, shift, arrow, type Placement,
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

  createEffect(() => {
    const ref = reference();
    const float = floating();
    if (!ref || !float) return;
    const update = () => {
      const middleware = [offset(options.gutter ?? 8), flip(), shift({ padding: 8 })];
      const aEl = options.arrowEl?.();
      if (aEl) middleware.push(arrow({ element: aEl }));
      computePosition(ref, float, {
        placement: options.placement ?? 'bottom',
        strategy: 'fixed',
        middleware,
      }).then(({ x, y, placement, middlewareData }) => {
        setPos({ x, y, placement });
        if (middlewareData.arrow) setArrowPos({ x: middlewareData.arrow.x, y: middlewareData.arrow.y });
      });
    };
    const cleanup = autoUpdate(ref, float, update);
    onCleanup(cleanup);
  });

  return { pos, arrowPos };
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
