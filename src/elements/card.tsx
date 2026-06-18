import { defineWebComponent } from './define';
import { Card } from '../components/card';

interface Props extends Record<string, unknown> {
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Supporting text under the heading. Attribute: `description`. */
  description?: string;
  /** When set, the card renders its inline error state instead of the body.
   *  Attribute: `error-message`. */
  errorMessage?: string;
  /** Compact spacing for dense lists. Attribute: `dense`. */
  dense?: boolean;
}

/**
 * `<kai-card>` — the shared, presentational card chrome every native card composes
 * from: an optional media region (`slot="media"`), a heading + description, a body
 * (default slot), an actions footer (`slot="actions"`), and one consistent inline
 * **error** state (`error-message`). It emits **no** events and reads no context —
 * it is chrome only; the cards that compose it (e.g. `<kai-form>`) own the contract
 * interaction. Isolated in Shadow DOM; theme-aware via the shared kit tokens.
 */
defineWebComponent<Props>('kai-card', {
  heading: undefined,
  description: undefined,
  errorMessage: undefined,
  dense: false,
}, (props, { flag }) => (
  <Card
    heading={props.heading}
    description={props.description}
    errorMessage={props.errorMessage}
    dense={flag('dense')}
    media={<slot name="media" />}
    actions={<slot name="actions" />}
  >
    <slot />
  </Card>
));
