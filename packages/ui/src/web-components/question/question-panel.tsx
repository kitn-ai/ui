import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { readSlots, QUESTION_PANEL_SLOTS } from '../slots/slots';
import { QuestionPanel, type QuestionPanelController } from '../../components/question/question-panel';
import type { PanelQuestion } from '../../components/question/question-state';
import type { Answer, AskResult, Question } from '../../primitives/questions';
import { normalizeQuestions, readQuestionChildren, type WarnOnce } from './read-questions';

interface Props extends Record<string, unknown> {
  /** The questions to ask, in order. JS property; `questionsFromToolCall` output fits. Ignored while `<kai-question>` children exist. */
  questions?: Question[];
  /** The provider's tool call id. Echoed in `kai-questions-submit` and `kai-questions-dismiss` so the host settles the right call, and a new one resets the answers. */
  toolCallId?: string;
  /** Controlled answers, one per answered question. JS property. Omit to let the panel keep its own. */
  value?: Answer[];
  /** The answers to start from when uncontrolled (a Reopen with the answers kept). JS property. */
  defaultValue?: Answer[];
  /** Controlled step: the question index, or the question count for the Review step. Omit to let the panel keep its own. */
  activeIndex?: number;
  /** The step to start on when uncontrolled. */
  defaultActiveIndex?: number;
  /** Text of the dismiss button. Replace the whole control with the `dismiss` slot. */
  dismissLabel?: string;
  /** Text of the final action. */
  submitLabel?: string;
  /** Accessible name of the panel and its tab list. */
  label?: string;
  /** Move focus into the panel when it appears. Default true; turn it off for a panel that is on the page from the start. */
  focusOnOpen?: boolean;
}

interface Events extends Record<string, unknown> {
  /** An answer changed. `answers` is the whole current set, one entry per answered question. */
  'kai-answer-change': { answers: Answer[] };
  /** The step changed (a tab, Back, Next, or a method). `questionId` is absent on the Review step. */
  'kai-active-change': { index: number; questionId?: string };
  /** The user submitted. `result` is the AskResult to hand to `answerQuestions` as the call's tool result. */
  'kai-questions-submit': { toolCallId?: string; result: AskResult };
  /** The user chose to chat instead (the button, or Escape inside the panel). `answers` are the partial answers so far. Settles nothing. */
  'kai-questions-dismiss': { toolCallId?: string; answers: Answer[] };
}
// The panel stands in the composer's place while a model's questions are open: it takes the composer
// card's surface so the thread's bottom edge does not move. Item mode: any `<kai-question>` child
// makes the app the owner of the questions (they render nothing themselves; the panel reads them),
// and `questions` is the preset over the same parts. Both feed ONE renderer, so they cannot differ.
// It never settles the call itself: the host calls `answerQuestions` / `settlePendingQuestions`.
/**
 * The question panel: tabs, Back and Next, numbered options with an Other row, a review step and Submit. Escape inside it dismisses.
 */
defineWebComponent<Props, Events>('kai-question-panel', {
  questions: undefined,
  toolCallId: undefined,
  value: undefined,
  defaultValue: undefined,
  activeIndex: undefined,
  defaultActiveIndex: undefined,
  dismissLabel: undefined,
  submitLabel: undefined,
  label: undefined,
  focusOnOpen: true,
}, (props, { element, dispatch, expose, flag }) => {
  let controller: QuestionPanelController | undefined;

  const warned = new Set<string>();
  const warn: WarnOnce = (key, message) => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(message);
  };

  // The children are read on every mutation of the subtree (a `<kai-question>` attribute, an option
  // added or edited): each child bumps `data-kai-rev` when a property changes, which the observer sees.
  const [rev, setRev] = createSignal(0);
  const [slots, setSlots] = createSignal<Record<string, boolean>>({});
  onMount(() => {
    const read = () => {
      setRev((v) => v + 1);
      setSlots(readSlots(element, QUESTION_PANEL_SLOTS));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true, characterData: true });
    onCleanup(() => observer.disconnect());
  });

  const composed = createMemo(() => {
    rev();
    return readQuestionChildren(element, warn);
  }, [], { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
  const isComposed = () => (rev(), [...element.children].some((c) => c.localName === 'kai-question'));

  createEffect(() => {
    if (!isComposed()) return;
    const data = props.questions;
    if (Array.isArray(data) && data.length > 0) {
      warn('both', "<kai-question-panel>: it has <kai-question> children, so the 'questions' property is ignored. Set the questions as children OR as 'questions', not both.");
    }
  });

  const dataQuestions = createMemo(() => normalizeQuestions(props.questions, warn), [], {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  const questions = (): PanelQuestion[] => (isComposed() ? composed() : dataQuestions());

  expose({
    /** Go to the next step. */
    next: () => controller?.next(),
    /** Go to the previous step. */
    back: () => controller?.back(),
    /** Go to a step by index; the question count is the Review step. */
    select: (index: number) => controller?.select(index),
    /** Submit, when every required question is answered. Fires `kai-questions-submit`. */
    submit: () => controller?.submit(),
    /** Focus the active step's first control. Call it when a dismissed panel is reopened. */
    focus: () => controller?.focus(),
  });

  return (
    <>
      <style>{':host{display:block}:host([hidden]){display:none}'}</style>
      <QuestionPanel
        questions={questions()}
        toolCallId={props.toolCallId as string | undefined}
        value={props.value as Answer[] | undefined}
        defaultValue={props.defaultValue as Answer[] | undefined}
        activeIndex={typeof props.activeIndex === 'number' ? props.activeIndex : undefined}
        defaultActiveIndex={typeof props.defaultActiveIndex === 'number' ? props.defaultActiveIndex : undefined}
        dismissLabel={props.dismissLabel as string | undefined}
        submitLabel={props.submitLabel as string | undefined}
        label={props.label as string | undefined}
        focusOnOpen={flag('focusOnOpen')}
        dismiss={slots()['dismiss'] ? <slot name="dismiss" /> : undefined}
        onValueChange={(answers) => dispatch('kai-answer-change', { answers })}
        onActiveChange={(detail) => dispatch('kai-active-change', detail)}
        onSubmit={(detail) => dispatch('kai-questions-submit', detail)}
        onDismiss={(detail) => dispatch('kai-questions-dismiss', detail)}
        controllerRef={(c) => (controller = c)}
      />
    </>
  );
});
