import { splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

/**
 * `KbdGroup` — welds several `Kbd`s into ONE key strip: the caps abut (no gap),
 * the facing corners go square, and the two borders at each seam collapse into one
 * hairline. Reach for it when one shortcut is spelled with caps that come from
 * MORE THAN ONE source or as a typed sequence
 * (`<KbdGroup><Kbd>G</Kbd><Kbd>D</Kbd></KbdGroup>`), because a group that merely
 * spaced its children out looked identical to a row of separate `Kbd`s, which is
 * the whole point of having a group. Two DIFFERENT shortcuts are two elements (or
 * two groups), not one group: the weld is what says they are one key.
 *
 * Composition only: which caps exist and in what order is the caller's business,
 * exactly as `RowGroup` takes children rather than `items`. Nothing here binds
 * keys, and `Kbd` is display only.
 *
 * The web-component layer implements the same geometry from the other side:
 * `<kai-kbd-group>` cannot reach the caps inside a slotted `<kai-kbd>`'s shadow
 * root, so it marks each direct `<kai-kbd>` child with `data-kai-join` and the
 * child's own stylesheet does the same weld. Both are pinned by tests; keep them
 * in step.
 */
export interface KbdGroupProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

export function KbdGroup(props: KbdGroupProps): JSX.Element {
  const [local, rest] = splitProps(props, ['children', 'class']);

  return (
    <div
      part="group"
      // The weld, in one place. Every selector here is one of five facts:
      //   1. the strip has no gap, and the chord gap INSIDE a child is zeroed by the
      //      inherited `--kai-kbd-cap-gap` (Kbd's own class reads it), so a
      //      multi-cap child welds internally too;
      //   2. each child after the first is pulled left 1px, which collapses the two
      //      facing 1px borders into a single hairline instead of a 2px seam;
      //   3. a cap that is not the last child of its parent loses its right corners,
      //      and one that is not the first loses its left corners (the caps inside a
      //      child, separated by the empty `part="separator"` span);
      //   4. the FIRST cap of a child that is not the group's first child loses its
      //      left corners, and the LAST cap of a child that is not the last loses its
      //      right corners (the seams BETWEEN children, which 3 cannot see);
      //   5. caps after the first inside one child shift 1px, and a child's own
      //      first cap does not (it is already shifted by 2).
      // A lone child keeps both ends rounded, which is why a one-child group is
      // harmless: it welds nothing.
      class={cn(
        'inline-flex items-center',
        '[--kai-kbd-cap-gap:0px]',
        '[&>*+*]:-ml-px',
        '[&_[part=key]:not(:last-child)]:rounded-r-none',
        '[&_[part=key]:not(:first-child)]:rounded-l-none',
        '[&>*:not(:first-child)>[part=key]:first-child]:rounded-l-none',
        '[&>*:not(:last-child)>[part=key]:last-child]:rounded-r-none',
        '[&_[part=key]:not(:first-child)]:-ml-px',
        local.class,
      )}
      // The props type extends `JSX.HTMLAttributes<HTMLElement>`, so `rest.ref` is an
      // `HTMLElement` while this frame is a `div`; the spread narrows it here rather
      // than on the public type two lanes code against. Runtime is unaffected — Solid
      // hands the ref the element it actually mounted.
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
    >
      {local.children}
    </div>
  );
}
