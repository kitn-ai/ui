import { createSignal, createUniqueId, onCleanup, Show, type JSX, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As } from './overlay';

export interface TooltipProps { content: string; children: JSX.Element; class?: string; openDelay?: number; dismissOnClick?: boolean; }

export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ['content', 'children', 'class', 'openDelay', 'dismissOnClick']);
  const config = useChatConfig();
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement>();
  const [contentEl, setContentEl] = createSignal<HTMLElement>();
  let timer: number | undefined;

  const [pointerInside, setPointerInside] = createSignal(false);
  const [focusInside, setFocusInside] = createSignal(false);

  const show = (delay = 0) => {
    clearTimeout(timer);
    if (delay) timer = window.setTimeout(() => setOpen(true), delay);
    else setOpen(true);
  };
  const hide = () => { clearTimeout(timer); setOpen(false); };
  const maybeHide = () => { if (!pointerInside() && !focusInside()) hide(); };
  // Action-style tooltips should dismiss when their trigger is clicked: the pointer
  // never "leaves", so reset the inside flags and force-close until the next genuine
  // hover/focus. Opt out with dismissOnClick={false}.
  const dismiss = () => { if (local.dismissOnClick === false) return; setPointerInside(false); setFocusInside(false); hide(); };
  onCleanup(() => clearTimeout(timer));

  const presence = createPresence(open);
  const position = usePosition(triggerEl, contentEl, { placement: 'top', gutter: 6 });
  useDismiss({ enabled: open, onDismiss: hide, refs: () => [triggerEl(), contentEl()] });

  return (
    <>
      <As
        as="span"
        ref={setTriggerEl}
        aria-describedby={open() ? id : undefined}
        onPointerEnter={() => { setPointerInside(true); show(local.openDelay ?? 600); }}
        onPointerLeave={() => { setPointerInside(false); maybeHide(); }}
        onPointerDown={dismiss}
        onClick={dismiss}
        onFocusIn={() => { setFocusInside(true); show(); }}
        onFocusOut={(e: FocusEvent) => { const t = triggerEl(); if (t && t.contains(e.relatedTarget as Node)) return; setFocusInside(false); maybeHide(); }}
      >
        {local.children}
      </As>
      <Show when={presence.present()}>
        <Portal mount={config.portalMount()}>
          <div
            ref={(el) => { setContentEl(el); presence.setRef(el); }}
            id={id}
            role="tooltip"
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`, 'pointer-events': 'none', visibility: position.hidden() ? 'hidden' : 'visible' }}
            class={cn(
              'z-50 rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md',
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
              local.class,
            )}
          >
            {local.content}
          </div>
        </Portal>
      </Show>
    </>
  );
}
