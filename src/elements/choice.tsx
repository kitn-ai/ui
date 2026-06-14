import { defineWebComponent } from './define';
import { ChoiceCard, type ChoiceCardData } from '../components/choice-card';

interface Props extends Record<string, unknown> {
  /** The choice definition (the CardEnvelope.data). Set as a JS PROPERTY:
   *  `el.data = { prompt, options:[…], layout?, allowOther? }`. Import
   *  `ChoiceCardData` from `@kitn.ai/chat` for the full shape. */
  data?: Record<string, unknown>;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
}

/**
 * `<kc-choice>` — a single-select **"pick one of N rich options"** card (set via the
 * `data` property): a prompt + a radiogroup of options (list or grid layout). Picking
 * an option emits the Card contract's **`action`** verb up a bubbling **`kc-card`**
 * CustomEvent (`{ kind:'action', cardId, action: option.id, payload? }`) and resolves
 * the card so the same pick can't double-fire. An optional `allowOther` free-text escape
 * renders a final "Other…" option that reveals an inline input + Submit (emitting
 * `action:'__other__'` with `{ text }`). Also emits `ready` on mount and `error` for a
 * malformed definition (inline error). Routes through a `CardProvider` when present, else
 * the bubbling `kc-card` event. Isolated in Shadow DOM; theme-aware via the shared tokens.
 */
defineWebComponent<Props>(
  'kc-choice',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
  },
  (props, { element }) => (
    <ChoiceCard
      data={props.data as ChoiceCardData | undefined}
      cardId={props.cardId ?? (element.id || 'kc-choice')}
      heading={props.heading}
      hostElement={element}
    />
  ),
);
