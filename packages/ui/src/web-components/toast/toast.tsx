import { defineWebComponent } from '../define/define';
import { ToastRegion, type ToastDismissReason, type ToastPosition, type ToastAppearance } from '../../components/toast/toast';
import { toast as toastStore, type ToastItem } from '../../primitives/toast-store';

interface Props extends Record<string, unknown> {
  // Note the handover: the first `toast()` call ADOPTS a region you placed in markup (no
  // second region mounts) and binds the imperative store to this property, replacing any
  // array you set. Drive a region as data OR via `toast()`, not both at once. Omitted is
  // the normal resting state, and how the imperative `toast()` API starts.
  /** The toasts to render, newest on top. JS property; a new array reference updates it. */
  toasts?: ToastItem[];
  /** Stack anchor: `'top-center'` (default), `'top-right'`, `'bottom-center'`, … */
  position?: ToastPosition;
  /** Max simultaneously-visible toasts; the rest queue. Defaults to `3`. */
  max?: number;
  /** Stacking: 'expanded' (default, full column) | 'collapsed' (Sonner-style
   *  pile that expands on hover/focus). Attribute: stack. */
  stack?: 'expanded' | 'collapsed';
  /** Default appearance for this region's toasts: `pill` (default, compact) or `card` (richer). A per-toast `appearance` wins. */
  appearance?: ToastAppearance;
  /** Default high-contrast inverse treatment for this region's toasts. A per-toast
   *  `inverse` wins. Off by default. Attribute: `inverse`. */
  inverse?: boolean;
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
// The store lazily mounts ONE region on `document.body`; `toast()` ADOPTS the first connected
// `<kai-toast-region>` instead of mounting a second, and creates its own only when none exists.
// Adoption keeps the authored attributes (position/stack/appearance) but binds the imperative
// store to `toasts`, replacing an array driven as data, so within one app either own the array
// or call `toast()`, never both. With two or more regions placed the first in document order is
// adopted and a one-time console.warn flags the ambiguity.
// `--kai-toast-z` (default 100) is the consumer knob that moves the layer; it is not in the
// slots registry, so this comment is the only source-tree copy.
/**
 * The viewport overlay that stacks toasts.
 */
defineWebComponent<Props, Events>('kai-toast-region', {
  toasts: [],
  position: 'top-center',
  max: 3,
  stack: 'expanded',
  appearance: 'pill',
  inverse: false,
  target: undefined,
}, (props, { dispatch, flag }) => {
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
      appearance={props.appearance as ToastAppearance | undefined}
      inverse={flag('inverse')}
      target={props.target as HTMLElement | undefined}
      onDismiss={(id, reason) => {
        remove(id);
        dispatch('kai-dismiss', { id, reason });
      }}
      onAction={(id, label) => dispatch('kai-action', { id, label })}
    />
  );
});
