import {
  createEffect, createSignal, createUniqueId, onCleanup, Show, type Accessor, type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useChatConfig } from '../../primitives/chat-config';
import { createPresence } from '../overlay/overlay';

/** Imperative open controller, handed to a parent (e.g. the kai-dialog facade)
 *  via `controllerRef` so it can drive/observe open state with `wireDisclosure`. */
export interface DialogController { open: Accessor<boolean>; setOpen: (v: boolean) => void; }

export interface DialogProps {
  /** Dialog body: the default slot content. */
  children?: JSX.Element;
  /** Optional header region (e.g. a title). Rendered above the body with a divider. */
  header?: JSX.Element;
  /** Optional footer region (e.g. action buttons). Rendered below the body with a divider. */
  footer?: JSX.Element;
  /** Controlled open state. While it is set the component never changes it itself; omit it for uncontrolled state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Fires whenever the dialog wants to open or close (Escape / backdrop / method). */
  onOpenChange?: (open: boolean) => void;
  /** Receive the open controller (open accessor + setOpen) once mounted. */
  controllerRef?: (api: DialogController) => void;
  /** Receive the focusable panel node so a facade's `focus()` can target it. */
  panelRef?: (el: HTMLElement) => void;
  /** Accessible name for the dialog when no `header` is provided. */
  'aria-label'?: string;
  /** Extra class applied to the panel (e.g. a wider `max-w-*`). */
  class?: string;
}

/** Focusable-element selector for the Tab focus trap. */
const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  'audio[controls]', 'video[controls]', '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Roughly "rendered and not visibility:hidden"; skips display:none / hidden nodes. */
function isVisible(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
    && getComputedStyle(el).visibility !== 'hidden';
}

/**
 * Tabbable descendants of `panel`, in tab order. Crosses `<slot>` boundaries:
 * when used as a web-component facade the panel's real content is light-DOM nodes
 * assigned to its slots, not panel descendants, so a plain querySelectorAll would
 * miss them. We walk the tree and expand each slot to its assigned elements.
 */
function getTabbables(panel: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (child instanceof HTMLSlotElement) {
        for (const assigned of child.assignedElements()) {
          if (assigned instanceof HTMLElement) {
            if (assigned.matches(FOCUSABLE_SELECTOR)) out.push(assigned);
            walk(assigned);
          }
        }
      } else if (child instanceof HTMLElement) {
        if (child.matches(FOCUSABLE_SELECTOR)) out.push(child);
        walk(child);
      }
    }
  };
  walk(panel);
  return out.filter(isVisible);
}

/** The deepest active element, drilling through nested shadow roots (so a focused
 *  node inside a shadow tree resolves to the real element, not its host). */
function deepActiveElement(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement as HTMLElement;
  return el;
}

/**
 * The element, then the contexts it sits in, nearest first, crossing shadow
 * boundaries. Recorded while the element is still connected, because a removed
 * element has no parent left to walk: a close that finds the remembered element
 * gone has to look for the nearest SURVIVING context instead, and a detached node
 * cannot tell it what that was.
 */
function focusChain(el: HTMLElement | null): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let node: HTMLElement | null = el;
  while (node) {
    chain.push(node);
    const parent: HTMLElement | null = node.parentElement;
    const root = node.getRootNode();
    node = parent ?? (root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null);
  }
  return chain;
}

/**
 * The close fallback's ONE walk, so every host composing this dialog inherits the
 * policy instead of re-deciding it. Its rule:
 *
 *   Outward from the remembered opener, over the contexts it sat in, nearest first,
 *   take the first context that yields a focusable destination.
 *
 * Two things it does not do, both measured. It does not stop at the first context that
 * merely SURVIVED: surviving and being able to take focus are different questions, and
 * answering only the first is what dropped focus on `body` when the opener was a host's
 * own slotted trigger and its only focusable - the host survived EMPTY, and the walk
 * ended on it. And it never lands inside this dialog's own panel, or the light DOM
 * assigned into it, because that subtree goes in the same breath as the walk: a
 * destination there is the focus drop again. `goingAway` is how the caller says so.
 *
 * It stops at the END OF THE RECORDED CHAIN - `body`/`html`, the outermost contexts a
 * remembered opener can have - so an emptied page leaves focus where the browser put it
 * once the panel went. Nothing further out is invented: a second guess at where the
 * reader "really" was is the quiet fallback this component should not make.
 */
