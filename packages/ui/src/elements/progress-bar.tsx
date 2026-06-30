import { ProgressBar, type ProgressTone } from '../ui/progress-bar';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** Current progress value (0..max). Attribute: `value`. */
  value?: number;
  /** The value `value` runs to (default 100). Attribute: `max`. */
  max?: number;
  /** Optional caption above the track. Attribute: `label`. */
  label?: string;
  /** Fill color: `primary` (default), `success`, `warning`, `error`, `info`. Attribute: `tone`. */
  tone?: string;
}

/**
 * `<kai-progress-bar>` — a thin determinate progress bar: a rounded track with a
 * `bg-primary` fill whose width is `value / max` (clamped to 0..100%). Set `tone`
 * for a semantic fill hue. Scalar attributes only.
 *
 * ```html
 * <kai-progress-bar value="66"></kai-progress-bar>
 * <kai-progress-bar value="3" max="5" label="Setup"></kai-progress-bar>
 * <kai-progress-bar value="60" tone="success"></kai-progress-bar>
 * ```
 * Restyle via `::part(track)` / `::part(fill)`.
 */
defineWebComponent<Props>('kai-progress-bar', {
  value: undefined,
  max: undefined,
  label: undefined,
  tone: 'primary',
}, (props) => (
  <ProgressBar
    value={props.value != null ? Number(props.value) : 0}
    max={props.max != null ? Number(props.max) : undefined}
    label={props.label as string | undefined}
    tone={props.tone as ProgressTone | undefined}
  />
));
