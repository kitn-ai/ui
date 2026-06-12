import { defineKitnElement } from './define';
import { ModelSwitcher } from '../components/model-switcher';
import type { ModelOption } from '../types';

interface Props extends Record<string, unknown> {
  /** The selectable models. Set as a JS property (array). */
  models: ModelOption[];
  /** The currently-selected model id. Defaults to the first model. */
  currentModel?: string;
}

/** Events fired by `<kitn-model-switcher>`. */
interface Events {
  /** A model was selected. */
  modelchange: { modelId: string };
}

/**
 * `<kitn-model-switcher>` — an event-emitting leaf element. Data in via the
 * `models` property, selection out via a `modelchange` event. Mirrors the
 * header switcher inside `<kitn-chat>` as a standalone, composable piece.
 *
 * Note: like the underlying primitive, this only renders when more than one
 * model is provided.
 */
defineKitnElement<Props, Events>('kitn-model-switcher', {
  models: [],
  currentModel: undefined,
}, (props, { dispatch }) => (
  <ModelSwitcher
    models={props.models}
    currentModelId={props.currentModel ?? props.models[0]?.id ?? ''}
    onModelChange={(modelId) => dispatch('modelchange', { modelId })}
  />
));
