import { defineWebComponent } from './define';
import { Embed } from '../components/embed';
import type { EmbedCardData } from '../primitives/embed-providers';
import { emitCardEvent } from '../primitives/card-routing';

interface Props extends Record<string, unknown> {
  /** Stable card id correlating every emitted event. Set as an attribute or property. */
  cardId?: string;
  /** The embed payload (provider + id/url + options). Set as a JS **property** (object). */
  data?: EmbedCardData;
}

/**
 * `<kai-embed>` — a privacy-first **lazy media embed** (YouTube / Vimeo / allowlisted
 * generic player). Initial render is a poster + play button: NO provider iframe, JS,
 * or cookies until the user clicks play (YouTube via `youtube-nocookie`, Vimeo with
 * `dnt=1`). A persistent "Open on {provider}" affordance dispatches the contract
 * `open` verb via the bubbling `kai-card` event. `generic` URLs are rejected unless
 * their origin was allowlisted with `configureEmbedAllowlist`. Set `data` as a JS
 * property; `card-id` via attribute.
 */
defineWebComponent<Props>(
  'kai-embed',
  {
    cardId: undefined,
    data: undefined,
  },
  (props, { element }) => (
    <Embed
      cardId={props.cardId ?? ''}
      data={props.data ?? ({ provider: 'generic' } as EmbedCardData)}
      onEmit={(event) => emitCardEvent(element, event)}
    />
  ),
);
