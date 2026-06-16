import { Show, createEffect, createMemo, on } from 'solid-js';
import { defineWebComponent } from './define';
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
  computeSeverity,
  DEFAULT_WARN_THRESHOLD,
  DEFAULT_DANGER_THRESHOLD,
  type ContextSeverity,
} from '../components/context';

interface ContextUsage {
  /** Tokens consumed so far in the context window (drives the meter fill). */
  usedTokens: number;
  /** The model's total context-window size in tokens. */
  maxTokens: number;
  /** Tokens attributed to the prompt/input, shown in the breakdown. */
  inputTokens?: number;
  /** Tokens attributed to the generated output, shown in the breakdown. */
  outputTokens?: number;
  /** Tokens attributed to reasoning/thinking, shown when present. */
  reasoningTokens?: number;
  /** Tokens served from prompt cache, shown when present. */
  cacheTokens?: number;
  /** Estimated cost in dollars for this usage, shown in the footer. */
  estimatedCost?: number;
}

interface Props extends Record<string, unknown> {
  /** Token-usage data. Set as a JS property. */
  context?: ContextUsage;
  /**
   * Fraction (0–1) above which the meter turns yellow.
   * Defaults to `0.7` (70%).
   */
  warnThreshold?: number;
  /**
   * Fraction (0–1) above which the meter turns red.
   * Defaults to `0.9` (90%).
   */
  dangerThreshold?: number;
}

/** Events fired by `<kc-context>`. */
interface Events {
  /**
   * Fires when the computed severity level changes (ok → warn → danger or back).
   * `detail.level` is `'ok'`, `'warn'`, or `'danger'`.
   */
  'kc-threshold-change': { level: ContextSeverity };
}

/**
 * `<kc-context>` — a token/context-window usage meter with a hover-card
 * breakdown (input/output/reasoning/cache + estimated cost). Data via the
 * `context` property.
 *
 * **Color thresholds** are configurable via `warnThreshold` (default `0.7`)
 * and `dangerThreshold` (default `0.9`). When the computed severity level
 * changes, a `kc-threshold-change` event fires with `detail.level` set to
 * `'ok'`, `'warn'`, or `'danger'`.
 */
defineWebComponent<Props, Events>('kc-context', {
  context: undefined,
  warnThreshold: undefined,
  dangerThreshold: undefined,
}, (props, { dispatch }) => {
  const warn = () => (props.warnThreshold as number | undefined) ?? DEFAULT_WARN_THRESHOLD;
  const danger = () => (props.dangerThreshold as number | undefined) ?? DEFAULT_DANGER_THRESHOLD;

  const severity = createMemo<ContextSeverity>(() => {
    const ctx = props.context;
    if (!ctx) return 'ok';
    return computeSeverity(ctx.usedTokens / ctx.maxTokens, warn(), danger());
  });

  // Fire kc-threshold-change only when the level actually changes.
  createEffect(on(severity, (level, prev) => {
    if (prev !== undefined && level !== prev) {
      dispatch('kc-threshold-change', { level });
    }
  }));

  return (
    <Show when={props.context}>
      <Context
        usedTokens={props.context!.usedTokens}
        maxTokens={props.context!.maxTokens}
        inputTokens={props.context!.inputTokens}
        outputTokens={props.context!.outputTokens}
        reasoningTokens={props.context!.reasoningTokens}
        cacheTokens={props.context!.cacheTokens}
        estimatedCost={props.context!.estimatedCost}
        warnThreshold={warn()}
        dangerThreshold={danger()}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <div class="space-y-1.5">
              <ContextInputUsage />
              <ContextOutputUsage />
              <Show when={props.context!.reasoningTokens}><ContextReasoningUsage /></Show>
              <Show when={props.context!.cacheTokens}><ContextCacheUsage /></Show>
            </div>
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </Show>
  );
});
