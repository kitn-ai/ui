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
import { HoverCard } from '../ui/hover-card';
import { Card } from './card';
import type { CardEnvelope, CardEvent, CardHost, CardResolution } from '../primitives/card-contract';
import { useCardResolution } from './use-card-resolution';
import { emitCardEvent } from '../primitives/card-routing';
import { useCardHost } from '../primitives/card-host';
import { Check } from 'lucide-solid';

// ─────────────────────────────────────────────────────────────────────────────
// Types (choice.schema.json) — see src/primitives/card-schemas/choice.schema.json
// ─────────────────────────────────────────────────────────────────────────────

export interface ChoiceOptionMedia {
  image?: string;
  imageAlt?: string;
  icon?: string;
}

export interface ChoiceOption {
  id: string; // required, unique within the card
  label: string; // required
  description?: string;
  media?: ChoiceOptionMedia;
  meta?: string; // trailing freeform text (e.g. price/badge)
  recommended?: boolean; // renders a "Recommended" pill
  disabled?: boolean; // not selectable; skipped in keyboard nav
  payload?: unknown; // echoed back in the emitted action
}

export type ChoiceAllowOther = boolean | { label?: string; placeholder?: string };

export interface ChoiceCardData {
  prompt?: string; // optional question/body above the options
  options: ChoiceOption[]; // 1..N
  allowOther?: ChoiceAllowOther; // free-text escape
  submitLabel?: string; // label for the Submit button (default 'Submit')
}

export type ChoiceCardEnvelope = CardEnvelope<'choice', ChoiceCardData>;

export const CHOICE_CARD_TYPE = 'choice' as const;

/** The reserved action id emitted by the `allowOther` free-text submit. */
export const OTHER_ACTION = '__other__' as const;

const DEFAULT_OTHER_LABEL = 'Other…';

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (unit-tested in isolation).
// ─────────────────────────────────────────────────────────────────────────────

/** De-dupe options by id (first wins) and validate their shape. Returns the usable
 *  list + an optional error message when there's nothing renderable. Modeled on
 *  `normalizeActions`. */
export function normalizeOptions(options: unknown): {
  options: ChoiceOption[];
  error?: string;
} {
  if (!Array.isArray(options) || options.length === 0) {
    return { options: [], error: "This card couldn't be displayed." };
  }
  const seen = new Set<string>();
  const out: ChoiceOption[] = [];
  for (const o of options) {
    if (!o || typeof o !== 'object') continue;
    const opt = o as Partial<ChoiceOption>;
    if (typeof opt.id !== 'string' || opt.id.length === 0) continue;
    if (typeof opt.label !== 'string' || opt.label.length === 0) continue;
    if (seen.has(opt.id)) {
      // eslint-disable-next-line no-console
      console.warn(`[kc-choice] duplicate option id "${opt.id}" ignored`);
      continue;
    }
    seen.add(opt.id);
    const media =
      opt.media && typeof opt.media === 'object'
        ? {
            image: typeof opt.media.image === 'string' ? opt.media.image : undefined,
            imageAlt: typeof opt.media.imageAlt === 'string' ? opt.media.imageAlt : undefined,
            icon: typeof opt.media.icon === 'string' ? opt.media.icon : undefined,
          }
        : undefined;
    out.push({
      id: opt.id,
      label: opt.label,
      description: typeof opt.description === 'string' ? opt.description : undefined,
      media,
      meta: typeof opt.meta === 'string' ? opt.meta : undefined,
      recommended: opt.recommended === true,
      disabled: opt.disabled === true,
      payload: opt.payload,
    });
  }
  if (out.length === 0) return { options: [], error: "This card couldn't be displayed." };
  return { options: out };
}

/** Resolve the `allowOther` data field to a config (or null when off). */
export function resolveOtherConfig(
  allowOther: ChoiceAllowOther | undefined,
): { label: string; placeholder: string | undefined } | null {
  if (!allowOther) return null;
  if (allowOther === true) return { label: DEFAULT_OTHER_LABEL, placeholder: undefined };
  if (typeof allowOther === 'object') {
    return {
      label:
        typeof allowOther.label === 'string' && allowOther.label.length > 0
          ? allowOther.label
          : DEFAULT_OTHER_LABEL,
      placeholder: typeof allowOther.placeholder === 'string' ? allowOther.placeholder : undefined,
    };
  }
  return null;
}

/** Index of the next non-disabled option, moving by `dir` (+1/-1) from `from`,
 *  wrapping. Returns `from` when nothing else is focusable. */
