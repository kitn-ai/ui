import { defineWebComponent } from '../define/define';
import { Loader, type LoaderVariant, type LoaderSize } from '../../components/loader/loader';

interface Props extends Record<string, unknown> {
  /** Animation style. Default `circular`. */
  variant?: LoaderVariant;
  /** Loader size. Default `md`. */
  size?: LoaderSize;
  /** Label for the text-based variants. */
  text?: string;
}

/**
 * An animated loading indicator.
 */
defineWebComponent<Props>('kai-loader', {
  variant: 'circular',
  size: 'md',
  text: undefined,
}, (props) => (
  <Loader variant={props.variant} size={props.size} text={props.text} />
));
