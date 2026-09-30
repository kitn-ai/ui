import { type JSX, Show } from 'solid-js';
import { Radio } from '../radio/radio';
import { Checkbox } from '../checkbox/checkbox';
import { Kbd } from '../kbd/kbd';
import { cn } from '../../utils/cn';

export interface QuestionOptionRowProps {
  /** Zero-based; the number hint shows `index + 1`. */
  index: number;
  label: string;
  description?: string;
  /** Radio for single-select, checkbox for multi-select and tasks. */
  multi: boolean;
  /** The tasks kind reads as a checklist: the box leads, the number trails. */
  task?: boolean;
  checked: boolean;
  /** Shared radio name (also groups the rows for assistive tech). */
  name: string;
  /** This row owns the group's one tab stop. */
  tabbable: boolean;
  onPick: () => void;
  /** The row was pointed at or focused: the preview follows it. */
  onFocusRow: () => void;
  /** Arrow keys inside the group: move to the row `delta` away. */
  onMove: (delta: number | 'first' | 'last') => void;
  /** The Other row's textarea, shown under the label while the row is on. */
  children?: JSX.Element;
}

/**
 * One numbered option row: number hint, label, one-line description, and a real radio or checkbox.
 * Label and description are MODEL OUTPUT and render as text nodes.
 *
 * Roving focus: one tab stop per group. Arrows move focus (a radio also selects, per the ARIA radio
 * pattern, WITHOUT advancing: only a click, Enter or a number key advances).
 */
export function QuestionOptionRow(props: QuestionOptionRowProps): JSX.Element {
  const control = () =>
    props.multi ? (
      <Checkbox
        checked={props.checked}
        tabindex={props.tabbable ? 0 : -1}
        onChange={() => props.onPick()}
        data-option-input=""
        class="mt-0.5 shrink-0"
      />
    ) : (
      <Radio
        name={props.name}
        checked={props.checked}
        tabindex={props.tabbable ? 0 : -1}
        // Controlled: a click, Space or Enter picks (and advances); the native arrow behaviour is
        // replaced below, because arrow selection must not advance the question.
        onChange={() => {}}
        onClick={() => props.onPick()}
        data-option-input=""
        class="mt-0.5 shrink-0"
      />
    );
  const num = () => <Kbd keys={String(props.index + 1)} size="sm" class="mt-0.5 shrink-0 text-muted-foreground" />;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).matches?.('[data-option-input]')) return;
    const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : undefined;
    const ends = e.key === 'Home' ? 'first' : e.key === 'End' ? 'last' : undefined;
    if (delta !== undefined || ends !== undefined) {
      e.preventDefault();
      props.onMove((ends ?? delta) as number | 'first' | 'last');
    } else if (e.key === 'Enter' && !props.multi) {
      e.preventDefault();
      props.onPick();
    }
  };

  return (
    <div
      data-option-row={props.index}
      onMouseEnter={() => props.onFocusRow()}
      onFocusIn={() => props.onFocusRow()}
      onKeyDown={onKeyDown}
      class={cn(
        'flex flex-col gap-2 rounded-lg px-2.5 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        props.checked ? 'bg-selected' : 'hover:bg-hover',
      )}
    >
      <label class="flex cursor-pointer items-start gap-3">
        <Show when={props.task} fallback={num()}>{control()}</Show>
        <span class="min-w-0 flex-1">
          <span class="block break-words text-body font-medium leading-snug text-foreground">{props.label}</span>
          <Show when={props.description}>
            <span class="block break-words text-meta text-muted-foreground">{props.description}</span>
          </Show>
        </span>
        <Show when={props.task} fallback={control()}>{num()}</Show>
      </label>
      {props.children}
    </div>
  );
}
