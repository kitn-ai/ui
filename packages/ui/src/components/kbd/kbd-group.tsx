import { splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

/**
 * `KbdGroup` lays several separate `Kbd`s out as one shortcut hint. Reach for it
 * when the caps come from MORE THAN ONE shortcut or from a typed sequence
 * (`<KbdGroup><Kbd keys="Mod+K" /><Kbd keys="Mod+S" /></KbdGroup>`), because a
 * `keys` token spec is a single shortcut and cannot express where one ends and the
 * next begins. A lone `Kbd` already renders its own token row with the same gap
 * (`gap-0.5` between caps of one chip), so it needs no group.
 *
 * Composition only: which shortcuts exist and in what order is the caller's
 * business, exactly as `RowGroup` takes children rather than `items`. Nothing here
 * binds keys: `Kbd` is display only.
 */
export interface KbdGroupProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

export function KbdGroup(props: KbdGroupProps): JSX.Element {
  const [local, rest] = splitProps(props, ['children', 'class']);

  return (
    <div
      part="group"
      // The props type extends `JSX.HTMLAttributes<HTMLElement>`, so `rest.ref` is an
      // `HTMLElement` while this frame is a `div`; the spread narrows it here rather
      // than on the public type two lanes code against. Runtime is unaffected — Solid
      // hands the ref the element it actually mounted.
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
      class={cn('inline-flex items-center gap-1', local.class)}
    >
      {local.children}
    </div>
  );
}
