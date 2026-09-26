import { defineWebComponent } from '../define/define';
import { Popover, type PopoverController } from '../../components/popover/popover';
import { wireDisclosure } from '../disclosure/disclosure';
import type { Placement } from '@floating-ui/dom';

interface Props extends Record<string, unknown> {
  /** Floating placement relative to the trigger (floating-ui placement). */
  placement?: Placement;
  /** Gap in px between the trigger and the panel. */
  gutter?: number;
  // Shoelace-style: settable and reflected to the `open` attribute, while the element
  // still self-manages on click.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Turn the popover off while keeping the trigger mounted (clicks and `show()`
   *  no longer open it). */
  disabled?: boolean;
}

/** Events fired by `<kai-popover>`. */
interface Events {
  /** The popover opened or closed (click, Escape, outside-click, or a method). */
  'kai-open-change': { open: boolean };
}
// The panel is a `role="dialog"` region, NOT a menu, which is the whole difference from
// `<kai-menu>`: it may hold model rows, switches, nested groups or any markup. Escape or an
// outside click closes it; clicks inside the panel do not.
/**
 * A trigger that opens a floating panel of arbitrary content.
 */
defineWebComponent<Props, Events>('kai-popover', {
  placement: 'bottom-start',
  gutter: 6,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { flag, element } = ctx;
  let api: PopoverController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. The sole source of kai-open-change — the
  // primitive's onOpenChange is intentionally NOT wired here to avoid a double
  // dispatch. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  return (
    <Popover
      trigger={<slot name="trigger" />}
      placement={props.placement as Placement}
      gutter={props.gutter}
      defaultOpen={flag('defaultOpen')}
      disabled={flag('disabled')}
      controllerRef={(a) => (api = a)}
      boundary={() => element}
    >
      <slot />
    </Popover>
  );
});
