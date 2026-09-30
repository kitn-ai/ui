// The pure half of the question panel: what a question's rows are, what a draft answer is, and how a
// draft becomes the public `Answer`. No Solid, no DOM, so the facade, the component and the tests read
// the same rules. Every string a question carries is MODEL OUTPUT; nothing here interprets one.

import type { Answer, Question, QuestionOption } from '../../primitives/questions';
import { isOneClick } from '../../primitives/questions';

export { isOneClick };

/** A question as the panel takes it: the normalised {@link Question} plus the one panel-only switch. */
export type PanelQuestion = Question & {
  /** Offer the "Other" row (the user's own words). Defaults to true for choice, confirm and tasks. */
  allowOther?: boolean;
};

/** What the user has done to one question so far. `otherOn` is UI state the public Answer does not carry. */
export interface AnswerDraft {
  selected: string[];
  otherOn: boolean;
  other: string;
  text: string;
  values: Record<string, unknown>;
}
export type Drafts = Record<string, AnswerDraft>;

export const emptyDraft = (): AnswerDraft => ({ selected: [], otherOn: false, other: '', text: '', values: {} });

/** The longest preview rendered; past it the text is cut and the cut says so. */
export const PREVIEW_MAX = 4000;

const DEFAULT_CONFIRM: QuestionOption[] = [{ label: 'Approve' }, { label: 'Deny' }];
const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';

/** The option rows of a question, without Other. A confirm with no model pair gets Approve / Deny. */
export function optionsOf(q: Pick<Question, 'kind' | 'options'>): QuestionOption[] {
  if (q.kind === 'confirm') return q.options && q.options.length > 0 ? q.options : DEFAULT_CONFIRM;
  if (q.kind === 'choice' || q.kind === 'tasks') return q.options ?? [];
  return [];
}

export function allowsOther(q: PanelQuestion): boolean {
  if (q.kind !== 'choice' && q.kind !== 'confirm' && q.kind !== 'tasks') return false;
  return q.allowOther !== false;
}

/** Checkbox semantics: multi-select choice and the tasks checklist. */
export const isMulti = (q: Pick<Question, 'kind' | 'multiSelect'>): boolean => q.kind === 'tasks' || q.multiSelect === true;

/** How many numbered rows the question shows, Other included (it is always last). */
export const rowCount = (q: PanelQuestion): number => optionsOf(q).length + (allowsOther(q) ? 1 : 0);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function requiredFields(q: Question): string[] {
  const req = isRecord(q.fields) ? q.fields.required : undefined;
  return Array.isArray(req) ? req.filter((k): k is string => typeof k === 'string') : [];
}

const filledValue = (v: unknown): boolean => (typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null && v !== false);

export function isAnswered(q: PanelQuestion, d: AnswerDraft | undefined): boolean {
  if (!d) return false;
  if (q.kind === 'text') return !blank(d.text);
  if (q.kind === 'form') {
    const values = d.values ?? {};
    const req = requiredFields(q);
    if (req.length > 0) return req.every((k) => filledValue(values[k]));
    return Object.values(values).some(filledValue);
  }
  return d.selected.length > 0 || (d.otherOn && !blank(d.other));
}

/** The public Answer for a draft, or undefined while the question has none. */
export function answerFromDraft(q: PanelQuestion, d: AnswerDraft | undefined): Answer | undefined {
  if (!d || !isAnswered(q, d)) return undefined;
  const base = { questionId: q.id, header: q.header, question: q.question, kind: q.kind };
  if (q.kind === 'text') return { ...base, text: d.text.trim() };
  if (q.kind === 'form') return { ...base, values: { ...d.values } };
  const order = optionsOf(q).map((o) => o.label);
  const selected = order.filter((l) => d.selected.includes(l));
  const answer: Answer = { ...base, selected };
  if (d.otherOn && !blank(d.other)) answer.text = d.other.trim();
  return answer;
}