function focusFirstIn(ctx: HTMLElement, goingAway: (el: HTMLElement) => boolean): boolean {
  const candidates = ctx.matches(FOCUSABLE_SELECTOR) ? [ctx] : [];
  for (const el of [...candidates, ...ctx.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]) {
    if (goingAway(el)) continue;
    el.focus();
    // Ask the DOCUMENT, not the candidate list: `focus()` on a node the browser will not
    // focus (hidden, inert, `display:none`) is silent, and "a candidate was found" is not
    // the same answer as "the reader is somewhere". A silent no-op is what the walk has
    // to keep walking past.
    if (deepActiveElement() === el) return true;
  }
  return false;
}

/**
 * Dialog is the presentational centered modal surface. It renders through a Portal
 * (so it escapes any clipping/stacking ancestor), dims the page with a backdrop,
 * and centers a panel with a sensible max width/height and internal scroll. It
 * closes on Escape (from inside the panel and, since focus can leave the panel while
 * it is open, from anywhere on the page) and on a backdrop click (never on a panel
 * click), moves focus into the panel on open and restores it on close - to the nearest
 * surviving context that can take focus when the element that had it is gone by then -
 * and runs a basic Tab focus trap so keyboard focus cycles within the panel while open.
 * The developer owns when it opens (drive `open` / `defaultOpen`); this owns being the
 * modal.
 *
 * Styleable parts: `backdrop` · `panel` · `header` · `body` · `footer`.
 */
