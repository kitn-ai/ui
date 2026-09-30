import { type JSX, For, Show, createUniqueId } from 'solid-js';
import type { FormField } from '../../primitives/card-data-types';
import { DEFAULT_INLINE_MAX, coerceValue, humanize, orderedKeys, widgetFor } from '../form/form';
import {
  TextWidget, TextareaWidget, NumberWidget, SliderWidget, RatingWidget, SwitchWidget, CheckboxWidget,
  RadioGroupWidget, SelectWidget, CheckboxGroupWidget, MultiSelectWidget, TagListWidget, type WidgetProps,
} from '../form/form-widgets';

export interface QuestionFormFieldsProps {
  /** The model's JSON Schema object (`Question.fields`). Untrusted: only `properties` and `required` are read. */
  fields: Record<string, unknown> | undefined;
  values: Record<string, unknown>;
  onValues: (values: Record<string, unknown>) => void;
  /** The question's own id, so field ids stay unique when two form questions share a page. */
  scope: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The `form` question kind: the kit's own form widgets (masking and field formats included) over the
 * model's field schema, without the card chrome or a second Submit. Leaf fields only: a nested
 * `fieldset` or `repeater` is named as unsupported rather than dropped, because a field the user
 * cannot see is a question the model thinks it asked.
 */
export function QuestionFormFields(props: QuestionFormFieldsProps): JSX.Element {
  const uid = createUniqueId();
  const def = () => {
    const f = props.fields;
    return isRecord(f) && isRecord(f.properties)
      ? ({ type: 'object', properties: f.properties as Record<string, FormField>, required: Array.isArray(f.required) ? (f.required as string[]) : [] } as const)
      : undefined;
  };
  const keys = () => { const d = def(); return d ? orderedKeys(d as never) : []; };

  return (
    <div class="grid gap-3 px-1 @xl:grid-cols-2">
      <Show when={def()} fallback={<p class="text-meta text-muted-foreground">This question has no fields to fill in.</p>}>
        <For each={keys()}>{(key) => {
          const field = () => (def()!.properties as Record<string, FormField>)[key];
          const required = () => (def()!.required as string[]).includes(key);
          const kind = () => widgetFor(field(), DEFAULT_INLINE_MAX);
          const id = `${uid}-${props.scope}-${key}`;
          const labelId = `${id}-label`;
          const common = (): WidgetProps => ({
            id,
            value: props.values[key],
            field: field(),
            disabled: field().readOnly === true,
            placeholder: field()['x-kai-placeholder'],
            required: required(),
            invalid: false,
            label: field().title ?? humanize(key),
            labelledBy: labelId,
            onInput: (v) => props.onValues({ ...props.values, [key]: coerceValue(field(), v) }),
            onBlur: () => {},
          });
          const group = () => ['radio', 'checkbox-group', 'multiselect'].includes(kind());
          return (
            <div class="flex flex-col gap-1.5" data-field={key}>
              <label id={labelId} for={group() ? undefined : id} class="text-meta font-medium text-foreground">
                {field().title ?? humanize(key)}
                <Show when={required()}><span class="text-destructive-text" aria-hidden="true">{' *'}</span></Show>
              </label>
              <Show when={field().description}><p class="text-meta text-muted-foreground">{field().description}</p></Show>
              {(() => {
                const k = kind();
                if (k === 'text' || k === 'email' || k === 'url' || k === 'date' || k === 'datetime' || k === 'time' || k === 'password') {
                  return <TextWidget {...common()} variant={k} />;
                }
                if (k === 'textarea') return <TextareaWidget {...common()} />;
                if (k === 'number') return <NumberWidget {...common()} />;
                if (k === 'slider') return <SliderWidget {...common()} />;
                if (k === 'rating') return <RatingWidget {...common()} />;
                if (k === 'switch') return <SwitchWidget {...common()} />;
                if (k === 'checkbox') return <CheckboxWidget {...common()} />;
                if (k === 'radio') return <RadioGroupWidget {...common()} />;
                if (k === 'select') return <SelectWidget {...common()} />;
                if (k === 'checkbox-group') return <CheckboxGroupWidget {...common()} />;
                if (k === 'multiselect') return <MultiSelectWidget {...common()} />;
                if (k === 'taglist') return <TagListWidget {...common()} />;
                return (
                  <p class="rounded-md border border-dashed border-border p-2 text-meta text-muted-foreground">
                    {`This field type is not supported in a question: ${key}`}
                  </p>
                );
              })()}
            </div>
          );
        }}</For>
      </Show>
    </div>
  );
}
