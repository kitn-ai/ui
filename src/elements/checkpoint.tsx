import { Show } from 'solid-js';
import { defineWebComponent } from './define';
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

/** Events fired by `<kc-checkpoint>`. */
interface Events {
  /** The checkpoint was clicked. */
  select: void;
}

/**
 * `<kc-checkpoint>` — a bookmark/checkpoint button (optional tooltip + label).
 * Emits `select`.
 */
defineWebComponent<Props, Events>('kc-checkpoint', {
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
      onClick={() => dispatch('select')}
    >
      <CheckpointIcon />
      <Show when={props.label}><span class="ml-1.5">{props.label}</span></Show>
    </CheckpointTrigger>
  </Checkpoint>
));
