import { defineWebComponent } from './define';
import { Status, type StatusKind } from '../ui/status';

interface Props extends Record<string, unknown> {
  /** Presence/notification state → color. `new` (default) maps to the blue hue. */
  status?: StatusKind;
  /** Animated ping ring (off by default; respects prefers-reduced-motion). */
  pulse?: boolean;
  /** Accessible name. Without it the dot is decorative. */
  label?: string;
  /** `sm` (default) or `md`. */
  size?: 'sm' | 'md';
}

/**
 * `<kai-status>` — a small presence / new dot.
 *
 * ```html
 * <kai-status status="online" label="Online"></kai-status>
 * <kai-status status="new" pulse></kai-status>
 * ```
 * Recolor via `::part(dot)`.
 */
defineWebComponent<Props>('kai-status', {
  status: 'new',
  pulse: false,
  label: undefined,
  size: 'sm',
}, (props, { flag }) => (
  <>
    {/* Base sets `:host{display:block}`; a presence dot sits inline beside an
        avatar/label, so inline-flex like kai-button. */}
    <style>{':host{display:inline-flex}'}</style>
    <Status
      status={(props.status as StatusKind) ?? 'new'}
      size={(props.size as 'sm' | 'md') ?? 'sm'}
      pulse={flag('pulse')}
      label={props.label as string | undefined}
      part="dot"
    />
  </>
));
