import { defineWebComponent } from './define';
import { Loader, type LoaderVariant, type LoaderSize } from '../components/loader';

interface Props extends Record<string, unknown> {
  /** The animation style: `'circular' | 'classic' | 'pulse' | 'pulse-dot' |
   *  'dots' | 'typing' | 'wave' | 'bars' | 'terminal' | 'text-blink' |
   *  'text-shimmer' | 'loading-dots'`. Defaults to `'circular'`. */
  variant?: LoaderVariant;
  /** Loader size: `'sm' | 'md' | 'lg'`. Defaults to `'md'`. */
  size?: LoaderSize;
  /** Label for the text-based variants. */
  text?: string;
}

/**
 * `<kc-loader>` — an animated loader. `variant` selects the style (circular,
 * dots, wave, text-shimmer, …); `size` and `text` are attributes.
 */
defineWebComponent<Props>('kc-loader', {
  variant: 'circular',
  size: 'md',
  text: undefined,
}, (props) => (
  <Loader variant={props.variant} size={props.size} text={props.text} />
));
