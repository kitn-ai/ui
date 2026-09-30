import { createEffect } from 'solid-js';
import { defineWebComponent } from '../define/define';
import type { QuestionKind } from '../../primitives/questions';

interface Props extends Record<string, unknown> {
  /** The question's identity, echoed in its answer. Defaults to `q<index>` from its position. */
  questionId?: string;
  /** The short tab label (keep it under about twelve characters). */
  header?: string;
  /** The question itself, shown above the options. */
  question?: string;
  /** What kind of answer it takes. Default `choice`. */
  kind?: QuestionKind;
  /** Let the user pick several options (checkboxes). A `tasks` question is always multiple. */
  multiSelect?: boolean;
  /** Hint text of the free-text field (the `text` kind, or the Other row). */
  placeholder?: string;
  /** Whether the question must be answered before Submit. Default true; `required="false"` turns it off. */
  required?: boolean;
  /** Offer the Other row (the user's own words). Default true for choice, confirm and tasks; `allow-other="false"` turns it off. */
  allowOther?: boolean;
  /** The `form` kind's fields: a JSON Schema object with `properties`, and `required` for the fields that must be filled. JS property. */
  fields?: Record<string, unknown>;
}
// A data holder, like `<option>`: it draws nothing, and its `<kai-question-panel>` parent reads it.
// It carries no state of its own and fires no event: answers surface on the panel.
// solid-coverage: equivalent QuestionBody -- a declarative light-DOM marker <kai-question-panel> reads through its MutationObserver; the Solid QuestionPanel takes the same fields as a `questions` prop and draws each one with QuestionBody, so there is no shared render path for the coverage guard to derive.
/**
 * One question of a `<kai-question-panel>`, declared as a child.
 */
defineWebComponent<Props>('kai-question', {
  questionId: undefined,
  header: undefined,
  question: undefined,
  kind: undefined,
  multiSelect: undefined,
  placeholder: undefined,
  required: undefined,
  allowOther: undefined,
  fields: undefined,
}, (props, { element }) => {
  // The parent watches the subtree for mutations. A property set from script is not one, so every
  // property change bumps this attribute, which is.
  let n = 0;
  createEffect(() => {
    void [props.questionId, props.header, props.question, props.kind, props.multiSelect, props.placeholder, props.required, props.allowOther, props.fields];
    element.setAttribute('data-kai-rev', String(++n));
  });
  return <style>{':host{display:none}'}</style>;
});
