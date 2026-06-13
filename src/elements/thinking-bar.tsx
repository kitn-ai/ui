import { defineKitnElement } from './define';
import { ThinkingBar } from '../components/thinking-bar';

interface Props extends Record<string, unknown> {
  /** The shimmering label, e.g. "Thinking…". */
  text?: string;
  /** When true, show a "stop" affordance that fires a `stop` event. */
  stoppable?: boolean;
  /** Label for the stop affordance. */
  stopLabel?: string;
}

/** Events fired by `<kitn-thinking-bar>`. */
interface Events {
  /** The "stop / answer now" affordance was clicked. */
  stop: void;
}

/**
 * `<kitn-thinking-bar>` — a pure leaf element: an animated "thinking" indicator
 * (one of the primitives the batteries-included `<kitn-chat>` does NOT surface).
 * Config via attributes, the only interaction (`stop`) comes back as an event.
 */
defineKitnElement<Props, Events>('kitn-thinking-bar', {
  text: 'Thinking',
  stoppable: false,
  stopLabel: 'Answer now',
}, (props, { dispatch, flag }) => (
  <ThinkingBar
    text={props.text}
    stopLabel={props.stopLabel}
    onStop={flag('stoppable') ? () => dispatch('stop') : undefined}
  />
));
