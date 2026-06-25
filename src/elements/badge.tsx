import { Badge } from '../ui/badge';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** `default` (muted pill) · `count` (compact number badge) · `citation`
   *  (filled primary, for inline citation markers). Defaults to `default`. */
  variant?: 'default' | 'count' | 'citation';
}

/**
 * `<kai-badge>` — a small pill for labels, status, counts, or citation markers.
 * Put the content as light-DOM text.
 *
 * ```html
 * <kai-badge>Beta</kai-badge>
 * <kai-badge variant="count">3</kai-badge>
 * <kai-badge variant="citation">1</kai-badge>
 * ```
 * Restyle via `::part(badge)`.
 */
defineWebComponent<Props>('kai-badge', {
  variant: 'default',
}, (props) => (
  <Badge variant={props.variant ?? 'default'} part="badge">
    <slot />
  </Badge>
));
