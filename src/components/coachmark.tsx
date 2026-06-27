import { createSignal, createUniqueId, Show, type Accessor, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { X } from 'lucide-solid';
import type { Placement } from '@floating-ui/dom';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition } from '../ui/overlay';

/** Imperative open controller, handed to the kai-coachmark facade via
 *  `controllerRef` so it can drive/observe open state with `wireDisclosure`. */
export interface CoachmarkController {
  open: Accessor<boolean>;
  setOpen: (v: boolean) => void;
}

export interface CoachmarkProps {
  /** The anchor/trigger (the default slot). The bubble is positioned against it. */
  children?: JSX.Element;
  /** The bubble body text (the `content` slot). */
  content?: JSX.Element;
  /** The bold title. NOT `title` — that is a reserved IDL attr (see define.tsx). */
  headline?: JSX.Element;
  /** A small badge pill (e.g. "New"). */
  badge?: JSX.Element;
  /** Floating placement relative to the anchor. Defaults to `'bottom'`. */
  placement?: Placement;
  /** Color tone: `primary` (default, the theme accent) or `info` (blue). */
  tone?: 'primary' | 'info';
  /** Controlled open state. When set, the component never changes it itself;
   *  drive it from `onOpenChange`. Omit for uncontrolled (internal) state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Fires whenever open wants to change (the × button / a method). */
  onOpenChange?: (open: boolean) => void;
  /** Dismiss intent: the × button. */
  onDismiss?: () => void;
  /** Receive the open controller once mounted. */
  controllerRef?: (api: CoachmarkController) => void;
}

/** Map a (post flip/shift) placement side to the bubble edge the arrow sits on. */
const STATIC_SIDE: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Color classes per `tone`. `info` is the blue onboarding look (white text). */
const TONES = {
  primary: {
    bubble: 'bg-primary text-primary-foreground',
    arrow: 'bg-primary',
    dismiss: 'text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground',
    badge: 'bg-primary-foreground/20',
    content: 'text-primary-foreground/85',
  },
  info: {
    bubble: 'bg-tool-blue text-white',
    arrow: 'bg-tool-blue',
    dismiss: 'text-white/70 hover:bg-white/15 hover:text-white',
    badge: 'bg-white/20',
    content: 'text-white/85',
  },
} as const;

/**
 * Coachmark is the presentational onboarding hint: a primary-colored bubble with
 * an arrow, anchored to a trigger. It wraps the anchor (the default slot) and
 * positions the bubble against it with `usePosition` (the shared Floating UI
 * primitive) so the arrow tracks the anchor on scroll/resize, flipping/shifting
 * to stay on screen. The developer owns when it shows (`open`/`default-open`);
 * the × fires `onDismiss`. The arrow is a rotated square that inherits the
 * bubble's `bg-primary`, so it always reads as a continuation of the bubble.
 */
export function Coachmark(props: CoachmarkProps) {
  const config = useChatConfig();
  const toneCls = () => TONES[props.tone ?? 'primary'];
  const titleId = createUniqueId();
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false);
  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const [bubble, setBubble] = createSignal<HTMLElement>();
  const [arrowEl, setArrowEl] = createSignal<HTMLElement>();

  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());
  const setOpen = (v: boolean) => {
    if (!isControlled()) setInternalOpen(v);
    props.onOpenChange?.(v);
  };

  props.controllerRef?.({ open: isOpen, setOpen });

  const presence = createPresence(isOpen);
  const position = usePosition(anchor, bubble, {
    placement: props.placement ?? 'bottom',
    gutter: 10,
    arrowEl,
  });

  const dismiss = () => {
    setOpen(false);
    props.onDismiss?.();
  };

  return (
    <>
      {/* The anchor wrapper. inline-block so it hugs the trigger it positions against. */}
      <span ref={setAnchor} style={{ display: 'inline-block' }}>
        {props.children}
      </span>
      <Show when={presence.present()}>
        <Portal mount={config.portalMount()}>
          <div
            ref={(el) => { setBubble(el); presence.setRef(el); }}
            part="bubble"
            role="dialog"
            aria-labelledby={titleId}
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            style={{
              position: 'fixed',
              left: `${position.pos().x}px`,
              top: `${position.pos().y}px`,
              visibility: position.hidden() ? 'hidden' : 'visible',
            }}
            class={cn(
              'z-50 w-64 rounded-lg p-3 pr-8 text-sm kai-elevation',
              toneCls().bubble,
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            )}
          >
            {/* The arrow: a rotated square inheriting bg-primary. usePosition writes
                its offset-axis position (x for top/bottom placements, y for left/right);
                the static side is pinned to the bubble edge facing the anchor. */}
            <div
              ref={setArrowEl}
              part="arrow"
              aria-hidden="true"
              class={cn('absolute size-2 rotate-45', toneCls().arrow)}
              style={{
                left: position.arrowPos().x != null ? `${position.arrowPos().x}px` : '',
                top: position.arrowPos().y != null ? `${position.arrowPos().y}px` : '',
                [STATIC_SIDE[position.pos().placement.split('-')[0]] ?? 'top']: '-4px',
              }}
            />

            <button
              type="button"
              part="dismiss"
              aria-label="Dismiss"
              onClick={dismiss}
              class={cn('absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded transition-colors', toneCls().dismiss)}
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>

            <Show when={props.headline}>
              <div class="flex items-center gap-2">
                <span id={titleId} part="title" class="font-semibold leading-tight">
                  {props.headline}
                </span>
                <Show when={props.badge}>
                  <span
                    part="badge"
                    class={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium uppercase leading-none tracking-wide', toneCls().badge)}
                  >
                    {props.badge}
                  </span>
                </Show>
              </div>
            </Show>

            <Show when={props.content}>
              <div class={cn(toneCls().content, props.headline ? 'mt-1.5' : '')}>
                {props.content}
              </div>
            </Show>
          </div>
        </Portal>
      </Show>
    </>
  );
}
