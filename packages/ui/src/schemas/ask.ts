// The model's `kai_ask` call, read: the server-safe half of the question tool. No Solid, no DOM, no
// provider SDK, so a backend route imports it beside `askTool` (`./tool-defs`) inside a tool loop.
//
// Unlike `kai_plan` and a card tool, the host does NOT answer this call: it leaves the tool part at
// `input-available`, the user answers in a panel, and `answerQuestions` (`@kitn.ai/ui/state`) turns
// the answers into the call's real tool result. In the loop: `if (isAskTool(call.name))`, send
// `questionsFromToolCall(...)`'s `{ error }` back with `applyToolFailure` if it has one, else `continue`.
//
// THE MODEL'S INPUT IS UNTRUSTED. `questionsFromToolCall` never throws and never repairs: a malformed
// call returns an error object the host hands BACK to the model, and what it returns is rebuilt field
// by field from OWN properties, so an unknown key, a `__proto__` entry or a 1MB label rides no further
// than the text it is. Every string reaches the DOM as text and nothing else.
//
// NO SIZE CAP, the same ruling as `kai_plan`: the schema's limits (four questions, twelve-character
// headers) GUIDE the model, and this reader keeps whatever arrives and says so once in the console;
// how much is too much is the app's call. It does refuse a call it cannot render or answer: wrong
// types, an unknown kind, no questions, duplicate ids or labels.

import type { Question, QuestionKind, QuestionOption, QuestionSet } from '../primitives/questions';
import { ASK_TOOL_NAME, QUESTION_KINDS } from '../primitives/questions';
import askSchemaDoc from '../primitives/question-schemas/ask.schema.json';

export { ASK_TOOL_NAME };

/** Is this tool call the question tool? Exact and case-sensitive, like tool names are. */
export function isAskTool(name: string): boolean {
  return name === ASK_TOOL_NAME;
}

// The guidance limits. The two the schema states structurally are READ from it; the per-kind option
// counts cannot be said structurally in one schema, so they are stated here and in the schema's prose.
const questionsSchema = (askSchemaDoc.properties.questions as unknown) as {
  maxItems: number;
  items: { properties: { header: { maxLength: number } } };
};
const MAX_QUESTIONS = questionsSchema.maxItems;
const MAX_HEADER = questionsSchema.items.properties.header.maxLength;
const CHOICE_OPTIONS = { min: 2, max: 6 } as const;
const TASK_OPTIONS = { min: 1, max: 12 } as const;

const MAX_ISSUES = 10;
const MAX_ECHO = 40;
const MAX_FIELDS_DEPTH = 32;

/** A bounded, throw-free description of a value for an error message. */
function show(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v.length > MAX_ECHO ? `${v.slice(0, MAX_ECHO)}...` : v);
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'an array';
  if (typeof v === 'object') return 'an object';
  return typeof v === 'number' || typeof v === 'boolean' ? String(v) : typeof v;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
/** An OWN property or `undefined`: a polluted `Object.prototype.kind` must not answer for the model. */
const own = (o: Record<string, unknown>, k: string): unknown => (hasOwn(o, k) ? o[k] : undefined);

class FieldsError extends Error {}

/** A JSON deep copy that cannot pollute: keys are DEFINED as own data properties (so an own
 *  `__proto__` stays an ordinary key), depth is capped, and anything JSON cannot carry is refused. */
function cloneJson(v: unknown, depth: number): unknown {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new FieldsError('a non-finite number');
    return v;
  }
  if (typeof v !== 'object') throw new FieldsError(`a ${typeof v}`);
  if (depth >= MAX_FIELDS_DEPTH) throw new FieldsError(`nesting deeper than ${MAX_FIELDS_DEPTH}`);
  if (Array.isArray(v)) return v.map((x) => cloneJson(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v)) {
    Object.defineProperty(out, k, { value: cloneJson((v as Record<string, unknown>)[k], depth + 1), enumerable: true, writable: true, configurable: true });
  }
  return out;
}

class Collector {
  readonly issues: string[] = [];
  count = 0;
  add(msg: string): void {
    this.count++;
    if (this.issues.length < MAX_ISSUES) this.issues.push(msg);
  }
  summary(): string {
    const more = this.count - this.issues.length;
    return `${this.issues.join('; ')}${more > 0 ? `; and ${more} more` : ''}`;
  }
}

