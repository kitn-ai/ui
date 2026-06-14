import { Show } from 'solid-js';
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
}

/**
 * `<kc-context>` — a token/context-window usage meter with a hover-card
 * breakdown (input/output/reasoning/cache + estimated cost). Data via the
 * `context` property.
 */
defineWebComponent<Props>('kc-context', {
  context: undefined,
}, (props) => (
  <Show when={props.context}>
    <Context
      usedTokens={props.context!.usedTokens}
      maxTokens={props.context!.maxTokens}
      inputTokens={props.context!.inputTokens}
      outputTokens={props.context!.outputTokens}
      reasoningTokens={props.context!.reasoningTokens}
      cacheTokens={props.context!.cacheTokens}
      estimatedCost={props.context!.estimatedCost}
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
));
