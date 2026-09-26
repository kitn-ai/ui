import { defineWebComponent } from '../define/define';
import { Screen, type ScreenController } from '../../components/screen/screen';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  // Shoelace-style: settable and reflected to the `open` attribute, while the element
  // still self-manages.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Header title text. A projected `title` slot overrides it. (Named `headline`
   *  because `title` collides with the global `HTMLElement.title` attribute.) */
  headline?: string;
  /** Show the back button (default true). */
  back?: boolean;
  /** Opt out of marking sibling elements inert/aria-hidden while open (for unusual layouts). */
  noInert?: boolean;
}

/** Events fired by `<kai-screen>`. */
interface Events {
  /** Back navigation intent: the back button or Escape. The consumer flips their
   *  own routing in response (the screen knows nothing about the trigger). */
  'kai-back': Record<string, never>;
  /** The screen opened or closed (a method, `Escape` close, or driven `open`). */
  'kai-open-change': { open: boolean };
}

/**
 * A full-bleed overlay destination that takes over its mount point under a back
 * header. `kai-dialog` is the centered modal instead.
 */
defineWebComponent<Props, Events>('kai-screen', {
  open: undefined,
  defaultOpen: undefined,
  headline: undefined,
  back: undefined,
  noInert: undefined,
}, (props, ctx) => {
  const { flag, element, dispatch, expose } = ctx;
  let api: ScreenController | undefined;
  let surface: HTMLElement | undefined;

  // The standard disclosure surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle. See ./disclosure. This is the SOLE emitter of kai-open-change.
  wireDisclosure(ctx, () => api, () => props.open);

  // focus() shadows the host's native focus so it targets the screen surface
  // inside the shadow root (the WebAwesome/Shoelace convention).
  expose({
    /** Move focus to the screen surface (no-op while closed). */
    focus: (options?: FocusOptions) => surface?.focus(options),
  });

  return (
    <Screen
      defaultOpen={flag('defaultOpen')}
      back={!(props.back === false || element.getAttribute('back') === 'false')}
      noInert={flag('noInert')}
      host={() => element}
      titleSlot={<slot name="title">{props.headline as string | undefined}</slot>}
      actions={<slot name="actions" />}
      onBack={() => { dispatch('kai-back', {}); }}
      controllerRef={(a) => (api = a)}
      surfaceRef={(el) => (surface = el)}
    >
      <slot />
    </Screen>
  );
});
