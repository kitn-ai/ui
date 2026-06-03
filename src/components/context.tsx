import { type JSX, Show, createContext, createMemo, splitProps, useContext } from 'solid-js';
import { HoverCard as KHoverCard } from '@kobalte/core/hover-card';
import { cn } from '../utils/cn';
import { Button } from '../ui/button';

const ICON_RADIUS = 10;
const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 2;
const PERCENT_MAX = 100;

interface ContextSchema {
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCost?: number;
}

const ContextCtx = createContext<ContextSchema>();

function useContextValue(): ContextSchema {
  const ctx = useContext(ContextCtx);
  if (!ctx) {
    throw new Error('Context components must be used within Context');
  }
  return ctx;
}

const fmtCompact = new Intl.NumberFormat('en-US', { notation: 'compact' });
const fmtPercent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, style: 'percent' });
const fmtCurrency = new Intl.NumberFormat('en-US', { currency: 'USD', style: 'currency' });

// --- Root provider ---

export interface ContextProps {
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCost?: number;
  children?: JSX.Element;
}

export function Context(props: ContextProps) {
  const value = createMemo<ContextSchema>(() => ({
    usedTokens: props.usedTokens,
    maxTokens: props.maxTokens,
    inputTokens: props.inputTokens,
    outputTokens: props.outputTokens,
    reasoningTokens: props.reasoningTokens,
    cacheTokens: props.cacheTokens,
    estimatedCost: props.estimatedCost,
  }));

  return (
    <ContextCtx.Provider value={value()}>
      <KHoverCard openDelay={0} closeDelay={0}>
        {props.children}
      </KHoverCard>
    </ContextCtx.Provider>
  );
}

// --- Icon (internal) ---

function ContextIcon() {
  const ctx = useContextValue();
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const usedPercent = createMemo(() => ctx.usedTokens / ctx.maxTokens);
  const dashOffset = createMemo(() => circumference * (1 - usedPercent()));

  return (
    <svg
      aria-label="Model context usage"
      height="20"
      role="img"
      style={{ color: 'currentcolor' }}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width="20"
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.25"
        r={ICON_RADIUS}
        stroke="currentColor"
        stroke-width={ICON_STROKE_WIDTH}
      />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.7"
        r={ICON_RADIUS}
        stroke="currentColor"
        stroke-dasharray={`${circumference} ${circumference}`}
        stroke-dashoffset={dashOffset()}
        stroke-linecap="round"
        stroke-width={ICON_STROKE_WIDTH}
        style={{ transform: 'rotate(-90deg)', 'transform-origin': 'center' }}
      />
    </svg>
  );
}

// --- Trigger ---

export interface ContextTriggerProps {
  children?: JSX.Element;
  class?: string;
}

export function ContextTrigger(props: ContextTriggerProps) {
  const ctx = useContextValue();
  const usedPercent = createMemo(() => ctx.usedTokens / ctx.maxTokens);
  const renderedPercent = createMemo(() => fmtPercent.format(usedPercent()));

  return (
    <KHoverCard.Trigger as="span">
      <Show
        when={!props.children}
        fallback={props.children}
      >
        <Button type="button" variant="ghost" class={props.class}>
          <span class="font-medium text-muted-foreground">{renderedPercent()}</span>
          <ContextIcon />
        </Button>
      </Show>
    </KHoverCard.Trigger>
  );
}

// --- Content ---

export interface ContextContentProps {
  class?: string;
  children?: JSX.Element;
}

export function ContextContent(props: ContextContentProps) {
  return (
    <KHoverCard.Portal>
      <KHoverCard.Content
        class={cn(
          'z-50 min-w-60 divide-y divide-border overflow-hidden rounded-lg bg-card shadow-lg animate-in fade-in-0 zoom-in-95',
          props.class
        )}
      >
        {props.children}
      </KHoverCard.Content>
    </KHoverCard.Portal>
  );
}

// --- Content Header ---

export interface ContextContentHeaderProps {
  class?: string;
  children?: JSX.Element;
}

