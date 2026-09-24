import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { Dialog, type DialogController } from '../../components/dialog/dialog';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  // Shoelace-style: settable and reflected to the `open` attribute, while the element
  // still self-manages on Escape/backdrop.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  // A projected `header` slot WINS over this (it becomes `aria-labelledby`), because ARIA
  // resolves `aria-labelledby` ahead of `aria-label` and the visible heading is the name
  // both a sighted and a screen-reader user can be talked through.
  /** Accessible name for the modal, used when no `header` slot is projected. Defaults to `Dialog`. */
  label?: string;
}

/**
 * The fallback accessible name.
 *
 * DELIBERATELY GENERIC, and a decision rather than a placeholder. A modal with no
 * name at all fails WCAG and axe's `aria-dialog-name`; "Dialog, dialog" is merely
 * redundant, and between the two the redundant one is strictly better: it is also
 * what Shoelace and WebAwesome ship. The kit cannot know what a given modal is about,
 * so inventing something specific here would be a worse default than saying nothing
 * extra. Consumers name it properly with `label` or by projecting a `header`.
 */
const DEFAULT_LABEL = 'Dialog';

/**
 * The consumer's label, or the fallback, with "no label" meaning every way a
 * consumer can arrive at one.
 *
 * The declared default is a SEED, not a floor: component-register writes the prop
 * back as `null` when the attribute is removed and does NOT restore the declared
 * value, so `props.label` is legitimately `null`/`undefined` at runtime. An empty or
 * whitespace-only string is the same situation wearing a name: `aria-label=""` is a
 * `role="dialog"` with no accessible name, i.e. the exact defect this exists to
 * prevent, reached through the attribute that was supposed to prevent it. Each of
 * those routes is a row in tests/web-components/dialog.test.tsx, because a mutation run
 * showed the plain `??` was uncovered.
 */
function resolveLabel(label: unknown): string {
  return typeof label === 'string' && label.trim() !== '' ? label : DEFAULT_LABEL;
}

/** Events fired by `<kai-dialog>`. */
interface Events {
  /** The dialog opened or closed (Escape, backdrop click, a driven `open`, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * A centered modal dialog: a panel of your content over a dimmed page. `kai-screen`
 * is the full-bleed takeover instead.
 */
defineWebComponent<Props, Events>('kai-dialog', {
  open: undefined,
  defaultOpen: undefined,
  label: DEFAULT_LABEL,
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
      // The primitive already ranks these correctly — it emits `aria-labelledby` when
      // a header is present and `aria-label` only when one is not — so the facade just
      // has to HAND the name over, which is the wiring that was missing.
      aria-label={resolveLabel(props.label)}
      header={hasHeader() ? <slot name="header" /> : undefined}
      footer={hasFooter() ? <slot name="footer" /> : undefined}
      controllerRef={(a) => (api = a)}
      panelRef={(el) => (panel = el)}
    >
      <slot />
    </Dialog>
  );
});
