import { defineWebComponent } from '../define/define';
import { LinkPreview } from '../../components/link-preview/link-preview';
import type { LinkPreviewData } from '../../primitives/link-preview';
import { emitCardEvent } from '../../primitives/card-routing';

interface Props extends Record<string, unknown> {
  /** Stable card id correlating every emitted event. Set as an attribute or property. */
  cardId?: string;
  /** The link payload (OG metadata). Set as a JS **property** (object). */
  data?: LinkPreviewData;
}
// It renders from the supplied `data` and NEVER fetches; an app that wants the bare `{ url }` path
// resolved registers a fetcher through `configureLinkPreview`. Activating the card dispatches the
// contract `open` verb through the bubbling, composed `kai-card` event.
/**
 * A rich link preview card built from Open-Graph metadata.
 */
defineWebComponent<Props>(
  'kai-link-preview',
  {
    cardId: undefined,
    data: undefined,
  },
  (props, { element }) => (
    <LinkPreview
      cardId={props.cardId ?? ''}
      data={props.data ?? ({ url: '' } as LinkPreviewData)}
      onEmit={(event) => emitCardEvent(element, event)}
    />
  ),
);
