import {
  createSignal, createEffect, onCleanup, For, Show, createMemo,
} from 'solid-js';
import { X, Check } from 'lucide-solid';
import { cn } from '../utils/cn';
import { createPresence } from '../ui/overlay';
import {
  type ToastItem, type ToastVariant, resolveDuration,
} from '../primitives/toast-store';

export type { ToastItem, ToastVariant };

/** Why a toast went away — surfaced to `onDismiss` (and the facade event). */
export type ToastDismissReason = 'timeout' | 'close' | 'action';

export type ToastPosition = 'top-center' | 'top-right' | 'top-left' | 'bottom-center' | 'bottom-right' | 'bottom-left';

export interface ToastRegionProps {
  /** The toasts to render. Newest is shown on top. Set as a JS property on the
   *  element; mutate by passing a new array reference. */
  toasts: ToastItem[];
  /** Where the stack anchors. Defaults to `'top-center'`. */
  position?: ToastPosition;
  /** Max simultaneously-visible toasts; the rest queue and promote as slots
   *  free up. Defaults to `3`. */
  max?: number;
  /** Stacking: 'expanded' (default, full column) | 'collapsed' (Sonner-style
   *  pile that expands on hover/focus). Attribute: stack. */
  stack?: 'expanded' | 'collapsed';
  /** When set, this region renders only the toasts scoped to that element and
   *  anchors over its bounds (top-center), following it on scroll/resize. Unset =
   *  the global, viewport-anchored region. */
  target?: HTMLElement;
  /** Fired when a toast leaves, with the reason. */
  onDismiss?: (id: string, reason: ToastDismissReason) => void;
  /** Fired when a toast's action button is pressed. */
  onAction?: (id: string, label: string) => void;
}

/** Reactive `prefers-reduced-motion`. SSR-safe (returns false when no window). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = createSignal(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    onCleanup(() => mq.removeEventListener?.('change', on));
  }
  return reduced;
}

// ── Single toast pill ────────────────────────────────────────────────────────

interface ToastProps {
  item: ToastItem;
  onDismiss: (reason: ToastDismissReason) => void;
  onAction?: (label: string) => void;
}

/**
 * A single toast pill. Auto-dismisses after its (action-floored) duration,
 * pauses the timer while hovered, and animates in/out via `createPresence`.
 * Pure + prop-driven — the parent `ToastRegion` owns the list + queue.
 */
export function Toast(props: ToastProps) {
  const [open, setOpen] = createSignal(true);
  const presence = createPresence(open);
  const variant = () => props.item.variant ?? 'neutral';
  const dismissible = () => props.item.dismissible !== false;

  let remaining = resolveDuration(props.item);
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reason: ToastDismissReason = 'timeout';

  const clear = () => { if (timer !== undefined) { clearTimeout(timer); timer = undefined; } };

  const begin = () => {
    clear();
    if (remaining <= 0) return; // sticky (duration 0)
    startedAt = Date.now();
    timer = setTimeout(() => { reason = 'timeout'; setOpen(false); }, remaining);
  };
  const pause = () => {
    if (timer === undefined) return;
    clear();
    remaining -= Date.now() - startedAt;
  };

  // Start the auto-dismiss timer once (duration is read from the item at mount;
  // an in-place `update()` that changes duration re-evaluates on the next tick).
  createEffect(() => {
    // re-arm when the item's duration changes via update()
    remaining = resolveDuration(props.item);
    begin();
  });
  onCleanup(clear);

  // When presence has fully exited, notify the parent so it drops the item.
  createEffect(() => {
    if (!presence.present() && !open()) props.onDismiss(reason);
  });

  const close = () => { clear(); reason = 'close'; setOpen(false); };

  const act = () => {
    const action = props.item.action;
    if (!action) return;
    props.onAction?.(action.label);
    const keepOpen = action.onAction() === false;
    if (!keepOpen) { clear(); reason = 'action'; setOpen(false); }
  };

  return (
    <Show when={presence.present()}>
      <div
        ref={presence.setRef}
        role="status"
        data-closed={presence.state() === 'closed' ? '' : undefined}
        onPointerEnter={pause}
        onPointerLeave={begin}
        class={cn(
          'pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm shadow-lg',
          'bg-popover text-popover-foreground border-border',
          'animate-in fade-in-0 slide-in-from-top-4',
          'data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:slide-out-to-top-2',
        )}
      >
        <Show when={variant() === 'success'}>
          <Check class="size-4 shrink-0 text-emerald-500" />
        </Show>
        <span class="min-w-0 flex-1 truncate">{props.item.message}</span>
        <Show when={props.item.action}>
          {(action) => (
            <button
              type="button"
              onClick={act}
              class="text-primary hover:text-primary/80 shrink-0 rounded-md text-sm font-medium underline-offset-2 hover:underline"
            >
              {action().label}
            </button>
          )}
        </Show>
        <Show when={dismissible()}>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss"
            class="text-muted-foreground hover:text-foreground -mr-1 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <X class="size-3.5" />
          </button>
        </Show>
      </div>
    </Show>
  );
}

