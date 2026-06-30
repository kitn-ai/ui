import { Notice, noticeIconNode } from '../ui/notice';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** `neutral` (default) · `info` · `warning` · `error` · `success`. Drives the
   *  leading icon's color and the a11y role (`alert` for errors, else `status`). */
  severity?: 'neutral' | 'info' | 'warning' | 'error' | 'success';
  /** Leading icon: omit for the severity default, `"none"` to hide it, or a named
   *  icon to override. */
  icon?: string;
  /** Show a dismiss (×) that hides the notice and emits `kai-dismiss`. */
  dismissible?: boolean;
}

/** Events fired by `<kai-notice>`. */
interface Events {
  /** The notice was dismissed via its × (it also hides itself). */
  'kai-dismiss': void;
}

/**
 * `<kai-notice>` — a self-contained inline notice / alert. Put the message as
 * light-DOM text and an optional `slot="action"` (e.g. a link); it carries the
 * severity icon, the right a11y role, and an optional self-dismissing ×.
 *
 * It owns the notice box, not its placement — you position it in your own layout
 * (above a composer, at the top of a panel, …).
 *
 * For a custom leading icon, slot any inline SVG via `slot="icon"` (it wins over
 * the severity/`icon` default — the same escape hatch as `kai-button`).
 *
 * ```html
 * <kai-notice severity="warning" dismissible>
 *   Claude Fable 5 is currently unavailable.
 *   <a slot="action" href="#">Learn more</a>
 * </kai-notice>
 * ```
 */
defineWebComponent<Props, Events>('kai-notice', {
  severity: 'neutral',
  icon: undefined,
  dismissible: false,
}, (props, { dispatch, flag }) => (
  <Notice
    severity={props.severity ?? 'neutral'}
    iconSlot={<slot name="icon">{noticeIconNode(props.severity ?? 'neutral', props.icon)}</slot>}
    dismissible={flag('dismissible')}
    onDismiss={() => dispatch('kai-dismiss')}
    action={<slot name="action" />}
  >
    <slot />
  </Notice>
));
