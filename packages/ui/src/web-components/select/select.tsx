import { createEffect, createSignal, untrack } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { Select } from '../../components/select/select';
// Public shape of the `options` prop; lives in ./web-component-data-types so the ROOT
// entry can re-export it (see that file's header).
import type { KaiSelectOption } from '../web-component/web-component-data-types';

interface Props extends Record<string, unknown> {
  /** The choices, in display order. Set as a JS PROPERTY (array), never an attribute.
   *  Rendered in full: the kit never truncates, re-orders or de-duplicates them. */
  options: KaiSelectOption[];
  /** Controlled selected value, reflected to the `value` attribute. For a `multiple` select read `el.values`. */
  value?: string;
  // Omitted means no such row at all; there is no default wording, because inventing one
  // would put words in your UI.
  /** Text for a leading, disabled, empty option (the "nothing chosen yet" row). */
  placeholder?: string;
  /** Allow more than one selection. Turns the control into the platform's list box, so
   *  the kit's chevron is not drawn. */
  multiple?: boolean;
  /** Force the invalid (destructive-border) state. */
  invalid?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Set the native `required` attribute, and nothing more. Whether an empty select is
   *  an error is the application's rule, not the kit's. */
  required?: boolean;
  /** Accessible label for the control. */
  label?: string;
  /** Form-control name, for a native form submit. */
  name?: string;
}

/** Events fired by `<kai-select>`. */
interface Events {
  // `values` is every selected option, which is what a `multiple` select needs. Both are
  // always present, so neither shape silently loses the other.
  /** A choice was made. `value` is the first selected option, empty when nothing is selected. */
  'kai-change': { value: string; values: string[] };
}
// A real native `<select>`, deliberately not a hand-built listbox: that is what keeps the
// platform picker on mobile, type-ahead on desktop, form participation and the OS
// accessibility tree. The dropdown list itself stays OS chrome (it renders outside the page and
// no stylesheet reaches it); all this element does is make it follow the kit's light/dark mode
// rather than the OS's. `multiple` therefore turns it into the platform list box and the kit's
// chevron is not drawn.
/**
 * A select control built on a real native `<select>` element.
 */
defineWebComponent<Props, Events>('kai-select', {
  options: [],
  value: undefined,
  placeholder: undefined,
  multiple: undefined,
  invalid: undefined,
  disabled: undefined,
  required: undefined,
  label: undefined,
  name: undefined,
}, (props, ctx) => {
  const { element, dispatch, flag, expose } = ctx;

  // Lift the selection into the facade and drive Select CONTROLLED so the host can read
  // it (`el.value` / `:host([value])`) and set it after mount. Seed from the `value`
  // property/attribute present on mount; nothing is auto-selected, because `options`
  // normally arrives as a property AFTER upgrade (kai-radio-group's structure).
  const seed = (props.value as string | undefined) ?? element.getAttribute('value') ?? '';
  const [values, setValues] = createSignal<string[]>(seed ? [seed] : []);
  const first = () => values()[0] ?? '';

  // Coerce anything arriving through the `value` setter (a JS assignment, or the
  // attributeChangedCallback write-back the reflect effect below triggers) to a string,
  // falling back to the live attribute when nullish so the write-back equals the signal
  // and the guards absorb it — no attr⇄prop feedback loop.
  const coerce = (v: unknown): string =>
    v == null ? (element.getAttribute('value') ?? '') : String(v);

  // Apply a new selection and fire kai-change once (the user-choice path).
  const apply = (next: string[]) => {
    const prev = untrack(values);
    if (prev.length === next.length && prev.every((v, i) => v === next[i])) return;
    setValues(next);
    dispatch('kai-change', { value: next[0] ?? '', values: next });
  };

  Object.defineProperty(element, 'value', {
    get: () => first(),
    set: (v: unknown) => {
      const next = coerce(v);
      if (untrack(first) !== next) setValues(next ? [next] : []);
    },
    configurable: true,
    enumerable: true,
  });

  // The multi-selection read/write side. `value` alone cannot represent it, and
  // returning only the first option from a `multiple` select would be a silent drop.
  Object.defineProperty(element, 'values', {
    get: () => values(),
    set: (v: unknown) => setValues(Array.isArray(v) ? v.map(String) : []),
    configurable: true,
    enumerable: true,
  });

  // Reflect the primary value → the `[value]` host attribute (for `:host([value])`).
  createEffect(() => {
    const v = first();
    if (v) {
      if (element.getAttribute('value') !== v) element.setAttribute('value', v);
    } else if (element.hasAttribute('value')) {
      element.removeAttribute('value');
    }
  });

  expose({
    /** Focus the inner select (the host element can't reach it). */
    focus: (options?: FocusOptions) =>
      element.shadowRoot?.querySelector<HTMLSelectElement>('select')?.focus(options),
  });

  return (
    <Select
      options={(props.options ?? []) as KaiSelectOption[]}
      value={values()}
      placeholder={props.placeholder as string | undefined}
      multiple={flag('multiple')}
      invalid={flag('invalid')}
      disabled={flag('disabled')}
      required={flag('required')}
      aria-label={props.label as string | undefined}
      name={props.name as string | undefined}
      onChange={(e) => apply([...e.currentTarget.selectedOptions].map((o) => o.value))}
    />
  );
});
