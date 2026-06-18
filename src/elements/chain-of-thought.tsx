import { For, Show, createSignal, onMount, onCleanup } from 'solid-js';
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

/** Parse a single light-DOM `<kai-step>` element into a `Step` descriptor.
 *  Attribute mapping:
 *   - `label`       → Step.label   (the always-visible heading)
 *   - textContent   → Step.content (optional expandable detail)
 */
export function parseKaiStepElement(n: Element): Step {
  return {
    label: n.getAttribute('label') ?? '',
    content: n.textContent?.trim() || undefined,
  };
}

/**
 * `<kai-chain-of-thought>` — step-by-step reasoning with connectors and
 * per-step collapsible detail.
 *
 * **Route 1 — JS property:** set the `steps` property to an array of
 * `{ label, content? }` objects.
 *
 * **Route 2 — declarative children:** compose `<kai-step>` child elements in
 * light DOM (hidden by the Shadow DOM — pure data carriers). The `label`
 * attribute becomes the step heading; `textContent` becomes the expandable
 * detail. Children are merged after any prop steps.
 *
 * ```html
 * <kai-chain-of-thought>
 *   <kai-step label="Understand the request">The user wants composable web components.</kai-step>
 *   <kai-step label="Design the API">Route 1: variant + flags; rich data via properties.</kai-step>
 *   <kai-step label="Build & verify"></kai-step>
 * </kai-chain-of-thought>
 * ```
 */
defineWebComponent<Props>('kai-chain-of-thought', {
  steps: [],
}, (props, { element }) => {
  // Read declarative <kai-step> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedSteps, setSlottedSteps] = createSignal<Step[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-step')];
      setSlottedSteps(nodes.map(parseKaiStepElement));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Prop steps first; declarative children appended after.
  const allSteps = () => [...props.steps, ...slottedSteps()];

  return (
    <ChainOfThought>
      <For each={allSteps()}>
        {(step, i) => (
          <ChainOfThoughtStep isLast={i() === allSteps().length - 1}>
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
  );
});