// ── Region (stack + queue) ───────────────────────────────────────────────────

const POSITION_CLASSES: Record<ToastPosition, string> = {
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse',
  'bottom-right': 'bottom-4 right-4 items-end flex-col-reverse',
  'bottom-left': 'bottom-4 left-4 items-start flex-col-reverse',
};

// Flex alignment + stack direction per position, for a TARGET-anchored region (the
// stack hugs the chosen corner; bottom rows grow upward so the newest sits at the
// anchored edge). Mirrors POSITION_CLASSES minus the viewport-edge offsets.
const ANCHOR_FLEX: Record<ToastPosition, string> = {
  'top-center': 'items-center',
  'top-left': 'items-start',
  'top-right': 'items-end',
  'bottom-center': 'items-center flex-col-reverse',
  'bottom-left': 'items-start flex-col-reverse',
  'bottom-right': 'items-end flex-col-reverse',
};

/** Inset from the target's edges, in px. */
const ANCHOR_PAD = 12;

interface TargetRect { top: number; left: number; right: number; bottom: number; width: number }

/**
 * The fixed-position style pinning a target-anchored stack to the corner named by
 * `position`, computed from the target's rect. The region is `position: fixed`, so
 * we resolve absolute top/left + a transform that grows the stack inward from that
 * edge. (Rect-based, like the popover's anchor math — no collision flipping needed.)
 */
function anchorStyle(position: ToastPosition, r: TargetRect): Record<string, string> {
  const cx = r.left + r.width / 2;
  const top = r.top + ANCHOR_PAD;
  const bottom = r.bottom - ANCHOR_PAD;
  const left = r.left + ANCHOR_PAD;
  const right = r.right - ANCHOR_PAD;
  const maxWidth = `${Math.max(0, r.width - ANCHOR_PAD * 2)}px`;
  switch (position) {
    case 'top-left':
      return { top: `${top}px`, left: `${left}px`, transform: 'none', 'max-width': maxWidth };
    case 'top-right':
      return { top: `${top}px`, left: `${right}px`, transform: 'translateX(-100%)', 'max-width': maxWidth };
    case 'bottom-center':
      return { top: `${bottom}px`, left: `${cx}px`, transform: 'translate(-50%, -100%)', 'max-width': maxWidth };
    case 'bottom-left':
      return { top: `${bottom}px`, left: `${left}px`, transform: 'translateY(-100%)', 'max-width': maxWidth };
    case 'bottom-right':
      return { top: `${bottom}px`, left: `${right}px`, transform: 'translate(-100%, -100%)', 'max-width': maxWidth };
    case 'top-center':
    default:
      return { top: `${top}px`, left: `${cx}px`, transform: 'translateX(-50%)', 'max-width': maxWidth };
  }
}

/**
 * Renders a stack of toasts at a viewport edge. Caps the visible count at `max`
 * (newest on top); overflow waits in a queue and is promoted as visible toasts
 * leave. `aria-live=polite` / `role=region` so screen readers announce new
 * toasts without stealing focus.
 */
