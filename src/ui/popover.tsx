import { createSignal, Show, type JSX } from 'solid-js';
import type { Placement } from '@floating-ui/dom';
import { cn } from '../utils/cn';
import { createPresence, usePosition, useDismiss } from './overlay';

export interface PopoverProps {
  /** The trigger content (e.g. a button). Clicking it toggles the popover. */
  trigger: JSX.Element;
  /** The popover panel content — arbitrary nodes (rows, toggles, nested groups). */
  children: JSX.Element;
  /** Floating placement relative to the trigger. */
  placement?: Placement;
  /** Gap in px between trigger and panel. */
  gutter?: number;
  /** Controlled open state. When set, the component never changes it itself —
   *  drive it from `onOpenChange`. Omit for uncontrolled (internal) state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Fires whenever the popover wants to open or close. */
  onOpenChange?: (open: boolean) => void;
  /** Extra elements counted as "inside" for outside-click dismissal — e.g. the
   *  custom-element host, so clicks on slotted panel content don't dismiss. */
  boundary?: () => HTMLElement | undefined;
  /** Class applied to the floating panel. */
  class?: string;
}

/**
 * A general popover: a trigger that toggles a floating panel of arbitrary
 * content. Unlike `Dropdown` (role="menu" + roving focus), the panel is a
 * `role="dialog"` region, so it can hold model rows, toggles, nested groups —
 * anything. Positioning, exit animation, and Escape/outside-click dismissal
 * come from the shared overlay primitives.
 */
export function Popover(props: PopoverProps) {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [panel, setPanel] = createSignal<HTMLElement>();

  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());
  const setOpen = (v: boolean) => {
    if (!isControlled()) setInternalOpen(v);
    props.onOpenChange?.(v);
  };

  const presence = createPresence(isOpen);
  const position = usePosition(trigger, panel, {
    placement: props.placement ?? 'bottom-start',
    gutter: props.gutter ?? 6,
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
        onClick={() => setOpen(!isOpen())}
      >
        {props.trigger}
      </span>
      <Show when={presence.present()}>
        <div
          ref={(el) => { setPanel(el); presence.setRef(el); }}
          role="dialog"
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px` }}
          class={cn(
            'z-50 min-w-[12rem] rounded-lg bg-card p-1 shadow-lg',
            'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            props.class,
          )}
        >
          {props.children}
        </div>
      </Show>
    </>
  );
}
