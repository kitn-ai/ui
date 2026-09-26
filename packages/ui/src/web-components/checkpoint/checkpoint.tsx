import { Show } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '../../components/checkpoint/checkpoint';

interface Props extends Record<string, unknown> {
  /** Text beside the icon. */
  label?: string;
  /** Hint shown on hover. */
  tooltip?: string;
  /** Button style. */
  variant?: 'ghost' | 'default' | 'outline';
  /** Button size; use an icon size for an icon-only checkpoint. */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
}

/** Events fired by `<kai-checkpoint>`. */
interface Events {
  /** The checkpoint was clicked. */
  'kai-select': void;
}

/**
 * A bookmark button that marks a point in a thread.
 */
defineWebComponent<Props, Events>('kai-checkpoint', {
  label: undefined,
  tooltip: undefined,
  variant: 'ghost',
  size: 'sm',
}, (props, { dispatch }) => (
  <Checkpoint>
    <CheckpointTrigger
      tooltip={props.tooltip}
      // Icon-only (no visible label) needs an accessible name: prefer the
      // tooltip text, else a sensible default. With a visible label, the text
      // is the name — leave aria-label unset so it isn't duplicated.
      aria-label={props.label ? undefined : (props.tooltip ?? 'Checkpoint')}
      variant={props.variant}
      size={props.size}
      onClick={() => dispatch('kai-select')}
    >
      <CheckpointIcon />
      <Show when={props.label}><span class="ml-1.5">{props.label}</span></Show>
    </CheckpointTrigger>
  </Checkpoint>
));
