import { defineWebComponent } from './define';
import { TasksCard, type TasksCardData } from '../components/tasks-card';
import type { CardResolution } from '../primitives/card-contract';

interface Props extends Record<string, unknown> {
  /** The tasks definition (the CardEnvelope.data). Set as a JS PROPERTY:
   *  `el.data = { tasks:[…], selectAll, confirmLabel, … }`. Import
   *  `TasksCardData` from `@kitn.ai/ui` for the full shape. */
  data?: Record<string, unknown>;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Set when the user resolved this card; renders the read-only view. Property:
   *  `el.resolution = { kind:'submit', data:{ selected:[…] } }`. */
  resolution?: Record<string, unknown>;
}

/**
 * `<kc-tasks>` — a **selectable** task/plan list (set via the `data` property):
 * checkbox rows + an optional select-all + a confirm button. Toggling rows is local
 * UI state; only the final confirm emits the Card contract's **`submit`** verb
 * up a bubbling **`kc-card`** CustomEvent (`{ kind:'submit', cardId,
 * data:{ selected } }`) with the checked ids in input order. Also emits `ready` on
 * mount and `error` for a malformed definition (inline error). v1 = select/approve
 * mode only. Routes through a `CardProvider` when present, else the bubbling
 * `kc-card` event. Isolated in Shadow DOM; theme-aware via the shared kit tokens.
 */
defineWebComponent<Props>(
  'kc-tasks',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
    resolution: undefined,
  },
  (props, { element }) => (
    <TasksCard
      data={props.data as TasksCardData | undefined}
      cardId={props.cardId ?? (element.id || 'kc-tasks')}
      heading={props.heading}
      resolution={props.resolution as CardResolution | undefined}
      hostElement={element}
    />
  ),
);