export function nextEnabledIndex(options: ChoiceOption[], from: number, dir: 1 | -1): number {
  const n = options.length;
  if (n === 0) return from;
  for (let step = 1; step <= n; step += 1) {
    const i = (((from + dir * step) % n) + n) % n;
    if (!options[i].disabled) return i;
  }
  return from;
}

/** The first non-disabled option index (the initial roving tab stop), or -1. */
export function firstEnabledIndex(options: ChoiceOption[]): number {
  return options.findIndex((o) => !o.disabled);
}

// ─────────────────────────────────────────────────────────────────────────────
// The <ChoiceCard> component.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChoiceCardProps {
  /** The choice definition (CardEnvelope.data). */
  data?: ChoiceCardData;
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
  /** When set, render the chromed read-only view instead of the interactive radiogroup. */
  resolution?: CardResolution;
}

/**
 * `ChoiceCard` — a single-select "pick one of N rich options" card (plans, products,
 * flights, quick replies) inside `Card` chrome. The options are a WAI-ARIA radiogroup
 * (list rows) with roving tabindex: clicking a row (or Space/Enter on the focused row)
 * **selects** it locally without emitting; a **Submit** button below the list then emits
 * the Card contract's **`action`** verb (`{ kind:'action', cardId, action: option.id,
 * payload }`) and resolves the card (chosen option shown read-only) so the same pick can't
 * double-fire. An optional `allowOther` free-text escape appends a selectable "Other…" row;
 * selecting it reveals an inline text input, and the same Submit emits `action:'__other__'`
 * with `{ text }`. Emits `ready` on mount and `error` for an unusable definition (inline
 * error state).
 */
