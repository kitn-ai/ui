import { type JSX, type Accessor, splitProps, createUniqueId, For, Show } from 'solid-js';
import { ChevronDown, Circle, CircleCheck, LoaderCircle } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { ProgressBar } from '../progress/progress-bar';
import { TextShimmer } from '../text-shimmer/text-shimmer';
import { createControllableSignal } from '../../primitives/controllable';
import { truncateForDisplay } from '../../primitives/activity';
import type { PlanItem, PlanItemStatus } from '../../primitives/plan';

// Plan: the agent's checklist, one line that opens to every item.
//
// It carries NO surface of its own: no fill, border or shadow. It is built to sit inside the
// prompt input's `above` region, where the card around it is the surface and a hairline divides it
// from the input. Standalone it is just text on whatever it is placed on.
//
// EVERY LABEL HERE IS MODEL OUTPUT (`kai_plan` input). It is rendered as a Solid text node and
// nothing else, clamped for display, so `<img onerror>` in a label is visible characters.
//
// Two ways in, one set of parts. DATA mode gives `items` and the component builds every row from
// `PlanItemRow`. ITEM mode also gives `children` (the rows, yours or the `kai-plan-item` elements)
// and `items` still supplies the summary line and the bar, since the component cannot read a
// foreign row's status.

/** Longest label a row or the header carries, in UTF-16 code units. The model's label has no limit; the display does. */
export const MAX_LABEL_CHARS = 300;
/** Longest label the one-line collapsed summary carries. */
const MAX_LINE_LABEL_CHARS = 120;

/** The disclosure controller handed to a parent (the `kai-plan` facade) via `controllerRef`. */
export interface PlanController {
  open: Accessor<boolean>;
  setOpen: (v: boolean) => void;
}

const STATUS_NAME: Record<PlanItemStatus, string> = {
  completed: 'completed',
  in_progress: 'in progress',
  pending: 'pending',
};

const ROW_TONE: Record<PlanItemStatus, string> = {
  completed: 'text-muted-foreground line-through decoration-muted-foreground/60',
  in_progress: 'font-medium text-foreground',
  pending: 'text-muted-foreground',
};

/** How many items are done, and which one is running (the first `in_progress`). */
function tally(items: PlanItem[]) {
  return {
    done: items.filter((i) => i.status === 'completed').length,
    total: items.length,
    current: items.find((i) => i.status === 'in_progress'),
  };
}

/** "2 of 4 done · Write the intro": the count, then the running item's label when there is one. */
export function planSummary(items: PlanItem[]): string {
  const { done, total, current } = tally(items);
  const base = `${done} of ${total} done`;
  return current && done < total ? `${base} · ${truncateForDisplay(current.label, MAX_LINE_LABEL_CHARS)}` : base;
}

export interface PlanItemRowProps {
  /** The item's text. Model output when it came from `kai_plan`: rendered as text. */
  label?: string;
  /** Replaces `label` with your own content (a facade's `<slot />`). */
  children?: JSX.Element;
  /** Default `pending`. Names the glyph for assistive tech and styles the row. */
  status?: PlanItemStatus;
  /** The row's root element. A list item by default; a host that carries `role="listitem"` itself asks for a plain block. */
  as?: 'li' | 'div';
  class?: string;
}

/** One row of the list: a status glyph (an image named "completed", "in progress" or "pending") and the label. */
export function PlanItemRow(props: PlanItemRowProps) {
  const status = (): PlanItemStatus => (props.status && props.status in STATUS_NAME ? props.status : 'pending');
  const body = () => (
    <>
      <span
        class="mt-px flex size-4 shrink-0 items-center justify-center"
        role="img"
        aria-label={STATUS_NAME[status()]}
        data-kai-status={status()}
      >
        <Show when={status() === 'completed'}><CircleCheck class="size-3.5 text-success" aria-hidden="true" /></Show>
        <Show when={status() === 'in_progress'}>
          <LoaderCircle class="size-3.5 text-foreground motion-safe:animate-spin" aria-hidden="true" />
        </Show>
        <Show when={status() === 'pending'}><Circle class="size-3.5 text-muted-foreground" aria-hidden="true" /></Show>
      </span>
      <span class="min-w-0 break-words">
        <Show when={'children' in props} fallback={truncateForDisplay(props.label ?? '', MAX_LABEL_CHARS)}>{props.children}</Show>
      </span>
    </>
  );
  const cls = () => cn('flex items-start gap-2.5', ROW_TONE[status()], props.class);
  return (
    <Show
      when={(props.as ?? 'li') === 'li'}
      fallback={<div class={cls()} data-kai-plan-item="" data-kai-status={status()}>{body()}</div>}
    >
      <li class={cls()} data-kai-plan-item="" data-kai-status={status()}>{body()}</li>
    </Show>
  );
}

