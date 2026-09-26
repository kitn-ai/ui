import { defineWebComponent } from '../define/define';
import { ChoiceCard, type ChoiceCardData, type ChoiceController } from '../../components/choice-card/choice-card';
import type { CardResolution } from '../../primitives/card-contract';

interface Props extends Record<string, unknown> {
  // Import `ChoiceCardData` from `@kitn.ai/ui` for the full shape.
  /** The choice definition (the card's `data`). JS property: `el.data = { prompt, options: [...] }`. */
  data?: ChoiceCardData;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Set when the user resolved this card; renders the read-only view. Property:
   *  `el.resolution = { kind:'action', action:'…' }`. */
  resolution?: Record<string, unknown>;
  /** Controlled selection: the selected option id. When set, the consumer owns
   *  the current pick (RadioGroup `value`). Attribute: `value`. */
  value?: string;
  /** Option id to pre-select on mount (uncontrolled seed). Attribute: `default-value`. */
  defaultValue?: string;
  /** Disable the whole radiogroup + Submit (e.g. while the agent is busy).
   *  Attribute: `disabled`. */
  disabled?: boolean;
}

/** Events fired by `<kai-choice>`. (The terminal submit/dismiss/reopen flow is
 *  emitted via the bubbling `kai-card` contract event: listen for `kai-card`.) */
interface Events {
  /** The selection changed BEFORE submit (a row click or the `select()` method).
   *  Distinct from the terminal `action` verb on the `kai-card` contract event. */
  'kai-value-change': { value: string };
}
// Two-stage on purpose: a row click only SELECTS (`kai-value-change`), and Submit commits the
// Card contract's `action` verb up a bubbling `kai-card` event, which also resolves the card so
// the same pick cannot double-fire. `allowOther` appends a selectable "Other..." row that
// reveals an inline input, and Submit then emits `action: '__other__'` with `{ text }`. Routes
// through a CardProvider when present, else the bubbling `kai-card` event.
/**
 * A single-select card of rich options that submits one choice.
 */
defineWebComponent<Props, Events>(
  'kai-choice',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
    resolution: undefined,
    value: undefined,
    defaultValue: undefined,
    disabled: undefined,
  },
  (props, { element, dispatch, flag, expose }) => {
    // Pattern C: the ChoiceCard owns selection/submit/dismiss state and hands up a
    // controller; the facade captures it and exposes delegating methods. The card's
    // own paths still fire (select → kai-value-change; send → kai-card `action`;
    // dismiss/reopen → kai-card `dismiss`/`reopen`).
    let controller: ChoiceController | undefined;
    expose({
      /** Focus the radiogroup roving tab stop (or the Other input when selected). */
      focus: (options?: FocusOptions) => controller?.focus(options),
      /** Select an option by id locally: no emit, fires kai-value-change (same as a
       *  row click). Lets a consumer pre-highlight or drive selection externally. */
      select: (optionId: string) => controller?.select(optionId),
      /** Submit the current selection: emits the `action` verb on kai-card and
       *  resolves the card (single-shot). Named `send`, not `submit`, per the shared
       *  vocabulary. */
      send: () => controller?.send(),
      /** Trigger the dismiss path: emits `dismiss` on kai-card and optimistically
       *  collapses the card to its re-openable stub. */
      dismiss: () => controller?.dismiss(),
      /** Re-open a dismissed card from its stub: emits `reopen` on kai-card. */
      reopen: () => controller?.reopen(),
    });

    return (
      <ChoiceCard
        data={props.data}
        cardId={props.cardId ?? (element.id || 'kai-choice')}
        heading={props.heading}
        resolution={props.resolution as CardResolution | undefined}
        value={props.value}
        defaultValue={props.defaultValue}
        disabled={flag('disabled')}
        onValueChange={(value) => dispatch('kai-value-change', { value })}
        controllerRef={(c) => (controller = c)}
        hostElement={element}
      />
    );
  },
);
