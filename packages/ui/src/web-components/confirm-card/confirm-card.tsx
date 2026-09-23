import { defineWebComponent } from '../define/define';
import { ConfirmCard, type ConfirmCardData, type ConfirmController } from '../../components/confirm-card/confirm-card';
import type { CardResolution } from '../../primitives/card-contract';

interface Props extends Record<string, unknown> {
  // Import `ConfirmCardData` from `@kitn.ai/ui` for the full shape.
  /** The confirm definition (the card's `data`). JS property: `el.data = { body, tone, actions: [...] }`. */
  data?: ConfirmCardData;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Focus the default action on mount (off by default, so nothing steals
   *  focus). Attribute: `autofocus`. */
  autofocus?: boolean;
  /** Set when the user resolved this card; renders the read-only view. Property:
   *  `el.resolution = { kind:'action', action:'…' }`. */
  resolution?: Record<string, unknown>;
}

/**
 * A card that presents an approval and a small set of actions for it.
 */
defineWebComponent<Props>(
  'kai-confirm',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
    autofocus: false,
    resolution: undefined,
  },
  (props, { element, flag, expose }) => {
    // Pattern C: the ConfirmCard owns the action/dismiss state and hands up a
    // controller; the facade captures it and exposes delegating methods. The card's
    // own paths still fire (confirm → kai-card `action`; dismiss/reopen → kai-card
    // `dismiss`/`reopen`).
    let controller: ConfirmController | undefined;
    expose({
      /** Focus the default action button (or the first action if none is default).
       *  The same target `autofocus` focuses on mount, but on demand. */
      focus: (options?: FocusOptions) => controller?.focus(options),
      /** Activate an action by id: emits the `action` verb on kai-card and resolves
       *  the card (single-shot). With no id, invokes the default action. */
      confirm: (actionId?: string) => controller?.confirm(actionId),
      /** Trigger the dismiss path: emits `dismiss` on kai-card and optimistically
       *  collapses the card to its re-openable stub. */
      dismiss: () => controller?.dismiss(),
      /** Re-open a dismissed card from its stub: emits `reopen` on kai-card. */
      reopen: () => controller?.reopen(),
    });

    return (
      <ConfirmCard
        data={props.data}
        cardId={props.cardId ?? (element.id || 'kai-confirm')}
        heading={props.heading}
        autofocus={flag('autofocus')}
        resolution={props.resolution as CardResolution | undefined}
        controllerRef={(c) => (controller = c)}
        hostElement={element}
      />
    );
  },
);
