import { defineWebComponent } from './define';
import { ConfirmCard, type ConfirmCardData } from '../components/confirm-card';
import type { CardResolution } from '../primitives/card-contract';

interface Props extends Record<string, unknown> {
  /** The confirm definition (the CardEnvelope.data). Set as a JS PROPERTY:
   *  `el.data = { body, tone, actions:[…] }`. Import `ConfirmCardData` from
   *  `@kitn.ai/ui` for the full shape. */
  data?: Record<string, unknown>;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Focus the default action on mount (off by default — no focus-stealing).
   *  Attribute: `autofocus`. */
  autofocus?: boolean;
  /** Set when the user resolved this card; renders the read-only view. Property:
   *  `el.resolution = { kind:'action', action:'…' }`. */
  resolution?: Record<string, unknown>;
}

/**
 * `<kc-confirm>` — a named-intent **approval** card (set via the `data` property):
 * a title + body + a small set of action buttons. Activating an action emits the
 * Card contract's **`action`** verb up a bubbling **`kc-card`** CustomEvent
 * (`{ kind:'action', cardId, action, payload }`) and resolves the card so the same
 * approval can't double-fire. Also emits `ready` on mount, `dismiss` for the
 * optional close affordance, and `error` for a malformed definition (inline error).
 * Routes through a `CardProvider` when present, else the bubbling `kc-card` event.
 * Isolated in Shadow DOM; theme-aware via the shared kit tokens.
 */
defineWebComponent<Props>(
  'kc-confirm',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
    autofocus: false,
    resolution: undefined,
  },
  (props, { element, flag }) => (
    <ConfirmCard
      data={props.data as ConfirmCardData | undefined}
      cardId={props.cardId ?? (element.id || 'kc-confirm')}
      heading={props.heading}
      autofocus={flag('autofocus')}
      resolution={props.resolution as CardResolution | undefined}
      hostElement={element}
    />
  ),
);
