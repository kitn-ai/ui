import { createEffect, createSignal, untrack } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { Switch } from '../../components/switch/switch';

interface Props extends Record<string, unknown> {
  /** Controlled checked state, reflected to the `checked` attribute. The toggle updates it and fires `kai-change`. */
  checked?: boolean;
  /** Initial checked state on mount (uncontrolled seed). Bare attribute
   *  (`<kai-switch default-checked>`) turns it on. */
  defaultChecked?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Accessible label. */
  label?: string;
  /** Form-control name (paired with `value`). */
  name?: string;
  /** Submitted value when checked (paired with `name`). Defaults to `'on'`. */
  value?: string;
}

/** Events fired by `<kai-switch>`. */
interface Events {
  /** The toggle changed. */
  'kai-change': { checked: boolean };
}
/**
 * A toggle switch.
 */
defineWebComponent<Props, Events>('kai-switch', {
  checked: undefined,
  defaultChecked: undefined,
  disabled: undefined,
  label: undefined,
  name: undefined,
  value: undefined,
}, (props, ctx) => {
  const { element, dispatch, flag, expose } = ctx;

  // Lift the on/off state into the facade and drive the Switch CONTROLLED so the
  // host can read it (`el.checked` / `:host([checked])`) and set it after mount.
  // Seed from `defaultChecked` (or a bare `checked` attribute present on mount).
  const [checked, setChecked] = createSignal(flag('defaultChecked') || flag('checked'));

  // Coerce any value coming through the `checked` setter (a JS assignment, or the
  // write-back from `attributeChangedCallback` when the attribute changes) to a
  // boolean — falling back to attribute presence, matching `flag`'s semantics. An
  // `undefined` write-back (which `toggleAttribute` triggers) thus resolves to the
  // attribute we just wrote, so it equals the signal and the equality guard below
  // absorbs it — no attr⇄prop feedback loop (the pattern hover-card uses for `open`).
  const coerce = (v: unknown): boolean =>
    v === true ? true
      : v === false ? false
        : element.hasAttribute('checked') && element.getAttribute('checked') !== 'false';

  // Apply a new checked state and fire kai-change once (the toggle UI / `toggle()`
  // path). No-op while disabled.
  const apply = (next: boolean) => {
    if (flag('disabled')) return;
    if (untrack(checked) === next) return;
    setChecked(next);
    dispatch('kai-change', { checked: next });
  };

  // Override the `checked` property so reads return LIVE state (the signal) and
  // host writes (`el.checked = …`) drive it WITHOUT firing kai-change — distinct
  // from the user-toggle path. The equality guard kills the reflect write-back loop.
  Object.defineProperty(element, 'checked', {
    get: () => checked(),
    set: (v: unknown) => { const next = coerce(v); if (untrack(checked) !== next) setChecked(next); },
    configurable: true,
    enumerable: true,
  });

  // Reflect internal checked → the `[checked]` host attribute (for `:host([checked])`).
  // The equality guard against the live attribute keeps the write-back the toggle
  // triggers (attributeChangedCallback → setter) from looping (mirrors
  // wireDisclosure's reflect structure).
  createEffect(() => {
    const c = checked();
    if (c !== element.hasAttribute('checked')) element.toggleAttribute('checked', c);
  });

  expose({
    /** Flip the switch and fire `kai-change` (no-op while disabled). */
    toggle: () => apply(!untrack(checked)),
    /** Focus the inner `role="switch"` button (the host element can't reach it). */
    focus: (options?: FocusOptions) =>
      element.shadowRoot?.querySelector<HTMLButtonElement>('button[role="switch"]')?.focus(options),
  });

  return (
    <Switch
      checked={checked()}
      disabled={flag('disabled')}
      label={props.label as string | undefined}
      name={props.name as string | undefined}
      value={props.value as string | undefined}
      onChange={(next) => apply(next)}
    />
  );
});
