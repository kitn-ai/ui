import { renderIcon } from '../ui/icon';
import { cn } from '../utils/cn';
import { defineWebComponent } from './define';

const SIZE: Record<string, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' };

interface Props extends Record<string, unknown> {
  /** A curated icon name (e.g. `"mic"`, `"globe"`), an image URL/data-URI, or
   *  plain text. */
  name?: string;
  /** Size token: `sm` | `md` (default) | `lg`. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * `<kai-icon>` — render one of the kit's curated icons (inline SVG) in your own
 * markup, so surrounding UI can match the kit without pulling in an icon library.
 * `name` also accepts a URL/data-URI or text. Renders in the theme's foreground by
 * default; recolor with `kai-icon::part(icon){ color: … }`.
 *
 * Scope: the kit's small, *curated* icon set — not a general icon library. For
 * anything outside it, drop your own inline SVG into an element's `icon` slot.
 *
 * ```html
 * <kai-icon name="globe"></kai-icon>
 * <kai-icon name="sparkles" size="lg"></kai-icon>
 * ```
 */
defineWebComponent<Props>('kai-icon', {
  name: '',
  size: 'md',
}, (props) => (
  <span part="icon" class={cn('inline-flex shrink-0', SIZE[props.size ?? 'md'] ?? SIZE.md)}>
    {renderIcon(props.name, { class: 'size-full', imgClass: 'size-full', spanClass: 'size-full' })}
  </span>
));
