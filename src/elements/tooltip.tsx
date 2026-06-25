import { Tooltip } from '../ui/tooltip';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** The hint text shown on hover/focus of the slotted trigger. */
  content?: string;
  /** Delay (ms) before the tooltip appears on hover. Defaults to 600. Focus
   *  shows it immediately regardless. */
  openDelay?: number;
}

/**
 * `<kai-tooltip>` — wraps a trigger and shows a hint on hover/focus. Put the
 * trigger as light-DOM content; set the text via `content`. Positions itself and
 * dismisses on Escape/outside-click; the content is portaled inside the shadow
 * root so it isn't clipped.
 *
 * ```html
 * <kai-tooltip content="Voice input">
 *   <kai-button variant="subtle" size="icon" icon="mic" label="Voice input"></kai-button>
 * </kai-tooltip>
 * ```
 */
defineWebComponent<Props>('kai-tooltip', {
  content: '',
  openDelay: undefined,
}, (props) => (
  <Tooltip
    content={props.content ?? ''}
    openDelay={props.openDelay != null ? Number(props.openDelay) : undefined}
  >
    <slot />
  </Tooltip>
));
