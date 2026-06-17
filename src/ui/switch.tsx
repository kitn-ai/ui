import { createSignal } from 'solid-js';
import { cn } from '../utils/cn';

export interface SwitchProps {
  /** Controlled checked state. When set, the component defers state to the
   *  parent — drive it from `onChange`. Omit for uncontrolled (internal) state. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Accessible label for the control. */
  label?: string;
  /** Fires with the next checked state on toggle. */
  onChange?: (checked: boolean) => void;
  class?: string;
}

/**
 * A toggle switch (`role="switch"`). Controlled via `checked`, or uncontrolled
 * from `defaultChecked`. Keyboard-operable (Space/Enter) and theme-tokened.
 */
export function Switch(props: SwitchProps) {
  const [internal, setInternal] = createSignal(props.defaultChecked ?? false);
  const isControlled = () => props.checked !== undefined;
  const isOn = () => (isControlled() ? !!props.checked : internal());

  const toggle = () => {
    if (props.disabled) return;
    const next = !isOn();
    if (!isControlled()) setInternal(next);
    props.onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn()}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      }}
      class={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isOn() ? 'bg-primary' : 'bg-muted',
        props.class,
      )}
    >
      <span
        class={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          isOn() ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