export function ContextContentHeader(props: ContextContentHeaderProps) {
  const ctx = useContextValue();
  const usedPercent = createMemo(() => ctx.usedTokens / ctx.maxTokens);
  const displayPct = createMemo(() => fmtPercent.format(usedPercent()));
  const used = createMemo(() => fmtCompact.format(ctx.usedTokens));
  const total = createMemo(() => fmtCompact.format(ctx.maxTokens));
  const barWidth = createMemo(() => `${Math.min(usedPercent() * PERCENT_MAX, PERCENT_MAX)}%`);

  const colorClass = createMemo(() => {
    const pct = usedPercent() * PERCENT_MAX;
    if (pct > 90) return 'bg-red-400';
    if (pct > 70) return 'bg-yellow-400';
    return 'bg-primary';
  });

  return (
    <div class={cn('w-full space-y-2 p-3', props.class)}>
      <Show when={!props.children} fallback={props.children}>
        <div class="flex items-center justify-between gap-3 text-xs">
          <p>{displayPct()}</p>
          <p class="font-mono text-muted-foreground">
            {used()} / {total()}
          </p>
        </div>
        <div class="space-y-2">
          <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              class={cn('h-full rounded-full transition-all', colorClass())}
              style={{ width: barWidth() }}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}

// --- Content Body ---

export interface ContextContentBodyProps {
  class?: string;
  children?: JSX.Element;
}

export function ContextContentBody(props: ContextContentBodyProps) {
  return (
    <div class={cn('w-full p-3', props.class)}>
      {props.children}
    </div>
  );
}

// --- Content Footer ---

export interface ContextContentFooterProps {
  class?: string;
  children?: JSX.Element;
}

export function ContextContentFooter(props: ContextContentFooterProps) {
  const ctx = useContextValue();
  const totalCost = createMemo(() =>
    fmtCurrency.format(ctx.estimatedCost ?? 0)
  );

  return (
    <div
      class={cn(
        'flex w-full items-center justify-between gap-3 bg-muted p-3 text-xs',
        props.class
      )}
    >
      <Show when={!props.children} fallback={props.children}>
        <span class="text-muted-foreground">Total cost</span>
        <span>{totalCost()}</span>
      </Show>
    </div>
  );
}

// --- Token row helper ---

function TokensDisplay(props: { tokens?: number }) {
  return (
    <span>
      {props.tokens === undefined
        ? '\u2014'
        : fmtCompact.format(props.tokens)}
    </span>
  );
}

// --- Specialized usage rows ---

export interface ContextUsageRowProps {
  class?: string;
  children?: JSX.Element;
}

export function ContextInputUsage(props: ContextUsageRowProps) {
  const ctx = useContextValue();
  return (
    <Show when={props.children || ctx.inputTokens}>
      <Show when={!props.children} fallback={props.children}>
        <div class={cn('flex items-center justify-between text-xs', props.class)}>
          <span class="text-muted-foreground">Input</span>
          <TokensDisplay tokens={ctx.inputTokens} />
        </div>
      </Show>
    </Show>
  );
}

export function ContextOutputUsage(props: ContextUsageRowProps) {
  const ctx = useContextValue();
  return (
    <Show when={props.children || ctx.outputTokens}>
      <Show when={!props.children} fallback={props.children}>
        <div class={cn('flex items-center justify-between text-xs', props.class)}>
          <span class="text-muted-foreground">Output</span>
          <TokensDisplay tokens={ctx.outputTokens} />
        </div>
      </Show>
    </Show>
  );
}

export function ContextReasoningUsage(props: ContextUsageRowProps) {
  const ctx = useContextValue();
  return (
    <Show when={props.children || ctx.reasoningTokens}>
      <Show when={!props.children} fallback={props.children}>
        <div class={cn('flex items-center justify-between text-xs', props.class)}>
          <span class="text-muted-foreground">Reasoning</span>
          <TokensDisplay tokens={ctx.reasoningTokens} />
        </div>
      </Show>
    </Show>
  );
}

export function ContextCacheUsage(props: ContextUsageRowProps) {
  const ctx = useContextValue();
  return (
    <Show when={props.children || ctx.cacheTokens}>
      <Show when={!props.children} fallback={props.children}>
        <div class={cn('flex items-center justify-between text-xs', props.class)}>
          <span class="text-muted-foreground">Cache</span>
          <TokensDisplay tokens={ctx.cacheTokens} />
        </div>
      </Show>
    </Show>
  );
}