export function ToastRegion(props: ToastRegionProps) {
  const max = () => props.max ?? 3;
  const position = () => props.position ?? 'top-center';

  const stack = () => props.stack ?? 'expanded';
  const reduced = usePrefersReducedMotion();
  const collapsed = () => stack() === 'collapsed' && !reduced();
  const [open, setOpen] = createSignal(false); // hover/focus-expanded (collapsed mode)

  // Tunable look (IVP). Resting peek + per-depth shrink; uniform expanded row height.
  const OFFSET = 14;       // px each deeper toast peeks past the one in front
  const SCALE_STEP = 0.05; // each deeper toast is 5% smaller
  const ROW_FALLBACK = 48; // px; used until the front pill is measured
  const GAP = 8;           // matches gap-2 in the expanded column

  const isBottom = () => position().startsWith('bottom');
  const dir = () => (isBottom() ? -1 : 1);

  // Measure ONE pill (all are single-line/uniform) to size the expanded spacing.
  const [rowH, setRowH] = createSignal(ROW_FALLBACK);
  const measure = (el: HTMLElement | undefined) => {
    if (!el || typeof window === 'undefined') return;
    const set = () => { const h = el.offsetHeight; if (h) setRowH(h); };
    set();
    // jsdom (and SSR) lack ResizeObserver; the fallback height is fine there.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  };

  // The transform for the wrapper at depth i, given the current open/resting state.
  const depthTransform = (i: number): string => {
    if (open()) return `translateY(${dir() * (rowH() + GAP) * i}px) scale(1)`;
    return `translateY(${dir() * OFFSET * i}px) scale(${1 - SCALE_STEP * i})`;
  };

  // Only the toasts for THIS region's target (undefined target = the global one).
  // Newest-first so the freshest toast sits at the top; the queue (past `max`)
  // stays mounted-but-hidden until a slot frees up.
  const ordered = createMemo(() =>
    [...(props.toasts ?? []).filter((t) => (t.target ?? undefined) === props.target)].reverse(),
  );
  const visible = createMemo(() => ordered().slice(0, max()));

  // Scoped to a target → anchor the stack to the `position` corner of the target,
  // following it on scroll/resize. Otherwise it's a viewport-fixed corner/center.
  const [anchor, setAnchor] = createSignal<TargetRect | null>(null);
  createEffect(() => {
    const t = props.target;
    if (!t || typeof window === 'undefined') { setAnchor(null); return; }
    const update = () => {
      const r = t.getBoundingClientRect();
      setAnchor({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(t);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    onCleanup(() => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    });
  });

  return (
    <Show
      when={collapsed()}
      fallback={
        <div
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          data-stack="expanded"
          class={cn(
            'pointer-events-none fixed z-[100] flex flex-col gap-2',
            anchor()
              ? ANCHOR_FLEX[position()]
              : cn('max-w-[min(28rem,calc(100vw-2rem))]', POSITION_CLASSES[position()]),
          )}
          style={anchor() ? anchorStyle(position(), anchor()!) : undefined}
        >
          <For each={visible()}>
            {(item) => (
              <Toast
                item={item}
                onDismiss={(reason) => props.onDismiss?.(item.id, reason)}
                onAction={(label) => props.onAction?.(item.id, label)}
              />
            )}
          </For>
        </div>
      }
    >
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        data-stack="collapsed"
        data-expanded={open() ? '' : undefined}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocusIn={() => setOpen(true)}
        onFocusOut={() => setOpen(false)}
        class={cn('pointer-events-none fixed z-[100]', !anchor() && POSITION_CLASSES[position()])}
        style={anchor() ? anchorStyle(position(), anchor()!) : undefined}
      >
        {/* Relative stage; pills are absolutely stacked from the anchored edge. */}
        <div class="relative" style={{ 'min-width': '16rem', 'max-width': 'min(28rem, calc(100vw - 2rem))' }}>
          <For each={visible()}>
            {(item, i) => (
              <div
                data-depth={i()}
                ref={(el) => { if (i() === 0) measure(el); }}
                class={cn(
                  'absolute inset-x-0 flex transition-[transform,opacity] duration-200 ease-out',
                  isBottom() ? 'bottom-0 origin-bottom' : 'top-0 origin-top',
                  position().endsWith('right') ? 'justify-end' : position().endsWith('left') ? 'justify-start' : 'justify-center',
                )}
                style={{ 'z-index': String(max() - i()), transform: depthTransform(i()) }}
              >
                <Toast
                  item={item}
                  onDismiss={(reason) => props.onDismiss?.(item.id, reason)}
                  onAction={(label) => props.onAction?.(item.id, label)}
                />
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