export function ChoiceCard(props: ChoiceCardProps): JSX.Element {
  const merged = mergeProps({ cardId: 'kc-choice' }, props);
  const [local] = splitProps(merged, ['data', 'cardId', 'heading', 'host', 'hostElement', 'class', 'resolution']);

  const ctxHost = useCardHost();
  const uid = createUniqueId();

  const emit = (event: CardEvent): void => {
    const h = local.host ?? ctxHost;
    if (h) h.emit(event);
    else if (local.hostElement) emitCardEvent(local.hostElement, event);
  };

  const normalized = createMemo(() => normalizeOptions(local.data?.options));
  const valid = createMemo(() => normalized().error === undefined);
  const errorMessage = createMemo(() => normalized().error ?? '');
  const baseOptions = createMemo(() => normalized().options);
  const otherCfg = createMemo(() => resolveOtherConfig(local.data?.allowOther));

  // The full radio list = base options + a synthetic "Other" option when allowOther is set.
  const options = createMemo<ChoiceOption[]>(() => {
    const cfg = otherCfg();
    if (!cfg) return baseOptions();
    return [...baseOptions(), { id: OTHER_ACTION, label: cfg.label }];
  });

  const res = useCardResolution({ prop: () => local.resolution, data: () => local.data });

  const resolvedId = createMemo(() => {
    const r = res.resolution();
    return r && r.kind === 'action' ? r.action : undefined;
  });

  const [focusIndex, setFocusIndex] = createSignal(0);
  const [selectedId, setSelectedId] = createSignal<string | undefined>(undefined);
  const [otherText, setOtherText] = createSignal('');

  let groupRef: HTMLDivElement | undefined;
  let otherInputRef: HTMLInputElement | undefined;

  const otherSelected = createMemo(() => selectedId() === OTHER_ACTION);

  // Reset all transient state whenever a NEW definition arrives.
  createEffect(
    on(
      () => local.data,
      () => {
        setSelectedId(undefined);
        setOtherText('');
        setFocusIndex(Math.max(0, firstEnabledIndex(options())));
      },
    ),
  );

  const resolvedChoice = createMemo(() => {
    const r = res.resolution();
    if (!r || r.kind !== 'action') return undefined;
    if (r.action === OTHER_ACTION) {
      const text = (r.payload as { text?: string } | undefined)?.text ?? '';
      return { other: true as const, text };
    }
    const opt = baseOptions().find((o) => o.id === r.action);
    return { other: false as const, opt, id: r.action };
  });

  // ready / error lifecycle emits.
  createEffect(
    on(valid, (ok) => {
      if (ok) emit({ kind: 'ready', cardId: local.cardId });
      else emit({ kind: 'error', cardId: local.cardId, message: errorMessage() });
    }),
  );

  // Surface the resolved option id for host styling.
  createEffect(() => {
    const el = local.hostElement;
    if (!el) return;
    const id = resolvedId();
    if (id !== undefined) el.setAttribute('data-kc-resolved', id);
    else el.removeAttribute('data-kc-resolved');
  });

  const isOther = (opt: ChoiceOption): boolean => opt.id === OTHER_ACTION;

  // Select (do NOT emit) the given option locally.
  const select = (opt: ChoiceOption): void => {
    if (res.isResolved()) return; // single-shot
    if (opt.disabled) return;
    setSelectedId(opt.id);
    if (isOther(opt)) {
      queueMicrotask(() => otherInputRef?.focus());
    }
  };

  // Whether the current selection is submittable.
  const canSubmit = createMemo(() => {
    if (res.isResolved()) return false;
    const id = selectedId();
    if (id === undefined) return false;
    if (id === OTHER_ACTION) return otherText().trim().length > 0;
    return true;
  });

  const submitLabel = (): string => local.data?.submitLabel ?? 'Submit';

  // Submit the current selection: emit `action` then resolve (single-shot).
  const submit = (): void => {
    if (res.isResolved()) return;
    const id = selectedId();
    if (id === undefined) return;
    if (id === OTHER_ACTION) {
      const text = otherText().trim();
      if (text.length === 0) return;
      emit({ kind: 'action', cardId: local.cardId, action: OTHER_ACTION, payload: { text } });
      res.setLocal({ kind: 'action', action: OTHER_ACTION, payload: { text } });
      return;
    }
    const opt = baseOptions().find((o) => o.id === id);
    if (!opt) return;
    emit({
      kind: 'action',
      cardId: local.cardId,
      action: opt.id,
      ...(opt.payload !== undefined ? { payload: opt.payload } : {}),
    });
    res.setLocal({
      kind: 'action',
      action: opt.id,
      ...(opt.payload !== undefined ? { payload: opt.payload } : {}),
    });
  };

  const focusRadio = (index: number): void => {
    const radios = groupRef?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[index]?.focus();
  };

  const onGroupKeyDown = (e: KeyboardEvent): void => {
    if (res.isResolved()) return;
    const opts = options();
    const i = focusIndex();
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = nextEnabledIndex(opts, i, 1);
      setFocusIndex(next);
      focusRadio(next);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = nextEnabledIndex(opts, i, -1);
      setFocusIndex(next);
      focusRadio(next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const next = Math.max(0, firstEnabledIndex(opts));
      setFocusIndex(next);
      focusRadio(next);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const opt = opts[i];
      if (opt) select(opt);
    }
  };

  const groupLabel = (): string => local.heading ?? local.data?.prompt ?? 'Choose an option';
  const promptId = `kc-choice-prompt-${uid}`;
  const otherInputId = `kc-choice-other-${uid}`;

  return (
    <Show when={valid()} fallback={<Card heading={local.heading} errorMessage={errorMessage()} />}>
      <ErrorBoundary
        fallback={() => {
          emit({ kind: 'error', cardId: local.cardId, message: 'The card failed to render.' });
          return <Card heading={local.heading} errorMessage="The card failed to render." />;
        }}
      >
        <Card heading={local.heading}>
          <div class={cn('flex flex-col gap-3', local.class)}>
            <Show when={local.data?.prompt}>
              <p id={promptId} class="text-sm text-foreground">
                {local.data?.prompt}
              </p>
            </Show>

            <Show
              when={!res.isResolved()}
              fallback={<ResolvedChoice choice={resolvedChoice()!} optimistic={res.isOptimistic()} />}
            >
              <div
                ref={groupRef}
                role="radiogroup"
                aria-label={groupLabel()}
                aria-describedby={local.data?.prompt ? promptId : undefined}
                class="divide-y divide-border overflow-hidden rounded-lg border border-input"
                onKeyDown={onGroupKeyDown}
              >
                <For each={options()}>
                  {(opt, index) => {
                    const checked = () => selectedId() === opt.id;
                    const tabStop = () =>
                      !opt.disabled && index() === focusIndex() && !res.isResolved();
                    const descId = `kc-choice-desc-${uid}-${opt.id}`;
                    const hasDesc = () => Boolean(opt.description);
                    return (
                      <ListRow
                        opt={opt}
                        checked={checked()}
                        tabStop={tabStop()}
                        descId={descId}
                        hasDesc={hasDesc()}
                        onPick={() => {
                          setFocusIndex(index());
                          select(opt);
                        }}
                        onFocus={() => setFocusIndex(index())}
                      />
                    );
                  }}
                </For>
              </div>

              <Show when={otherSelected()}>
                <div class="flex flex-col gap-2">
                  <label for={otherInputId} class="sr-only">
                    {otherCfg()?.label ?? DEFAULT_OTHER_LABEL}
                  </label>
                  <input
                    id={otherInputId}
                    ref={otherInputRef}
                    type="text"
                    class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={otherCfg()?.placeholder}
                    value={otherText()}
                    onInput={(e) => setOtherText(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                      }
                    }}
                  />
                </div>
              </Show>

              <Button type="button" class="self-end" disabled={!canSubmit()} onClick={submit}>
                {submitLabel()}
              </Button>
            </Show>
          </div>
        </Card>
      </ErrorBoundary>
    </Show>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal list-row presentation: a `role="radio"` with the kit's
// selectable-list styling.
// ─────────────────────────────────────────────────────────────────────────────

interface RowProps {
  opt: ChoiceOption;
  checked: boolean;
  tabStop: boolean;
  descId: string;
  hasDesc: boolean;
  onPick: () => void;
  onFocus: () => void;
}

function RecommendedPill(): JSX.Element {
  return (
    <span class="inline-flex items-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase leading-none tracking-wide text-[var(--color-primary-foreground,white)]">
      Recommended
    </span>
  );
}

/** A leading image thumbnail (alt required for a11y; decorative → empty alt). */
function Thumb(props: { media: ChoiceOptionMedia; class?: string }): JSX.Element {
  return (
    <img
      src={props.media.image}
      alt={props.media.imageAlt ?? ''}
      class={cn('shrink-0 rounded-md object-cover', props.class)}
    />
  );
}

/** A leading named-icon badge (decorative; the label carries the meaning). */
function IconBadge(props: { name: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground"
    >
      {props.name.slice(0, 2)}
    </span>
  );
}

function ListRow(props: RowProps): JSX.Element {
  return (
    <div
      role="radio"
      aria-checked={props.checked}
      aria-disabled={props.opt.disabled ? 'true' : undefined}
      aria-describedby={props.hasDesc ? props.descId : undefined}
      data-option-id={props.opt.id}
      tabindex={props.opt.disabled ? -1 : props.tabStop ? 0 : -1}
      onClick={() => !props.opt.disabled && props.onPick()}
      onFocus={props.onFocus}
      class={cn(
        'flex items-center gap-3 px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        props.opt.disabled
          ? 'cursor-not-allowed opacity-60 text-foreground'
          : 'cursor-pointer hover:bg-muted/50',
        props.checked ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground',
      )}
    >
      <Show when={props.opt.media?.image}>
        <HoverCard
          openDelay={150}
          class="p-1 w-auto"
          placement="right-start"
          trigger={<Thumb media={props.opt.media!} class="h-9 w-9" />}
        >
          <img
            src={props.opt.media!.image}
            alt={props.opt.media!.imageAlt ?? ''}
            class="max-h-80 max-w-80 rounded-md object-contain"
          />
        </HoverCard>
      </Show>
      <Show when={!props.opt.media?.image && props.opt.media?.icon}>
        <IconBadge name={props.opt.media!.icon!} />
      </Show>
      <span
        aria-hidden="true"
        class={cn(
          'flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          props.checked ? 'border-[var(--color-primary)]' : 'border-input bg-background',
        )}
      >
        <Show when={props.checked}>
          <span class="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
        </Show>
      </span>
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="flex items-center gap-2">
          <span class="truncate">{props.opt.label}</span>
          <Show when={props.opt.recommended}>
            <RecommendedPill />
          </Show>
        </span>
        <Show when={props.opt.description}>
          <span id={props.descId} class="text-xs font-normal text-muted-foreground">
            {props.opt.description}
          </span>
        </Show>
      </span>
      <Show when={props.opt.meta}>
        <span class="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
          {props.opt.meta}
        </span>
      </Show>
    </div>
  );
}

function ResolvedChoice(props: {
  choice: { other: true; text: string } | { other: false; opt?: ChoiceOption; id: string };
  optimistic: boolean;
}): JSX.Element {
  const c = props.choice;
  return (
    <div
      class="flex items-center gap-3 rounded-lg border border-input bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground"
      role={props.optimistic ? 'status' : undefined}
    >
      <Check size={16} aria-hidden="true" />
      <Show when={!c.other} fallback={<span>Other: {c.other ? c.text : ''}</span>}>
        <span>{!c.other ? (c.opt?.label ?? c.id) : ''}</span>
        <Show when={!c.other && c.opt?.meta}>
          <span class="ml-auto text-xs font-normal text-muted-foreground">{!c.other ? c.opt?.meta : ''}</span>
        </Show>
      </Show>
    </div>
  );
}
