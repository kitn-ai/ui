import {
  type JSX,
  For,
  Show,
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
import type { CardEnvelope, CardEvent, CardHost, CardResolution } from '../primitives/card-contract';
import { useCardResolution } from './use-card-resolution';
import { emitCardEvent } from '../primitives/card-routing';
import { useCardHost } from '../primitives/card-host';
import { Check } from 'lucide-solid';

// ─────────────────────────────────────────────────────────────────────────────
// Types (tasks.schema.json) — see src/primitives/card-schemas/tasks.schema.json
// ─────────────────────────────────────────────────────────────────────────────

export interface TasksTask {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
}

export interface TasksCardData {
  mode?: 'select'; // future: 'select' | 'progress'
  heading?: string;
  tasks: TasksTask[]; // >=1
  selectAll?: boolean;
  confirmLabel?: string;
  allowEmpty?: boolean;
  min?: number;
  max?: number;
}

export interface TasksCardResult {
  selected: string[];
}

export type TasksCardEnvelope = CardEnvelope<'tasks', TasksCardData>;

export const TASKS_CARD_TYPE = 'tasks' as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (unit-tested in isolation).
// ─────────────────────────────────────────────────────────────────────────────

/** De-dupe tasks by id (first wins). Returns the usable list + an optional error. */
export function normalizeTasks(tasks: unknown): { tasks: TasksTask[]; error?: string } {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { tasks: [], error: "This card couldn't be displayed." };
  }
  const seen = new Set<string>();
  const out: TasksTask[] = [];
  for (const t of tasks) {
    if (!t || typeof t !== 'object') continue;
    const task = t as Partial<TasksTask>;
    if (typeof task.id !== 'string' || task.id.length === 0) continue;
    if (typeof task.label !== 'string' || task.label.length === 0) continue;
    if (seen.has(task.id)) {
      // eslint-disable-next-line no-console
      console.warn(`[kc-tasks] duplicate task id "${task.id}" ignored`);
      continue;
    }
    seen.add(task.id);
    out.push({
      id: task.id,
      label: task.label,
      description: typeof task.description === 'string' ? task.description : undefined,
      checked: task.checked === true,
      disabled: task.disabled === true,
    });
  }
  if (out.length === 0) return { tasks: [], error: "This card couldn't be displayed." };
  return { tasks: out };
}

/** The ids of the initially-checked tasks (in input order). */
export function initialSelected(tasks: TasksTask[]): string[] {
  return tasks.filter((t) => t.checked).map((t) => t.id);
}

/** The selected ids in input order (selection set ∩ tasks, preserving task order). */
export function selectedInOrder(tasks: TasksTask[], selected: Set<string>): string[] {
  return tasks.filter((t) => selected.has(t.id)).map((t) => t.id);
}

/** The toggleable (non-disabled) task ids. */
export function toggleableIds(tasks: TasksTask[]): string[] {
  return tasks.filter((t) => !t.disabled).map((t) => t.id);
}

export type SelectAllState = 'checked' | 'unchecked' | 'indeterminate';

/** Select-all tri-state over the toggleable rows. */
export function selectAllState(tasks: TasksTask[], selected: Set<string>): SelectAllState {
  const ids = toggleableIds(tasks);
  if (ids.length === 0) return 'unchecked';
  const n = ids.filter((id) => selected.has(id)).length;
  if (n === 0) return 'unchecked';
  if (n === ids.length) return 'checked';
  return 'indeterminate';
}

/** Whether select-all should be shown: requested AND not blocked by `max` (since
 *  "all" would violate max). */
export function showSelectAll(data: TasksCardData, tasks: TasksTask[]): boolean {
  if (data.selectAll !== true) return false;
  const count = toggleableIds(tasks).length;
  if (data.max !== undefined && count > data.max) return false;
  return true;
}

/** Whether confirm is enabled for the current selection count. */
export function canConfirm(data: TasksCardData, count: number): boolean {
  const min = data.min ?? (data.allowEmpty ? 0 : 1);
  if (count < min) return false;
  if (data.max !== undefined && count > data.max) return false;
  return true;
}

/** Whether an unchecked row is blocked because `max` is reached. */
export function isMaxReached(data: TasksCardData, count: number): boolean {
  return data.max !== undefined && count >= data.max;
}

