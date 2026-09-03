import { For } from 'solid-js';
import './filter-chips.css';

/**
 * Glass chips. They float over the page's ground rather than sitting in it,
 * which is the rule that decides the material.
 */
export default function FilterChips<T extends string>(props: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  allLabel?: string;
  label: string;
}) {
  return (
    <div class="chips" role="group" aria-label={props.label}>
      <button
        class="chip glass-sm"
        aria-pressed={props.value === null}
        onClick={() => props.onChange(null)}
      >
        {props.allLabel ?? 'All'}
      </button>
      <For each={props.options}>
        {(option) => (
          <button
            class="chip glass-sm"
            aria-pressed={props.value === option}
            onClick={() => props.onChange(props.value === option ? null : option)}
          >
            {option}
          </button>
        )}
      </For>
    </div>
  );
}
