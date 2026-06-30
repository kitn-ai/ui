import { Show, type JSX, splitProps } from 'solid-js';
import { cn } from '../utils/cn';

export interface StatProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The small muted caption above the value. */
  label?: string;
  /** The big value. A default-slot / `children` override wins over this. */
  value?: string;
  /** A small caption below the value. */
  hint?: string;
}

/**
 * A single metric / KPI tile: a muted label on top, a large value below, and an
 * optional hint caption. The consumer arranges tiles in their own CSS grid — this
 * is ONE cell. `children` (the default slot in the element) override `value` for
 * rich content.
 */
export function Stat(props: StatProps) {
  const [local, rest] = splitProps(props, ['label', 'value', 'hint', 'class', 'children']);
  return (
    <div
      part="stat"
      class={cn('flex flex-col gap-1 rounded-lg bg-surface p-3', local.class)}
      {...rest}
    >
      <Show when={local.label}>
        <span part="label" class="text-xs text-muted-foreground">{local.label}</span>
      </Show>
      <span part="value" class="text-2xl font-semibold leading-tight text-foreground">
        {local.children ?? local.value}
      </span>
      {/* When used directly (no slot), `value` renders; the element facade
          passes a <slot>{value}</slot> as `children`, so projected light-DOM
          content overrides `value` while `value` remains the slot's fallback. */}
      <Show when={local.hint}>
        <span class="text-xs text-muted-foreground">{local.hint}</span>
      </Show>
    </div>
  );
}
