import { Skeleton, type SkeletonVariant } from '../ui/skeleton';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** `text` (one or more lines), `rect` (a block), or `circle` (round).
   *  Defaults to `text`. */
  variant?: SkeletonVariant;
  /** CSS width (e.g. `'12rem'`, `'60%'`). Defaults to full width (responsive);
   *  for `circle` it is the diameter. */
  width?: string;
  /** CSS height. Defaults per variant (a text line height; circle = width). */
  height?: string;
  /** `text` only: number of lines; the last is shorter. Defaults to 1. */
  lines?: number;
}

/**
 * `<kai-skeleton>` — a pulsing loading placeholder that preserves layout while
 * content arrives. Responsive by default (fills its container's width). It is
 * prop-driven because utility classes can't cross the shadow boundary: pick a
 * `variant` and optionally set `width` / `height` / `lines`.
 *
 * ```html
 * <kai-skeleton variant="text" lines="3"></kai-skeleton>
 * <kai-skeleton variant="circle" width="2.5rem"></kai-skeleton>
 * <kai-skeleton variant="rect" height="10rem"></kai-skeleton>
 * ```
 * Recolor by overriding the `--color-muted` token.
 */
defineWebComponent<Props>('kai-skeleton', {
  variant: 'text',
  width: undefined,
  height: undefined,
  lines: undefined,
}, (props) => (
  <>
    <style>{':host{display:block}'}</style>
    <Skeleton
      variant={props.variant ?? 'text'}
      width={props.width}
      height={props.height}
      lines={props.lines != null ? Number(props.lines) : undefined}
    />
  </>
));
