import { type JSX, For, Show, createSignal } from 'solid-js';
import { cn } from '../utils/cn';
import { Textarea } from '../ui/textarea';
import { Star } from 'lucide-solid';
import type { FormField } from './form';

/** The shared prop shape every leaf widget receives from FieldRow. */
export interface WidgetProps {
  id: string;
  value: unknown;
  field: FormField;
  disabled: boolean;
  placeholder?: string;
  required: boolean;
  invalid: boolean;
  describedBy?: string;
  label: string;
  onInput: (value: unknown) => void;
  onBlur: () => void;
}

const inputBase =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none';

function ariaProps(p: WidgetProps) {
  return {
    'aria-required': p.required || undefined,
    'aria-invalid': p.invalid || undefined,
    'aria-describedby': p.describedBy,
  };
}

/** text / email / url / date / datetime / time / password — all <input> variants. */
export function TextWidget(
  props: WidgetProps & { variant: 'text' | 'email' | 'url' | 'date' | 'datetime' | 'time' | 'password' },
): JSX.Element {
  const inputType = () => {
    switch (props.variant) {
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      case 'time':
        return 'time';
      case 'password':
        return 'password';
      default:
        return 'text';
    }
  };
  return (
    <input
      id={props.id}
      data-control
      type={inputType()}
      class={cn(inputBase, props.invalid && 'border-destructive')}
      value={(props.value as string) ?? ''}
      placeholder={props.placeholder}
      disabled={props.disabled}
      minLength={props.field.minLength}
      maxLength={props.field.maxLength}
      {...ariaProps(props)}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      onBlur={props.onBlur}
    />
  );
}

