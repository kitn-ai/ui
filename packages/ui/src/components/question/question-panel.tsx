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
  isAnswered, isOneClick, missingQuestions, TEXT_LIMITS, showText, clampText,
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
 * Escape inside the panel is the dismiss control ("Let's chat"): it fires the same dismiss event with
 * the partial answers and does not settle the call.
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

  // Where focus was, as a selector that names the EQUIVALENT element after a rebuild. Content changes
  // keep the rows' identity (see QuestionBody), so this only matters when an id or the shape changed.
  let lastFocus: string | undefined;
  const describeFocus = (t: EventTarget | null): string | undefined => {
    const el = t as HTMLElement | null;
    if (!el?.closest) return undefined;
    const tab = el.closest<HTMLElement>('[data-tab]');
    if (tab) return `[data-tab="${tab.dataset.tab}"]`;
    if (el.matches('textarea[data-other]')) return 'textarea[data-other]';
    const row = el.closest<HTMLElement>('[data-option-row]');
    if (row && el.matches('[data-option-input]')) return `[data-option-row="${row.dataset.optionRow}"] [data-option-input]`;
    const edit = el.closest<HTMLElement>('[data-review-edit]');
    if (edit) return `[data-review-edit="${edit.dataset.reviewEdit}"]`;
    if (el.matches('[data-question-body] textarea')) return '[data-question-body] textarea';
    return undefined;
  };
  const onFocusIn = (e: FocusEvent) => { lastFocus = describeFocus(e.target); };
  const onFocusOut = (e: FocusEvent) => {
    const t = e.target as Node;
    // A real blur clears it; an element that was REMOVED while focused is still disconnected a tick later.
    // The microtask can run AFTER the next focusin (a programmatic focus() inside a handler), so it also
    // checks that focus is really outside the panel now.
    queueMicrotask(() => {
      const active = (root.getRootNode() as Document | ShadowRoot).activeElement;
      if (t.isConnected && !(active && root.contains(active))) lastFocus = undefined;
    });
  };
  createEffect(on(() => props.questions, () => {
    const sel = lastFocus;
    if (!sel || !root) return;
    const scope = root.getRootNode() as Document | ShadowRoot;
    if (scope.activeElement && root.contains(scope.activeElement)) return;
    if (scope.activeElement && scope.activeElement !== document.body) return; // focus went somewhere else on purpose
    const target = root.querySelector<HTMLElement>(sel);
    if (target) target.focus();
    else body?.focus();
  }, { defer: true }));

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
    if (e.key === 'Escape' && !e.isComposing && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      dismiss();
      return;
    }
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !/^[1-9]$/.test(e.key)) return;
    // Never steal a digit from a field the user is typing into.
    if ((e.target as HTMLElement).closest?.('textarea,[contenteditable],input:not([type="radio"]):not([type="checkbox"]),select')) return;
    if (body?.pick(Number(e.key) - 1)) e.preventDefault();
  };

  // --- tabs ---
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;
  // Tabs are keyed by INDEX and read their label and check reactively, so editing a header or ticking an
  // answer updates the tab in place instead of rebuilding it (and dropping focus from it).
  const tabIndexes = createMemo(() => Array.from({ length: steps() }, (_, i) => i), [], {
    equals: (a, b) => a.length === b.length,
  });
  const tabLabel = (i: number) => (i < n() ? showText(qs()[i]?.header ?? '', TEXT_LIMITS.header) : 'Review');
  const tabTip = (i: number) => (i < n() ? showText(qs()[i]?.header ?? '', TEXT_LIMITS.tip) : 'Review');
  const tabAnswered = (i: number) => i < n() && isAnswered(qs()[i], drafts()[qs()[i]?.id]);
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
              <span dir="auto" class="truncate text-meta text-muted-foreground [unicode-bidi:isolate]" title={showText(q.question, TEXT_LIMITS.tip)}>{showText(q.header, TEXT_LIMITS.header)}</span>
              <span dir="auto" class={cn('line-clamp-3 min-w-0 whitespace-pre-line break-words text-body [unicode-bidi:isolate]', text() ? 'text-foreground' : 'text-warning')}>
                {text() !== undefined ? showText(text()!, TEXT_LIMITS.answer) : 'Not answered'}
              </span>
              <button
                type="button"
                data-review-edit={i()}
                aria-label={`${text() ? 'Edit' : 'Answer'}: ${clampText(q.header, 80)}`}
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
        ref={(el) => {
          root = el;
          // Native listeners, not Solid's delegated onFocusIn: focus moves made from script inside a key
          // handler are not reliably seen through delegation, and this record must not miss one.
          el.addEventListener('focusin', onFocusIn);
          el.addEventListener('focusout', onFocusOut);
        }}
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
              <For each={tabIndexes()}>{(i) => (
                <button
                  type="button"
                  role="tab"
                  id={tabId(i)}
                  data-tab={i}
                  aria-selected={idx() === i}
                  aria-controls={panelId}
                  tabindex={idx() === i ? 0 : -1}
                  title={tabTip(i)}
                  onClick={() => go(i)}
                  class={cn(
                    'inline-flex h-7 max-w-40 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    idx() === i ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Show when={tabAnswered(i)}>
                    <Check class="size-3 shrink-0 text-success" aria-hidden="true" />
                  </Show>
                  <span dir="auto" class="truncate [unicode-bidi:isolate]">{tabLabel(i)}</span>
                  <Show when={tabAnswered(i)}><span class="sr-only">(answered)</span></Show>
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
          // Bounded, so a huge question can never push the tabs and the footer out of reach. It is a scroll
          // region, so it is focusable (keyboard scrolling), and the small negative margin keeps the option
          // rows' focus ring inside the clip.
          tabindex="0"
          class="col-span-3 row-start-2 -mx-1 min-w-0 max-h-[min(26rem,55vh)] overflow-y-auto overscroll-contain px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <Show when={idx() > 0}>
            <Button type="button" size="sm" variant="outline" class={OUTLINE} onClick={() => go(idx() - 1)}>Back</Button>
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
