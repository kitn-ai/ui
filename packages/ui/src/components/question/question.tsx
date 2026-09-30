import { type JSX, For, Show, createMemo, createSignal, createUniqueId } from 'solid-js';
import { Terminal } from 'lucide-solid';
import { Textarea } from '../textarea/textarea';
import { FIELD_BASE } from '../input/input';
import { cn } from '../../utils/cn';
import { OtherAnswer } from './other-answer';
import { QuestionOptionRow } from './question-option';
import { QuestionFormFields } from './question-form-fields';
import {
  type AnswerDraft, type PanelQuestion, TEXT_LIMITS, allowsOther, clampPreview, confirmDetail, isMulti, optionsOf, rowCount, showText,
} from './question-state';

/** What the panel may ask of the question on screen. */
export interface QuestionBodyApi {
  /** Pick the numbered row (0-based). Returns false when the question has no such row. */
  pick: (row: number) => boolean;
  /** Put focus on the question's first control: the tab-stop option, the textarea, or the first field. */
  focus: () => void;
}

export interface QuestionBodyProps {
  question: PanelQuestion;
  draft: AnswerDraft;
  onDraft: (next: AnswerDraft) => void;
  /** The user finished the question: a single-select pick or Enter in a textarea. */
  onAdvance: (via: 'pick' | 'enter') => void;
  apiRef?: (api: QuestionBodyApi) => void;
  /** Extra classes for the preview and form wells (the surface the panel sits on decides the tone). */
  wellClass?: string;
}

/**
 * One question's body: its text, then the answer control for its kind. Every string it renders (the
 * question, labels, descriptions, previews, the confirm detail) is MODEL OUTPUT and is a text node.
 */
