import { defineWebComponent } from '../define/define';
import { TasksCard, type TasksCardController, type TasksCardData } from '../../components/tasks/tasks-card';
import type { CardResolution } from '../../primitives/card-contract';

interface Props extends Record<string, unknown> {
  // Import `TasksCardData` from `@kitn.ai/ui` for the full shape.
  /** The tasks definition (the card's `data`). JS property: `el.data = { tasks: [...], selectAll, confirmLabel }`. */
  data?: TasksCardData;
  /** Stable card id correlating every emitted CardEvent. Attribute: `card-id`. */
  cardId?: string;
  /** Heading rendered in the card chrome (= CardEnvelope.title). Attribute: `heading`. */
  heading?: string;
  /** Set when the user resolved this card; renders the read-only view. Property:
   *  `el.resolution = { kind:'submit', data:{ selected:[…] } }`. */
  resolution?: Record<string, unknown>;
  /** Controlled selection (task ids; JS property). When set, it wins over local state. */
  value?: string[];
  /** Uncontrolled initial selection (task ids; JS property), overlaying per-task `checked`. */
  defaultValue?: string[];
  /** Freeze the whole list + Confirm. Attribute: `disabled`. */
  disabled?: boolean;
  /** Display-only: rows can't be toggled and show the default cursor (no pointer,
   *  hover, or focus affordances). Keeps the look as-is. Attribute: `readonly`. */
  readonly?: boolean;
}

/** Events fired by `<kai-tasks>`. (Resolution still flows up the bubbling `kai-card`
 *  contract event — `kai-value-change` is the live selection signal, distinct from
 *  the terminal submit.) */
interface Events {
  /** The selection changed on a toggle. Carries the selected ids in input
   *  order. */
  'kai-value-change': { value: string[] };
}

/**
 * A checklist of tasks the user ticks off and confirms.
 */
defineWebComponent<Props, Events>(
  'kai-tasks',
  {
    data: undefined,
    cardId: undefined,
    heading: undefined,
    resolution: undefined,
    value: undefined,
    defaultValue: undefined,
    disabled: false,
    readonly: false,
  },
  (props, { element, dispatch, flag, expose }) => {
    // Pattern C: the TasksCard component owns the selection set + confirm gating and
    // hands up a controller; the facade captures it and exposes delegating methods.
    let controller: TasksCardController | undefined;
    expose({
      /** Set the checked task ids (local-only, no emit), respecting disabled/max.
       *  With no arg, select all toggleable rows. */
      select: (taskIds?: string[]) => controller?.select(taskIds),
      /** Toggle one task by id, honoring the max gate (no `checked` = flip). */
      toggle: (taskId: string, checked?: boolean) => controller?.toggle(taskId, checked),
      /** Confirm the current selection: emits the `submit` CardEvent + resolves
       *  (only when the min/max gate passes). Named `send`, not `submit`. */
      send: () => controller?.send(),
      /** Focus the task group (select-all checkbox if shown, else the first row). */
      focus: (options?: FocusOptions) => controller?.focus(options),
      /** Trigger the dismiss path (emit `dismiss` + collapse to the re-openable stub). */
      dismiss: () => controller?.dismiss(),
      /** Re-open a dismissed card from its stub (emit `reopen`). */
      reopen: () => controller?.reopen(),
    });

    return (
      <TasksCard
        data={props.data}
        cardId={props.cardId ?? (element.id || 'kai-tasks')}
        heading={props.heading}
        resolution={props.resolution as CardResolution | undefined}
        value={props.value as string[] | undefined}
        defaultValue={props.defaultValue as string[] | undefined}
        disabled={flag('disabled')}
        readonly={flag('readonly')}
        onValueChange={(payload) => dispatch('kai-value-change', payload)}
        controllerRef={(c) => (controller = c)}
        hostElement={element}
      />
    );
  },
);