export interface PlanProps {
  /** The plan, as `planFromMessages` returns it. Builds the rows in data mode; in item mode it still feeds the summary line and the bar. */
  items?: PlanItem[];
  /** Item mode: the rows, as `PlanItemRow`s or a `<slot />` of `kai-plan-item`s. Replaces the built rows. */
  children?: JSX.Element;
  /** Force item mode on or off. Default: on when `children` was given. A facade that always forwards a children slot sets it. */
  itemMode?: boolean;
  /** The header while open. Default `Plan`. */
  label?: string;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default closed. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  controllerRef?: (api: PlanController) => void;
  class?: string;
}

/**
 * The agent's plan: "2 of 4 done · <the running item>" that opens to every item, over a thin
 * progress bar that turns green when the plan is done. No surface of its own; put it in the
 * prompt input's `above` region.
 */
export function Plan(props: PlanProps) {
  const [local] = splitProps(props, [
    'items', 'children', 'itemMode', 'label', 'open', 'defaultOpen', 'onOpenChange', 'controllerRef', 'class',
  ]);
  const [open, setOpen] = createControllableSignal(() => local.open, !!local.defaultOpen);
  const items = () => local.items ?? [];
  const stats = () => tally(items());
  const finished = () => stats().total > 0 && stats().done === stats().total;
  const listId = createUniqueId();
  const change = (next: boolean) => {
    if (next === open()) return;
    setOpen(next);
    local.onOpenChange?.(next);
  };
  local.controllerRef?.({ open, setOpen: change });

  return (
    <Show when={items().length > 0}>
      <div role="group" aria-label={local.label || 'Plan'} class={cn('w-full text-meta', local.class)} data-kai-plan="">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center gap-2 text-left"
          aria-expanded={open()}
          aria-controls={listId}
          onClick={() => change(!open())}
        >
          <Show
            when={open()}
            fallback={
              <>
                <Show
                  when={finished()}
                  fallback={
                    <LoaderCircle class="size-3.5 shrink-0 text-muted-foreground motion-safe:animate-spin" aria-hidden="true" />
                  }
                >
                  <CircleCheck class="size-3.5 shrink-0 text-success" aria-hidden="true" />
                </Show>
                <span class="min-w-0 truncate text-muted-foreground" data-kai-plan-line="">
                  {stats().done} of {stats().total} done
                  <Show when={stats().current && !finished()}>
                    {' · '}
                    <TextShimmer>{truncateForDisplay(stats().current!.label, MAX_LINE_LABEL_CHARS)}</TextShimmer>
                  </Show>
                </span>
              </>
            }
          >
            <span class="min-w-0 truncate font-medium text-foreground">{truncateForDisplay(local.label || 'Plan', 60)}</span>
            <span class="shrink-0 text-muted-foreground">{stats().done} of {stats().total} done</span>
          </Show>
          <ChevronDown
            class={cn('ml-auto size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open() && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        <ProgressBar
          class={cn('mt-2 [&_[part=track]]:h-0.5', !finished() && '[&_[part=fill]]:bg-muted-foreground')}
          value={stats().done}
          max={stats().total}
          tone={finished() ? 'success' : 'primary'}
          aria-label={`${stats().done} of ${stats().total} steps done`}
        />
        <Show when={open()}>
          <ol id={listId} class="mt-2.5 flex flex-col gap-1.5">
            <Show when={local.itemMode ?? 'children' in props} fallback={
              <For each={items()}>{(it) => <PlanItemRow label={it.label} status={it.status} />}</For>
            }>
              {local.children}
            </Show>
          </ol>
        </Show>
      </div>
    </Show>
  );
}