/** The draft an existing Answer means (a controlled `value`, or a Reopen with answers kept). */
export function draftFromAnswer(q: PanelQuestion, a: Answer | undefined): AnswerDraft {
  const d = emptyDraft();
  if (!a) return d;
  if (q.kind === 'text') return { ...d, text: typeof a.text === 'string' ? a.text : '' };
  if (q.kind === 'form') return { ...d, values: isRecord(a.values) ? { ...a.values } : {} };
  const text = typeof a.text === 'string' ? a.text : '';
  return { ...d, selected: Array.isArray(a.selected) ? [...a.selected] : [], otherOn: !blank(text), other: text };
}

export function draftsFromAnswers(questions: PanelQuestion[], answers: Answer[] | undefined): Drafts {
  const out: Drafts = {};
  for (const q of questions) out[q.id] = draftFromAnswer(q, answers?.find((a) => a?.questionId === q.id));
  return out;
}

export function answersFromDrafts(questions: PanelQuestion[], drafts: Drafts): Answer[] {
  const out: Answer[] = [];
  for (const q of questions) {
    const a = answerFromDraft(q, drafts[q.id]);
    if (a) out.push(a);
  }
  return out;
}

/** The required questions with no answer yet. */
export const missingQuestions = (questions: PanelQuestion[], drafts: Drafts): PanelQuestion[] =>
  questions.filter((q) => q.required !== false && !isAnswered(q, drafts[q.id]));

/**
 * How many questions have no answer in `answers`: the count of the "N of M questions waiting" line.
 * Reads the PUBLIC answers (what `kai-answer-change` and `kai-questions-dismiss` carry), so the host
 * needs no draft state.
 */
export function unansweredCount(questions: PanelQuestion[], answers: Answer[]): number {
  return questions.filter((q) => answerFromDraft(q, draftFromAnswer(q, answers.find((a) => a?.questionId === q.id))) === undefined).length;
}

/** One-line reading of an answer, Other text included; undefined while the question is open. */
export function answerLine(q: PanelQuestion, d: AnswerDraft | undefined): string | undefined {
  const a = answerFromDraft(q, d);
  if (!a) return undefined;
  if (q.kind === 'text') return a.text;
  if (q.kind === 'form') return Object.values(a.values ?? {}).filter(filledValue).map(String).join(', ');
  return [...(a.selected ?? []), ...(a.text ? [a.text] : [])].join(', ');
}

/** A preview is code or config text; a very long one is cut and the cut is stated, never silent. */
export function clampPreview(text: string): string {
  if (text.length <= PREVIEW_MAX) return text;
  return `${text.slice(0, PREVIEW_MAX)}\n\n[preview truncated: showing ${PREVIEW_MAX} of ${text.length} characters]`;
}

/** Longest text drawn for each kind of model string. Past it the text is cut and the cut is stated. */
export const TEXT_LIMITS = { header: 200, question: 8000, label: 300, description: 600, answer: 2000, tip: 500 } as const;

/** Text clamped to `max` characters, with the cut made visible ("... +N more characters"). */
export function clampText(text: string, max: number): string {
  if (typeof text !== 'string' || text.length <= max) return text;
  return `${text.slice(0, max)}\u2026 [+${text.length - max} more characters]`;
}

// The embedding and override controls (U+202A-202E) reorder the text AROUND them, and an isolate on the
// element cannot stop one inside it. LRM, RLM and the isolates are left alone: real RTL text carries them
// and `unicode-bidi: isolate` contains them. "\u202Eevil.exe" reads "exe.live". They are drawn as a visible code point instead.
const BIDI_CONTROLS = /[\u202A-\u202E]/g;
const bidiLabel = (c: string): string => `[U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}]`;

/** Model text as it is DRAWN: bidi controls made visible, then clamped. Answers keep the original. */
export function showText(text: string, max: number = Infinity): string {
  if (typeof text !== 'string') return '';
  return clampText(text.replace(BIDI_CONTROLS, bidiLabel), max);
}

/** The thing a `confirm` asks to approve (a command, a path): the first option preview, drawn in a strip. */
export function confirmDetail(q: Pick<Question, 'kind' | 'options'>): string | undefined {
  if (q.kind !== 'confirm') return undefined;
  const p = q.options?.find((o) => typeof o.preview === 'string' && o.preview !== '')?.preview;
  return p === undefined ? undefined : clampPreview(p);
}
