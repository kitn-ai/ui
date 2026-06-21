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
  /** Fired when a toast leaves, with the reason. */
  onDismiss?: (id: string, reason: ToastDismissReason) => void;
  /** Fired when a toast's action button is pressed. */
  onAction?: (id: string, label: string) => void;
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

/**
 * Renders a stack of toasts at a viewport edge. Caps the visible count at `max`
 * (newest on top); overflow waits in a queue and is promoted as visible toasts
 * leave. `aria-live=polite` / `role=region` so screen readers announce new
 * toasts without stealing focus.
 */
export function ToastRegion(props: ToastRegionProps) {
  const max = () => props.max ?? 3;
  const position = () => props.position ?? 'top-center';

  // Newest-first so the freshest toast sits at the top of the stack; the queue
  // (everything past `max`) stays mounted-but-hidden until a slot frees up.
  const ordered = createMemo(() => [...(props.toasts ?? [])].reverse());
  const visible = createMemo(() => ordered().slice(0, max()));

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      class={cn(
        'pointer-events-none fixed z-[100] flex flex-col gap-2',
        'max-w-[min(28rem,calc(100vw-2rem))]',
        POSITION_CLASSES[position()],
      )}
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
  );
}
