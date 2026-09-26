import { defineWebComponent } from '../define/define';
import { Embed } from '../../components/embed/embed';
import type { EmbedCardData } from '../../primitives/embed-providers';
import { emitCardEvent } from '../../primitives/card-routing';

interface Props extends Record<string, unknown> {
  /** Stable card id correlating every emitted event. Set as an attribute or property. */
  cardId?: string;
  /** The embed payload (provider + id/url + options). Set as a JS **property** (object). */
  data?: EmbedCardData;
}
// Privacy first: NO provider iframe, JS or cookies until the reader presses play (YouTube through
// `youtube-nocookie`, Vimeo with `dnt=1`). `generic` URLs are rejected unless their origin was
// allowlisted with `configureEmbedAllowlist`; the "Open on {provider}" affordance dispatches the
// contract `open` verb through the bubbling `kai-card` event.
/**
 * A lazy media embed: a poster and a play button until the reader presses play.
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
