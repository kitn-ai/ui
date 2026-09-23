import { createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from '../define/define';
import {
  ChainOfThoughtAccordion,
  type ChainOfThoughtController,
  type ChainOfThoughtStepData,
  type ChainOfThoughtType,
} from '../../components/chain-of-thought/chain-of-thought';

/**
 * A reasoning step descriptor.
 *
 * `id` is an OPTIONAL stable key. The Accordion's open-set keys (used by `value`,
 * `defaultValue`, the `kai-value-change` payload, and the index→key resolution
 * behind the methods) are `step.id` when present, else `String(index)`. Set `id`
 * if you want to drive/observe a step by a meaningful key rather than position.
 */
type Step = ChainOfThoughtStepData;

interface Props extends Record<string, unknown> {
  // Compound sub-parts collapse to this one data model (Route 1); each entry is
  // `{ label, content?, id? }`. When both this property and light-DOM children are
  // present, the property's steps come first.
  /** The reasoning steps. JS property (array); omit to pass `<kai-step>` light-DOM children instead. */
  steps?: Step[];
  /** Open mode: `'multiple'` (default, any number of steps open at once) or
   *  `'single'` (at most one open; opening a step closes the others). */
  type?: ChainOfThoughtType;
  // When set, it WINS over user interaction: the consumer owns the open set.
  /** Controlled open step key(s): a string in `single` mode, a string array in `multiple`. JS property. */
  value?: string | string[];
  /** Uncontrolled INITIAL open step key(s), seeding which steps render
   *  expanded. Ignored once `value` is provided. Set as a JS property. */
  defaultValue?: string | string[];
}

/** Events fired by `<kai-chain-of-thought>`. */
interface Events {
  // The consumer owns the open set while `value` is set; it wins over user
  // interaction. Maps Radix Accordion's onValueChange.
  /** The open set changed, by user click or an `expand()`/`collapse()`/`toggle()` call. */
  'kai-value-change': { value: string | string[] };
}

/** Parse a single light-DOM `<kai-step>` element into a `Step` descriptor.
 *  Attribute mapping:
 *   - `label`       → Step.label   (the always-visible heading)
 *   - `step-id`     → Step.id      (optional stable open-set key)
 *   - textContent   → Step.content (optional expandable detail)
 */
export function parseKaiStepElement(n: Element): Step {
  return {
    label: n.getAttribute('label') ?? '',
    content: n.textContent?.trim() || undefined,
    id: n.getAttribute('step-id') ?? undefined,
  };
}

/**
 * Step-by-step reasoning drawn as connected steps, each with its own collapsible
 * detail. `kai-reasoning` is the single thinking block instead.
 */
defineWebComponent<Props, Events>('kai-chain-of-thought', {
  steps: [],
  type: undefined,
  value: undefined,
  defaultValue: undefined,
}, (props, { element, dispatch, expose }) => {
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
  const allSteps = () => [...(props.steps ?? []), ...slottedSteps()];

  // ── Imperative API (instance methods on the host) ──────────────────────────
  // Pattern C: the Accordion component owns the open-set; the facade captures its
  // controller and exposes index-based methods. Every setter routes through the
  // component's onValueChange (handleValueChange below) — the single emit point —
  // so user clicks AND method calls both fire kai-value-change. No prop collisions:
  // the only props are steps/type/value/defaultValue.
  let controller: ChainOfThoughtController | undefined;
  expose({
    /** Open one step's detail by index, or ALL steps when called with no arg. In
     *  `single` mode opening one step closes the others (expand-all keeps the
     *  last). */
    expand: (index?: number) => controller?.expand(index),
    /** Close one step's detail by index, or ALL steps when called with no
     *  arg. */
    collapse: (index?: number) => controller?.collapse(index),
    /** Flip one step's open state by index. */
    toggle: (index?: number) => controller?.toggle(index),
  });

  // Single emit point for the open set — both user clicks and the methods above
  // flow through the component's onValueChange to here.
  const handleValueChange = (value: string | string[]) => {
    dispatch('kai-value-change', { value });
  };

  return (
    <ChainOfThoughtAccordion
      steps={allSteps()}
      type={props.type as ChainOfThoughtType | undefined}
      value={props.value as string | string[] | undefined}
      defaultValue={props.defaultValue as string | string[] | undefined}
      onValueChange={handleValueChange}
      controllerRef={(c) => (controller = c)}
    />
  );
});
