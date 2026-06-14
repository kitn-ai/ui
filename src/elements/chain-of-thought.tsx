import { For, Show } from 'solid-js';
import { defineWebComponent } from './define';
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from '../components/chain-of-thought';

interface Step {
  /** The step's heading (the always-visible trigger). */
  label: string;
  /** Optional expandable detail. */
  content?: string;
}

interface Props extends Record<string, unknown> {
  /** The reasoning steps. Set as a JS property. Compound sub-parts collapse to
   *  this one data model (Route 1). */
  steps: Step[];
}

/**
 * `<kc-chain-of-thought>` — step-by-step reasoning with connectors and
 * per-step collapsible detail. Data via the `steps` property.
 */
defineWebComponent<Props>('kc-chain-of-thought', {
  steps: [],
}, (props) => (
  <ChainOfThought>
    <For each={props.steps}>
      {(step, i) => (
        <ChainOfThoughtStep isLast={i() === props.steps.length - 1}>
          <ChainOfThoughtTrigger>{step.label}</ChainOfThoughtTrigger>
          <Show when={step.content}>
            <ChainOfThoughtContent>
              <ChainOfThoughtItem>{step.content}</ChainOfThoughtItem>
            </ChainOfThoughtContent>
          </Show>
        </ChainOfThoughtStep>
      )}
    </For>
  </ChainOfThought>
));
