import {
  type JSX, type Accessor, splitProps, createSignal, createMemo, createEffect, createUniqueId, onCleanup, For, Show,
} from 'solid-js';
import { Check, ChevronRight, LoaderCircle, TriangleAlert, X } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { CodeBlock, CodeBlockCode } from '../code-block/code-block';
import { Markdown } from '../markdown/markdown';
import { TagRenderer } from '../renderer/tag-renderer';
import { TextShimmer } from '../text-shimmer/text-shimmer';
import { createControllableSignal } from '../../primitives/controllable';
import { createRovingTabList } from '../../primitives/roving-tab-list';
import { observeContentHeight } from '../../primitives/use-resize-observer';
import { resolveRenderer, type RendererMap } from '../../primitives/renderer-registry';
import {
  ACTIVITY_LABELS, formatDuration, interruptedLabel, summarizeActivity, truncateForDisplay, type ActivityStep,
} from '../../primitives/activity';

// Activity: reasoning and tool calls as ONE quiet line, opening to a timeline of steps, each of
// which opens to its arguments and result.
//
// EVERYTHING THAT REACHES THIS FILE FROM A STEP IS MODEL OUTPUT: the label, the tool name, the
// arguments, the result, the error text and the reasoning text. It is rendered as TEXT (a Solid
// text node, a `<pre>`, or the kit's token-rendered markdown) and never as markup, so a
// `<img onerror>` in any of them is visible characters and nothing else.
//
// Two ways in, one set of parts. DATA mode gives `steps` and the component builds every row;
// ITEM mode gives `children` (the `kai-activity-step` elements, or `ActivityStepItem`s) and the
// app renders the rows itself. Data mode is the preset and is built from the same
// `ActivityStepItem`, so the two cannot drift.

export type ActivityStatus = ActivityStep['status'];

/** A run of more steps than this scrolls inside a capped timeline; a shorter one shows every step in full. */
export const LONG_RUN_STEPS = 8;

/** Largest run of characters one Arguments / Result / Error block renders before it clamps. */
export const MAX_VALUE_CHARS = 20_000;

/** The disclosure controller handed to a parent (the `kai-activity` facade) via `controllerRef`. */
export interface ActivityController {
  open: Accessor<boolean>;
  setOpen: (v: boolean) => void;
}

// ── Labels ─────────────────────────────────────────────────────────────────────────────

const labelKey = (s: ActivityStep) => (s.kind === 'reasoning' ? 'reasoning' : s.toolKind ?? 'generic');

/** The text a step's row carries: its own `label`, else the phrase for what it is doing or did. */
export function activityStepLabel(step: ActivityStep): string {
  if (step.label) return step.label;
  const name = step.toolName ? truncateForDisplay(step.toolName) : undefined;
  if (step.status === 'interrupted') return interruptedLabel(1, name);
  const phrases = ACTIVITY_LABELS[labelKey(step)];
  return step.status === 'running' ? phrases.live(name) : phrases.done(1, name);
}

/** The step's duration as text, or `undefined` while it runs or when it carries no timing. */
export function activityStepDuration(step: ActivityStep): string | undefined {
  if (step.startedAt === undefined || step.endedAt === undefined) return undefined;
  return formatDuration(step.endedAt - step.startedAt) || undefined;
}

/**
 * The collapsed line for a run: `summarizeActivity`, plus what FAILED. A failed step is left out of
 * the counted phrases ("Read a file" would claim work that has no result) and named at the end
 * instead: "Thought for 6s · Searched the web · read_file failed".
 */
export function activityLine(steps: ActivityStep[], streaming = false): string {
  if (streaming && steps.some((s) => s.status === 'running')) return summarizeActivity(steps, { streaming: true });
  const failed = steps.filter((s) => s.status === 'error');
  if (failed.length === 0) return summarizeActivity(steps, { streaming });
  const ok = summarizeActivity(steps.filter((s) => s.status !== 'error'));
  const names = [...new Set(failed.map((s) => truncateForDisplay(s.toolName || s.label || 'step')))];
  const what = failed.length === 1 ? `${names[0]} failed` : `${failed.length} steps failed`;
  return ok ? `${ok} · ${what}` : what;
}

