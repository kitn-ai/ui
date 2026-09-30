// Turning what a page hands the panel into `PanelQuestion[]`: the `questions` property, or the app's own
// `<kai-question>` children. Both go through ONE normaliser, so the two shapes cannot drift, and every
// string is copied as a string: nothing here interprets model output.
import type { PanelQuestion } from '../../components/question/question-state';
import type { QuestionKind, QuestionOption } from '../../primitives/questions';

const KINDS: readonly string[] = ['choice', 'confirm', 'tasks', 'text', 'form'];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);

export type WarnOnce = (key: string, message: string) => void;

/** A flag that defaults to ON: an explicit `false` (property or `="false"` attribute) turns it off. */
export function flagDefaultTrue(value: unknown, attribute: string | null): boolean {
  if (value === false) return false;
  if (value === true) return true;
  return attribute !== 'false';
}

/** A flag that defaults to OFF: `true`, or the attribute present and not `="false"`. */
export function flagDefaultFalse(value: unknown, attribute: string | null): boolean {
  if (value === true) return true;
  if (value === false) return false;
  return attribute !== null && attribute !== 'false';
}

function normalizeOptions(raw: unknown): QuestionOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: QuestionOption[] = [];
  for (const o of raw) {
    const rec = isRecord(o) ? o : typeof o === 'string' ? { label: o } : undefined;
    const label = str(rec?.label);
    if (label === undefined) continue;
    const opt: QuestionOption = { label };
    const description = str(rec!.description);
    const preview = str(rec!.preview);
    if (description !== undefined) opt.description = description;
    if (preview !== undefined) opt.preview = preview;
    out.push(opt);
  }
  return out;
}

/** One raw question to a PanelQuestion, or undefined (and a warning) when it cannot be drawn. */
export function normalizeQuestion(raw: unknown, index: number, warn: WarnOnce): PanelQuestion | undefined {
  if (!isRecord(raw)) {
    warn(`q${index}:shape`, `<kai-question-panel>: question ${index} is not an object, so it is not shown.`);
    return undefined;
  }
  const kind = str(raw.kind) ?? 'choice';
  if (!KINDS.includes(kind)) {
    warn(`q${index}:kind`, `<kai-question-panel>: question ${index} has an unknown kind, so it is not shown. Use one of: ${KINDS.join(', ')}.`);
    return undefined;
  }
  const q: PanelQuestion = {
    id: str(raw.id) ?? str(raw.questionId) ?? `q${index}`,
    header: str(raw.header) ?? '',
    question: str(raw.question) ?? '',
    kind: kind as QuestionKind,
    required: raw.required !== false,
  };
  if (raw.multiSelect === true) q.multiSelect = true;
  const options = normalizeOptions(raw.options);
  if (options) q.options = options;
  const placeholder = str(raw.placeholder);
  if (placeholder !== undefined) q.placeholder = placeholder;
  if (isRecord(raw.fields)) q.fields = raw.fields;
  if (raw.allowOther === false) q.allowOther = false;
  return q;
}

export function normalizeQuestions(raw: unknown, warn: WarnOnce): PanelQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: PanelQuestion[] = [];
  raw.forEach((r, i) => {
    const q = normalizeQuestion(r, i, warn);
    if (q) out.push(q);
  });
  return out;
}

const prop = (el: Element, name: string): unknown => (el as unknown as Record<string, unknown>)[name];
const attr = (el: Element, name: string): string | null => el.getAttribute(name);
const text = (el: Element, name: string, attribute: string): string | undefined => str(prop(el, name)) ?? attr(el, attribute) ?? undefined;

/** The `<kai-question-option>` children of a question host, as options. */
function readOptionChildren(host: Element): QuestionOption[] | undefined {
  const rows = [...host.children].filter((c) => c.localName === 'kai-question-option');
  if (rows.length === 0) return undefined;
  return rows.map((row) => {
    const opt: QuestionOption = { label: text(row, 'label', 'label') ?? row.textContent?.trim() ?? '' };
    const description = text(row, 'description', 'description');
    const preview = text(row, 'preview', 'preview');
    if (description !== undefined) opt.description = description;
    if (preview !== undefined) opt.preview = preview;
    return opt;
  });
}

/** The panel's `<kai-question>` children, read as the same raw records the data mode takes. */
export function readQuestionChildren(host: Element, warn: WarnOnce): PanelQuestion[] {
  const hosts = [...host.children].filter((c) => c.localName === 'kai-question');
  const raws = hosts.map((el) => ({
    questionId: text(el, 'questionId', 'question-id'),
    header: text(el, 'header', 'header'),
    question: text(el, 'question', 'question'),
    kind: text(el, 'kind', 'kind'),
    multiSelect: flagDefaultFalse(prop(el, 'multiSelect'), attr(el, 'multi-select')),
    placeholder: text(el, 'placeholder', 'placeholder'),
    required: flagDefaultTrue(prop(el, 'required'), attr(el, 'required')),
    allowOther: flagDefaultTrue(prop(el, 'allowOther'), attr(el, 'allow-other')),
    fields: prop(el, 'fields'),
    options: readOptionChildren(el),
  }));
  return normalizeQuestions(raws, warn);
}
