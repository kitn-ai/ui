import { defineWebComponent } from './define';
import { Popover } from '../ui/popover';
import type { Placement } from '@floating-ui/dom';

interface Props extends Record<string, unknown> {
  /** Floating placement relative to the trigger (floating-ui placement). */
  placement?: Placement;
  /** Gap in px between the trigger and the panel. */
  gutter?: number;
  /** Controlled open state. Set as a JS property (`el.open = true`) to drive the
   *  popover from your app; omit for the default click-to-toggle behaviour. */
  open?: boolean;
}

/** Events fired by `<kc-popover>`. */
interface Events {
  /** The popover wants to open or close (click, Escape, or outside-click). */
  'kc-open-change': { open: boolean };
}

/**
 * `<kc-popover>` — a button-and-popover primitive: a trigger that toggles a
 * floating panel of arbitrary content. The panel is a `role="dialog"` region
 * (not a menu), so it can hold model rows, toggle switches, nested groups, or
 * any markup — the building block for ChatGPT-style header menus and similar
 * "button + popover card" affordances.
 *
 * **How to use** — slot a trigger and the panel content:
 * ```html
 * <kc-popover placement="bottom-start">
 *   <button slot="trigger">ChatGPT ⌄</button>
 *   <div>
 *     <p><strong>GPT-5.5</strong> — Flagship model</p>
 *     <button>Legacy models</button>
 *   </div>
 * </kc-popover>
 * ```
 *
 * The default slot is the panel; the `trigger` slot is the control. Clicking the
 * trigger toggles the panel; Escape or an outside click closes it (clicks inside
 * the panel do not). It fires `kc-open-change` with `{ open }` on every change,
 * and accepts an `open` JS property for controlled use.
 */
defineWebComponent<Props, Events>('kc-popover', {
  placement: 'bottom-start',
  gutter: 6,
  open: undefined,
}, (props, { dispatch, element }) => (
  <Popover
    trigger={<slot name="trigger" />}
    placement={props.placement as Placement}
    gutter={props.gutter}
    open={props.open}
    boundary={() => element}
    onOpenChange={(open) => dispatch('kc-open-change', { open })}
  >
    <slot />
  </Popover>
));
