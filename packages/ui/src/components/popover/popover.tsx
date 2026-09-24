import { createSignal, Show, type JSX, type Accessor } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Placement } from '@floating-ui/dom';
import { cn } from '../../utils/cn';
import { useChatConfig } from '../../primitives/chat-config';
import { createPresence, usePosition, useDismiss } from '../overlay/overlay';

/** Imperative open controller, handed to a parent (e.g. the kai-popover facade)
 *  via `controllerRef` so it can drive/observe open state. */
export interface PopoverController { open: Accessor<boolean>; setOpen: (v: boolean) => void; }

export interface PopoverProps {
  /** The trigger content (e.g. a button). Clicking it toggles the popover. */
  trigger: JSX.Element;
  /** The panel content: arbitrary nodes (rows, toggles, nested groups). */
  children: JSX.Element;
  /** Floating placement relative to the trigger. */
  placement?: Placement;
  /** Gap in px between trigger and panel. */
  gutter?: number;
  /** Controlled open state; drive it from `onOpenChange`. Omit for uncontrolled state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** When true, clicking the trigger never opens the popover. */
  disabled?: boolean;
  /** Fires whenever the popover wants to open or close. */
  onOpenChange?: (open: boolean) => void;
  /** Receive the open controller (open accessor + setOpen) once mounted. */
  controllerRef?: (api: PopoverController) => void;
  /** Extra elements counted as inside for outside-click dismissal, e.g. the custom-element host. */
  boundary?: () => HTMLElement | undefined;
  /** Class applied to the floating panel. */
  class?: string;
}

/**
 * A general popover: a trigger that toggles a floating panel of arbitrary
 * content. Unlike `Dropdown` (role="menu" + roving focus), the panel is a
 * `role="dialog"` region, so it can hold model rows, toggles, nested groups:
 * anything. Positioning, exit animation, and Escape/outside-click dismissal
 * come from the shared overlay primitives.
 */
export function Popover(props: PopoverProps) {
  const config = useChatConfig();
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [panel, setPanel] = createSignal<HTMLElement>();

  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());
  const setOpen = (v: boolean) => {
    if (!isControlled()) setInternalOpen(v);
    props.onOpenChange?.(v);
  };

  // Hand the open controller up to a parent (e.g. the kai-popover facade) so it
  // can drive/observe open state via wireDisclosure.
  props.controllerRef?.({ open: isOpen, setOpen });

  const presence = createPresence(isOpen);
  const position = usePosition(trigger, panel, {
    placement: props.placement ?? 'bottom-start',
    gutter: props.gutter ?? 6,
    // Trigger removed from the DOM -> close so the panel portal doesn't orphan.
    onDisconnect: () => setOpen(false),
  });
  useDismiss({
    enabled: isOpen,
    onDismiss: () => setOpen(false),
    refs: () => [trigger(), panel(), props.boundary?.()],
  });

  return (
    <>
      <span
        ref={setTrigger}
        style={{ display: 'inline-flex' }}
        onClick={() => { if (!props.disabled) setOpen(!isOpen()); }}
      >
        {props.trigger}
      </span>
      {/* PORTALED, and `position: fixed` alone does NOT make that redundant: a fixed
          element is still laid out inside its nearest CONTAINING BLOCK, and any
          ancestor with `transform`, `filter`, `perspective`, `contain` or
          `will-change` becomes one — after which an `overflow: hidden`/`auto` ancestor
          clips the panel. That is the reported bug: the dropdown looked right inside
          a clipping story frame and the popover did not, and the whole difference was
          this element. Reproducible in a consumer app too — a popover inside an
          `overflow-hidden` card is a popover with its bottom cut off.

          The portal is what escapes it: the panel is moved out of the clipping
          subtree, so neither the containing block nor the overflow applies. The
          `position: fixed` coords stay, because with no containing block ancestor
          they are viewport coords, which is what `usePosition` computed.

          `config.portalMount()` is the kit's ONE mount point, not a second mechanism:
          `useChatConfig` falls back to the defaults (undefined) with no provider, and
          a web-component facade points it at its shadow root so the panel keeps the
          facade's tokens and stylesheet. Never hardcode `document.body` here. */}
      <Show when={presence.present()}>
        <Portal mount={config.portalMount()}>
          <div
            ref={(el) => { setPanel(el); presence.setRef(el); }}
            role="dialog"
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            style={{
              position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`,
              // hide (without unmounting) when the trigger scrolls out of view
              visibility: position.hidden() ? 'hidden' : 'visible',
              'pointer-events': position.hidden() ? 'none' : undefined,
            }}
            class={cn(
              // text-sm is a sensible menu default; slotted content can override it.
              'z-50 min-w-[12rem] rounded-lg bg-card p-1 text-sm kai-elevation',
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
              props.class,
            )}
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </>
  );
}
