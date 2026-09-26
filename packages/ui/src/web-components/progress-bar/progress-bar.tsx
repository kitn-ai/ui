import { ProgressBar, type ProgressTone } from '../../components/progress/progress-bar';
import { defineWebComponent } from '../define/define';

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
 * A thin determinate progress bar for a task whose remaining scope is known.
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
