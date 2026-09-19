import { splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

/**
 * `RowGroup` — the frame that turns loose rows into a LIST: one bordered, rounded
 * card with a hairline between adjacent rows, the first row rounded at the top
 * only, the last at the bottom only, and every middle row square. It is the shape
 * a settings screen, a link list and a home tab all hand-rolled before it existed
 * (`row.stories.tsx`, `settings-group.tsx`, `home-panel.tsx` — the last two also
 * had to fight `Row`'s own standalone radius with `rounded-none border-b
 * last:border-b-0`).
 *
 * COMPOSITION ONLY. It takes children, not `items`: which rows exist, in what
 * order, keyed how, and what an empty list means are the application's business
 * (a data-driven list would also have to own loading, empty and error states,
 * which is a component library deciding policy it cannot see). Rows are authored
 * by the caller and this only frames them.
 *
 * It renders NO geometry itself — see the row-list block in `../kit-base.css` for
 * the dividers and the per-position corners, and the reasons they are CSS rather
 * than classes. Two consequences worth knowing at the call site:
 *
 * - Rows must be DIRECT CHILDREN. Both rule sets are direct-child selectors, so a
 *   wrapper element per row (a `<li>`, a slide-in transition container) collects
 *   the divider on its own box and the rows inside it get none.
 * - Rows are MOUNTED AND UNMOUNTED rather than hidden. `hidden` leaves the row in
 *   the sibling chain and the next row's hairline lands under the frame's top
 *   border; that limit is explained where the rule lives.
 *
 * The frame's own chrome (border, radius, clip) is a plain class, overridable
 * through `class` like any other kit part: a group inside a rounded panel passes
 * `rounded-none border-0` and one that should read as flush sets
 * `[--kai-row-radius:0]`.
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
