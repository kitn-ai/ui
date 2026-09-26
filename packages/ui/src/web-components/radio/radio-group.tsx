import { createEffect, createSignal, untrack } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { RadioGroup } from '../../components/radio/radio';
// Public shape of the `options` prop; lives in ./web-component-data-types so the ROOT
// entry can re-export it (see that file's header).
import type { KaiRadioOption } from '../web-component/web-component-data-types';

interface Props extends Record<string, unknown> {
  /** The choices, top to bottom. Set as a JS PROPERTY (array), never an attribute. */
  options: KaiRadioOption[];
  /** Controlled selected `value`, reflected to the `value` attribute. Choosing a row updates it and fires `kai-change`. */
  value?: string;
  /** Shared form-control name for every radio. Defaults to a generated id, so the group stays exclusive unsubmitted. */
  name?: string;
  /** Disable every row. Individual rows carry their own `disabled`. */
  disabled?: boolean;
  /** Accessible name for the group. */
  label?: string;
}

/** Events fired by `<kai-radio-group>`. */
interface Events {
  /** A row was chosen. */
  'kai-change': { value: string };
}
// Real `<input type="radio">`s sharing a `name`, so one tab stop, arrow keys, mutual exclusion
// and form participation are the browser's rather than a reimplementation. `name` defaults to a
// generated id, which is what keeps the group exclusive when it is never submitted.
/**
 * A bordered list of rows that selects exactly one of them.
 */
defineWebComponent<Props, Events>('kai-radio-group', {
  options: [],
  value: undefined,
  name: undefined,
  disabled: undefined,
  label: undefined,
}, (props, ctx) => {
  const { element, dispatch, flag, expose } = ctx;

  // Lift the selection into the facade and drive RadioGroup CONTROLLED so the host can
  // read it (`el.value` / `:host([value])`) and set it after mount. Seed from the
  // `value` property/attribute present on mount; nothing is auto-selected, because
  // `options` normally arrives as a property AFTER upgrade (kai-segmented's structure).
  const [value, setValue] = createSignal(
    (props.value as string | undefined) ?? element.getAttribute('value') ?? '',
  );

  // Coerce anything arriving through the `value` setter (a JS assignment, or the
  // attributeChangedCallback write-back) to a string, falling back to the live
  // attribute when nullish so the reflect write-back equals the signal and the guards
  // below absorb it — no attr⇄prop feedback loop.
  const coerce = (v: unknown): string =>
    v == null ? (element.getAttribute('value') ?? '') : String(v);

  // Apply a new value and fire kai-change once (the user-choice path).
  const apply = (next: string) => {
    if (untrack(value) === next) return;
    setValue(next);
    dispatch('kai-change', { value: next });
  };

  Object.defineProperty(element, 'value', {
    get: () => value(),
    set: (v: unknown) => { const next = coerce(v); if (untrack(value) !== next) setValue(next); },
    configurable: true,
    enumerable: true,
  });

  // Reflect internal value → the `[value]` host attribute (for `:host([value])`).
  createEffect(() => {
    const v = value();
    if (v) {
      if (element.getAttribute('value') !== v) element.setAttribute('value', v);
    } else if (element.hasAttribute('value')) {
      element.removeAttribute('value');
    }
  });

  expose({
    /** Focus the group's tab stop. That is the selected radio, or the first row when
     *  nothing is selected yet. */
    focus: (options?: FocusOptions) => {
      const root = element.shadowRoot;
      const radios = [...(root?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [])];
      (radios.find((r) => r.checked) ?? radios[0])?.focus(options);
    },
  });

  return (
    <RadioGroup
      options={(props.options ?? []) as KaiRadioOption[]}
      value={value()}
      name={props.name as string | undefined}
      disabled={flag('disabled')}
      label={props.label as string | undefined}
      onChange={(next) => apply(next)}
    />
  );
});
