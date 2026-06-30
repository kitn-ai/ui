import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { Dialog, type DialogController } from '../ui/dialog';
import { wireDisclosure } from './disclosure';

interface Props extends Record<string, unknown> {
  /** Drive/observe open state (Shoelace-style: settable + reflected to the `open`
   *  attribute; the element still self-manages on Escape/backdrop). Set
   *  `el.open = true`, or `<kai-dialog open>`; listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
}

/** Events fired by `<kai-dialog>`. */
interface Events {
  /** The dialog opened or closed (Escape, backdrop click, a driven `open`, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * `<kai-dialog>` — a centered modal: a dimmed backdrop over the page with a
 * centered panel of arbitrary content. It is the real primitive behind the kind
 * of modal that settings panels and broadcast composers reach for.
 *
 * **How to use** — slot the body, and optionally a `header` and `footer`:
 * ```html
 * <kai-dialog open>
 *   <h2 slot="header">Broadcast a message</h2>
 *   <textarea placeholder="What's on your mind?"></textarea>
 *   <div slot="footer">
 *     <button onclick="this.closest('kai-dialog').hide()">Cancel</button>
 *     <button>Send</button>
 *   </div>
 * </kai-dialog>
 * ```
 *
 * The default slot is the body; `header`/`footer` are optional regions with
 * dividers. The backdrop dims the page; clicking it (or pressing Escape) closes
 * the dialog. Focus moves into the panel on open and is restored on close, and a
 * basic Tab focus trap keeps keyboard focus inside while open.
 *
 * Open state is the standard disclosure surface: settable+reflecting `open`,
 * `kai-open-change`, and `show()`/`hide()`/`toggle()`; seed with `default-open`.
 * It also exposes `focus()` to move focus to the panel. Parts: `backdrop` ·
 * `panel` · `header` · `body` · `footer`.
 */
defineWebComponent<Props, Events>('kai-dialog', {
  open: undefined,
  defaultOpen: undefined,
}, (props, ctx) => {
  const { flag, element, expose } = ctx;
  let api: DialogController | undefined;
  let panel: HTMLElement | undefined;

  // The standard disclosure surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle. See ./disclosure. The SOLE emitter of kai-open-change — the
  // primitive's onOpenChange is intentionally NOT wired here to avoid a double
  // dispatch.
  wireDisclosure(ctx, () => api, () => props.open);

  // Only render the header/footer chrome (border + padding) when the consumer has
  // actually projected content for that slot — otherwise an empty bordered region
  // would show. Tracked off the host's light-DOM children.
  const [hasHeader, setHasHeader] = createSignal(false);
  const [hasFooter, setHasFooter] = createSignal(false);
  const recompute = () => {
    setHasHeader(!!element.querySelector(':scope > [slot="header"]'));
    setHasFooter(!!element.querySelector(':scope > [slot="footer"]'));
  };
  onMount(() => {
    recompute();
    if (typeof MutationObserver === 'function') {
      const obs = new MutationObserver(recompute);
      obs.observe(element, { childList: true });
      onCleanup(() => obs.disconnect());
    }
  });

  // focus() shadows the host's native focus so it targets the dialog panel inside
  // the shadow root (the WebAwesome/Shoelace convention).
  expose({
    /** Move focus to the dialog panel (no-op while closed). */
    focus: (options?: FocusOptions) => panel?.focus(options),
  });

  return (
    <Dialog
      defaultOpen={flag('defaultOpen')}
      header={hasHeader() ? <slot name="header" /> : undefined}
      footer={hasFooter() ? <slot name="footer" /> : undefined}
      controllerRef={(a) => (api = a)}
      panelRef={(el) => (panel = el)}
    >
      <slot />
    </Dialog>
  );
});
