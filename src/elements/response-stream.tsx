import { defineWebComponent } from './define';
import { ResponseStream, type Mode } from '../components/response-stream';

interface Props extends Record<string, unknown> {
  /** Text to stream. A string, or an `AsyncIterable<string>` (set as a JS
   *  property — async iterables can't be HTML attributes). */
  text?: string | AsyncIterable<string>;
  /** Reveal animation. */
  mode?: Mode;
  /** Characters/segments per tick. */
  speed?: number;
  /** Element tag to render as. */
  as?: string;
}

/** Events fired by `<kc-response-stream>`. */
interface Events {
  /** Streaming finished. */
  'kc-complete': void;
}

/**
 * `<kc-response-stream>` — reveals text with a typewriter or fade animation.
 * Text via the `text` property; `mode`/`speed` attributes; emits `kc-complete`.
 */
defineWebComponent<Props, Events>('kc-response-stream', {
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
    onComplete={() => dispatch('kc-complete')}
  />
));
