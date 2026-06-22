import { defineWebComponent } from './define';
import { ToastRegion, type ToastDismissReason, type ToastPosition } from '../components/toast';
import { toast as toastStore, type ToastItem } from '../primitives/toast-store';

interface Props extends Record<string, unknown> {
  /** The toasts to render. Newest is shown on top. Set as a JS property (array);
   *  pass a new array reference to update. */
  toasts: ToastItem[];
  /** Stack anchor: `'top-center'` (default), `'top-right'`, `'bottom-center'`, … */
  position?: ToastPosition;
  /** Max simultaneously-visible toasts; the rest queue. Defaults to `3`. */
  max?: number;
  /** Stacking: 'expanded' (default, full column) | 'collapsed' (Sonner-style
   *  pile that expands on hover/focus). Attribute: stack. */
  stack?: 'expanded' | 'collapsed';
  /** Container element to anchor this region to (JS property). Set by the store
   *  for a scoped region; unset = the global viewport region. */
  target?: HTMLElement;
}

interface Events {
  /** A toast left the stack. `reason` is `'timeout' | 'close' | 'action'`. */
  'kai-dismiss': { id: string; reason: ToastDismissReason };
  /** A toast's action button was pressed. */
  'kai-action': { id: string; label: string };
}

/**
 * `<kai-toast-region>` — the viewport overlay that renders the toast stack.
 *
 * It is the substrate behind the imperative `toast()` API: the store lazily
 * mounts ONE of these on `document.body` and binds the list to `toasts`. It is
 * also usable declaratively — set `el.toasts = [...]` (a JS property, never an
 * attribute) and listen for `kai-dismiss` / `kai-action`.
 *
 * Because it is a real `kai-*` element it carries its own shadow root + the
 * shared kit stylesheet, so it is viewport-positioned AND kit-styled.
 */
defineWebComponent<Props, Events>('kai-toast-region', {
  toasts: [],
  position: 'top-center',
  max: 3,
  stack: 'expanded',
  target: undefined,
}, (props, { dispatch }) => {
  // `max` may arrive as a string attribute (`<kai-toast-region max="2">`).
  const max = () => {
    const raw = props.max as unknown;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return typeof n === 'number' && !Number.isNaN(n) ? n : 3;
  };

  const remove = (id: string) => {
    // Drop from the shared store (imperative path). For purely-declarative
    // consumers the store simply won't contain the id — the dispatched event
    // is the signal for them to update their own `toasts` array.
    toastStore.dismiss(id);
  };

  return (
    <ToastRegion
      toasts={props.toasts ?? []}
      position={props.position}
      max={max()}
      stack={props.stack as 'expanded' | 'collapsed' | undefined}
      target={props.target as HTMLElement | undefined}
      onDismiss={(id, reason) => {
        remove(id);
        dispatch('kai-dismiss', { id, reason });
      }}
      onAction={(id, label) => dispatch('kai-action', { id, label })}
    />
  );
});
