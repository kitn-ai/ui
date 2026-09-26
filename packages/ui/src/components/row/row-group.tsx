import { splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

/**
 * `RowGroup`, the frame that turns loose rows into a LIST: one bordered, rounded card
 * with a hairline between adjacent rows, the first row rounded at the top only and the
 * last at the bottom only.
 *
 * COMPOSITION ONLY. It takes children, not `items`: which rows exist and in what order
 * are the application's business, since a data-driven list would also own loading, empty
 * and error states. Rows are authored by the caller and this only frames them.
 *
 * It renders NO geometry itself; the row-list block in `../kit-base.css` owns the
 * dividers, the per-position corners and why they are CSS. Two consequences:
 *
 * - Rows must be DIRECT CHILDREN. Both rule sets are direct-child selectors, so a
 *   wrapper per row (an `<li>`, a transition container) takes the divider for itself.
 * - Rows are MOUNTED AND UNMOUNTED, not hidden: a `hidden` row stays in the sibling
 *   chain and the next row's hairline lands under the frame's top border.
 *
 * The frame's chrome is a plain class, overridable like any other kit part: a group
 * inside a rounded panel passes `rounded-none border-0`.
 */
export interface RowGroupProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'ref'> {
  /** The rows, as direct children. */
  children?: JSX.Element;
  class?: string;
}

export function RowGroup(props: RowGroupProps) {
  const [local, rest] = splitProps(props, ['children', 'class']);

  return (
    <div
      part="group"
      {...rest}
      // `kai-row-group` is load-bearing, not decoration: every divider and corner
      // rule in kit-base.css is keyed on it. Renaming it here without renaming it
      // there renders a group with no dividers and no rounding at all, silently.
      class={cn('kai-row-group overflow-hidden rounded-xl border border-border', local.class)}
    >
      {local.children}
    </div>
  );
}
