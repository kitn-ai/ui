import { defineWebComponent } from './define';
import { LinkCard } from '../components/link-card';
import type { LinkCardData } from '../primitives/link-preview';
import { emitCardEvent } from '../primitives/card-routing';

interface Props extends Record<string, unknown> {
  /** Stable card id correlating every emitted event. Set as an attribute or property. */
  cardId?: string;
  /** The link payload (OG metadata). Set as a JS **property** (object). */
  data?: LinkCardData;
}

/**
 * `<kc-link-card>` — a themed, accessible rich link / Open-Graph preview card. It
 * renders from the supplied `data` (it never fetches; an app may register a
 * `configureLinkPreview` fetcher for the bare-`{ url }` path). Activating the card
 * dispatches the bubbling, composed **`kc-card`** CustomEvent with the contract
 * `open` verb (`{ kind:'open', url, target:'tab' }`) so a host-level listener
 * routes it through CardPolicy. Set `data` as a JS property; `card-id` via attribute.
 */
defineWebComponent<Props>(
  'kc-link-card',
  {
    cardId: undefined,
    data: undefined,
  },
  (props, { element }) => (
    <LinkCard
      cardId={props.cardId ?? ''}
      data={props.data ?? ({ url: '' } as LinkCardData)}
      onEmit={(event) => emitCardEvent(element, event)}
    />
  ),
);
