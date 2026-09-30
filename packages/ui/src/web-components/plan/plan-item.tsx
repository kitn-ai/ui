import { createEffect } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { PlanItemRow } from '../../components/plan/plan';
import type { PlanItemStatus } from '../../primitives/plan';

interface Props extends Record<string, unknown> {
  // The container reads the item's state through a mirrored attribute: a JS-property write
  // (`el.status = 'completed'`) is not a DOM mutation, so without the mirror the summary line
  // could not see it change.
  /** `pending` (default), `in_progress` or `completed`. Names the glyph for assistive tech and styles the row. */
  status?: PlanItemStatus;
}

/**
 * One row of a `kai-plan` checklist. Put the item's text inside it. Compose the rows yourself
 * inside `<kai-plan>`; the container adds the summary line, the progress bar and the list.
 */
defineWebComponent<Props>('kai-plan-item', {
  status: undefined,
}, (props, { element }) => {
  const status = () => {
    const s = props.status as string | undefined;
    return s === 'in_progress' || s === 'completed' ? s : 'pending';
  };
  createEffect(() => {
    if (element.getAttribute('data-kai-status') !== status()) element.setAttribute('data-kai-status', status());
  });
  return (
    <PlanItemRow as="div" status={status()}>
      <slot />
    </PlanItemRow>
  );
});
