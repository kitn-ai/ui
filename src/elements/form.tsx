import { defineWebComponent } from './define';
import { Form, type FormDefinition } from '../components/form';

interface Props extends Record<string, unknown> {
  /** The form definition — a JSON Schema (`type:'object'`) + `x-kc-*` UI hints
   *  (the CardEnvelope.data). Set as a JS PROPERTY: `el.data = { type:'object',
   *  properties:{…} }`. Import the `FormDefinition` type from `@kitn.ai/chat` for
   *  the full shape (it is self-referential, so the element types it loosely). */
  data?: Record<string, unknown>;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
}

/**
 * `<kc-form>` — renders a JSON-Schema **form definition** (set via the `data`
 * property) into themed, accessible widgets inside `<kc-card>` chrome, validates
 * input client-side, and emits the collected, coerced, validated object up the
 * Card contract as a bubbling **`kc-card`** CustomEvent of `{ kind:'submit' }`.
 * It also emits `ready` on mount, `action`/`dismiss` for secondary affordances, and
 * `error` for a malformed definition. Routes through a `CardProvider` when present,
 * else the bubbling `kc-card` event (so a bare `<kc-form>` works without a host).
 * Isolated in Shadow DOM; theme-aware via the shared kit tokens.
 */
defineWebComponent<Props>('kc-form', {
  data: undefined,
  cardId: undefined,
  heading: undefined,
}, (props, { element }) => (
  <Form
    data={props.data as FormDefinition | undefined}
    cardId={props.cardId ?? (element.id || 'kc-form')}
    heading={props.heading}
    hostElement={element}
  />
));
