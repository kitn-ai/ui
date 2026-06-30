import { createSignal, type Accessor } from 'solid-js';

/**
 * The controlled/uncontrolled state pattern, as a reusable signal.
 *
 * `controlled` is an accessor for the controlling prop: when it returns a value,
 * that value wins (controlled mode); when it returns `undefined`, the component
 * manages its own state seeded from `initial` (uncontrolled mode). The returned
 * setter always writes the internal value — harmless (masked) while controlled,
 * authoritative while uncontrolled — so a single call site works in both modes.
 *
 * Mirrors `props.value ?? internal()` used elsewhere in the kit, without effects.
 */
export function createControllableSignal(
  controlled: Accessor<boolean | undefined>,
  initial: boolean,
): [Accessor<boolean>, (value: boolean) => void] {
  const [internal, setInternal] = createSignal(initial);
  const value: Accessor<boolean> = () => controlled() ?? internal();
  return [value, (v: boolean) => setInternal(v)];
}
