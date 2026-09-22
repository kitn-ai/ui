import { createSignal, onCleanup, onMount } from 'solid-js';
import {
  Lightbox,
  LightboxTrigger,
  LightboxContent,
  type LightboxController,
} from '../../components/lightbox/lightbox';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  /** Drive/observe open state (Shoelace-style: settable + reflected to the `open`
   *  attribute, while the trigger click still works). Set `el.open = true`, or
   *  `<kai-lightbox open>`; listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Take away the PROGRAMMATIC open path only: `show()` becomes a no-op and
   *  `toggle()` closes rather than opens. The trigger, the `open` attribute and
   *  `hide()` are untouched. These are the disclosure semantics every overlay in
   *  the kit shares; see ../disclosure. */
  disabled?: boolean;
  /** Accessible name for the modal (`aria-label`), for a lightbox whose content
   *  carries no heading. Without one the panel is an UNNAMED `role="dialog"`,
   *  which is a WCAG failure, so name it. */
  label?: string;
}

/** Events fired by `<kai-lightbox>`. */
interface Events {
  /** The modal opened or closed (trigger click, Escape, backdrop click, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * `<kai-lightbox>` — the GENERAL case: wrap your own markup and show it bigger,
 * centered, over a dimmed page. The trigger is the default light-DOM content, the
 * media is `slot="content"`.
 *
 * ```html
 * <kai-lightbox label="Sunset over the bay">
 *   <button type="button">Zoom the photo</button>
 *   <img slot="content" src="/sunset.jpg" alt="Sunset over the bay" />
 * </kai-lightbox>
 * ```
 *
 * The trigger is OCCUPANCY-GATED: with nothing in the default slot there is no
 * `role="button"` in the shadow root at all, so this element is also usable when
 * you open it from your own control or from `show()`. The modal it composes gets
 * the whole modal contract from the kit's `Dialog`: Escape, backdrop dismissal,
 * focus moved in and restored, a Tab trap, `role="dialog" aria-modal`, and an
 * `aria-label` from `label`. Any descendant `<img>` is clamped to the viewport.
 *
 * Open state is the standard disclosure surface: settable+reflecting `open`,
 * `kai-open-change`, and `show()`/`hide()`/`toggle()`; seed with `default-open`.
 * Parts: `backdrop` · `panel` · `body`.
 */
defineWebComponent<Props, Events>('kai-lightbox', {
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
  label: undefined,
}, (props, ctx) => {
  const { element, flag } = ctx;
  let api: LightboxController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  // The default slot IS the trigger, and rendering it unconditionally is a bug: an
  // empty `LightboxTrigger` is a `<span role="button" tabindex="0">` with no name
  // and nothing that opens on activation. That is an empty tab stop a keyboard user
  // lands on and cannot use, i.e. a keyboard trap for a consumer who drives the
  // modal from their own button or from `show()`.
  //
  // Read off the host's LIGHT-DOM children, not off the live slot's
  // `assignedNodes()`. The assigned-node reading cannot tell a trigger from the
  // whitespace between the tags: `<kai-lightbox>\n  <img slot="content" …>\n
  // </kai-lightbox>` assigns that whitespace text node to the default slot, so it
  // reports a trigger where the author wrote none. Only ELEMENTS count here, and an
  // element that names a slot belongs to that slot.
  const [hasTrigger, setHasTrigger] = createSignal(false);
  const readTrigger = () =>
    setHasTrigger(Array.from(element.children).some((child) => !child.getAttribute('slot')));

  onMount(() => {
    readTrigger();
    // `slot` is in the attributeFilter because a child that GAINS or LOSES its slot
    // attribute moves between the two slots, which is a trigger appearing or
    // leaving. Subtree too, so late or streamed markup lights its button up.
    const observer = new MutationObserver(readTrigger);
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['slot'] });
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      <style>{':host{display:inline-block}'}</style>
      <Lightbox
        defaultOpen={flag('defaultOpen')}
        controllerRef={(a) => (api = a)}
      >
        {hasTrigger() ? <LightboxTrigger><slot /></LightboxTrigger> : undefined}
        <LightboxContent label={props.label}>
          <slot name="content" />
        </LightboxContent>
      </Lightbox>
    </>
  );
});
