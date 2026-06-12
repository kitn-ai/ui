import { Show } from 'solid-js';
import { defineKitnElement } from './define';
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
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCost?: number;
}

interface Props extends Record<string, unknown> {
  /** Token-usage data. Set as a JS property. */
  context?: ContextUsage;
}

/**
 * `<kitn-context-meter>` — a token/context-window usage meter with a hover-card
 * breakdown (input/output/reasoning/cache + estimated cost). Data via the
 * `context` property.
 */
defineKitnElement<Props>('kitn-context-meter', {
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
