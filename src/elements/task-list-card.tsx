import { defineWebComponent } from './define';
import { TaskListCard, type TaskListCardData } from '../components/task-list-card';

interface Props extends Record<string, unknown> {
  /** The task-list definition (the CardEnvelope.data). Set as a JS PROPERTY:
   *  `el.data = { tasks:[…], selectAll, confirmLabel, … }`. Import
   *  `TaskListCardData` from `@kitn.ai/chat` for the full shape. */
  data?: Record<string, unknown>;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
}

/**
 * `<kc-task-list>` — a **selectable** task/plan list (set via the `data` property):
 * checkbox rows + an optional select-all + a confirm button. Toggling rows is local
 * UI state; only the final confirm emits the Card contract's **`submit`** verb
 * up a bubbling **`kc-card`** CustomEvent (`{ kind:'submit', cardId,
 * data:{ selected } }`) with the checked ids in input order. Also emits `ready` on
 * mount and `error` for a malformed definition (inline error). v1 = select/approve
 * mode only. Routes through a `CardProvider` when present, else the bubbling
 * `kc-card` event. Isolated in Shadow DOM; theme-aware via the shared kit tokens.
 */
defineWebComponent<Props>(
  'kc-task-list',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
  },
  (props, { element }) => (
    <TaskListCard
      data={props.data as TaskListCardData | undefined}
      cardId={props.cardId ?? (element.id || 'kc-task-list')}
      heading={props.heading}
      hostElement={element}
    />
  ),
);
