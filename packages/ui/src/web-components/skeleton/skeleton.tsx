import { Skeleton, type SkeletonVariant } from '../../components/skeleton/skeleton';
import { defineWebComponent } from '../define/define';

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

// Prop-driven, not class-driven: a consumer's utility classes cannot reach inside a shadow root.
/**
 * A pulsing placeholder that holds a layout while content loads.
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
