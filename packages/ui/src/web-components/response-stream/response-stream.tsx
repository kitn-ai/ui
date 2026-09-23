import { defineWebComponent } from '../define/define';
import { ResponseStream, type Mode } from '../../components/response/response-stream';

interface Props extends Record<string, unknown> {
  /** Text to stream: a string, or an `AsyncIterable<string>` set as a property. */
  text?: string | AsyncIterable<string>;
  /** Reveal animation. */
  mode?: Mode;
  /** Characters or segments per tick. */
  speed?: number;
  /** Element tag to render as. */
  as?: string;
}

/** Events fired by `<kai-response-stream>`. */
interface Events {
  /** Streaming finished. */
  'kai-complete': void;
}

/**
 * Reveals streamed text with a typewriter or fade animation.
 */
defineWebComponent<Props, Events>('kai-response-stream', {
  text: '',
  mode: 'typewriter',
  speed: 20,
  as: undefined,
}, (props, { dispatch }) => (
  <ResponseStream
    textStream={props.text ?? ''}
    mode={props.mode}
    speed={props.speed}
    as={props.as}
    class="text-body"
    onComplete={() => dispatch('kai-complete')}
  />
));
