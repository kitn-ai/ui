import { Stat } from '../ui/stat';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** The small muted label above the value. */
  label?: string;
  /** The big value (scalar). A default-slot override wins over this. */
  value?: string;
  /** A small caption below the value. */
  hint?: string;
}

/**
 * `<kai-stat>` — a metric / KPI tile: a muted `label` on top, a big `value`
 * below, and an optional `hint` caption. One tile; the consumer arranges them in
 * their own CSS grid for a usage dashboard.
 *
 * ```html
 * <kai-stat label="Sessions" value="408"></kai-stat>
 * <kai-stat label="Total tokens" value="181.5M" hint="+12% this week"></kai-stat>
 * <!-- rich value via the default slot (overrides value): -->
 * <kai-stat label="Favorite model"><strong>Opus 4.8</strong></kai-stat>
 * ```
 * Restyle via `::part(stat)` / `::part(label)` / `::part(value)`.
 */
defineWebComponent<Props>('kai-stat', {
  label: undefined,
  value: undefined,
  hint: undefined,
}, (props) => (
  <Stat
    label={props.label as string | undefined}
    hint={props.hint as string | undefined}
  >
    {/* Projected light-DOM content wins; `value` is the slot's fallback. */}
    <slot>{props.value as string | undefined}</slot>
  </Stat>
));
