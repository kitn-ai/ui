// Module-level toast store + the imperative `toast()` API.
//
// This is the PRIMARY way consumers raise a toast: `toast('Saved')`,
// `toast.success('Copied')`, `toast.dismiss(id)`. The store is a single
// reactive list held in a long-lived `createRoot` (so its reactivity survives
// outside any component), and `ensureMounted()` lazily creates exactly ONE
// `<kai-toast-region>` on `document.body` the first time a toast is raised,
// binding the list to its `toasts` property. The region is a real `kai-*`
// element, so it carries its own shadow root + the shared kit stylesheet — it's
// viewport-positioned AND fully kit-styled, never a raw div.
//
// SSR-safe: every DOM touch is guarded by `typeof document`. On the server,
// raising a toast is an inert no-op (the store updates, nothing mounts).

import { createRoot, createSignal } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

export type ToastVariant = 'neutral' | 'success';

/** An action button rendered inside the toast. Returning `false` from
 *  `onAction` keeps the toast open (e.g. to show a follow-up); any other
 *  return value dismisses it. */
export interface ToastAction {
  label: string;
  onAction: () => void | false;
}

export interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  /** Auto-dismiss delay in ms. `0` = sticky (never auto-dismisses). When an
   *  `action` is present the effective floor is 4000ms so it stays long enough
   *  to act on. Defaults to 2000ms. */
  duration?: number;
  /** Whether the × close affordance is shown. Defaults to `true`. */
  dismissible?: boolean;
}

/** Options accepted by `toast()` — everything but the message. Pass `id` to
 *  update an existing toast in place. */
export interface ToastOptions {
  id?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
  dismissible?: boolean;
}

/** Handle returned from `toast()` for imperative control. */
export interface ToastHandle {
  id: string;
  dismiss: () => void;
  update: (patch: Partial<Omit<ToastItem, 'id'>>) => void;
}

/** Default auto-dismiss delay. */
export const DEFAULT_TOAST_DURATION = 2000;
/** Minimum auto-dismiss delay when the toast carries an action. */
export const ACTION_TOAST_FLOOR = 4000;

// ── The reactive store ──────────────────────────────────────────────────────
// Held in a never-disposed root so the signal/store graph stays live for the
// lifetime of the page, independent of any component.
const { toasts, setToasts, mounted, setMounted } = createRoot(() => {
  const [list, setList] = createStore<ToastItem[]>([]);
  const [isMounted, setIsMounted] = createSignal(false);
  return { toasts: list, setToasts: setList, mounted: isMounted, setMounted: setIsMounted };
});

/** The live toast list (reactive). The region facade binds to this. */
export function getToasts(): ToastItem[] {
  return toasts;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

/** Resolve the effective duration, applying the action floor. */
function resolveDuration(item: Pick<ToastItem, 'duration' | 'action'>): number {
  const base = item.duration ?? DEFAULT_TOAST_DURATION;
  if (base === 0) return 0; // explicit sticky wins
  if (item.action) return Math.max(base, ACTION_TOAST_FLOOR);
  return base;
}

/**
 * Lazily create the single `<kai-toast-region>` host on `document.body` and
 * bind the store to its `toasts` property. Idempotent + SSR-safe. The element
 * upgrade (its `defineWebComponent` registration) happens when the elements
 * bundle loads; setting the property before/after upgrade both work because
 * `customElement` reflects late-set properties.
 */
export function ensureMounted(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const existing = document.querySelector('kai-toast-region') as HTMLElement | null;
  if (existing) {
    (existing as unknown as { toasts: ToastItem[] }).toasts = toasts as ToastItem[];
    setMounted(true);
    return existing;
  }
  const el = document.createElement('kai-toast-region') as HTMLElement;
  // Append FIRST so the element upgrades, THEN bind the reactive store. Setting
  // the property before upgrade loses it: component-register resets every prop in
  // the constructor on upgrade (the same pre-upgrade clobber that bites <kai-chat>),
  // so a pre-append `el.toasts = …` is wiped and the FIRST toast never renders.
  // Post-upgrade the accessor stores the live store proxy and the facade reacts.
  document.body.appendChild(el);
  (el as unknown as { toasts: ToastItem[] }).toasts = toasts as ToastItem[];
  setMounted(true);
  return el;
}

/** Test-only: whether `ensureMounted` has run. */
export function isToastRegionMounted(): boolean {
  return mounted();
}

function upsert(item: ToastItem): void {
  const idx = toasts.findIndex((t) => t.id === item.id);
  if (idx >= 0) {
    setToasts(idx, item);
  } else {
    setToasts(produce((list) => { list.push(item); }));
  }
}

function dismiss(id: string): void {
  setToasts((list) => list.filter((t) => t.id !== id));
}

function makeHandle(id: string): ToastHandle {
  return {
    id,
    dismiss: () => dismiss(id),
    update: (patch) => {
      const idx = toasts.findIndex((t) => t.id === id);
      if (idx >= 0) setToasts(idx, (prev) => ({ ...prev, ...patch }));
    },
  };
}

/** Internal: raise/refresh a toast of a given variant. */
function raise(message: string, opts: ToastOptions | undefined, variant: ToastVariant): ToastHandle {
  ensureMounted();
  const id = opts?.id ?? nextId();
  const item: ToastItem = {
    id,
    message,
    variant: opts?.variant ?? variant,
    action: opts?.action,
    duration: opts?.duration,
    dismissible: opts?.dismissible,
  };
  upsert(item);
  return makeHandle(id);
}

export interface ToastFn {
  (message: string, opts?: ToastOptions): ToastHandle;
  /** Raise a success (emerald check) toast. */
  success: (message: string, opts?: ToastOptions) => ToastHandle;
  /** Dismiss a toast by id. */
  dismiss: (id: string) => void;
  /** Dismiss every active toast. */
  clear: () => void;
}

/**
 * Raise a transient toast. Returns a `{ id, dismiss, update }` handle.
 *
 * ```ts
 * toast('Copied to clipboard');
 * toast.success('Saved');
 * const t = toast('Working…', { duration: 0 });
 * t.update({ message: 'Done', variant: 'success', duration: 2000 });
 * ```
 */
export const toast: ToastFn = Object.assign(
  (message: string, opts?: ToastOptions) => raise(message, opts, 'neutral'),
  {
    success: (message: string, opts?: ToastOptions) => raise(message, opts, 'success'),
    dismiss,
    clear: () => setToasts([]),
  },
);

// Re-export for the region facade so the effective-duration rule lives in one place.
export { resolveDuration };
