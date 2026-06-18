import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { ModelSwitcher } from '../components/model-switcher';
import type { ModelOption } from '../types';

interface Props extends Record<string, unknown> {
  /** The selectable models. Set as a JS property (array). */
  models: ModelOption[];
  /** The currently-selected model id. Defaults to the first model. */
  currentModel?: string;
}

/** Events fired by `<kai-model-switcher>`. */
interface Events {
  /** A model was selected. */
  'kai-model-change': { modelId: string };
}

/**
 * Parse a single light-DOM `<kai-model>` element into a `ModelOption` descriptor.
 * Attribute mapping:
 *  - `id`        → ModelOption.id
 *  - textContent    → ModelOption.name
 *  - `provider`     → ModelOption.provider (optional)
 *  - `description`  → ModelOption.description (optional subtitle)
 *  - `group`        → ModelOption.group (optional collapsible section)
 */
export function parseKaiModelElement(n: Element): ModelOption {
  return {
    id: n.getAttribute('id') ?? '',
    name: n.textContent?.trim() ?? '',
    provider: n.getAttribute('provider') ?? undefined,
    description: n.getAttribute('description') ?? undefined,
    group: n.getAttribute('group') ?? undefined,
  };
}

/**
 * `<kai-model-switcher>` — an event-emitting leaf element. Data in via the
 * `models` property, selection out via a `kai-model-change` event. Mirrors the
 * header switcher inside `<kai-chat>` as a standalone, composable piece.
 *
 * Note: like the underlying primitive, this only renders when more than one
 * model is provided.
 *
 * **How to use:**
 *
 * _Property API_ — set `models` as a JS property and listen for `kai-model-change`:
 * ```js
 * el.models = [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' }];
 * el.addEventListener('kai-model-change', (e) => console.log(e.detail.modelId));
 * ```
 *
 * _Declarative child API_ — compose `<kai-model>` light-DOM children (no JS needed):
 * ```html
 * <kai-model-switcher>
 *   <kai-model id="gpt-4o" provider="OpenAI">GPT-4o</kai-model>
 *   <kai-model id="gpt-4o-mini" provider="OpenAI">GPT-4o mini</kai-model>
 * </kai-model-switcher>
 * ```
 * Each `<kai-model>` child carries `id` (required), `provider` (optional), and
 * a text label as its `textContent`. Children are light-DOM data carriers hidden
 * by Shadow DOM. Prop `models` items render first; declarative children follow.
 */
defineWebComponent<Props, Events>('kai-model-switcher', {
  models: [],
  currentModel: undefined,
}, (props, { dispatch, element }) => {
  // Read declarative <kai-model> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedModels, setSlottedModels] = createSignal<ModelOption[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-model')];
      setSlottedModels(nodes.map(parseKaiModelElement));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Merge prop models (first) with declarative children (after).
  const allModels = () => [...(props.models ?? []), ...slottedModels()];

  return (
    <ModelSwitcher
      models={allModels()}
      currentModelId={props.currentModel ?? allModels()[0]?.id ?? ''}
      onModelChange={(modelId) => dispatch('kai-model-change', { modelId })}
    />
  );
});
