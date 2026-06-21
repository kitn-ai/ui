import {
  type JSX,
  type Accessor,
  Show,
  Index,
  splitProps,
  mergeProps,
  createSignal,
  createMemo,
  createEffect,
  on,
  ErrorBoundary,
  createUniqueId,
} from 'solid-js';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';
import { Card } from './card';
import { MessageBody } from './message';
import { TextShimmer } from './text-shimmer';
import { Check } from 'lucide-solid';
import {
  type CompareCandidate,
  type ComparePair,
  type CompareSelection,
  type ResponseCompareData,
  buildSelection,
  isAnyStreaming,
  normalizeCandidates,
} from './response-compare-types';

// Re-export the data types + pure helpers so consumers (and the `<kai-compare>`
// facade) can import everything from a single `response-compare` module.
export type {
  CompareCandidate,
  ComparePair,
  CompareCollapse,
  ResponseCompareData,
  CompareSelection,
} from './response-compare-types';
export { normalizeCandidates, buildSelection, isAnyStreaming } from './response-compare-types';

export type CompareLayout = 'auto' | 'columns' | 'stacked';

// ─────────────────────────────────────────────────────────────────────────────
// Resolution controller — a sibling of `useCardResolution` for `CompareSelection`,
// which has no `kind` field (so it can't satisfy `R extends CardResolution`). Same
// precedence: prop (host-driven / re-hydrated) > local optimistic flip > none. A
// fresh `data` identity clears the local flip, but an explicit prop keeps it
// resolved. `isOptimistic` is true only for a flip made THIS session (announced via
// role="status"; silent on re-hydrate).
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedController<T> {
  value: Accessor<T | undefined>;
  isResolved: Accessor<boolean>;
  isOptimistic: Accessor<boolean>;
  setLocal: (v: T) => void;
}

export function useResolved<T>(opts: {
  prop: Accessor<T | undefined>;
  data: Accessor<unknown>;
}): ResolvedController<T> {
  const [local, setLocal] = createSignal<T | undefined>(undefined);
  // Clear the optimistic flip on a NEW data identity (deferred so mount doesn't
  // clobber an initial prop). The prop still wins via the memo below.
  createEffect(on(opts.data, () => setLocal(undefined), { defer: true }));
  const value = createMemo(() => opts.prop() ?? local());
  const isResolved = createMemo(() => value() !== undefined);
  const isOptimistic = createMemo(() => opts.prop() === undefined && local() !== undefined);
  return { value, isResolved, isOptimistic, setLocal };
}

// ─────────────────────────────────────────────────────────────────────────────
// The <ResponseCompare> component.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponseCompareProps {
  /** The compare definition (prompt + the two candidates). */
  data?: ResponseCompareData;
  /** Stable id correlating every emitted event. */
  compareId?: string;
  /** Re-hydrate / control the selection. Renders the collapsed winner. Set as a
   *  JS property: `el.selection = { chosenId, rejectedIds }`. */
  selection?: CompareSelection;
  /** Column layout. `'auto'` (default) uses a container query — stacked below
   *  ~640px, side-by-side columns above. */
  layout?: CompareLayout;
  class?: string;
  /** Fired when the user commits a pick. */
  onSelect?: (sel: CompareSelection) => void;
  /** Fired once both candidates have settled (stopped streaming) and a valid
   *  definition is shown. */
  onReady?: () => void;
  /** Fired for an unusable definition (inline error state). */
  onError?: (message: string) => void;
}

/**
 * `ResponseCompare` — a dual-response comparison. Two assistant candidates for the
 * same prompt render side-by-side (or stacked), each via `MessageBody` so a
 * candidate reads exactly like an assistant message (reasoning + tools +
 * attachments + markdown). The pick is a COMMIT, not a Submit: clicking "Pick this"
 * (or Enter on the focused column) computes `{ chosenId, rejectedIds:[other], at }`,
 * optimistically collapses to the chosen candidate's body, and calls `onSelect` for
 * the consumer to send a `(prompt, chosen, rejected)` preference pair. Single-shot.
 *
 * While EITHER candidate is `streaming`, both pick controls are disabled and the
 * streaming column shows a `TextShimmer`; `onReady` fires once both settle. The two
 * columns are a WAI-ARIA radiogroup with roving tabindex (Arrow keys move A↔B,
 * Enter/Space picks). Emits `onError` for a malformed definition.
 */
