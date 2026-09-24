import { defineWebComponent } from '../define/define';
import { Coachmark, type CoachmarkController } from '../../components/coachmark/coachmark';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  // Settable and reflected to the `open` attribute, while the element still
  // self-manages.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** The bold title. Named `headline` because `title` collides with the global
   *  `HTMLElement.title` attribute (it throws at registration). */
  headline?: string;
  /** A small badge pill beside the headline (e.g. "New"). */
  badge?: string;
  /** Floating placement relative to the anchor (default `bottom`). */
  placement?: string;
  /** Color tone, reusing the kit's tool hues. Defaults to the theme accent. */
  tone?: 'primary' | 'info' | 'success' | 'warning' | 'error';
  /** Render the arrow that points at the anchor (default `true`). Set
   *  `arrow="false"` for a plain bubble with no pointer. */
  arrow?: boolean;
}

/** Events fired by `<kai-coachmark>`. */
interface Events {
  /** The × dismiss button was pressed. The consumer records that this hint was
   *  seen so it won't show again. */
  'kai-dismiss': Record<string, never>;
  /** The coachmark opened or closed (a method, the ×, or a driven `open`). */
  'kai-open-change': { open: boolean };
}

/**
 * An anchored onboarding bubble with an arrow, pointing at the trigger it wraps.
 * `kai-tooltip` is the one-line hint instead.
 */
defineWebComponent<Props, Events>('kai-coachmark', {
  open: undefined,
  defaultOpen: undefined,
  headline: undefined,
  badge: undefined,
  placement: undefined,
  tone: undefined,
  arrow: true,
}, (props, ctx) => {
  const { flag, dispatch } = ctx;
  let api: CoachmarkController | undefined;

  // The standard disclosure surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle. See ./disclosure. This is the SOLE emitter of kai-open-change.
  wireDisclosure(ctx, () => api, () => props.open);

  // headline/badge are scalar string props (NOT slots) — pass through directly so
  // the component's own `Show when={…}` gating drives whether each region renders.
  // The body is the `content` slot; an empty `<slot>` renders nothing.
  return (
    <Coachmark
      defaultOpen={flag('defaultOpen')}
      arrow={flag('arrow')}
      placement={props.placement as never}
      tone={props.tone as 'primary' | 'info' | 'success' | 'warning' | 'error' | undefined}
      headline={props.headline as string | undefined}
      badge={props.badge as string | undefined}
      content={<slot name="content" />}
      controllerRef={(a) => (api = a)}
      onDismiss={() => dispatch('kai-dismiss', {})}
    >
      <slot />
    </Coachmark>
  );
});
