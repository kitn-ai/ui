import { Notice, noticeIconNode } from '../../components/notice/notice';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  // The leading icon follows the severity; the a11y role is `alert` for errors and
  // `status` otherwise.
  /** Severity. Defaults to `'neutral'`. */
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
 * An inline notice box with a leading status icon.
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