function readOptions(raw: unknown, path: string, into: Collector): QuestionOption[] | undefined {
  if (!Array.isArray(raw)) {
    into.add(`${path}: must be an array of { label } objects (got ${show(raw)})`);
    return undefined;
  }
  const seen = new Set<string>();
  const out: QuestionOption[] = [];
  let ok = true;
  raw.forEach((o, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord(o)) {
      into.add(`${p}: must be an object with a label (got ${show(o)})`);
      ok = false;
      return;
    }
    const label = own(o, 'label');
    if (typeof label !== 'string') {
      into.add(`${p}.label: must be a string (got ${show(label)})`);
      ok = false;
      return;
    }
    if (label.trim() === '') {
      into.add(`${p}.label: is blank`);
      ok = false;
      return;
    }
    if (seen.has(label)) {
      into.add(`${p}.label: ${show(label)} is used twice (an answer is recorded by label)`);
      ok = false;
      return;
    }
    seen.add(label);
    const option: QuestionOption = { label };
    for (const k of ['description', 'preview'] as const) {
      const v = own(o, k);
      if (v === undefined) continue;
      if (typeof v !== 'string') {
        into.add(`${p}.${k}: must be a string (got ${show(v)})`);
        ok = false;
        continue;
      }
      option[k] = v;
    }
    out.push(option);
  });
  return ok ? out : undefined;
}

function readQuestion(raw: unknown, index: number, seenIds: Set<string>, into: Collector, guidance: string[]): Question | undefined {
  const path = `questions[${index}]`;
  if (!isRecord(raw)) {
    into.add(`${path}: must be an object (got ${show(raw)})`);
    return undefined;
  }
  const before = into.count;

  const str = (key: string): string | undefined => {
    const v = own(raw, key);
    if (typeof v !== 'string') {
      into.add(`${path}.${key}: must be a string (got ${show(v)})`);
      return undefined;
    }
    if (v.trim() === '') {
      into.add(`${path}.${key}: is blank`);
      return undefined;
    }
    return v;
  };
  const optStr = (key: string): string | undefined => {
    const v = own(raw, key);
    if (v === undefined) return undefined;
    if (typeof v !== 'string') {
      into.add(`${path}.${key}: must be a string (got ${show(v)})`);
      return undefined;
    }
    return v;
  };
  const optBool = (key: string): boolean | undefined => {
    const v = own(raw, key);
    if (v === undefined) return undefined;
    if (typeof v !== 'boolean') {
      into.add(`${path}.${key}: must be true or false (got ${show(v)})`);
      return undefined;
    }
    return v;
  };

  const header = str('header');
  const question = str('question');

  let kind: QuestionKind | undefined;
  const rawKind = own(raw, 'kind');
  if (typeof rawKind !== 'string') {
    into.add(`${path}.kind: must be one of ${QUESTION_KINDS.join(', ')} (got ${show(rawKind)})`);
  } else if (!(QUESTION_KINDS as readonly string[]).includes(rawKind)) {
    into.add(`${path}.kind: unknown kind ${show(rawKind)}; use one of ${QUESTION_KINDS.join(', ')}`);
  } else {
    kind = rawKind as QuestionKind;
  }

  let id = `q${index}`;
  const rawId = own(raw, 'id');
  if (rawId !== undefined) {
    if (typeof rawId !== 'string' || rawId.trim() === '') into.add(`${path}.id: must be a non-blank string (got ${show(rawId)})`);
    else id = rawId;
  }
  if (seenIds.has(id)) into.add(`${path}.id: ${show(id)} is used twice`);
  seenIds.add(id);

  const multiSelect = optBool('multiSelect');
  const placeholder = optStr('placeholder');
  const requiredFlag = optBool('required');

  const rawOptions = own(raw, 'options');
  let options: QuestionOption[] | undefined;
  if (rawOptions !== undefined && (kind === 'choice' || kind === 'tasks' || kind === 'confirm')) {
    options = readOptions(rawOptions, `${path}.options`, into);
  }

  let fields: Record<string, unknown> | undefined;
  const rawFields = own(raw, 'fields');
  if (kind === 'form') {
    if (rawFields === undefined) {
      into.add(`${path} (kind "form") needs fields, a JSON Schema object describing what to collect`);
    } else if (!isRecord(rawFields)) {
      into.add(`${path}.fields: must be an object (got ${show(rawFields)})`);
    } else {
      try {
        fields = cloneJson(rawFields, 0) as Record<string, unknown>;
      } catch (e) {
        into.add(`${path}.fields: cannot be used (${e instanceof FieldsError ? e.message : 'unreadable'}); send plain JSON`);
      }
    }
  }

  if (kind === 'choice' || kind === 'tasks') {
    if (rawOptions === undefined || (Array.isArray(rawOptions) && rawOptions.length === 0)) {
      into.add(`${path} (kind "${kind}") needs options`);
    } else if (options) {
      const limits = kind === 'choice' ? CHOICE_OPTIONS : TASK_OPTIONS;
      if (options.length < limits.min || options.length > limits.max) {
        guidance.push(`${path} has ${options.length} options (guidance for ${kind}: ${limits.min} to ${limits.max})`);
      }
    }
  } else if (kind === 'confirm' && options && options.length !== 2) {
    into.add(`${path}.options: a confirm takes exactly two labels (approve, then deny), got ${options.length}`);
  }

  // Keys that do nothing for this kind: kept out of the result, and said once.
  if (kind !== undefined) {
    const ignored: string[] = [];
    if (rawOptions !== undefined && kind !== 'choice' && kind !== 'tasks' && kind !== 'confirm') ignored.push('options');
    if (multiSelect !== undefined && kind !== 'choice') ignored.push('multiSelect');
    if (placeholder !== undefined && kind !== 'text') ignored.push('placeholder');
    if (rawFields !== undefined && kind !== 'form') ignored.push('fields');
    if (ignored.length > 0) guidance.push(`${path} sets ${ignored.join(', ')}, which does nothing for kind "${kind}"`);
  }

  if (typeof header === 'string' && header.length > MAX_HEADER) {
    guidance.push(`${path}.header is ${header.length} characters (guidance: at most ${MAX_HEADER})`);
  }

  if (into.count > before || header === undefined || question === undefined || kind === undefined) return undefined;

  const out: Question = { id, header, question, kind, required: requiredFlag ?? true };
  if (kind === 'choice' && multiSelect !== undefined) out.multiSelect = multiSelect;
  if (options) out.options = options;
  if (kind === 'text' && placeholder !== undefined) out.placeholder = placeholder;
  if (fields) out.fields = fields;
  return out;
}

