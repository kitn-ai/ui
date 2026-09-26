import { type Placement } from '@floating-ui/dom';
import { HoverCardRoot, HoverCardTrigger, HoverCardContent, type HoverCardController } from '../../components/hover/hover-card';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  /** Delay (ms) before the card opens on hover. Defaults to 0 (focus opens it
   *  immediately too). */
  openDelay?: number;
  /** Delay (ms) before it closes after the pointer leaves. Defaults to 300. */
  closeDelay?: number;
  /** Preferred placement: `'top' | 'bottom' | 'left' | 'right'` (+ optional
   *  `-start`/`-end`). Defaults to `'bottom'`; flips to stay in view. */
  placement?: string;
  // Shoelace-style: settable and reflected to the `open` attribute, while the element
  // still self-manages on hover.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Suppress the hover behavior entirely without unmounting. */
  disabled?: boolean;
}

/** Events fired by `<kai-hover-card>`. */
interface Events {
  /** The card opened or closed (by hover/focus, outside-click, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * Reveals rich markup on hover or focus of the trigger it wraps. `kai-tooltip` is
 * the text-only hint instead.
 */
defineWebComponent<Props, Events>('kai-hover-card', {
  openDelay: undefined,
  closeDelay: undefined,
  placement: undefined,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { flag } = ctx;
  let api: HoverCardController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  return (
    <>
      <style>{':host{display:inline-block}'}</style>
      <HoverCardRoot
        openDelay={props.openDelay != null ? Number(props.openDelay) : undefined}
        closeDelay={props.closeDelay != null ? Number(props.closeDelay) : undefined}
        defaultOpen={flag('defaultOpen')}
        disabled={flag('disabled')}
        controllerRef={(a) => (api = a)}
      >
        <HoverCardTrigger><slot /></HoverCardTrigger>
        <HoverCardContent placement={(props.placement as Placement | undefined) ?? undefined}>
          <slot name="card" />
        </HoverCardContent>
      </HoverCardRoot>
    </>
  );
});
