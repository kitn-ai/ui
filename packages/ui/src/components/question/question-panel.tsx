import {
  type JSX, For, Show, createEffect, createMemo, createSignal, createUniqueId, on, onMount, untrack,
} from 'solid-js';
import { Check } from 'lucide-solid';
import { Button } from '../button/button';
import { cn } from '../../utils/cn';
import type { Answer, AskResult } from '../../primitives/questions';
import { QuestionBody, type QuestionBodyApi } from './question';
import {
  type AnswerDraft, type Drafts, type PanelQuestion, answerLine, answersFromDrafts, draftsFromAnswers, emptyDraft,
  isAnswered, isOneClick, missingQuestions,
} from './question-state';

/** The imperative surface the element forwards onto its host. */
export interface QuestionPanelController {
  next: () => void;
  back: () => void;
  /** Go to a step by index; `questions.length` is the Review step when there are two or more questions. */
  select: (index: number) => void;
  submit: () => void;
  /** Focus the active step's first control. The host calls it on Reopen. */
  focus: () => void;
}

export interface QuestionPanelProps {
  questions: PanelQuestion[];
  /** The provider's tool call id, echoed on submit and dismiss so the host can settle the right call. */
  toolCallId?: string;
  /** Controlled answers. Omit to let the panel keep its own, seeded from `defaultValue`. */
  value?: Answer[];
  defaultValue?: Answer[];
  onValueChange?: (answers: Answer[]) => void;
  /** Controlled step index (`questions.length` is Review). */
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveChange?: (detail: { index: number; questionId?: string }) => void;
  /** The dismiss control's text. Default "Let's chat". */
  dismissLabel?: string;
  /** The final action's text. Default "Submit". */
  submitLabel?: string;
  /** Accessible name of the panel and its tab list. */
  label?: string;
  /** Replaces the dismiss control. A click anywhere in it dismisses. */
  dismiss?: JSX.Element;
  onSubmit?: (detail: { toolCallId?: string; result: AskResult }) => void;
  onDismiss?: (detail: { toolCallId?: string; answers: Answer[] }) => void;
  /** Move focus into the panel when it mounts. Default true. */
  focusOnOpen?: boolean;
  controllerRef?: (c: QuestionPanelController) => void;
  class?: string;
}

// The kit's `outline` button variant is a soft `bg-muted/50` fill with NO border. The owner asked for
// a real outline, so the panel draws the border itself instead of restyling every outline button.
const OUTLINE = 'border border-input bg-transparent hover:bg-hover';
const fingerprint = (answers: Answer[] | undefined): string => JSON.stringify(answers ?? []);

/**
 * The question panel: it stands in the composer's place while a model's questions are open.
 * Segmented tabs (one per question, plus Review from two questions), Back and Next, numbered option
 * rows with an "Other" last row, and one Submit. Every string in `questions` is MODEL OUTPUT and is
 * rendered as text.
 *
 * Keyboard: number keys pick while focus is inside the panel (never inside a text field), arrows move
 * between tabs and between options, Enter in the Other textarea advances, Shift+Enter is a newline.
 * There is no Escape binding: the way out is the dismiss control, which does not settle the call.
 */