/**
 * Read a model's tool call as a set of questions.
 *
 * - `null`: not the question tool, so the caller carries on (the same convention as `cardFromToolCall`).
 * - `{ error }`: the call cannot be rendered or answered. One bounded sentence written for the MODEL;
 *   hand it back with `applyToolFailure` so it retries. Never thrown.
 * - `{ id, questions }`: normalised (ids defaulted to `q<index>`, `required` to true), rebuilt field by
 *   field. Anything over the schema's guidance is KEPT and reported once with `console.warn`.
 *
 * @param opts.id the provider's `tool_call_id`, which becomes `QuestionSet.id`
 */
export function questionsFromToolCall(name: string, input: unknown, opts: { id: string }): QuestionSet | { error: string } | null {
  if (name !== ASK_TOOL_NAME) return null;
  const id = isRecord(opts) ? opts.id : undefined;
  if (typeof id !== 'string' || id === '') {
    return { error: 'kai_ask could not be read: the host did not pass the tool call id (questionsFromToolCall(name, input, { id }))' };
  }
  try {
    if (!isRecord(input)) {
      return { error: `kai_ask input is invalid: expected an object with a questions array, got ${show(input)}. Send { questions: [{ header, question, kind }] }.` };
    }
    const raw = own(input, 'questions');
    if (!Array.isArray(raw)) {
      return { error: `kai_ask input is invalid: questions must be an array (got ${show(raw)}). Send { questions: [{ header, question, kind }] }.` };
    }
    if (raw.length === 0) {
      return { error: 'kai_ask input is invalid: send at least one question. Send { questions: [{ header, question, kind }] }.' };
    }

    const into = new Collector();
    const guidance: string[] = [];
    const seen = new Set<string>();
    const questions: Question[] = [];
    for (let i = 0; i < raw.length; i++) {
      const q = readQuestion(raw[i], i, seen, into, guidance);
      if (q) questions.push(q);
    }
    if (into.count > 0) {
      return {
        error:
          `kai_ask input is invalid: ${into.summary()}. ` +
          `Send the questions again: each is { header, question, kind } with kind one of ${QUESTION_KINDS.join(', ')}; choice and tasks need options, form needs fields.`,
      };
    }

    if (raw.length > MAX_QUESTIONS) guidance.push(`${raw.length} questions (guidance: at most ${MAX_QUESTIONS})`);
    if (guidance.length > 0) {
      const shown = guidance.slice(0, MAX_ISSUES);
      const more = guidance.length - shown.length;
      console.warn(
        `kai_ask (call ${show(id)}) is outside the schema's guidance; all of it is kept and shown: ${shown.join('; ')}${more > 0 ? `; and ${more} more` : ''}.`,
      );
    }
    return { id, questions };
  } catch (e) {
    // A value JS can hold and JSON cannot (a getter that throws, a hostile Proxy).
    return { error: `kai_ask input could not be read (${e instanceof Error ? e.message.slice(0, MAX_ECHO) : 'unreadable'}). Send plain JSON: { questions: [{ header, question, kind }] }.` };
  }
}
