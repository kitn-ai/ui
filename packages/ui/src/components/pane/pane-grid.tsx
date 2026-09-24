import { type JSX, For, children as resolveChildren } from 'solid-js';
import { cn } from '../../utils/cn';

export interface PaneGridProps {
  /** The panes - arbitrary N. Each top-level child is one tile in the grid. */
  children: JSX.Element;
  /** Minimum width of every pane, in px, before columns drop / the grid scrolls.
   *  Defaults to `280`. */
  minPaneWidth?: number;
  /** Minimum height of every pane, in px, before the grid scrolls vertically.
   *  Defaults to `200`. */
  minPaneHeight?: number;
  /** Column cap when the container is wide. Columns fill up to this many, then drop
   *  to fewer as the container narrows. Defaults to `3`. */
  maxColumns?: number;
  /** Gap between panes - any CSS length. Defaults to the kit gap
   *  (`var(--kai-pane-grid-gap, 0.5rem)`). */
  gap?: string;
  /** The child index to render alone, filling the grid; `null` shows the full grid. */
  maximizedIndex?: number | null;
  /** Extra classes for the grid container. */
  class?: string;
}

/**
 * PaneGrid - an N-pane responsive tiling grid with a min-size + scroll floor.
 *
 * It lays panes out in a CSS grid that fills up to `maxColumns` columns when wide, then
 * DROPS columns as the container narrows, so panes never squish below their minimums.
 * Once even one column cannot hold a pane at `minPaneWidth` the grid SCROLLS instead of
 * shrinking, and rows stay at least `minPaneHeight` tall. Because new rows stack
 * downward the overflow is preferentially VERTICAL.
 *
 * Column track: `repeat(auto-fit, minmax(max(<minPaneWidth>px, (100% - <gaps>) /
 * <maxColumns>), 1fr))`, where `<gaps>` is `(maxColumns - 1) * gap`. The inner `max()`
 * is the floor: each track is at least `minPaneWidth` and at most `1fr`, while
 * `(100% - gaps) / maxColumns` is the per-column width when the cap is filled, so
 * `auto-fit` never packs in more. Below one pane's minimum the `overflow:auto`
 * container scrolls.
 *
 * Maximize: with `maximizedIndex` set, only that pane renders, in one `1fr x 1fr` cell.
 * The gap default reads `--kai-pane-grid-gap` (fallback `0.5rem`), and everything else
 * is tokenized, so it reads correctly in light and dark.
 */
export function PaneGrid(props: PaneGridProps) {
  const minPaneWidth = () => props.minPaneWidth ?? 280;
  const minPaneHeight = () => props.minPaneHeight ?? 200;
  const maxColumns = () => Math.max(1, props.maxColumns ?? 3);
  const gap = () => props.gap ?? 'var(--kai-pane-grid-gap, 0.5rem)';

  // Resolve children to their rendered nodes so a single pane can be picked out for
  // the maximize hook (mirrors how Resizable reads its panels).
  const resolved = resolveChildren(() => props.children);
  const items = (): JSX.Element[] => resolved.toArray() as JSX.Element[];

  // A valid maximize target, or null for the full grid.
  const maxIndex = (): number | null => {
    const m = props.maximizedIndex;
    if (m == null) return null;
    return m >= 0 && m < items().length ? m : null;
  };

  const shown = (): JSX.Element[] => {
    const m = maxIndex();
    return m == null ? items() : [items()[m]];
  };

  const gridStyle = (): JSX.CSSProperties => {
    const g = gap();
    if (maxIndex() != null) {
      // One filling cell.
      return {
        'grid-template-columns': '1fr',
        'grid-auto-rows': '1fr',
        gap: g,
      };
    }
    const cols = maxColumns();
    // The per-column width when the cap is filled: (container - all gaps) / cols.
    // Inside max() this is a math sub-expression, so the var/number arithmetic is valid.
    const capped = `(100% - ${cols - 1} * ${g}) / ${cols}`;
    return {
      'grid-template-columns': `repeat(auto-fit, minmax(max(${minPaneWidth()}px, ${capped}), 1fr))`,
      'grid-auto-rows': `minmax(${minPaneHeight()}px, 1fr)`,
      gap: g,
    };
  };

  return (
    <div
      data-pane-grid
      // min-w-0 / min-h-0 let the grid shrink inside a flex/grid parent so its own
      // overflow:auto (not the parent) takes over once panes hit their minimums.
      class={cn('grid h-full w-full min-h-0 min-w-0 overflow-auto', props.class)}
      tabindex={0}
      style={gridStyle()}
    >
      <For each={shown()}>{(pane) => pane}</For>
    </div>
  );
}
