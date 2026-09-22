import { type Placement } from '@floating-ui/dom';
import { Tooltip, type TooltipController } from '../../components/tooltip/tooltip';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  /** The hint text shown on hover/focus of the slotted trigger. */
  content?: string;
  /** Delay (ms) before the tooltip appears on hover. Defaults to 600. Focus
   *  shows it immediately regardless. */
  openDelay?: number;
  /** Delay (ms) before it hides after the pointer leaves. Defaults to 0 (hides
   *  immediately). */
  closeDelay?: number;
  /** Preferred placement: `'top' | 'bottom' | 'left' | 'right'` (+ optional
   *  `-start`/`-end`). Defaults to `'top'`; flips to stay in view. */
  placement?: string;
  /** Drive/observe open state (Shoelace-style: settable + reflected to the `open`
   *  attribute, the element still self-manages on hover/focus). Set `el.open = true`,
   *  or `<kai-tooltip open>`; listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Turn the tooltip off while keeping the trigger mounted (hover/focus and
   *  `show()` no longer open it). */
  disabled?: boolean;
}

/** Events fired by `<kai-tooltip>`. */
interface Events {
  /** The tooltip opened or closed (by hover/focus, outside-click, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * `<kai-tooltip>` — wraps a trigger and shows a hint on hover/focus. The trigger
 * is the default light-DOM content. The tip body is the text `content` prop, or
 * a `slot="content"` child when the tip needs markup (a `<kai-kbd>`, a label
 * with a key cap in it); the slotted child replaces the text, and the prop stays
 * as that slot's fallback, so a plain string renders the same as it always has.
 * Positions itself and dismisses on Escape/outside-click; the content is portaled
 * inside the shadow root so it isn't clipped.
 *
 * ```html
 * <kai-tooltip content="Voice input">
 *   <kai-button variant="subtle" size="icon" icon="mic" label="Voice input"></kai-button>
 * </kai-tooltip>
 *
 * <kai-tooltip>
 *   <kai-button variant="subtle" size="icon" icon="mic" label="Voice input"></kai-button>
 *   <span slot="content">Hold to talk <kai-kbd keys="Mod+Shift+M"></kai-kbd></span>
 * </kai-tooltip>
 * ```
 */
defineWebComponent<Props, Events>('kai-tooltip', {
  content: '',
  openDelay: undefined,
  closeDelay: undefined,
  placement: undefined,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { flag } = ctx;
  let api: TooltipController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  return (
    <>
      {/* The shared element base sets `:host{display:block}` (styles.css). A block
          host wraps the inline-flex trigger in a line box, so the font-descender
          strut makes the host taller than the control and pins the control to the
          top, so it reads off-center beside non-tooltipped siblings in a
          flex-items-center row. inline-flex (like kai-button) drops the line box so
          the host hugs the trigger and their centers line up. */}
      <style>{':host{display:inline-flex}'}</style>
      {/* The tip body goes through a named slot rather than the `content` string
          alone: a web-component consumer cannot pass JSX, so a slot is the only
          channel for a tip that has to carry markup. Slotted content replaces the
          text; the string stays as the slot's fallback. */}
      <Tooltip
        content={<slot name="content">{props.content ?? ''}</slot>}
        openDelay={props.openDelay != null ? Number(props.openDelay) : undefined}
        closeDelay={props.closeDelay != null ? Number(props.closeDelay) : undefined}
        placement={(props.placement as Placement | undefined) ?? undefined}
        defaultOpen={flag('defaultOpen')}
        disabled={flag('disabled')}
        controllerRef={(a) => (api = a)}
      >
        <slot />
      </Tooltip>
    </>
  );
});