/** The disabled-reason text for confirm (for aria-describedby), or undefined. */
export function confirmReason(data: TasksCardData, count: number): string | undefined {
  if (canConfirm(data, count)) return undefined;
  const min = data.min ?? (data.allowEmpty ? 0 : 1);
  if (count < min) return `Select at least ${min}.`;
  if (data.max !== undefined && count > data.max) return `Select at most ${data.max}.`;
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// The <TasksCard> component.
// ─────────────────────────────────────────────────────────────────────────────

export interface TasksCardProps {
  /** The tasks definition (CardEnvelope.data). */
  data?: TasksCardData;
  /** The card id used to correlate every emitted CardEvent. */
  cardId?: string;
  /** The envelope title rendered in the card chrome. */
  heading?: string;
  /** Optional explicit CardHost (otherwise read from a CardProvider, otherwise the
   *  bubbling `kc-card` CustomEvent off `hostElement`). */
  host?: CardHost;
  /** The custom-element host node, for the bubbling `kc-card` fallback emit. */
  hostElement?: HTMLElement;
  class?: string;
  /** When set, render the chromed read-only summary instead of the interactive controls. */
  resolution?: CardResolution;
}

const DEFAULT_DATA: TasksCardData = { tasks: [] };

/**
 * `TasksCard` — a selectable task/plan list (checkbox rows + optional select-all
 * + a confirm button) inside `Card` chrome. Row toggling and select-all are local
 * UI state; only the final confirm emits the Card contract's `submit` verb
 * (`{ kind:'submit', cardId, data:{ selected } }`) with the checked ids in
 * input order. Emits `ready` on mount and `error` for an unusable definition.
 */
export function TasksCard(props: TasksCardProps): JSX.Element {
  const merged = mergeProps({ cardId: 'kc-tasks' }, props);
  const [local] = splitProps(merged, ['data', 'cardId', 'heading', 'host', 'hostElement', 'class', 'resolution']);

  const ctxHost = useCardHost();
  const uid = createUniqueId();

  const emit = (event: CardEvent): void => {
    const h = local.host ?? ctxHost;
    if (h) h.emit(event);
    else if (local.hostElement) emitCardEvent(local.hostElement, event);
  };

  const normalized = createMemo(() => normalizeTasks(local.data?.tasks));
  const valid = createMemo(() => normalized().error === undefined);
  const errorMessage = createMemo(() => normalized().error ?? '');
  const tasks = createMemo(() => normalized().tasks);
  const data = createMemo<TasksCardData>(() => local.data ?? DEFAULT_DATA);

  const [selected, setSelected] = createSignal<Set<string>>(new Set());

  const res = useCardResolution({ prop: () => local.resolution, data: () => local.data });

  // Seed selection from the tasks' initial checked state when a NEW definition arrives.
  createEffect(
    on(
      () => local.data,
      () => {
        setSelected(new Set(initialSelected(tasks())));
      },
    ),
  );

  // ready / error lifecycle emits.
  createEffect(
    on(valid, (ok) => {
      if (ok) emit({ kind: 'ready', cardId: local.cardId });
      else emit({ kind: 'error', cardId: local.cardId, message: errorMessage() });
    }),
  );

  const count = createMemo(() => selected().size);
  const confirmLabel = () => data().confirmLabel ?? 'Confirm';
  const masterState = createMemo(() => selectAllState(tasks(), selected()));
  const showMaster = createMemo(() => showSelectAll(data(), tasks()));
  const reason = createMemo(() => confirmReason(data(), count()));
  const confirmEnabled = createMemo(() => canConfirm(data(), count()) && !res.isResolved());

  const toggle = (id: string, on: boolean): void => {
    if (res.isResolved()) return;
    const next = new Set(selected());
    if (on) {
      // Respect max: block adding past max.
      if (isMaxReached(data(), next.size) && !next.has(id)) return;
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelected(next);
  };

  const toggleAll = (on: boolean): void => {
    if (res.isResolved()) return;
    const next = new Set(selected());
    for (const id of toggleableIds(tasks())) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  };

  const onConfirm = (): void => {
    if (!confirmEnabled()) return;
    const result: TasksCardResult = { selected: selectedInOrder(tasks(), selected()) };
    emit({ kind: 'submit', cardId: local.cardId, data: result });
    res.setLocal({ kind: 'submit', data: result });
  };

  // Surface the resolved state for host styling.
  createEffect(() => {
    const el = local.hostElement;
    if (!el) return;
    if (res.isResolved()) el.setAttribute('data-kc-resolved', 'submitted');
    else el.removeAttribute('data-kc-resolved');
  });

  const resolvedSummary = createMemo(() => {
    const r = res.resolution();
    if (!r || r.kind !== 'submit') return undefined;
    const sel = (r.data as { selected?: unknown })?.selected;
    const ids: string[] = Array.isArray(sel) ? (sel as string[]) : [];
    const all = tasks();
    const chosen = all.filter((t) => ids.includes(t.id)).map((t) => t.label);
    return { count: chosen.length, total: all.length, labels: chosen };
  });

  const reasonId = `kc-tl-reason-${uid}`;
  const countId = `kc-tl-count-${uid}`;

  return (
    <Show when={valid()} fallback={<Card heading={local.heading} errorMessage={errorMessage()} />}>
      <ErrorBoundary
        fallback={() => {
          emit({ kind: 'error', cardId: local.cardId, message: 'The card failed to render.' });
          return <Card heading={local.heading} errorMessage="The card failed to render." />;
        }}
      >
        <Card
          heading={local.heading ?? local.data?.heading}
          actions={
            res.isResolved() ? undefined : (
              <div class="flex w-full flex-wrap items-center justify-between gap-2">
                <span id={countId} aria-live="polite" class="text-xs text-muted-foreground">
                  {count()} selected
                </span>
                <div class="ml-auto flex items-center gap-2">
                  <Show when={reason()}>
                    <span id={reasonId} class="sr-only">
                      {reason()}
                    </span>
                  </Show>
                  <Button
                    type="button"
                    disabled={!confirmEnabled()}
                    aria-describedby={reason() ? reasonId : undefined}
                    onClick={onConfirm}
                  >
                    {confirmLabel()}
                  </Button>
                </div>
              </div>
            )
          }
        >
          <Show
            when={!res.isResolved()}
            fallback={<TasksResolved summary={resolvedSummary()!} optimistic={res.isOptimistic()} />}
          >
            <div
              role="group"
              aria-label={local.heading ?? local.data?.heading ?? 'Tasks'}
              class={cn('flex flex-col', local.class)}
              onKeyDown={(e) => {
                // Enter anywhere in the card (off a checkbox) confirms when enabled.
                if (e.key !== 'Enter') return;
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT') return;
                if (confirmEnabled()) onConfirm();
              }}
            >
              <div class="divide-y divide-border overflow-hidden rounded-lg border border-input">
                <Show when={showMaster()}>
                  {(() => {
                    const indeterminate = () => masterState() === 'indeterminate';
                    return (
                      <label
                        class={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                          masterState() === 'checked'
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-muted/50',
                        )}
                      >
                        <input
                          type="checkbox"
                          class="kc-checkbox"
                          checked={masterState() === 'checked'}
                          aria-checked={indeterminate() ? 'mixed' : masterState() === 'checked'}
                          ref={(el) => {
                            createEffect(() => {
                              el.indeterminate = indeterminate();
                            });
                          }}
                          onChange={(e) => toggleAll(e.currentTarget.checked)}
                        />
                        <span>Select all</span>
                      </label>
                    );
                  })()}
                </Show>

                <For each={tasks()}>
                  {(task) => {
                    const checked = () => selected().has(task.id);
                    const blocked = () =>
                      task.disabled || (!checked() && isMaxReached(data(), count()));
                    const descId = `kc-tl-desc-${uid}-${task.id}`;
                    return (
                      <label
                        class={cn(
                          'flex items-start gap-3 px-3 py-2.5 text-sm transition-colors',
                          blocked()
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:bg-muted/50',
                          checked() && !blocked()
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-foreground',
                        )}
                        data-task-id={task.id}
                      >
                        <input
                          type="checkbox"
                          class="kc-checkbox mt-0.5"
                          checked={checked()}
                          disabled={blocked()}
                          aria-disabled={blocked() ? 'true' : undefined}
                          aria-describedby={task.description ? descId : undefined}
                          onChange={(e) => toggle(task.id, e.currentTarget.checked)}
                        />
                        <span class="flex flex-col gap-0.5">
                          <span>{task.label}</span>
                          <Show when={task.description}>
                            <span id={descId} class="text-xs font-normal text-muted-foreground">
                              {task.description}
                            </span>
                          </Show>
                        </span>
                      </label>
                    );
                  }}
                </For>
              </div>

              <Show when={data().max !== undefined}>
                <p class="pt-1 text-xs text-muted-foreground">Up to {data().max} selected.</p>
              </Show>
            </div>
          </Show>
        </Card>
      </ErrorBoundary>
    </Show>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-only resolved summary presenter.
// ─────────────────────────────────────────────────────────────────────────────

function TasksResolved(props: {
  summary: { count: number; total: number; labels: string[] };
  optimistic: boolean;
}): JSX.Element {
  return (
    <div class="flex flex-col gap-2" role={props.optimistic ? 'status' : undefined}>
      <p class="flex items-center gap-2 text-sm font-medium text-foreground">
        <Check size={16} aria-hidden="true" />
        <span>Selected {props.summary.count} of {props.summary.total}</span>
      </p>
      <Show when={props.summary.labels.length > 0}
        fallback={<p class="text-sm text-muted-foreground">None selected</p>}>
        <ul class="list-disc pl-5 text-sm text-foreground">
          <For each={props.summary.labels}>{(l) => <li>{l}</li>}</For>
        </ul>
      </Show>
    </div>
  );
}