export function Dialog(props: DialogProps) {
  const config = useChatConfig();
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false);
  const headerId = `kai-dialog-title-${createUniqueId()}`;

  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());
  const setOpen = (v: boolean) => {
    if (!isControlled()) setInternalOpen(v);
    props.onOpenChange?.(v);
  };

  // Hand the open controller up to a parent (e.g. the kai-dialog facade) so it can
  // drive/observe open state via wireDisclosure.
  props.controllerRef?.({ open: isOpen, setOpen });

  const presence = createPresence(isOpen);

  let backdrop: HTMLElement | undefined;
  let panel: HTMLElement | undefined;
  // The element that had focus before we opened, restored on close, and the contexts
  // it sat in, for the case where that element is gone by then.
  let restoreFocus: HTMLElement | null = null;
  let restoreContext: HTMLElement[] = [];
  // Track where a click started so a drag that ends on the backdrop (e.g. a text
  // selection begun inside the panel) does not falsely dismiss.
  let pointerDownOnBackdrop = false;

  /** Is `node` inside this dialog's own panel: either the shadow content, or the
   *  light-DOM content assigned to its slots (which `panel.contains` cannot see). */
  const insidePanel = (node: HTMLElement | null): boolean => {
    if (!node || !panel) return false;
    if (node === panel || panel.contains(node)) return true;
    const root = panel.getRootNode();
    return root instanceof ShadowRoot && root.host instanceof HTMLElement && root.host.contains(node);
  };

  // Escape while we are open, at the DOCUMENT. The backdrop's own keydown is reached
  // through the event's composed path, so it only ever sees a press that started
  // inside this panel - and focus can leave the panel through no fault of the reader's,
  // most ordinarily because whatever opened the modal returns focus to its own trigger
  // in a microtask. An `aria-modal="true"` surface owns Escape for the whole page, so
  // the press that lands elsewhere still belongs to us. Scoped to exactly that case:
  // while the panel IS in the path the backdrop handler owns the key, which is also
  // what keeps a nested modal's Escape from closing the modal it sits in.
  const onDocumentKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !panel || e.composedPath().includes(panel)) return;
    setOpen(false);
  };

  // Move focus into the panel on open; restore it on close. Seeded prev=false so a
  // `defaultOpen` (open-at-mount) still runs the open branch.
  createEffect((wasOpen: boolean) => {
    const open = isOpen();
    if (open && !wasOpen) {
      document.addEventListener('keydown', onDocumentKeyDown);
      onCleanup(() => document.removeEventListener('keydown', onDocumentKeyDown));
      const active = deepActiveElement();
      // A target already inside the panel is not a place to come BACK to: the panel is
      // removed when we close, so remembering it would restore focus into a node that
      // is going away (i.e. drop it on `<body>`) rather than return the reader anywhere.
      restoreFocus = insidePanel(active) ? null : active;
      restoreContext = focusChain(restoreFocus);
      queueMicrotask(() => panel?.focus());
    } else if (!open && wasOpen) {
      const target = restoreFocus;
      const chain = restoreContext;
      restoreFocus = null;
      restoreContext = [];
      if (target?.isConnected) {
        queueMicrotask(() => target.focus());
      } else if (target && insidePanel(deepActiveElement())) {
        // The element is gone (a menu item that closed behind the modal is the
        // ordinary case) and focus is still ours, so without a fallback the browser
        // drops it on `<body>` and the reader loses their place on the page. Return it
        // to the nearest surviving context that can actually TAKE focus - the walk's
        // rule and where it stops are stated on `focusFirstIn`.
        //
        // Deferred like every other focus move here, and the walk runs inside the
        // microtask rather than being resolved ahead of it because the panel can still
        // be mounted at this instant: `insidePanel` has to read it then, so the panel
        // subtree is skipped for what it is (a destination about to disappear) and not
        // for what it happens to be right now.
        const survivors = chain.filter((ctx) => ctx !== target && ctx.isConnected);
        queueMicrotask(() => {
          for (const ctx of survivors) if (focusFirstIn(ctx, insidePanel)) return;
        });
      }
    }
    return open;
  }, false);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab' || !panel) return;
    // Basic focus trap: keep Tab / Shift+Tab cycling within the panel.
    const items = getTabbables(panel);
    if (!items.length) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const active = deepActiveElement();
    const idx = active ? items.indexOf(active) : -1;
    if (e.shiftKey) {
      if (idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    } else if (idx === -1 || idx === items.length - 1) {
      e.preventDefault();
      items[0].focus();
    }
  };

  const onClick = (e: MouseEvent) => {
    if (pointerDownOnBackdrop && e.target === backdrop) setOpen(false);
    pointerDownOnBackdrop = false;
  };

  return (
    <Show when={presence.present()}>
      <Portal mount={config.portalMount()}>
        <div
          ref={(el) => { backdrop = el; presence.setRef(el); }}
          part="backdrop"
          data-expanded={presence.state() === 'open' ? '' : undefined}
          data-closed={presence.state() === 'closed' ? '' : undefined}
          onPointerDown={(e) => { pointerDownOnBackdrop = e.target === e.currentTarget; }}
          onClick={onClick}
          onKeyDown={onKeyDown}
          class={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
            'animate-in fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0 motion-reduce:animate-none',
          )}
        >
          <div
            ref={(el) => { panel = el; props.panelRef?.(el); }}
            part="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={props.header ? headerId : undefined}
            aria-label={props.header ? undefined : props['aria-label']}
            tabindex={-1}
            data-expanded={presence.state() === 'open' ? '' : undefined}
            data-closed={presence.state() === 'closed' ? '' : undefined}
            // `outline-none` is DELIBERATE here and must stay. This is a
            // `tabindex={-1}` focus-trap container: it is focused
            // programmatically on open to move keyboard and screen-reader
            // context into the dialog, and is never a tab stop. Drawing a ring
            // would put a blue box around the entire dialog every time it
            // opened. The controls inside it carry their own focus rings.
            class={cn(
              'flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl outline-none',
              'animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 motion-reduce:animate-none',
              props.class,
            )}
          >
            <Show when={props.header}>
              <header part="header" id={headerId} class="shrink-0 border-b border-border px-5 py-4 text-base font-semibold text-foreground">
                {props.header}
              </header>
            </Show>
            <div part="body" class="min-h-0 flex-1 overflow-auto px-5 py-4 text-sm text-foreground">
              {props.children}
            </div>
            <Show when={props.footer}>
              <footer part="footer" class="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
                {props.footer}
              </footer>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
