import { createEffect } from 'solid-js';
import { defineWebComponent } from '../define/define';

interface Props extends Record<string, unknown> {
  /** The option's label, and the value that comes back in `selected`. The element's own text is the fallback. */
  label?: string;
  /** One line under the label. */
  description?: string;
  /** Code or config text shown beside the list while this option is focused. Rendered as plain text, never markup. */
  preview?: string;
}
// A data holder, like `<option>`: it draws nothing, and the `<kai-question>` it sits in is read by the panel.
// solid-coverage: equivalent QuestionOptionRow -- a declarative light-DOM marker the panel reads; the Solid QuestionPanel takes the same fields inside a question's `options` and draws each with QuestionOptionRow, so there is no shared render path for the coverage guard to derive.
/**
 * One option of a `<kai-question>`.
 */
defineWebComponent<Props>('kai-question-option', {
  label: undefined,
  description: undefined,
  preview: undefined,
}, (props, { element }) => {
  let n = 0;
  createEffect(() => {
    void [props.label, props.description, props.preview];
    element.setAttribute('data-kai-rev', String(++n));
  });
  return <style>{':host{display:none}'}</style>;
});
