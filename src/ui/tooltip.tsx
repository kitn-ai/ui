import { createSignal, createUniqueId, Show, type JSX, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As } from './overlay';

export interface TooltipProps { content: string; children: JSX.Element; class?: string; openDelay?: number; }

export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ['content', 'children', 'class', 'openDelay']);
  const config = useChatConfig();
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  let triggerEl: HTMLElement | undefined;
  let contentEl: HTMLElement | undefined;
  let timer: number | undefined;

  const show = (delay = 0) => {
    clearTimeout(timer);
    if (delay) timer = window.setTimeout(() => setOpen(true), delay);
    else setOpen(true);
  };
  const hide = () => { clearTimeout(timer); setOpen(false); };

  const presence = createPresence(open);
  const position = usePosition(() => triggerEl, () => contentEl, { placement: 'top', gutter: 6 });
  useDismiss({ enabled: open, onDismiss: hide, refs: () => [triggerEl, contentEl] });

  return (
    <>
      <As
        as="span"
        ref={(el: HTMLElement) => (triggerEl = el)}
        aria-describedby={open() ? id : undefined}
        onPointerEnter={() => show(local.openDelay ?? 600)}
        onPointerLeave={hide}
        onFocusIn={() => show()}
        onFocusOut={hide}
      >
        {local.children}
      </As>
      <Show when={presence.present()}>
        <Portal mount={config.portalMount()}>
          <div
            ref={(el) => { contentEl = el; presence.setRef(el); }}
            id={id}
            role="tooltip"
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            style={{ position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`, 'pointer-events': 'none' }}
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
