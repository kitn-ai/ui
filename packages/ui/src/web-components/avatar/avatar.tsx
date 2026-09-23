import { Avatar } from '../../components/avatar/avatar';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** Image URL/data-URI. When absent, the `fallback` initials show instead. */
  src?: string;
  /** Alt text for the image. Defaults to `fallback`. */
  alt?: string;
  /** Short text shown when there's no image, usually initials (e.g. "JD", "AI"). */
  fallback?: string;
  /** Size token: `sm` | `md` (default) | `lg`. */
  size?: 'sm' | 'md' | 'lg';
}
// An identity badge (the thing beside a message, or in a conversation list), not a generic icon:
// for a glyph, use an `icon` prop on another element.
/**
 * A person or entity avatar: a rounded image that falls back to initials.
 */
defineWebComponent<Props>('kai-avatar', {
  src: undefined,
  alt: undefined,
  fallback: '',
  size: 'md',
}, (props) => (
  <Avatar src={props.src} alt={props.alt} fallback={props.fallback ?? ''} size={props.size ?? 'md'} />
));
