import {
  createContext, useContext, createSignal, Show, splitProps, onCleanup,
  type JSX, type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As } from './overlay';

interface HoverCardCtx {
  open: Accessor<boolean>;
  enter: () => void;
  leave: () => void;
  setTrigger: (el: HTMLElement) => void;
  setContent: (el: HTMLElement) => void;
  trigger: () => HTMLElement | undefined;
  content: () => HTMLElement | undefined;
}
const Ctx = createContext<HoverCardCtx>();
const useHoverCard = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('HoverCard parts must be used within <HoverCardRoot>');
  return c;
};

export interface HoverCardRootProps { children: JSX.Element; openDelay?: number; closeDelay?: number; }

export function HoverCardRoot(props: HoverCardRootProps) {
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLElement | undefined;
  let content: HTMLElement | undefined;
  let timer: number | undefined;

  // ONE shared timer drives both trigger and content. Entering either cancels
  // any pending close and schedules an open; leaving either cancels any pending
  // open and schedules a close. Because the pointer transit trigger -> content
  // fires leave() then enter() against the SAME timer, the close is cancelled
  // before it can run, so the card never flickers and there are no stale-timer
  // sporadics (the HC-1 fix).
  const enter = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => setOpen(true), props.openDelay ?? 0);
  };
  const leave = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => setOpen(false), props.closeDelay ?? 0);
  };
  onCleanup(() => clearTimeout(timer));

  return (
    <Ctx.Provider value={{
      open, enter, leave,
      setTrigger: (el) => (trigger = el),
      setContent: (el) => (content = el),
      trigger: () => trigger,
      content: () => content,
    }}>
      {props.children}
    </Ctx.Provider>
  );
}

export interface HoverCardTriggerProps { children: JSX.Element; }

export function HoverCardTrigger(props: HoverCardTriggerProps) {
  const ctx = useHoverCard();
  return (
    <As
      as="span"
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

export interface HoverCardContentProps { children: JSX.Element; class?: string; }

export function HoverCardContent(props: HoverCardContentProps) {
  const ctx = useHoverCard();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  const position = usePosition(ctx.trigger, ctx.content, { placement: 'bottom', gutter: 8 });
  useDismiss({ enabled: ctx.open, onDismiss: ctx.leave, refs: () => [ctx.trigger(), ctx.content()] });

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => { ctx.setContent(el); presence.setRef(el); }}
          data-hovercard-content
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onPointerEnter={ctx.enter}
          onPointerLeave={ctx.leave}
          style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px` }}
          class={cn(
            'z-50 rounded-lg bg-card shadow-lg',
            'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
            props.class,
          )}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

export interface HoverCardProps { trigger: JSX.Element; children: JSX.Element; class?: string; openDelay?: number; closeDelay?: number; }

export function HoverCard(props: HoverCardProps) {
  const [local] = splitProps(props, ['trigger', 'children', 'class', 'openDelay', 'closeDelay']);
  return (
    <HoverCardRoot openDelay={local.openDelay} closeDelay={local.closeDelay}>
      <HoverCardTrigger>{local.trigger}</HoverCardTrigger>
      <HoverCardContent class={cn('w-64 p-4', local.class)}>{local.children}</HoverCardContent>
    </HoverCardRoot>
  );
}
