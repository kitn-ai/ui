// The data model of `kai_ask`, the question tool: types and the two facts every layer shares.
// Types and constants only: no Solid, no DOM, no validator, no provider SDK. The helpers live
// beside their side of the seam: `schemas/ask` (the model's call in, server-safe) and
// `state/questions` (the thread, client-safe).

/** The one tool name. `kai_`-prefixed like the card tools but NOT a card (see `cardTypeFromToolName`). */
export const ASK_TOOL_NAME = 'kai_ask';

export type QuestionKind = 'choice' | 'confirm' | 'tasks' | 'text' | 'form';

/** Every kind, once. `schemas/ask` validates against it and the tool schema's `enum` is checked
 *  against it in tests, so a sixth kind cannot be added to one and not the other. */
export const QUESTION_KINDS: readonly QuestionKind[] = ['choice', 'confirm', 'tasks', 'text', 'form'];

export interface QuestionOption {
  label: string;
  description?: string;
  /** Plain text. Rendered as text in a `<pre>`, never as markup. */
  preview?: string;
}

/**
 * One question, normalised. Every string here is MODEL OUTPUT: render it as text and nothing else.
 *
 * "Other" (the user's own words) is not an option in `options`: it is always available on choice,
 * confirm and tasks, and comes back as `Answer.text` beside or instead of `selected`.
 */
export interface Question {
  /** `q<index>` unless the model supplied one. Unique within the set. */
  id: string;
  header: string;
  question: string;
  kind: QuestionKind;
  multiSelect?: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  /** `form` only: a copy of the model's JSON Schema object, for the form widgets to read. */
  fields?: Record<string, unknown>;
  required: boolean;
}

/** The questions of ONE call. `id` is the provider's tool call id. */
export interface QuestionSet {
  id: string;
  questions: Question[];
}

export interface Answer {
  questionId: string;
  /** Echoed from the question so the tool result reads on its own in a transcript. */
  header: string;
  question: string;
  kind: QuestionKind;
  /** Option labels chosen (choice, tasks, confirm). */
  selected?: string[];
  /** The user's own words: the Other answer, or the whole answer for `text`. */
  text?: string;
  /** `form`: the field values. */
  values?: Record<string, unknown>;
}

/** What the model receives as the call's tool result. `dismissed` keeps any partial answers. */
export type AskResult = { status: 'answered'; answers: Answer[] } | { status: 'dismissed'; answers: Answer[] };

/**
 * One-click approval (supervisor default, REVERSIBLE): a panel whose ONLY question is a `confirm`
 * submits on the click of Approve or Deny, with no separate Submit. Every other panel keeps Submit.
 * The single branch the panel consults, so reversing the default is a change to this line and its test.
 */
export function isOneClick(questions: readonly Pick<Question, 'kind'>[]): boolean {
  return Array.isArray(questions) && questions.length === 1 && questions[0]?.kind === 'confirm';
}

/**
 * Is this value shaped like an {@link AskResult}? A shape check only (status, an array of answer
 * records), used wherever a tool part's `output` is read back: a saved thread can hold anything.
 */
export function isAskResult(v: unknown): v is AskResult {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as { status?: unknown; answers?: unknown };
  return (
    (r.status === 'answered' || r.status === 'dismissed') &&
    Array.isArray(r.answers) &&
    r.answers.every((a) => typeof a === 'object' && a !== null && !Array.isArray(a))
  );
}
