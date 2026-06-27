import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { Card } from '../components/card';

interface Props extends Record<string, unknown> {
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Supporting text under the heading. Attribute: `description`. */
  description?: string;
  /** When set, the card renders its inline error state instead of the body.
   *  Attribute: `error-message`. */
  errorMessage?: string;
  /** Compact spacing for dense lists. Attribute: `dense`. */
  dense?: boolean;
  /** Show a close (×) that hides the card and emits `kai-dismiss`. Attribute:
   *  `dismissible`. Off by default. */
  dismissible?: boolean;
  /** Render the whole card as a link. Attribute: `href`. Wins over `clickable`. */
  href?: string;
  /** `target` for the `href` anchor. Attribute: `target`. */
  target?: string;
  /** `rel` for the `href` anchor. Attribute: `rel`. */
  rel?: string;
  /** Make the whole card a button (`role="button"`, Enter/Space, hover affordance)
   *  that emits `kai-card-click`. Attribute: `clickable`. Ignored when `href` is set. */
  clickable?: boolean;
}

/** Events fired by `<kai-card>`. */
interface Events {
  /** The card was dismissed via its × (it also hides itself). */
  'kai-dismiss': void;
  /** A `clickable`/`href` card was activated (click, or Enter/Space). */
  'kai-card-click': void;
}

/**
 * `<kai-card>` — the shared, presentational card chrome every native card composes
 * from: an optional media region (`slot="media"`), a heading + description, a body
 * (default slot), an actions footer (`slot="actions"`), and one consistent inline
 * **error** state (`error-message`). Isolated in Shadow DOM; theme-aware via the
 * shared kit tokens.
 *
 * Presentational by default — the contract cards (`<kai-form>`, …) compose the
 * underlying `Card` directly and never opt into the behaviors below. The optional
 * interactions are all OFF by default:
 *
 * - `dismissible` renders a × that hides the card and fires `kai-dismiss` (mirrors
 *   `kai-notice`).
 * - `href` (+ `target`, `rel`) renders the card as an `<a>`; `clickable` makes the
 *   whole card a `role="button"` with Enter/Space activation. Either fires
 *   `kai-card-click`. `href` wins if both are set.
 * - `slot="trailing"` projects a chevron/arrow for a clickable card (no auto-chevron).
 *
 * a11y: a clickable/`href` card MUST NOT also contain footer action buttons
 * (`slot="actions"`) — that nests interactive controls. Use actions OR make the
 * card clickable, never both.
 *
 * ```html
 * <kai-card clickable dense heading="Upgrade" description="Unlock Fable 5.">
 *   <svg slot="trailing" ...></svg>
 * </kai-card>
 * ```
 */
defineWebComponent<Props, Events>('kai-card', {
  heading: undefined,
  description: undefined,
  errorMessage: undefined,
  dense: false,
  dismissible: false,
  href: undefined,
  target: undefined,
  rel: undefined,
  clickable: false,
}, (props, { element, dispatch, flag }) => {
  // The trailing region rerenders the inner layout, so only mount it when the
  // consumer actually projected `slot="trailing"` content — an empty slot must
  // leave the plain card untouched. Tracked off the host's direct children.
  const [hasTrailing, setHasTrailing] = createSignal(false);
  onMount(() => {
    const read = () => setHasTrailing(!!element.querySelector(':scope > [slot="trailing"]'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true });
    onCleanup(() => observer.disconnect());
  });

  return (
    <Card
      heading={props.heading}
      description={props.description}
      errorMessage={props.errorMessage}
      dense={flag('dense')}
      dismissible={flag('dismissible')}
      href={props.href}
      target={props.target}
      rel={props.rel}
      clickable={flag('clickable')}
      onDismiss={() => dispatch('kai-dismiss')}
      onCardClick={() => dispatch('kai-card-click')}
      media={<slot name="media" />}
      actions={<slot name="actions" />}
      trailing={hasTrailing() ? <slot name="trailing" /> : undefined}
    >
      <slot />
    </Card>
  );
});
