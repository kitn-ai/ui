import { defineKitnElement } from './define';
import { TextShimmer } from '../components/text-shimmer';

interface Props extends Record<string, unknown> {
  /** The text to shimmer. */
  text?: string;
  /** Element tag to render as (default `span`). */
  as?: string;
  /** Animation duration in seconds. */
  duration?: number;
  /** Gradient spread (5–45). */
  spread?: number;
}

/**
 * `<kitn-text-shimmer>` — animated shimmering text. Text via the `text`
 * attribute; `duration`/`spread` tune the effect.
 */
defineKitnElement<Props>('kitn-text-shimmer', {
  text: '',
  as: 'span',
  duration: 4,
  spread: 20,
}, (props) => (
  <TextShimmer as={props.as} duration={props.duration} spread={props.spread}>
    {props.text}
  </TextShimmer>
));
