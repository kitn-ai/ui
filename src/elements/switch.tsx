import { defineWebComponent } from './define';
import { Switch } from '../ui/switch';

interface Props extends Record<string, unknown> {
  /** Initial checked state. Bare attribute (`<kai-switch checked>`) turns it on. */
  checked?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Accessible label. */
  label?: string;
}

/** Events fired by `<kai-switch>`. */
interface Events {
  /** The toggle changed. */
  'kai-change': { checked: boolean };
}

/**
 * `<kai-switch>` — a toggle switch. Self-manages its on/off state; set the initial
 * state with the `checked` attribute and read changes from `kai-change`.
 *
 * ```html
 * <kai-switch checked label="Temporary chat"></kai-switch>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 *   document.querySelector('kai-switch')
 *     .addEventListener('kai-change', (e) => console.log(e.detail.checked));
 * </script>
 * ```
 */
defineWebComponent<Props, Events>('kai-switch', {
  checked: undefined,
  disabled: undefined,
  label: undefined,
}, (props, { dispatch, flag }) => (
  <Switch
    defaultChecked={flag('checked')}
    disabled={flag('disabled')}
    label={props.label as string | undefined}
    onChange={(checked) => dispatch('kai-change', { checked })}
  />
));
