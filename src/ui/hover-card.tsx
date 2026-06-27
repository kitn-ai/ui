import {
  createContext, useContext, createSignal, Show, splitProps, onCleanup,
  type JSX, type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { type Placement } from '@floating-ui/dom';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As } from './overlay';

interface HoverCardCtx {
  open: Accessor<boolean>;
  enter: () => void;
  leave: () => void;
  close: () => void;
  setTrigger: (el: HTMLElement) => void;
  setContent: (el: HTMLElement) => void;
  trigger: Accessor<HTMLElement | undefined>;
  content: Accessor<HTMLElement | undefined>;
}
const Ctx = createContext<HoverCardCtx>();
const useHoverCard = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('HoverCard parts must be used within <HoverCardRoot>');
  return c;
};

/** Imperative open controller, handed to a parent (e.g. the kai-hover-card facade)
 *  via `controllerRef` so it can drive/observe open state. */
export interface HoverCardController { open: Accessor<boolean>; setOpen: (v: boolean) => void; }

export interface HoverCardRootProps {
  children: JSX.Element;
  openDelay?: number;
  closeDelay?: number;
  /** Initial open state (uncontrolled seed). */
  defaultOpen?: boolean;
  /** When true, hover/focus never opens the card. */
  disabled?: boolean;
  /** Receive the open controller (open accessor + setOpen) once mounted. */
  controllerRef?: (api: HoverCardController) => void;
}

export function HoverCardRoot(props: HoverCardRootProps) {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [content, setContent] = createSignal<HTMLElement>();
  let timer: number | undefined;
  props.controllerRef?.({ open, setOpen });

  // ONE shared timer drives both trigger and content. Entering either cancels
  // any pending close and schedules an open; leaving either cancels any pending
  // open and schedules a close. Because the pointer transit trigger -> content
  // fires leave() then enter() against the SAME timer, the close is cancelled
  // before it can run, so the card never flickers and there are no stale-timer
  // sporadics (the HC-1 fix).
  const enter = () => {
    if (props.disabled) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => setOpen(true), props.openDelay ?? 0);
  };
  const leave = () => {
    clearTimeout(timer);
    // closeDelay default is 300ms (Radix-style) as a belt-and-suspenders fallback
    // for diagonal pointer escapes that miss the transparent safe bridge.
    timer = window.setTimeout(() => setOpen(false), props.closeDelay ?? 300);
  };
  const close = () => { clearTimeout(timer); setOpen(false); };
  onCleanup(() => clearTimeout(timer));

  return (
    <Ctx.Provider value={{
      open, enter, leave, close,
      setTrigger, setContent,
      trigger, content,
    }}>
      {props.children}
    </Ctx.Provider>
  );
}

export interface HoverCardTriggerProps { children: JSX.Element; class?: string; }

export function HoverCardTrigger(props: HoverCardTriggerProps) {
  const ctx = useHoverCard();
  return (
    <As
      as="span"
      class={cn('inline-block', props.class)}
      ref={ctx.setTrigger}
      onPointerEnter={ctx.enter}
      onPointerLeave={ctx.leave}
      onFocusIn={ctx.enter}
      onFocusOut={ctx.leave}
    >
      {props.children}
    </As>
  );
}

export interface HoverCardContentProps { children: JSX.Element; class?: string; placement?: Placement; }

// Visual gap between trigger and the visible card. Also the depth of the
// transparent safe bridge so the pointer never crosses "empty" space.
const GUTTER = 8;

/**
 * Returns the CSS padding property that, set to `gutter`px on the OUTER floating
 * shell, recreates the visual gap as a transparent safe area on the
 * trigger-facing side. The outer shell is placed flush (gutter: 0) so the
 * padding bridges the gap while keeping the inner card the same distance away.
 *
 * Placement strings from @floating-ui/dom (post flip/shift) may carry a
 * '-start'/'-end' alignment suffix; we split on '-' and key on the side.
 *   bottom* -> padding-top, top* -> padding-bottom,
 *   left*   -> padding-right, right* -> padding-left
 */
function gapPaddingStyle(placement: string, gutter: number): JSX.CSSProperties {
  const side = placement.split('-')[0];
  const prop: Record<string, keyof JSX.CSSProperties> = {
    bottom: 'padding-top',
    top: 'padding-bottom',
    left: 'padding-right',
    right: 'padding-left',
  };
  return { [prop[side] ?? 'padding-top']: `${gutter}px` };
}

export function HoverCardContent(props: HoverCardContentProps) {
  const ctx = useHoverCard();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  // gutter: 0 places the outer shell flush with the trigger; the visual gap is
  // recreated by transparent padding (gapPaddingStyle) so the hit area bridges
  // it and a straight trigger->content transit never leaves a hot zone.
  const position = usePosition(ctx.trigger, ctx.content, { placement: props.placement ?? 'bottom', gutter: 0 });
  // Escape OR an outside click closes immediately — an outside click is a
  // deliberate dismiss, not a hover-out (which uses leave()'s grace delay).
  useDismiss({ enabled: ctx.open, onDismiss: () => ctx.close(), refs: () => [ctx.trigger(), ctx.content()] });

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        {/* Outer shell: positioning + the transparent safe bridge + hot zone. */}
        <div
          ref={(el) => { ctx.setContent(el); presence.setRef(el); }}
          data-hovercard-content
          onPointerEnter={ctx.enter}
          onPointerLeave={ctx.leave}
          onFocusIn={ctx.enter}
          onFocusOut={ctx.leave}
          style={{
            position: 'fixed',
            left: `${position.pos().x}px`,
            top: `${position.pos().y}px`,
            background: 'transparent',
            visibility: position.hidden() ? 'hidden' : 'visible',
            ...gapPaddingStyle(position.pos().placement, GUTTER),
          }}
          class="z-50"
        >
          {/* Inner card: all visual + animation classes and the presence state. */}
          <div
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            class={cn(
              'rounded-lg bg-card kai-elevation',
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
              props.class,
            )}
          >
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  );
}

export interface HoverCardProps { trigger: JSX.Element; children: JSX.Element; class?: string; openDelay?: number; closeDelay?: number; placement?: Placement; }

export function HoverCard(props: HoverCardProps) {
  const [local] = splitProps(props, ['trigger', 'children', 'class', 'openDelay', 'closeDelay', 'placement']);
  return (
    <HoverCardRoot openDelay={local.openDelay} closeDelay={local.closeDelay}>
      <HoverCardTrigger>{local.trigger}</HoverCardTrigger>
      <HoverCardContent class={cn('w-64 p-4', local.class)} placement={local.placement}>{local.children}</HoverCardContent>
    </HoverCardRoot>
  );
}
