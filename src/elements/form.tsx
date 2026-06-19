import { defineWebComponent } from './define';
import { Form, type FormDefinition } from '../components/form';
import type { CardResolution } from '../primitives/card-contract';

interface Props extends Record<string, unknown> {
  /** The form definition — a JSON Schema (`type:'object'`) + `x-kai-*` UI hints
   *  (the CardEnvelope.data). Set as a JS PROPERTY: `el.data = { type:'object',
   *  properties:{…} }`. Import the `FormDefinition` type from `@kitn.ai/ui` for
   *  the full shape (it is self-referential, so the element types it loosely). */
  data?: Record<string, unknown>;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Set when the user resolved this card; renders the read-only view. Property:
   *  `el.resolution = { kind:'submit', data:{…} }`. */
  resolution?: Record<string, unknown>;
}

/**
 * `<kai-form>` — renders a JSON-Schema **form definition** (set via the `data`
 * property) into themed, accessible widgets inside `<kai-card>` chrome, validates
 * input client-side, and emits the collected, coerced, validated object up the
 * Card contract as a bubbling **`kai-card`** CustomEvent of `{ kind:'submit' }`.
 * It also emits `ready` on mount, `action`/`dismiss` for secondary affordances, and
 * `error` for a malformed definition. Routes through a `CardProvider` when present,
 * else the bubbling `kai-card` event (so a bare `<kai-form>` works without a host).
 * Isolated in Shadow DOM; theme-aware via the shared kit tokens.
 */
defineWebComponent<Props>('kai-form', {
  data: undefined,
  cardId: undefined,
  heading: undefined,
  resolution: undefined,
}, (props, { element }) => (
  <Form
    data={props.data as FormDefinition | undefined}
    cardId={props.cardId ?? (element.id || 'kai-form')}
    heading={props.heading}
    resolution={props.resolution as CardResolution | undefined}
    hostElement={element}
  />
));