// ── Values: arguments, results, errors ────────────────────────────────────────────────

/** JSON for display. Total: a value JSON cannot represent is named, not thrown. */
function toDisplayJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return '[value could not be serialised]';
  }
}

const groupDigits = (n: number) => n.toLocaleString('en-US');

/**
 * One captioned block of model output. Past {@link MAX_VALUE_CHARS} it shows the head, says
 * plainly that it was cut and by how much, and offers "Show all" (decide loudly: the reader can
 * always get the rest). The full text is a plain `<pre>` rather than the highlighter, which would
 * spend seconds tokenising a 50,000-character string.
 */
function ValueBlock(props: { caption: string; text: string; language?: string; plain?: boolean }) {
  const [all, setAll] = createSignal(false);
  const clipped = () => props.text.length > MAX_VALUE_CHARS;
  const head = () => {
    let cut = props.text.slice(0, MAX_VALUE_CHARS);
    const last = cut.charCodeAt(cut.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
    return cut;
  };
  const shown = () => (clipped() && !all() ? head() : props.text);
  return (
    <div data-kai-activity-value={props.caption}>
      <p class="mb-1 text-caption text-muted-foreground">{props.caption}</p>
      <Show
        when={!all() && !props.plain}
        fallback={
          <div
            class={cn(
              'max-h-96 overflow-auto rounded-md border border-border bg-card px-3 py-2 text-caption text-card-foreground kai-focus-inset',
              props.plain && 'text-destructive-text',
            )}
            tabindex={0}
            role="group"
            aria-label={props.caption}
          >
            <pre class="whitespace-pre-wrap break-words font-mono">{shown()}</pre>
          </div>
        }
      >
        <CodeBlock class="rounded-md">
          <CodeBlockCode
            code={shown()}
            language={props.language ?? 'json'}
            class="[&>pre]:px-3 [&>pre]:py-2"
            aria-label={props.caption}
          />
        </CodeBlock>
      </Show>
      <Show when={clipped() && !all()}>
        <p class="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground" data-kai-truncated="">
          <span>
            Truncated: showing the first {groupDigits(MAX_VALUE_CHARS)} of {groupDigits(props.text.length)} characters.
          </span>
          <button
            type="button"
            class="cursor-pointer rounded px-1 text-foreground underline underline-offset-2 hover:bg-muted/60"
            onClick={() => setAll(true)}
          >
            Show all
          </button>
        </p>
      </Show>
    </div>
  );
}

// ── One step ───────────────────────────────────────────────────────────────────────────

const GLYPH_TONE: Record<ActivityStatus, string> = {
  done: 'text-success',
  error: 'text-destructive-text',
  running: 'text-muted-foreground',
  interrupted: 'text-warning',
};

function StepGlyph(props: { status: ActivityStatus }) {
  return (
    <span
      class={cn(
        'absolute top-[3px] -left-[8px] flex size-[15px] items-center justify-center rounded-full bg-background',
        GLYPH_TONE[props.status],
      )}
      data-kai-status={props.status}
      aria-hidden="true"
    >
      <Show when={props.status === 'done'}><Check class="size-3.5" stroke-width={2.5} /></Show>
      <Show when={props.status === 'error'}><X class="size-3.5" stroke-width={2.5} /></Show>
      <Show when={props.status === 'interrupted'}><TriangleAlert class="size-3.5" stroke-width={2.5} /></Show>
      <Show when={props.status === 'running'}><LoaderCircle class="size-3.5 motion-safe:animate-spin" /></Show>
    </span>
  );
}

/** Spoken by assistive tech in place of the glyph, which is decorative. */
const STATUS_WORD: Record<ActivityStatus, string> = {
  done: 'Done',
  error: 'Failed',
  running: 'Running',
  interrupted: 'Interrupted, no result',
};

/** The line under an interrupted step. Worded as what happened; the model never got a result. */
export const INTERRUPTED_NOTE = 'No result. The run ended before this call finished.';

export interface ActivityStepItemProps {
  /** The step's text. Model output when it came from a tool or reasoning: rendered as text. */
  label: string;
  /** `error` turns the row red; `interrupted` turns it amber with a note (see {@link INTERRUPTED_NOTE}). */
  status?: ActivityStatus;
  /** Right-aligned, already formatted ("1.2s"). */
  duration?: string;
  /** A second line under the label. For an `error` step, the reason. */
  note?: string;
  /** The step's detail, shown when it is expanded. Its presence makes the row a disclosure. */
  children?: JSX.Element;
  /** Whether the row can expand. Default: `children` was given. A slotted row that cannot see its own children says so here. */
  expandable?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The row's root element. A list item by default; a host that carries `role="listitem"` itself asks for a plain block. */
  as?: 'li' | 'div';
  /** Swap the row's header and detail for the consumer's own element. Receives the built-in row as the fallback. */
  wrap?: (builtin: () => JSX.Element) => JSX.Element;
  class?: string;
}

/**
 * One row of the timeline: a status glyph on the rail, the label, the duration and, when it has a
 * detail, a disclosure button (`aria-expanded`) that shows it. Used by `Activity` for every data
 * step and on its own by an app composing the timeline itself.
 */
function ActivityStepItem(props: ActivityStepItemProps) {
  const [local] = splitProps(props, [
    'label', 'status', 'duration', 'note', 'children', 'expandable', 'open', 'defaultOpen', 'onOpenChange', 'as', 'wrap', 'class',
  ]);
  const status = () => local.status ?? 'done';
  const [open, setOpen] = createControllableSignal(() => local.open, !!local.defaultOpen);
  // `'children' in props`, never `props.children !== undefined`: the children getter RE-RUNS the JSX on
  // every read, so testing for presence that way would build the detail (and start highlighting it) while closed.
  const expandable = () => local.expandable ?? 'children' in props;
  const panelId = createUniqueId();
  const toggle = () => {
    const next = !open();
    setOpen(next);
    local.onOpenChange?.(next);
  };
  const note = () => local.note ?? (status() === 'interrupted' ? INTERRUPTED_NOTE : undefined);
  const labelTone = () =>
    status() === 'error' ? 'text-destructive-text' : status() === 'interrupted' ? 'text-warning' : 'text-foreground';

  const labelParts = () => (
    <>
      <span class="sr-only">{STATUS_WORD[status()]}: </span>
      <span class={cn('min-w-0 truncate', labelTone())}>{local.label}</span>
      <Show when={local.duration}>
        <span class="shrink-0 tabular-nums text-muted-foreground">{local.duration}</span>
      </Show>
      <Show when={expandable()}>
        <ChevronRight
          class={cn('size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open() && 'rotate-90')}
          aria-hidden="true"
        />
      </Show>
    </>
  );

  const builtin = () => (
    <>
      <Show
        when={expandable()}
        fallback={<div class="flex items-center gap-2 py-0.5 text-meta">{labelParts()}</div>}
      >
        <button
          type="button"
          data-kai-step-trigger=""
          class="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-left text-meta hover:bg-muted/60"
          aria-expanded={open()}
          aria-controls={panelId}
          onClick={toggle}
        >
          {labelParts()}
        </button>
      </Show>
      <Show when={note()}>
        <p
          class={cn('py-0.5 text-caption', status() === 'interrupted' ? 'text-warning' : 'truncate text-destructive-text')}
          data-kai-step-note=""
        >
          {note()}
        </p>
      </Show>
      <Show when={expandable() && open()}>
        <div id={panelId} class="mt-1.5 mb-1 flex flex-col gap-2">
          {local.children}
        </div>
      </Show>
    </>
  );

  const Root = () => local.as ?? 'li';
  const body = () => (local.wrap ? local.wrap(builtin) : builtin());
  return (
    <Show
      when={Root() === 'li'}
      fallback={
        <div class={cn('relative pl-5', local.class)} data-kai-step="" data-kai-status={status()}>
          <StepGlyph status={status()} />
          {body()}
        </div>
      }
    >
      <li class={cn('relative pl-5', local.class)} data-kai-step="" data-kai-status={status()}>
        <StepGlyph status={status()} />
        {body()}
      </li>
    </Show>
  );
}

/** The detail of a data step: reasoning text through the safe markdown sink, or arguments and result as text. */
function StepDetail(props: { step: ActivityStep }) {
  return (
    <>
      <Show when={props.step.kind === 'reasoning' && props.step.text}>
        <div class="text-body text-muted-foreground" data-kai-activity-reasoning="">
          <Markdown content={props.step.text ?? ''} />
        </div>
      </Show>
      <Show when={props.step.input}>{(input) => <ValueBlock caption="Arguments" text={toDisplayJson(input())} />}</Show>
      <Show when={props.step.output}>{(output) => <ValueBlock caption="Result" text={toDisplayJson(output())} />}</Show>
      <Show when={props.step.errorText}>{(text) => <ValueBlock caption="Error" text={text()} plain />}</Show>
    </>
  );
}

const hasDetail = (s: ActivityStep) =>
  s.input !== undefined || s.output !== undefined || !!s.errorText || (s.kind === 'reasoning' && !!s.text);

// ── The line and the timeline ─────────────────────────────────────────────────────────

export interface ActivityProps {
  /** Data mode: the steps, as `activityStepsFromParts` returns them. */
  steps?: ActivityStep[];
  /** A run in progress: the line shows the live step, shimmering. */
  streaming?: boolean;
  /** Controlled open state of the timeline. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default closed. */
  defaultOpen?: boolean;
  /** Whether the line opens to the timeline (default) or stands alone with no disclosure, as `summary`. */
  detail?: 'full' | 'summary';
  /** Custom elements for individual steps: `tool:<name>`, `tool`, `reasoning`. The element gets `.step`. */
  renderers?: RendererMap;
  /** Replaces the derived line. */
  summary?: string;
  /** Item mode: the rows, as `ActivityStepItem`s or a `<slot />` of `kai-activity-step`s. */
  children?: JSX.Element;
  /** Force item mode on or off. Default: on when `children` was given. A facade that always forwards a children slot sets it. */
  itemMode?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A step's detail opened or closed. `id` is the step's own id. */
  onStepToggle?: (id: string, open: boolean) => void;
  controllerRef?: (api: ActivityController) => void;
  /** Item mode over a shadow boundary: the rows that own the arrow-key tab stop. Default: every step trigger in this list. */
  rovingRows?: () => HTMLElement[];
  /** Item mode: the node inside a row that takes focus (a slotted step's own trigger). Default: the row. */
  rovingTarget?: (row: HTMLElement) => HTMLElement | undefined;
  /** Item mode: the list changed under you (a step was added, removed or expanded); re-derive the tab stop. */
  syncRef?: (sync: () => void) => void;
  /** Whether the failed state should tint the line's dot even though the steps are not data (item mode). */
  failed?: boolean;
  /** Whether an interrupted step exists (item mode). */
  interrupted?: boolean;
  class?: string;
}

/** Ids made unique, so two steps a buggy provider gave the same id are still two rows. */
function uniqueIds(steps: ActivityStep[]): string[] {
  const seen = new Map<string, number>();
  return steps.map((s) => {
    const n = (seen.get(s.id) ?? 0) + 1;
    seen.set(s.id, n);
    return n === 1 ? s.id : `${s.id}~${n}`;
  });
}

/**
 * One quiet line for a run of reasoning and tool calls, in the reasoning trigger's style.
 * Opens to a timeline of steps on a thin rail; each step with a detail opens again to its
 * arguments and result. Give `steps` (the preset) or children (compose the rows yourself).
 */
function Activity(props: ActivityProps) {
  const [local] = splitProps(props, [
    'steps', 'streaming', 'open', 'defaultOpen', 'detail', 'renderers', 'summary', 'children', 'itemMode', 'onOpenChange', 'onStepToggle',
    'controllerRef', 'rovingRows', 'rovingTarget', 'syncRef', 'failed', 'interrupted', 'class',
  ]);
  const [open, setOpen] = createControllableSignal(() => local.open, !!local.defaultOpen);
  const steps = () => local.steps ?? [];
  const itemMode = () => local.itemMode ?? 'children' in props;
  const collapsible = () => local.detail !== 'summary';
  const isOpen = () => collapsible() && open();
  const listId = createUniqueId();

  const line = createMemo(() => local.summary ?? activityLine(steps(), !!local.streaming));
  const live = () => !!local.streaming && (itemMode() ? true : steps().some((s) => s.status === 'running'));
  const failed = () => (itemMode() ? !!local.failed : steps().some((s) => s.status === 'error'));
  const interrupted = () => (itemMode() ? !!local.interrupted : steps().some((s) => s.status === 'interrupted'));

  let triggerEl: HTMLButtonElement | undefined;
  let panelEl: HTMLDivElement | undefined;
  const changeOpen = (next: boolean) => {
    if (next === open()) return;
    // Hand focus to the trigger before the panel that holds it leaves the DOM: the browser would
    // otherwise drop it to <body> and the next Tab would restart from the top of the page.
    if (!next && panelEl) {
      const root = panelEl.getRootNode() as Document | ShadowRoot;
      const active = root.activeElement;
      if (active && panelEl.contains(active)) triggerEl?.focus();
    }
    setOpen(next);
    local.onOpenChange?.(next);
  };
  local.controllerRef?.({ open: isOpen, setOpen: changeOpen });

  // Which data steps are expanded, by their (uniquified) id: lives HERE and not in each row, so a
  // stream that hands back fresh step objects on every chunk cannot collapse what the reader opened.
  const [openSteps, setOpenSteps] = createSignal<ReadonlySet<string>>(new Set());
  const ids = createMemo(() => uniqueIds(steps()));
  const stepFor = (uid: string) => {
    const i = ids().indexOf(uid);
    return i === -1 ? undefined : steps()[i];
  };
  const toggleStep = (uid: string, next: boolean) => {
    setOpenSteps((cur) => {
      const s = new Set(cur);
      if (next) s.add(uid); else s.delete(uid);
      return s;
    });
    const step = stepFor(uid);
    if (step) local.onStepToggle?.(step.id, next);
  };

  // Arrow-key traversal over the steps that can expand (the ones with a trigger).
  let listEl: HTMLOListElement | undefined;
  const rows = (): HTMLElement[] =>
    local.rovingRows ? local.rovingRows() : [...(listEl?.querySelectorAll<HTMLElement>('[data-kai-step-trigger]') ?? [])];
  const roving = createRovingTabList({
    getRows: rows,
    targetOf: (row) => local.rovingTarget?.(row) ?? row,
    onActivate: (row) => (local.rovingTarget?.(row) ?? row).click(),
  });
  const sync = () => roving.sync();
  local.syncRef?.(sync);
  createEffect(() => {
    if (!isOpen()) return;
    // Track what changes the row set, then re-derive once the DOM has caught up.
    ids();
    openSteps();
    queueMicrotask(sync);
  });

  // The scroller is a tab stop only while it actually overflows (axe: scrollable-region-focusable),
  // so a short timeline adds no tab stop and a long one can be scrolled from the keyboard.
  const [overflowing, setOverflowing] = createSignal(false);
  createEffect(() => {
    if (!isOpen() || !panelEl || !listEl) return;
    const el = panelEl;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    // The LIST is observed, not the scroller: the scroller's own box is capped, so it never resizes.
    const dispose = observeContentHeight(listEl, measure);
    onCleanup(dispose);
  });

  // The cap is for LONG runs only, and never over an opened step: a step's Arguments and Result must
  // not be clipped by the pane it was opened in. Item mode is the app's list, so it is never capped.
  const capped = () => !itemMode() && steps().length > LONG_RUN_STEPS && openSteps().size === 0;

  const dotTone = () =>
    failed() ? 'border-destructive-text bg-destructive-text' : interrupted() ? 'border-warning bg-warning' : 'border-current';
  const lineContent = () => (
    <>
      <span class={cn('size-1.5 shrink-0 rounded-full border', dotTone())} aria-hidden="true" data-kai-dot="" />
      <Show when={live()} fallback={<span class="truncate" data-kai-line="">{line()}</span>}>
        <TextShimmer class="truncate font-medium">{line()}</TextShimmer>
      </Show>
    </>
  );

  const dataRow = (uid: string) => {
    const step = () => stepFor(uid);
    return (
      <Show when={step()}>
        {(s) => {
          const tag = () =>
            resolveRenderer(local.renderers, s().kind === 'reasoning' ? ['reasoning'] : [`tool:${s().toolName ?? ''}`, 'tool']);
          return (
            <ActivityStepItem
              label={activityStepLabel(s())}
              status={s().status}
              duration={activityStepDuration(s())}
              note={s().status === 'error' ? s().errorText : undefined}
              expandable={hasDetail(s())}
              open={openSteps().has(uid)}
              onOpenChange={(next) => toggleStep(uid, next)}
              wrap={
                tag()
                  ? (builtin) => (
                      <TagRenderer tag={tag() as string} data={s()} prop="step" fallback={<>{builtin()}</>} />
                    )
                  : undefined
              }
            >
              <StepDetail step={s()} />
            </ActivityStepItem>
          );
        }}
      </Show>
    );
  };

  return (
    <div class={cn('w-full text-meta', local.class)} data-kai-activity="" data-kai-streaming={local.streaming ? '' : undefined}>
      <Show
        when={collapsible()}
        fallback={
          <div class="flex max-w-full items-center gap-2 text-muted-foreground" data-kai-activity-summary="">
            {lineContent()}
          </div>
        }
      >
        <button
          ref={triggerEl}
          type="button"
          class="group flex max-w-full cursor-pointer items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={isOpen()}
          aria-controls={listId}
          data-state={isOpen() ? 'open' : 'closed'}
          onClick={() => changeOpen(!open())}
        >
          {lineContent()}
          <ChevronRight
            class={cn('size-3.5 shrink-0 transition-transform motion-reduce:transition-none', isOpen() && 'rotate-90')}
            aria-hidden="true"
          />
        </button>
        <Show when={isOpen()}>
          {/* The scroller wraps the list and owns the left gutter: the step glyphs sit half outside
              the rail, and an overflow container would clip them. */}
          <div
            ref={panelEl}
            class={cn('-ml-3 mt-2 pl-3 pr-2 kai-focus-inset', capped() && 'max-h-72 overflow-y-auto')}
            tabindex={overflowing() ? 0 : undefined}
            role={overflowing() ? 'group' : undefined}
            aria-label={overflowing() ? 'Activity steps' : undefined}
            data-kai-activity-scroller=""
          >
            <ol
              ref={listEl}
              id={listId}
              class="ml-[3px] flex flex-col gap-1.5 border-l border-border pb-0.5"
              onKeyDown={roving.handleKeyDown}
            >
              <Show when={itemMode()} fallback={<For each={ids()}>{(uid) => dataRow(uid)}</For>}>
                {local.children}
              </Show>
            </ol>
          </div>
        </Show>
      </Show>
    </div>
  );
}

export { Activity, ActivityStepItem };
