import { createContext, createSignal, Show, useContext, type JSX } from 'solid-js';
import { X } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { As } from '../overlay/overlay';
import { Dialog } from '../dialog/dialog';

// ============================================================================
// Lightbox - click-to-open full-size image preview
// ============================================================================

interface LightboxCtx {
  open: () => boolean;
  setOpen: (open: boolean) => void;
}

/**
 * What counts as "the reader meant that, not the modal" inside the content region: a
 * link in a caption, a download button beside the media. A click on one of these must
 * NOT dismiss the modal, or the control it landed on is unreachable.
 *
 * `[tabindex]` is on the list for the same reason — but it is also why the walk that
 * uses this is bounded at the content wrapper: the dialog panel ABOVE it carries
 * `tabindex="-1"`, so an unbounded `closest(...)` matches the panel and then no click
 * anywhere closes anything.
 */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [contenteditable], [role="button"], [tabindex]';

const Ctx = createContext<LightboxCtx>();

const useLightbox = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Lightbox parts must be used within <Lightbox>');
  return c;
};

export interface LightboxProps {
  children: JSX.Element;
  /** Controlled open state. When set, this component never changes it itself —
   *  drive it from `onOpenChange`. Omit for uncontrolled (internal) state. */
  open?: boolean;
  /** Initial open state (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Fires when the trigger click, Escape or backdrop wants a change. */
  onOpenChange?: (open: boolean) => void;
  // How `<kai-lightbox>` layers its `open` attribute, `show()`/`hide()` methods and
  // `kai-open-change` event onto the same state.
  /** Receive the open controller (open accessor + setOpen) once mounted. */
  controllerRef?: (api: LightboxController) => void;
}

/** Imperative open controller, handed to a parent (e.g. the kai-lightbox facade)
 *  via `controllerRef` so it can drive/observe open state. */
export interface LightboxController { open: () => boolean; setOpen: (v: boolean) => void; }

export function Lightbox(props: LightboxProps) {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false);
  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());
  const setOpen = (open: boolean) => {
    if (!isControlled()) setInternalOpen(open);
    props.onOpenChange?.(open);
  };
  props.controllerRef?.({ open: isOpen, setOpen });

  return (
    <Ctx.Provider value={{ open: isOpen, setOpen }}>
      {props.children}
    </Ctx.Provider>
  );
}

export interface LightboxTriggerProps {
  children: JSX.Element;
  class?: string;
}

/**
 * ★ THE TRIGGER IS A REAL BUTTON, UNLIKE `HoverCardTrigger`.
 *
 * `HoverCardTrigger` delegates its tab stop because a hover card is DESCRIPTIVE:
 * opening it is not an activation, so it must not promise one. This one opens a
 * modal, so it carries `role="button"` + `aria-haspopup` + `aria-expanded` and
 * owns the tab stop unconditionally — the same delegation would leave a tile
 * whose children are a div, an `<img>` and an svg with no keyboard way in at
 * all, which is the failure `HoverCardTrigger` was fixed for.
 *
 * `aria-expanded` is bound to the shared open state rather than to the dialog's
 * presence, so a controlled consumer's own `open` prop drives it too.
 *
 * The focus indicator repeats `HoverCardTrigger`'s measured recipe and must keep
 * the literal `[outline-style:solid]`: a Tailwind v4 utility that routes through
 * `var(--tw-outline-style)` is inert inside these shadow roots, so `outline-2`
 * alone computes `outline-style: none`. See the long note there before changing
 * it.
 */
export function LightboxTrigger(props: LightboxTriggerProps) {
  const ctx = useLightbox();

  return (
    <As
      as="span"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={ctx.open()}
      class={cn(
        'inline-block cursor-zoom-in rounded-sm focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        props.class,
      )}
      onClick={() => ctx.setOpen(true)}
      onKeyDown={(e: KeyboardEvent) => {
        // Space is handled because a real button opens on it. `preventDefault`
        // is not optional there: without it the keystroke scrolls the thread
        // behind the modal as well as opening it.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx.setOpen(true);
        }
      }}
    >
      {props.children}
    </As>
  );
}

