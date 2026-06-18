import { defineWebComponent } from './define';
import { Switch } from '../ui/switch';

interface Props extends Record<string, unknown> {
  /** Initial checked state. Bare attribute (`<kc-switch checked>`) turns it on. */
  checked?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Accessible label. */
  label?: string;
}

/** Events fired by `<kc-switch>`. */
interface Events {
  /** The toggle changed. */
  'kc-change': { checked: boolean };
}

/**
 * `<kc-switch>` — a toggle switch. Self-manages its on/off state; set the initial
 * state with the `checked` attribute and read changes from `kc-change`.
 *
 * ```html
 * <kc-switch checked label="Temporary chat"></kc-switch>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 *   document.querySelector('kc-switch')
 *     .addEventListener('kc-change', (e) => console.log(e.detail.checked));
 * </script>
 * ```
 */
defineWebComponent<Props, Events>('kc-switch', {
  checked: undefined,
  disabled: undefined,
  label: undefined,
}, (props, { dispatch, flag }) => (
  <Switch
    defaultChecked={flag('checked')}
    disabled={flag('disabled')}
    label={props.label as string | undefined}
    onChange={(checked) => dispatch('kc-change', { checked })}
  />
));