export function QuestionBody(props: QuestionBodyProps): JSX.Element {
  const uid = createUniqueId();
  const q = () => props.question;
  const qid = `${uid}-q`;
  let root!: HTMLDivElement;

  // Memos, not plain functions: a change to the question's TEXT must not re-run what only depends on its
  // SHAPE, or the rows (and the focused input in one) are rebuilt and the user loses their place.
  const options = createMemo(() => optionsOf(q()));
  const other = createMemo(() => allowsOther(q()));
  const multi = createMemo(() => isMulti(q()));
  const count = createMemo(() => rowCount(q()));
  const detail = createMemo(() => confirmDetail(q()));
  const isOtherRow = (i: number) => other() && i === options().length;

  const [pointed, setPointed] = createSignal<number | undefined>(undefined);
  const selectedRow = () => {
    const d = props.draft;
    const i = options().findIndex((o) => d.selected.includes(o.label));
    return i >= 0 ? i : d.otherOn && other() ? options().length : -1;
  };
  const cursor = () => Math.min(pointed() ?? Math.max(selectedRow(), 0), Math.max(count() - 1, 0));
  const hasPreview = () => q().kind !== 'confirm' && options().some((o) => o.preview !== undefined && o.preview !== '');
  const previewRow = () => pointed() ?? Math.max(selectedRow(), 0);

  const rowInput = (i: number) => root.querySelector<HTMLElement>(`[data-option-row="${i}"] [data-option-input]`);
  const focusOther = () => requestAnimationFrame(() => root.querySelector<HTMLTextAreaElement>('textarea[data-other]')?.focus());

  const setSingle = (i: number) => {
    const d = props.draft;
    if (isOtherRow(i)) props.onDraft({ ...d, selected: [], otherOn: true });
    else props.onDraft({ ...d, selected: [options()[i].label], otherOn: false });
  };

  const pick = (i: number, opts: { advance: boolean } = { advance: true }): boolean => {
    if (i < 0 || i >= count()) return false;
    const d = props.draft;
    if (multi()) {
      if (isOtherRow(i)) {
        const on = !d.otherOn;
        props.onDraft({ ...d, otherOn: on });
        if (on) focusOther();
      } else {
        const label = options()[i].label;
        const selected = d.selected.includes(label) ? d.selected.filter((l) => l !== label) : [...d.selected, label];
        props.onDraft({ ...d, selected });
      }
      return true;
    }
    setSingle(i);
    if (isOtherRow(i)) focusOther();
    else if (opts.advance) props.onAdvance('pick');
    return true;
  };

  const move = (from: number, to: number | 'first' | 'last') => {
    const last = count() - 1;
    const target = to === 'first' ? 0 : to === 'last' ? last : Math.max(0, Math.min(last, from + to));
    setPointed(target);
    rowInput(target)?.focus();
    // The ARIA radio pattern: an arrow selects as it moves, but never advances the question.
    if (!multi() && target !== from) pick(target, { advance: false });
  };

  const focus = () => {
    const el = root.querySelector<HTMLElement>('[data-option-input][tabindex="0"], textarea, input, select, button');
    el?.focus();
  };
  props.apiRef?.({ pick: (row) => pick(row), focus });

  const rows = () => Array.from({ length: count() }, (_, i) => i);
  const previewLabel = () => (isOtherRow(previewRow()) ? 'Other' : showText(options()[previewRow()]?.label ?? '', TEXT_LIMITS.tip));

  return (
    <div ref={root} class="flex flex-col gap-2" data-question-body={q().id}>
      <p id={qid} dir="auto" class="px-1 text-body font-medium leading-snug text-foreground break-words [unicode-bidi:isolate]">{showText(q().question, TEXT_LIMITS.question)}</p>

      <Show when={detail()}>
        <div
          data-confirm-detail=""
          dir="auto"
          tabIndex={0}
          role="region"
          aria-label="What you are approving"
          class={cn(
            'mx-1 flex max-h-40 items-start gap-2 overflow-auto rounded-lg border border-border px-3 py-2 font-mono text-meta text-foreground [unicode-bidi:isolate] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            props.wellClass ?? 'bg-background',
          )}
        >
          <Terminal class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="min-w-0 whitespace-pre-wrap break-all">{showText(detail()!)}</span>
        </div>
      </Show>

      <Show when={q().kind === 'choice' || q().kind === 'confirm' || q().kind === 'tasks'}>
        <div class={cn('grid gap-3', hasPreview() && '@xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
          <div
            role={multi() ? 'group' : 'radiogroup'}
            aria-labelledby={qid}
            class="flex min-w-0 flex-col"
            data-option-group=""
          >
            <For each={rows()}>{(i) => (
              <QuestionOptionRow
                index={i}
                label={isOtherRow(i) ? 'Other' : showText(options()[i]?.label ?? '', TEXT_LIMITS.label)}
                description={isOtherRow(i) ? undefined : showText(options()[i]?.description ?? '', TEXT_LIMITS.description) || undefined}
                multi={multi()}
                task={q().kind === 'tasks'}
                name={`${uid}-group`}
                checked={isOtherRow(i) ? props.draft.otherOn : props.draft.selected.includes(options()[i]?.label ?? '')}
                tabbable={i === cursor()}
                onPick={() => pick(i)}
                onFocusRow={() => setPointed(i)}
                onMove={(delta) => move(i, delta)}
              >
                <Show when={isOtherRow(i) && props.draft.otherOn}>
                  <div class="pl-[calc(1.25rem+0.75rem)]">
                    <OtherAnswer
                      dataOther={q().id}
                      question={q().question}
                      placeholder={q().placeholder}
                      value={props.draft.other}
                      onInput={(other) => props.onDraft({ ...props.draft, otherOn: true, other })}
                      onEnter={() => props.onAdvance('enter')}
                    />
                  </div>
                </Show>
              </QuestionOptionRow>
            )}</For>
          </div>
          <Show when={hasPreview()}>
            <div class="flex min-w-0 flex-col gap-1">
              <span dir="auto" title={previewLabel()} class="block truncate px-1 text-meta text-muted-foreground [unicode-bidi:isolate]">Preview of {previewLabel()}</span>
              <pre
                tabIndex={0}
                role="region"
                aria-label={`Preview of ${previewLabel()}`}
                dir="auto"
                data-preview=""
                class={cn(
                  'max-h-56 flex-1 overflow-auto whitespace-pre-wrap break-words [unicode-bidi:isolate] rounded-lg border border-border px-3 py-2.5 font-mono text-meta leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  props.wellClass ?? 'bg-background',
                )}
              >{isOtherRow(previewRow()) ? 'Your own answer has no preview.' : showText(clampPreview(options()[previewRow()]?.preview ?? ''))}</pre>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={q().kind === 'text'}>
        <div class="px-1">
          <Textarea
            aria-labelledby={qid}
            placeholder={q().placeholder}
            minHeight={64}
            maxHeight={160}
            value={props.draft.text}
            onInput={(e) => props.onDraft({ ...props.draft, text: e.currentTarget.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); props.onAdvance('enter'); }
            }}
            class={cn(FIELD_BASE, 'resize-none bg-background text-body')}
          />
        </div>
      </Show>

      <Show when={q().kind === 'form'}>
        <QuestionFormFields
          fields={q().fields}
          values={props.draft.values}
          scope={q().id}
          onValues={(values) => props.onDraft({ ...props.draft, values })}
        />
      </Show>
    </div>
  );
}
