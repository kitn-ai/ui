import { For } from 'solid-js';
import { defineKitnElement } from './define';
import { PromptSuggestion } from '../components/prompt-suggestion';

type Item = string | { label: string; value?: string };

interface Props extends Record<string, unknown> {
  /** The suggestions. Strings, or `{ label, value }` when the displayed text
   *  and the emitted value differ. Set as a JS property. */
  suggestions: Item[];
  /** Chip style: `'outline'` (default), `'ghost'`, or `'default'` (filled). */
  variant?: 'outline' | 'ghost' | 'default';
  /** Size preset for each chip. Defaults to the pill default (`'lg'`); pass
   *  `'sm'` for smaller pills (or `'md'`). */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  /** Full-width left-aligned rows instead of pills. */
  block?: boolean;
  /** Substring to highlight within each suggestion. */
  highlight?: string;
}

/** Events fired by `<kc-suggestions>`. */
interface Events {
  /** A suggestion was clicked. */
  select: { value: string };
}

const labelOf = (s: Item) => (typeof s === 'string' ? s : s.label);
const valueOf = (s: Item) => (typeof s === 'string' ? s : s.value ?? s.label);

/**
 * `<kc-suggestions>` — a row/list of suggestion chips. Data via the
 * `suggestions` property; `variant`/`block`/`highlight` attributes; emits
 * `select`.
 */
defineKitnElement<Props, Events>('kc-suggestions', {
  suggestions: [],
  variant: 'outline',
  size: undefined,
  block: false,
  highlight: undefined,
}, (props, { dispatch, flag }) => (
  <div class={flag('block') ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
    <For each={props.suggestions}>
      {(s) => (
        <PromptSuggestion
          variant={props.variant}
          size={props.size}
          block={flag('block')}
          highlight={props.highlight}
          onClick={() => dispatch('select', { value: valueOf(s) })}
        >
          {labelOf(s)}
        </PromptSuggestion>
      )}
    </For>
  </div>
));
