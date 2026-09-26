import { untrack } from 'solid-js';
import { defineWebComponent } from '../define/define';
import {
  Dock, DockCloseGlyph, DockLauncherGlyph,
  type DockController, type DockFocusOnOpen, type DockPosition,
} from '../../components/dock/dock';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  // Shoelace-style: settable and reflected to the `open` attribute, while the element
  // still self-manages on the launcher and Escape.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Which corner the dock sits in. Logical, so `-end` follows the writing direction
   *  and an RTL page docks on the left. Attribute: `position`. */
  position?: DockPosition;
  /** The widget's NAME. Derives the panel's accessible name and both launcher names
   *  (`Open ${label}` / `Close ${label}`). Defaults to `Chat`. */
  label?: string;
  /** i18n override for the launcher's name while closed (default `Open ${label}`). */
  openLabel?: string;
  /** i18n override for the launcher's name while open (default `Close ${label}`). */
  closeLabel?: string;
  /** Show the unread dot. YOURS: it renders only while closed, and the dock never
   *  writes it back. Clear it in your `kai-open-change` handler. */
  unread?: boolean;
  /** Disable the launcher; `show()` and `toggle()` are gated on it. */
  disabled?: boolean;
  // Set this when your slotted panel content supplies its own close affordance (e.g. a
  // `<kai-chat slot="header-end">` close button), otherwise the two stack. TRADEOFF: the
  // mobile panel reserves a padding band above its content so the built-in X never paints
  // over slotted content; that band stays reserved unless you set this true, so only set
  // it once your own control is actually in place.
  /** Suppress the dock's built-in mobile close X. Attribute: `hide-close`. */
  hideClose?: boolean;
  /** Where focus lands on open: `content` (default, the first element you slotted),
   *  `panel`, or `none`. Attribute: `focus-on-open`. */
  focusOnOpen?: DockFocusOnOpen;
}

/** Events fired by `<kai-dock>`. */
interface Events {
  /** The dock opened or closed (the launcher, Escape, a driven `open`, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * A floating corner launcher: a button pinned to the viewport edge that opens a
 * panel of your content. `kai-prompt-dock` is the in-flow tray around a prompt
 * input.
 */
defineWebComponent<Props, Events>('kai-dock', {
  open: undefined,
  defaultOpen: undefined,
  position: 'bottom-end',
  label: 'Chat',
  openLabel: undefined,
  closeLabel: undefined,
  unread: undefined,
  disabled: undefined,
  hideClose: undefined,
  focusOnOpen: 'content',
}, (props, ctx) => {
  const { flag, element, expose, reflectFlag } = ctx;
  let api: DockController | undefined;
  let panel: HTMLElement | undefined;
  let launcher: HTMLButtonElement | undefined;

  // The standard disclosure surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle. See ./disclosure — and note it is the SOLE emitter of the
  // event, so the primitive's onOpenChange is deliberately not wired here.
  wireDisclosure(ctx, () => api, () => props.open);

  // The other three booleans get the same read-back treatment, for the same reason:
  // `<kai-dock unread>` parses to `undefined`, so without this the property would
  // contradict the attribute that set it. Reflecting `unread` syncs
  // the ATTRIBUTE to the prop and never changes the VALUE — the dock still never
  // decides that a message has been read.
  reflectFlag('unread');
  reflectFlag('disabled');
  reflectFlag('defaultOpen');
  reflectFlag('hideClose');

  // Seed the primitive from EITHER spelling, read once at upgrade.
  //
  // `open` is folded in here rather than left to wireDisclosure's effect on purpose.
  // That effect runs a tick after mount, so `<kai-dock open>` would mount closed and
  // then transition — which the primitive's focus effect would correctly read as a
  // real open and steal focus with, on page load, on someone else's page. Seeding
  // makes mount a non-event for both spellings; wireDisclosure's effect then finds
  // the value already correct and its equality guard makes it a no-op.
  //
  // UNTRACKED, and that is not defensive noise — it is the fix for a real defect this
  // element shipped for about ten minutes. A facade body runs inside the tracking
  // scope that inserts it, so a bare `flag('open')` here subscribes the WHOLE FACADE
  // to `open`: every toggle re-ran it, which re-created the `<Dock>`, its panel div
  // and its controller. The visible symptoms were far away from the cause — focus
  // never moved (each fresh focus effect was re-seeded with the current state, so it
  // saw no transition) and `kai-open-change` never fired (wireDisclosure had latched
  // the first, discarded controller). Reading a prop at the top level of a facade is
  // the general trap; `untrack` is how you say "seed", and it is what makes this a
  // seed rather than a subscription.
  const seed = untrack(() => flag('open') || flag('defaultOpen'));

  expose({
    /** Move focus to the panel while open, or to the launcher while closed. */
    focus: (options?: FocusOptions) =>
      (api?.open() ? panel : launcher)?.focus(options),
  });

  // The `content` focus target: the first element assigned to the panel. Read off the
  // live slots rather than off `element.children`, so it is the ASSIGNMENT that
  // decides — a child whose `slot` attribute changes moves with it, and a comment or
  // whitespace text node is not mistaken for content.
  const contentTarget = () => {
    const slots = panel?.querySelectorAll('slot');
    for (const slot of Array.from(slots ?? [])) {
      const first = (slot as HTMLSlotElement).assignedElements()[0];
      if (first instanceof HTMLElement) return first;
    }
    return undefined;
  };

  return (
    <Dock
      defaultOpen={seed}
      position={props.position as DockPosition}
      label={props.label as string}
      openLabel={props.openLabel as string | undefined}
      closeLabel={props.closeLabel as string | undefined}
      unread={flag('unread')}
      disabled={flag('disabled')}
      hideClose={flag('hideClose')}
      focusOnOpen={props.focusOnOpen as DockFocusOnOpen}
      contentTarget={contentTarget}
      controllerRef={(a) => (api = a)}
      panelRef={(el) => (panel = el)}
      launcherRef={(el) => (launcher = el)}
      // NATIVE SLOT FALLBACK does the whole icon chain, with no occupancy tracking and
      // no MutationObserver: an unfilled slot renders its fallback content, and a slot
      // nested in another slot's fallback still receives its own assignment. So
      // `launcher-open` wins while open; failing that the consumer's `launcher` glyph
      // STAYS rather than morphing into a built-in ✕ that clashes with their art;
      // failing that the built-in ✕. Both defaults are the primitive's own, imported
      // rather than re-drawn here.
      launcher={<slot name="launcher"><DockLauncherGlyph /></slot>}
      launcherOpen={(
        <slot name="launcher-open">
          <slot name="launcher"><DockCloseGlyph /></slot>
        </slot>
      )}
    >
      <slot name="panel" />
      <slot />
    </Dock>
  );
});