export function QuestionPanel(props: QuestionPanelProps): JSX.Element {
  const uid = createUniqueId();
  const qs = () => props.questions ?? [];
  const n = () => qs().length;
  const hasReview = () => n() >= 2;
  const steps = () => n() + (hasReview() ? 1 : 0);
  const oneClick = createMemo(() => isOneClick(qs()));

  const [drafts, setDrafts] = createSignal<Drafts>(draftsFromAnswers(qs(), props.value ?? props.defaultValue));
  const [innerIdx, setInnerIdx] = createSignal(props.defaultActiveIndex ?? 0);
  const idx = () => Math.max(0, Math.min(Math.max(steps() - 1, 0), props.activeIndex ?? innerIdx()));
  const onReview = () => hasReview() && idx() === n();
  const active = (): PanelQuestion | undefined => (onReview() ? undefined : qs()[idx()]);

  // A controlled `value` wins, but re-seeding on every echo would throw away UI-only state (an Other
  // row that is on with nothing typed yet), so it only re-seeds when it really differs from the drafts.
  createEffect(on(() => props.value, (v) => {
    if (v === undefined) return;
    if (fingerprint(v) !== fingerprint(untrack(() => answersFromDrafts(qs(), drafts())))) setDrafts(draftsFromAnswers(qs(), v));
  }, { defer: true }));
  // A different call is a different set of answers, even if the ids (`q0`, `q1`) repeat.
  createEffect(on(() => props.toolCallId, () => {
    setDrafts(draftsFromAnswers(qs(), props.value ?? props.defaultValue));
    setInnerIdx(props.defaultActiveIndex ?? 0);
  }, { defer: true }));

  const answers = () => answersFromDrafts(qs(), drafts());
  const missing = createMemo(() => missingQuestions(qs(), drafts()));
  const draftOf = (q: PanelQuestion): AnswerDraft => drafts()[q.id] ?? emptyDraft();

  const setDraft = (q: PanelQuestion, d: AnswerDraft) => {
    setDrafts({ ...drafts(), [q.id]: d });
    props.onValueChange?.(answers());
  };

  let root!: HTMLDivElement;
  let body: QuestionBodyApi | undefined;

  const focusActive = () => requestAnimationFrame(() => {
    if (onReview()) root.querySelector<HTMLElement>('[role="tabpanel"] button:not([disabled])')?.focus();
    else body?.focus();
  });
  const focusTab = (i: number) => requestAnimationFrame(() => root.querySelector<HTMLElement>(`[data-tab="${i}"]`)?.focus());

  const go = (to: number, opts: { focus?: 'body' | 'tab' } = {}) => {
    const next = Math.max(0, Math.min(steps() - 1, to));
    if (next !== idx()) {
      setInnerIdx(next);
      props.onActiveChange?.({ index: next, questionId: qs()[next]?.id });
    }
    if (opts.focus === 'body') focusActive();
    else if (opts.focus === 'tab') focusTab(next);
  };

  const canSubmit = () => missing().length === 0;
  const submit = () => {
    if (!canSubmit()) return;
    props.onSubmit?.({ toolCallId: props.toolCallId, result: { status: 'answered', answers: answers() } });
  };
  const dismiss = () => props.onDismiss?.({ toolCallId: props.toolCallId, answers: answers() });

  const advance = (via: 'pick' | 'enter') => {
    if (oneClick() && via === 'pick') return submit();
    if (idx() < steps() - 1) go(idx() + 1, { focus: 'body' });
    else if (via === 'enter') submit();
  };

  props.controllerRef?.({
    next: () => go(idx() + 1),
    back: () => go(idx() - 1),
    select: (i) => go(i),
    submit,
    focus: focusActive,
  });

  onMount(() => {
    if (props.focusOnOpen !== false) focusActive();
  });

  const onPanelKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !/^[1-9]$/.test(e.key)) return;
    // Never steal a digit from a field the user is typing into.
    if ((e.target as HTMLElement).closest?.('textarea,[contenteditable],input:not([type="radio"]):not([type="checkbox"]),select')) return;
    if (body?.pick(Number(e.key) - 1)) e.preventDefault();
  };

  // --- tabs ---
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;
  const tabs = createMemo(() => [
    ...qs().map((q, i) => ({ i, label: q.header, title: q.header, answered: isAnswered(q, drafts()[q.id]) })),
    ...(hasReview() ? [{ i: n(), label: 'Review', title: 'Review', answered: false }] : []),
  ]);
  const onTabKey = (e: KeyboardEvent) => {
    const last = steps() - 1;
    const to = e.key === 'ArrowRight' ? (idx() + 1) % (last + 1)
      : e.key === 'ArrowLeft' ? (idx() - 1 + last + 1) % (last + 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : undefined;
    if (to === undefined) return;
    e.preventDefault();
    go(to, { focus: 'tab' });
  };

  const bodyKey = () => (onReview() ? 'review' : active() ? `${idx()}:${active()!.id}` : undefined);

  const lastStep = () => idx() === steps() - 1;
  const showSubmit = () => lastStep() && (!oneClick() || draftOf(qs()[0]).otherOn);

  const statusText = () => {
    const q = active();
    if (q?.kind === 'tasks') return `${draftOf(q).selected.length} of ${q.options?.length ?? 0} ticked`;
    // The reason a visible Submit is disabled. A lone confirm has no Submit to explain.
    if (idx() === steps() - 1 && missing().length > 0 && showSubmit()) {
      const c = missing().length;
      return `${c} question${c === 1 ? '' : 's'} still ${c === 1 ? 'needs' : 'need'} an answer`;
    }
    if (onReview()) return 'Ready to send';
    return undefined;
  };

  const ReviewBody = (): JSX.Element => (
    <div class="flex flex-col gap-2">
      <p id={`${uid}-review`} class="px-1 text-body font-medium leading-snug text-foreground">Review your answers</p>
      <ul aria-labelledby={`${uid}-review`} class="mx-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
        <For each={qs()}>{(q, i) => {
          const text = () => answerLine(q, drafts()[q.id]);
          return (
            <li class="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-2 @md:grid-cols-[6rem_minmax(0,1fr)_auto]">
              <span class="truncate text-meta text-muted-foreground" title={q.question}>{q.header}</span>
              <span class={cn('line-clamp-3 min-w-0 whitespace-pre-line break-words text-body', text() ? 'text-foreground' : 'text-warning')}>
                {text() ?? 'Not answered'}
              </span>
              <button
                type="button"
                data-review-edit={i()}
                aria-label={`${text() ? 'Edit' : 'Answer'}: ${q.header}`}
                onClick={() => go(i(), { focus: 'body' })}
                class="rounded-md px-1 text-meta text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >{text() ? 'Edit' : 'Answer'}</button>
            </li>
          );
        }}</For>
      </ul>
    </div>
  );

  return (
    <div class={cn('@container w-full', props.class)}>
      <div
        ref={root}
        role="group"
        aria-label={props.label ?? 'Questions'}
        data-question-panel=""
        onKeyDown={onPanelKey}
        class="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-3 rounded-composer border border-border bg-surface p-3 text-foreground shadow-xs"
      >
        <div class="col-span-3 row-start-1 min-w-0 overflow-x-auto p-0.5 [scrollbar-width:none] @md:col-span-2">
          <Show when={steps() > 0}>
            <div
              role="tablist"
              aria-label={props.label ?? 'Questions'}
              onKeyDown={onTabKey}
              class="inline-flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5"
            >
              <For each={tabs()}>{(t) => (
                <button
                  type="button"
                  role="tab"
                  id={tabId(t.i)}
                  data-tab={t.i}
                  aria-selected={idx() === t.i}
                  aria-controls={panelId}
                  tabindex={idx() === t.i ? 0 : -1}
                  title={t.title}
                  onClick={() => go(t.i)}
                  class={cn(
                    'inline-flex h-7 max-w-40 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    idx() === t.i ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Show when={t.answered}>
                    <Check class="size-3 shrink-0 text-success" aria-hidden="true" />
                  </Show>
                  <span class="truncate">{t.label}</span>
                  <Show when={t.answered}><span class="sr-only">(answered)</span></Show>
                </button>
              )}</For>
            </div>
          </Show>
        </div>

        <div
          onClick={dismiss}
          data-dismiss=""
          class="col-start-1 row-start-3 flex items-center self-center justify-self-start @md:col-start-3 @md:row-start-1 @md:justify-self-end"
        >
          <Show
            when={props.dismiss}
            fallback={<Button type="button" size="sm" variant="outline" class={OUTLINE}>{props.dismissLabel ?? "Let's chat"}</Button>}
          >
            {props.dismiss}
          </Show>
        </div>

        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={bodyKey() === 'review' || active() ? tabId(idx()) : undefined}
          class="col-span-3 row-start-2 min-w-0"
        >
          <Show when={bodyKey()} keyed fallback={<p class="px-1 text-body text-muted-foreground">There are no questions to answer.</p>}>
            {(key) => key === 'review'
              ? <ReviewBody />
              : (
                <QuestionBody
                  question={active()!}
                  draft={draftOf(active()!)}
                  onDraft={(d) => setDraft(active()!, d)}
                  onAdvance={advance}
                  apiRef={(a) => { body = a; }}
                />
              )}
          </Show>
        </div>

        <span
          aria-live="polite"
          class={cn(
            'col-start-2 row-start-3 min-w-0 self-center px-1 text-meta @md:col-span-2 @md:col-start-1',
            onReview() && missing().length ? 'text-warning' : 'text-muted-foreground',
          )}
        >{statusText()}</span>

        <div class="col-start-3 row-start-3 flex items-center gap-2 self-center justify-self-end">
          <Show when={steps() > 1}>
            <Button type="button" size="sm" variant="outline" class={OUTLINE} disabled={idx() === 0} onClick={() => go(idx() - 1)}>Back</Button>
          </Show>
          <Show when={!lastStep()}>
            <Button type="button" size="sm" variant="default" onClick={() => go(idx() + 1)}>Next</Button>
          </Show>
          <Show when={showSubmit()}>
            <Button type="button" size="sm" variant="default" disabled={!canSubmit()} onClick={submit}>{props.submitLabel ?? 'Submit'}</Button>
          </Show>
        </div>
      </div>
    </div>
  );
}
