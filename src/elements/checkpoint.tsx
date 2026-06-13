import { Show } from 'solid-js';
import { defineKitnElement } from './define';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '../components/checkpoint';

interface Props extends Record<string, unknown> {
  /** Optional text beside the icon. */
  label?: string;
  /** Tooltip on hover. */
  tooltip?: string;
  /** Visual button style. */
  variant?: 'ghost' | 'default' | 'outline';
  /** Button size (use an `icon*` size for an icon-only checkpoint). */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
}

/** Events fired by `<kitn-checkpoint>`. */
interface Events {
  /** The checkpoint was clicked. */
  select: void;
}

/**
 * `<kitn-checkpoint>` — a bookmark/checkpoint button (optional tooltip + label).
 * Emits `select`.
 */
defineKitnElement<Props, Events>('kitn-checkpoint', {
  label: undefined,
  tooltip: undefined,
  variant: 'ghost',
  size: 'sm',
}, (props, { dispatch }) => (
  <Checkpoint>
    <CheckpointTrigger
      tooltip={props.tooltip}
      variant={props.variant}
      size={props.size}
      onClick={() => dispatch('select')}
    >
      <CheckpointIcon />
      <Show when={props.label}><span class="ml-1.5">{props.label}</span></Show>
    </CheckpointTrigger>
  </Checkpoint>
));