export function TextareaWidget(props: WidgetProps): JSX.Element {
  const len = () => ((props.value as string) ?? '').length;
  return (
    <div class="flex flex-col gap-1">
      <Textarea
        id={props.id}
        data-control
        class={cn(inputBase, props.invalid && 'border-destructive')}
        value={(props.value as string) ?? ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        maxLength={props.field.maxLength}
        {...ariaProps(props)}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onBlur={props.onBlur}
      />
      <Show when={props.field.maxLength !== undefined}>
        <span class="self-end text-xs text-muted-foreground">
          {len()}/{props.field.maxLength}
        </span>
      </Show>
    </div>
  );
}

export function NumberWidget(props: WidgetProps): JSX.Element {
  const step = () => props.field['x-kc-step'] ?? (props.field.type === 'integer' ? 1 : undefined);
  return (
    <input
      id={props.id}
      data-control
      type="number"
      class={cn(inputBase, props.invalid && 'border-destructive')}
      value={props.value === undefined || props.value === null ? '' : String(props.value)}
      placeholder={props.placeholder}
      disabled={props.disabled}
      min={props.field.minimum}
      max={props.field.maximum}
      step={step()}
      {...ariaProps(props)}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      onBlur={props.onBlur}
    />
  );
}

export function SliderWidget(props: WidgetProps): JSX.Element {
  const min = () => props.field.minimum ?? 0;
  const max = () => props.field.maximum ?? 100;
  const step = () => props.field['x-kc-step'] ?? (props.field.type === 'integer' ? 1 : undefined);
  const current = () => (props.value === undefined || props.value === null ? min() : Number(props.value));
  return (
    <div class="flex items-center gap-3">
      <input
        id={props.id}
        data-control
        type="range"
        class="h-2 w-full cursor-pointer accent-[var(--color-primary)]"
        value={current()}
        min={min()}
        max={max()}
        step={step()}
        disabled={props.disabled}
        aria-valuetext={String(current())}
        {...ariaProps(props)}
        onInput={(e) => props.onInput(Number(e.currentTarget.value))}
        onBlur={props.onBlur}
      />
      <span class="w-10 shrink-0 text-right text-sm tabular-nums text-foreground">{current()}</span>
    </div>
  );
}

export function RatingWidget(props: WidgetProps): JSX.Element {
  const max = () => props.field.maximum ?? 5;
  const current = () => Number(props.value ?? 0);
  const stars = () => Array.from({ length: max() }, (_, i) => i + 1);
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      props.onInput(Math.min(max(), current() + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      props.onInput(Math.max(props.field.minimum ?? 1, current() - 1));
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      data-control
      tabindex={0}
      class="flex items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      {...ariaProps(props)}
      onKeyDown={onKey}
    >
      <For each={stars()}>
        {(n) => (
          <button
            type="button"
            role="radio"
            aria-checked={current() === n}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            tabindex={-1}
            disabled={props.disabled}
            class="rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => props.onInput(n)}
          >
            <Star
              size={20}
              class={cn(n <= current() ? 'fill-current text-[var(--color-primary)]' : '')}
              aria-hidden="true"
            />
          </button>
        )}
      </For>
    </div>
  );
}

export function SwitchWidget(props: WidgetProps): JSX.Element {
  const on = () => props.value === true;
  const toggle = (): void => {
    if (props.disabled) return;
    props.onInput(!on());
    props.onBlur();
  };
  return (
    <button
      id={props.id}
      data-control
      type="button"
      role="switch"
      aria-checked={on()}
      aria-label={props.label}
      disabled={props.disabled}
      class={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        on() ? 'bg-[var(--color-primary)]' : 'bg-muted',
      )}
      {...ariaProps(props)}
      onClick={toggle}
    >
      <span
        class={cn(
          'inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform',
          on() ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function CheckboxWidget(props: WidgetProps): JSX.Element {
  return (
    <label class="inline-flex items-center gap-2 text-sm text-foreground">
      <input
        id={props.id}
        data-control
        type="checkbox"
        class="h-4 w-4 rounded border-input accent-[var(--color-primary)]"
        checked={props.value === true}
        disabled={props.disabled}
        {...ariaProps(props)}
        onChange={(e) => {
          props.onInput(e.currentTarget.checked);
          props.onBlur();
        }}
      />
      <span>{props.label}</span>
    </label>
  );
}

export function RadioGroupWidget(props: WidgetProps): JSX.Element {
  const options = () => (props.field.enum ?? []) as unknown[];
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      data-control
      class="flex flex-col gap-1.5"
      {...ariaProps(props)}
    >
      <For each={options()}>
        {(opt) => (
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name={props.id}
              class="h-4 w-4 accent-[var(--color-primary)]"
              value={String(opt)}
              checked={props.value === opt}
              disabled={props.disabled}
              onChange={() => {
                props.onInput(opt);
                props.onBlur();
              }}
            />
            <span>{String(opt)}</span>
          </label>
        )}
      </For>
    </div>
  );
}

export function SelectWidget(props: WidgetProps): JSX.Element {
  const options = () => (props.field.enum ?? []) as unknown[];
  return (
    <select
      id={props.id}
      data-control
      class={cn(inputBase, props.invalid && 'border-destructive')}
      disabled={props.disabled}
      {...ariaProps(props)}
      onChange={(e) => {
        props.onInput(e.currentTarget.value);
        props.onBlur();
      }}
    >
      <option value="" disabled selected={props.value === undefined || props.value === ''}>
        {props.placeholder ?? 'Select…'}
      </option>
      <For each={options()}>
        {(opt) => (
          <option value={String(opt)} selected={props.value === opt}>
            {String(opt)}
          </option>
        )}
      </For>
    </select>
  );
}

function itemEnum(field: FormField): unknown[] {
  const items = field.items;
  if (items && 'enum' in items && Array.isArray(items.enum)) return items.enum;
  return [];
}

export function CheckboxGroupWidget(props: WidgetProps): JSX.Element {
  const selected = () => (Array.isArray(props.value) ? (props.value as unknown[]) : []);
  const toggle = (opt: unknown): void => {
    const set = selected();
    const next = set.includes(opt) ? set.filter((v) => v !== opt) : [...set, opt];
    props.onInput(next);
    props.onBlur();
  };
  return (
    <div
      role="group"
      aria-label={props.label}
      data-control
      class="flex flex-col gap-1.5"
      {...ariaProps(props)}
    >
      <For each={itemEnum(props.field)}>
        {(opt) => (
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-input accent-[var(--color-primary)]"
              checked={selected().includes(opt)}
              disabled={props.disabled}
              onChange={() => toggle(opt)}
            />
            <span>{String(opt)}</span>
          </label>
        )}
      </For>
    </div>
  );
}

export function MultiSelectWidget(props: WidgetProps): JSX.Element {
  const selected = () => (Array.isArray(props.value) ? (props.value as unknown[]) : []);
  return (
    <select
      id={props.id}
      data-control
      multiple
      aria-label={props.label}
      class={cn(inputBase, 'min-h-[6rem]', props.invalid && 'border-destructive')}
      disabled={props.disabled}
      {...ariaProps(props)}
      onChange={(e) => {
        const vals = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
        props.onInput(vals);
        props.onBlur();
      }}
    >
      <For each={itemEnum(props.field)}>
        {(opt) => (
          <option value={String(opt)} selected={selected().includes(opt)}>
            {String(opt)}
          </option>
        )}
      </For>
    </select>
  );
}

export function TagListWidget(props: WidgetProps): JSX.Element {
  const tags = () => (Array.isArray(props.value) ? (props.value as string[]) : []);
  const [draft, setDraft] = createSignal('');
  const add = (): void => {
    const v = draft().trim();
    if (!v) return;
    props.onInput([...tags(), v]);
    setDraft('');
    props.onBlur();
  };
  const remove = (i: number): void => {
    props.onInput(tags().filter((_, idx) => idx !== i));
    props.onBlur();
  };
  return (
    <div class="flex flex-col gap-2" role="group" aria-label={props.label}>
      <div class="flex flex-wrap gap-1.5">
        <For each={tags()}>
          {(tag, i) => (
            <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                disabled={props.disabled}
                class="text-muted-foreground hover:text-foreground"
                onClick={() => remove(i())}
              >
                ✕
              </button>
            </span>
          )}
        </For>
      </div>
      <div class="flex items-center gap-2">
        <input
          id={props.id}
          data-control
          type="text"
          class={cn(inputBase)}
          value={draft()}
          placeholder={props.placeholder ?? 'Add…'}
          disabled={props.disabled}
          {...ariaProps(props)}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          class="rounded-md border border-input px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          disabled={props.disabled}
          onClick={add}
        >
          Add
        </button>
      </div>
    </div>
  );
}
