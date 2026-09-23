import { defineWebComponent } from '../define/define';
import { TextShimmer } from '../../components/text-shimmer/text-shimmer';

interface Props extends Record<string, unknown> {
  /** The text to shimmer. */
  text?: string;
  /** Element tag to render as. Default `span`. */
  as?: string;
  /** Animation duration in seconds. */
  duration?: number;
  /** Gradient spread, 5 to 45. */
  spread?: number;
}

/**
 * Animated shimmering text, for a loading placeholder.
 */
defineWebComponent<Props>('kai-text-shimmer', {
  text: '',
  as: 'span',
  duration: 4,
  spread: 20,
}, (props) => (
  <TextShimmer as={props.as} duration={props.duration} spread={props.spread} class="text-body">
    {props.text}
  </TextShimmer>
));
