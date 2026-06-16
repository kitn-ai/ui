import { For, createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
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
  'kc-select': { value: string };
}

const labelOf = (s: Item) => (typeof s === 'string' ? s : s.label);
const valueOf = (s: Item) => (typeof s === 'string' ? s : s.value ?? s.label);

/** Parse a single `<kc-suggestion>` node into an `Item` descriptor. */
export function parseSuggestionNode(n: Element): Item {
  const text = n.textContent?.trim() ?? '';
  const value = n.getAttribute('value') ?? text;
  return { label: text, value };
}

/**
 * `<kc-suggestions>` — a row/list of suggestion chips. Data via the
 * `suggestions` property; `variant`/`block`/`highlight` attributes; emits
 * `select`.
 *
 * Alternatively, declare chips as `<kc-suggestion>` child elements
 * (light-DOM data carriers — hidden by the Shadow DOM):
 *
 * ```html
 * <kc-suggestions>
 *   <kc-suggestion value="vue">Use Vue</kc-suggestion>
 *   <kc-suggestion value="react">Use React</kc-suggestion>
 * </kc-suggestions>
 * ```
 */
defineWebComponent<Props, Events>('kc-suggestions', {
  suggestions: [],
  variant: 'outline',
  size: undefined,
  block: false,
  highlight: undefined,
}, (props, { dispatch, flag, element }) => {
  // Read declarative <kc-suggestion> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedSuggestions, setSlottedSuggestions] = createSignal<Item[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kc-suggestion')];
      setSlottedSuggestions(nodes.map(parseSuggestionNode));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Merge prop suggestions (first) with declarative children (after).
  const allSuggestions = () => [...(props.suggestions ?? []), ...slottedSuggestions()];

  return (
    <div class={flag('block') ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
      <For each={allSuggestions()}>
        {(s) => (
          <PromptSuggestion
            variant={props.variant}
            size={props.size}
            block={flag('block')}
            highlight={props.highlight}
            onClick={() => dispatch('kc-select', { value: valueOf(s) })}
          >
            {labelOf(s)}
          </PromptSuggestion>
        )}
      </For>
    </div>
  );
});