export interface LightboxContentProps {
  children: JSX.Element;
  class?: string;
  /** Accessible name for the dialog, used when the content carries no heading. */
  label?: string;
  /** Whether the close (X) button renders in the panel's top-right corner. On by default. */
  showClose?: boolean;
  // On by default: every photo viewer closes on a click on the picture, and a lightbox
  // that ignores it is the surprising one. A click on an interactive descendant (a link in
  // a caption, a button in the content) is let through, so those keep working.
  /** Whether a click inside the content region closes the modal. On by default. */
  closeOnContentClick?: boolean;
}

/**
 * The modal itself. Escape, the backdrop click, the focus move and the Tab trap
 * are ALL `Dialog`'s — this composes it and contributes nothing but sizing, so
 * the two overlays cannot disagree about what "dismissed" or "focus trapped"
 * means.
 *
 * A lightbox is sized by its media, not by the dialog's default prose column:
 * the panel shrink-wraps (`w-auto`), drops the card chrome, and the body's
 * padding goes with it so the `85vh` clamp is the image's height IN THE
 * VIEWPORT rather than 85vh minus 2rem of padding. Without that the tall image
 * this exists for lands in the body's `overflow-auto` and scrolls.
 *
 * The media is the CONSUMER's own `<img>` (a lightbox of arbitrary children),
 * so the size clamp has to reach it by descendant selector from here.
 *
 * BOTH dismissals this adds go through the SAME controller as the trigger, Escape
 * and the backdrop — `closeOnContentClick` and the close button — so a controlled
 * consumer's `onOpenChange` hears every dismissal from one path. The close button is
 * a real `<button>` inside the panel, which is what keeps it in Dialog's Tab trap
 * and out of the panel's accessible name.
 */
export function LightboxContent(props: LightboxContentProps) {
  const ctx = useLightbox();
  let content: HTMLDivElement | undefined;

  /**
   * A click anywhere in the content region closes the modal, unless it landed on (or
   * inside) an interactive element, which keeps its own behaviour.
   *
   * The walk is over the COMPOSED path and stops AT the wrapper, for two separate
   * reasons. `e.target.closest()` alone would keep climbing past the content: the
   * dialog panel above it is a `tabindex="-1"` element, so it both matches the
   * selector and swallows every click. And it cannot see the wrapper at all as
   * `<kai-lightbox>` — the media there is light-DOM slotted content, whose only link
   * to the slot is the FLATTENED tree, which `closest()` does not walk, so a link in
   * the slotted content would read as "not interactive" and close the modal.
   */
  const onContentClick = (e: MouseEvent) => {
    if (props.closeOnContentClick === false) return;
    for (const node of e.composedPath()) {
      if (node === content) break;
      if (node instanceof Element && node.matches(INTERACTIVE_SELECTOR)) return;
    }
    ctx.setOpen(false);
  };

  return (
    <Dialog
      open={ctx.open()}
      onOpenChange={ctx.setOpen}
      aria-label={props.label}
      class={cn(
        // `relative` is the close button's containing block.
        'relative w-auto max-w-[90vw] border-0 bg-transparent p-0 shadow-none',
        '[&>[part=body]]:p-0',
        '[&_img]:max-h-[85vh] [&_img]:max-w-[90vw] [&_img]:object-contain',
        props.class,
      )}
    >
      {/* ONE wrapper, and `contents` is what keeps it invisible to layout: the media
          still fills the panel, `[&>[part=body]]:p-0` still lands on the body, and the
          `[&_img]` clamp is a descendant selector so it still reaches the consumer's
          image. Giving it a box instead would shrink the image and add the padding the
          body was stripped of. */}
      <div ref={content} class="contents" onClick={onContentClick}>
        {props.children}
      </div>
      <Show when={props.showClose !== false}>
        <button
          type="button"
          part="close"
          aria-label="Close"
          onClick={() => ctx.setOpen(false)}
          class={cn(
            // Translucent so the X stays legible over any photo, with its own ring
            // because the panel is borderless and can sit on a light or a dark image.
            'absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full',
            'bg-background/80 text-foreground ring-1 ring-border/50 backdrop-blur transition-colors hover:bg-background',
            // The literal `[outline-style:solid]` is load-bearing in these shadow
            // roots — same measured recipe as `LightboxTrigger`; see the note there.
            'focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
          )}
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </Show>
    </Dialog>
  );
}
