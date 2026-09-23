import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { ModelSwitcher } from '../../components/model/model-switcher';
import { wireDisclosure } from '../disclosure/disclosure';
import type { DropdownController } from '../../components/dropdown/dropdown';
import type { ModelOption } from '../../types';

interface Props extends Record<string, unknown> {
  // When both this property and light-DOM children are present, the property's models
  // come first.
  /** The selectable models. JS property (array); omit to pass `<kai-model>` light-DOM children instead. */
  models?: ModelOption[];
  /** The currently-selected model id. Defaults to the first model. */
  currentModel?: string;
  // Shoelace-style: settable and reflected to the `open` attribute, while the dropdown
  // still self-manages on click/keyboard.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Disable the trigger: click/keyboard and `show()` no longer open the dropdown. */
  disabled?: boolean;
}

/** Events fired by `<kai-model-switcher>`. */
interface Events {
  /** A model was selected. */
  'kai-model-change': { modelId: string };
  /** The model dropdown opened or closed (by click, keyboard, Escape, outside-click, or a method). */
  'kai-open-change': { open: boolean };
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
// Renders only when more than one model is provided, like the primitive it wraps.
// Children are light-DOM data carriers (hidden by Shadow DOM): `id` (required), `provider`,
// `description`, `group` and the text label. `models` items render first, declarative children
// after.
/**
 * A model picker that reports the chosen model outward instead of owning the selection.
 */
defineWebComponent<Props, Events>('kai-model-switcher', {
  models: [],
  currentModel: undefined,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { dispatch, element, flag } = ctx;
  let api: DropdownController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure. When <=1 model the inner
  // Dropdown never mounts, so `api` stays undefined and these methods no-op.
  wireDisclosure(ctx, () => api, () => props.open);

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
      defaultOpen={flag('defaultOpen')}
      disabled={flag('disabled')}
      controllerRef={(a) => (api = a)}
    />
  );
});
