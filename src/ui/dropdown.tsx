import {
  createContext, useContext, createSignal, createUniqueId, Show,
  type JSX, type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../utils/cn';
import { useChatConfig } from '../primitives/chat-config';
import { createPresence, usePosition, useDismiss, As, type AsTag } from './overlay';

interface DropdownCtx {
  open: Accessor<boolean>;
  setOpen: (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => void;
  triggerId: string;
  menuId: string;
  setTrigger: (el: HTMLElement) => void;
  setMenu: (el: HTMLElement) => void;
  trigger: Accessor<HTMLElement | undefined>;
  menu: Accessor<HTMLElement | undefined>;
  openedViaKeyboard: Accessor<boolean>;
}
const Ctx = createContext<DropdownCtx>();
const useDropdown = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Dropdown parts must be used within <Dropdown>');
  return c;
};

export function Dropdown(props: { children: JSX.Element }) {
  const [open, setOpenSig] = createSignal(false);
  const [viaKb, setViaKb] = createSignal(false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [menu, setMenu] = createSignal<HTMLElement>();
  const setOpen = (v: boolean, opts?: { viaKeyboard?: boolean; returnFocus?: boolean }) => {
    setViaKb(!!opts?.viaKeyboard);
    setOpenSig(v);
    if (v) {
      // Focus the first item on keyboard-open. The menu mounts via <Show>; we
      // attempt focus now and re-assert in the menu ref's microtask so it lands
      // once the node exists. Skip disabled items (roving-focus contract).
      if (opts?.viaKeyboard) {
        const sel = '[role="menuitem"]:not([aria-disabled="true"])';
        queueMicrotask(() => menu()?.querySelector<HTMLElement>(sel)?.focus());
        menu()?.querySelector<HTMLElement>(sel)?.focus();
      }
    } else if (opts?.returnFocus !== false) {
      // Closing via keyboard/select: return focus to the trigger. The menu
      // unmounts on a microtask (createPresence) and that teardown blurs
      // whatever is focused, so re-assert focus AFTER unmount too.
      const el = trigger();
      el?.focus();
      queueMicrotask(() => el?.focus());
    }
  };
  return (
    <Ctx.Provider value={{
      open, setOpen, triggerId: createUniqueId(), menuId: createUniqueId(),
      setTrigger, setMenu, trigger, menu, openedViaKeyboard: viaKb,
    }}>
      {props.children}
    </Ctx.Provider>
  );
}

export function DropdownTrigger(props: { as?: AsTag; children?: JSX.Element; class?: string; [k: string]: any }) {
  const ctx = useDropdown();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.setOpen(true, { viaKeyboard: true });
    }
  };
  return (
    <As
      as={props.as ?? 'button'}
      ref={ctx.setTrigger}
      id={ctx.triggerId}
      aria-haspopup="menu"
      aria-expanded={ctx.open()}
      aria-controls={ctx.open() ? ctx.menuId : undefined}
      onClick={() => ctx.setOpen(!ctx.open())}
      onKeyDown={onKeyDown}
      class={props.class}
      {...(props.as ? {} : { type: 'button' })}
    >
      {props.children}
    </As>
  );
}

export function DropdownContent(props: { children: JSX.Element; class?: string }) {
  const ctx = useDropdown();
  const config = useChatConfig();
  const presence = createPresence(ctx.open);
  const position = usePosition(ctx.trigger, ctx.menu, { placement: 'bottom-start', gutter: 6 });
  useDismiss({
    enabled: ctx.open,
    onDismiss: (reason) => ctx.setOpen(false, { returnFocus: reason === 'escape' }),
    refs: () => [ctx.trigger(), ctx.menu()],
  });

  const items = () => Array.from(ctx.menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
  const focusIndex = (i: number) => {
    const list = items();
    if (!list.length) return;
    const idx = ((i % list.length) + list.length) % list.length;
    list[idx].focus();
  };
  // Resolve the focused item via the menu's own root node. Inside a Shadow DOM
  // (every kitn-* element), `document.activeElement` returns the host element,
  // not the focused menu item, which would break ArrowUp/Down roving focus.
  // `getRootNode().activeElement` correctly returns the active node within the
  // same tree (ShadowRoot or Document).
  const activeItem = () => {
    const root = ctx.menu()?.getRootNode() as Document | ShadowRoot | undefined;
    return (root?.activeElement ?? document.activeElement) as Element | null;
  };
  const currentIndex = () => items().findIndex((el) => el === activeItem());

  const onKeyDown = (e: KeyboardEvent) => {
    const list = items();
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusIndex(currentIndex() + 1); break;
      case 'ArrowUp': e.preventDefault(); focusIndex(currentIndex() - 1); break;
      case 'Home': e.preventDefault(); focusIndex(0); break;
      case 'End': e.preventDefault(); focusIndex(list.length - 1); break;
      case 'Tab': ctx.setOpen(false, { returnFocus: false }); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const start = currentIndex() + 1;
          const lower = e.key.toLowerCase();
          const match = list.findIndex((el, i) => i >= start && (el.textContent ?? '').trim().toLowerCase().startsWith(lower));
          const found = match >= 0 ? match : list.findIndex((el) => (el.textContent ?? '').trim().toLowerCase().startsWith(lower));
          if (found >= 0) { e.preventDefault(); focusIndex(found); }
        }
    }
  };

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => {
            ctx.setMenu(el); presence.setRef(el);
            // Keyboard-open focuses the first item. setOpen() also attempts this
            // synchronously; this ref-time microtask re-asserts focus once the
            // menu node exists. Skip disabled items.
            if (ctx.openedViaKeyboard()) {
              queueMicrotask(() => el.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus());
            }
          }}
          id={ctx.menuId}
          role="menu"
          aria-labelledby={ctx.triggerId}
          tabindex={-1}
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onKeyDown={onKeyDown}
          style={{
            position: 'fixed', left: `${position.pos().x}px`, top: `${position.pos().y}px`,
            // hide (without unmounting) when the trigger scrolls out of view
            visibility: position.hidden() ? 'hidden' : 'visible',
            'pointer-events': position.hidden() ? 'none' : undefined,
          }}
          class={cn(
            'z-50 min-w-[8rem] rounded-lg bg-card p-1 shadow-lg',
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

export function DropdownItem(props: { children: JSX.Element; class?: string; onSelect?: () => void }) {
  const ctx = useDropdown();
  const activate = () => { props.onSelect?.(); ctx.setOpen(false); };
  return (
    <div
      role="menuitem"
      tabindex={-1}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      onPointerMove={(e) => (e.currentTarget as HTMLElement).focus()}
      class={cn(
        'flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-muted focus:bg-muted',
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}