export function ResponseCompare(props: ResponseCompareProps): JSX.Element {
  const merged = mergeProps({ compareId: 'kai-compare', layout: 'auto' as CompareLayout }, props);
  const [local] = splitProps(merged, [
    'data',
    'compareId',
    'selection',
    'layout',
    'class',
    'onSelect',
    'onReady',
    'onError',
  ]);

  const uid = createUniqueId();

  const normalized = createMemo(() => normalizeCandidates(local.data?.candidates));
  const valid = createMemo(() => normalized().candidates !== null);
  const errorMessage = createMemo(() => normalized().error ?? '');
  const pair = createMemo<ComparePair | null>(() => normalized().candidates);

  const res = useResolved<CompareSelection>({
    prop: () => local.selection,
    data: () => local.data,
  });

  // Both candidates settled → enable the pick + announce ready.
  const streaming = createMemo(() => isAnyStreaming(pair()));

  const [focusIndex, setFocusIndex] = createSignal(0);
  let groupRef: HTMLDivElement | undefined;

  // Reset the roving tab stop whenever a NEW definition arrives.
  createEffect(on(() => local.data, () => setFocusIndex(0)));

  // ready / error lifecycle: error on an unusable definition, ready once both
  // candidates have settled (so consumers know the pick is now live).
  createEffect(
    on([valid, streaming], ([ok, isStreaming]) => {
      if (!ok) {
        local.onError?.(errorMessage());
        return;
      }
      if (!isStreaming) local.onReady?.();
    }),
  );

  const chosenId = createMemo(() => res.value()?.chosenId);
  const chosenCandidate = createMemo<CompareCandidate | undefined>(() => {
    const id = chosenId();
    return id === undefined ? undefined : pair()?.find((c) => c.id === id);
  });

  // Commit a pick: emit + optimistically flip (single-shot; inert once resolved
  // or while still streaming).
  const pick = (candidate: CompareCandidate): void => {
    if (res.isResolved()) return;
    if (streaming()) return;
    const p = pair();
    if (!p) return;
    const sel = buildSelection(p, candidate.id);
    local.onSelect?.(sel);
    res.setLocal(sel);
  };

  const focusColumn = (index: number): void => {
    const cols = groupRef?.querySelectorAll<HTMLElement>('[role="radio"]');
    cols?.[index]?.focus();
  };

  // Two-item roving tabindex (A↔B). Arrows toggle the focused column; Enter/Space
  // picks it. No-op once resolved.
  const onGroupKeyDown = (e: KeyboardEvent): void => {
    if (res.isResolved()) return;
    const p = pair();
    if (!p) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusIndex() === 0 ? 1 : 0;
      setFocusIndex(next);
      focusColumn(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = focusIndex() === 0 ? 1 : 0;
      setFocusIndex(next);
      focusColumn(next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusIndex(0);
      focusColumn(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusIndex(1);
      focusColumn(1);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const cand = p[focusIndex()];
      if (cand) pick(cand);
    }
  };

  // Layout classes for the columns wrapper. `auto` is a container query: stacked
  // below ~640px, columns above (Tailwind v4 `@container` + `@[640px]:` variants).
  const wrapperClass = createMemo(() => {
    const l = local.layout;
    if (l === 'columns') return 'grid grid-cols-2 gap-3';
    if (l === 'stacked') return 'grid grid-cols-1 gap-3';
    // auto
    return '@container/compare grid grid-cols-1 gap-3 @[640px]/compare:grid-cols-2';
  });

  const promptId = `kai-compare-prompt-${uid}`;
  const groupLabel = (): string => local.data?.prompt ?? 'Compare two responses';

  return (
    <Show
      when={valid()}
      fallback={<Card errorMessage={errorMessage() || "This comparison couldn't be displayed."} />}
    >
      <ErrorBoundary
        fallback={() => {
          local.onError?.('The comparison failed to render.');
          return <Card errorMessage="The comparison failed to render." />;
        }}
      >
        <div class={cn('flex flex-col gap-3', local.class)}>
          <Show when={local.data?.prompt}>
            <p id={promptId} class="text-sm text-foreground">
              {local.data?.prompt}
            </p>
          </Show>

          <Show
            when={!res.isResolved()}
            fallback={
              <CollapsedWinner
                candidate={chosenCandidate()}
                optimistic={res.isOptimistic()}
              />
            }
          >
            <div
              ref={groupRef}
              role="radiogroup"
              aria-label={groupLabel()}
              aria-describedby={local.data?.prompt ? promptId : undefined}
              class={wrapperClass()}
              onKeyDown={onGroupKeyDown}
            >
              <Index each={pair() ?? []}>
                {(candidate, index) => (
                  <CompareColumn
                    candidate={candidate()}
                    tabStop={index === focusIndex()}
                    disabled={streaming()}
                    onFocus={() => setFocusIndex(index)}
                    onPick={() => {
                      setFocusIndex(index);
                      pick(candidate());
                    }}
                  />
                )}
              </Index>
            </div>
          </Show>
        </div>
      </ErrorBoundary>
    </Show>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// One candidate column — a `role="radio"` wrapping the assistant-styled body +
// a pick control. Disabled (no emit) while either candidate streams.
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnProps {
  candidate: CompareCandidate;
  tabStop: boolean;
  disabled: boolean;
  onFocus: () => void;
  onPick: () => void;
}

function CompareColumn(props: ColumnProps): JSX.Element {
  const labelText = (): string =>
    props.candidate.label ?? props.candidate.model ?? props.candidate.id;
  return (
    <div
      role="radio"
      aria-checked={false}
      aria-label={`Response ${labelText()}`}
      data-candidate-id={props.candidate.id}
      tabindex={props.tabStop ? 0 : -1}
      onFocus={props.onFocus}
      class="flex min-w-0 flex-col gap-3 rounded-lg border border-input bg-background/40 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <Show when={props.candidate.label || props.candidate.model}>
        <div class="flex items-center gap-2">
          <Show when={props.candidate.label}>
            <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {props.candidate.label}
            </span>
          </Show>
          <Show when={props.candidate.model}>
            <span class="text-xs text-muted-foreground">{props.candidate.model}</span>
          </Show>
        </div>
      </Show>

      <div class="min-w-0 flex-1">
        <Show
          when={props.candidate.streaming}
          fallback={
            <MessageBody
              content={props.candidate.content}
              reasoning={props.candidate.reasoning}
              tools={props.candidate.tools}
              attachments={props.candidate.attachments}
              isUser={false}
              markdown={true}
            />
          }
        >
          <TextShimmer class="text-sm">Generating response…</TextShimmer>
        </Show>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mt-auto w-full"
        disabled={props.disabled}
        tabindex={-1}
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          props.onPick();
        }}
      >
        Pick this
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollapsedWinner — the read-only view after a pick: the chosen candidate's body
// (reasoning + tools + attachments + markdown), with a "Selected" affordance.
// role="status" only for an optimistic flip made this session.
// ─────────────────────────────────────────────────────────────────────────────

function CollapsedWinner(props: {
  candidate: CompareCandidate | undefined;
  optimistic: boolean;
}): JSX.Element {
  return (
    <div
      class="flex flex-col gap-2 rounded-lg border border-input bg-accent/40 p-3"
      role={props.optimistic ? 'status' : undefined}
    >
      <div class="flex items-center gap-2 text-sm font-medium text-accent-foreground">
        <Check size={16} aria-hidden="true" />
        <span>Selected{props.candidate?.label ? `: ${props.candidate.label}` : ''}</span>
      </div>
      <Show when={props.candidate} fallback={<p class="text-sm text-muted-foreground">Response selected.</p>}>
        {(c) => (
          <div class="min-w-0">
            <MessageBody
              content={c().content}
              reasoning={c().reasoning}
              tools={c().tools}
              attachments={c().attachments}
              isUser={false}
              markdown={true}
            />
          </div>
        )}
      </Show>
    </div>
  );
}
