import { Badge } from '../../components/badge/badge';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** `default` (muted pill) · `count` (compact number badge) · `citation`
   *  (filled primary, for inline citation markers). Defaults to `default`. */
  variant?: 'default' | 'count' | 'citation';
}

/**
 * A compact pill for status text, counts, or source citations.
 */
defineWebComponent<Props>('kai-badge', {
  variant: 'default',
}, (props) => (
  <>
    {/* Base sets `:host{display:block}`; a badge/pill flows inline with text and
        beside sibling badges, so inline-flex like kai-button. */}
    <style>{':host{display:inline-flex}'}</style>
    <Badge variant={props.variant ?? 'default'} part="badge">
      <slot />
    </Badge>
  </>
));
