import { For, createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from '../define/define';
import { PromptSuggestion } from '../../components/prompt/prompt-suggestion';

type Item = string | { label: string; value?: string; icon?: string };

interface Props extends Record<string, unknown> {
  // When both this property and light-DOM children are present, the property's
  // suggestions come first.
  /** The suggestions: strings, or `{ label, value }` when the displayed text and emitted value differ. JS property (array). */
  suggestions?: Item[];
  /** Chip style: `'outline'` (default), `'ghost'`, or `'default'` (filled). */
  variant?: 'outline' | 'ghost' | 'default';
  /** Row height for `layout="list"`: `'md'` (default) or `'lg'` for taller rows.
   *  Chips are unaffected. */
  size?: 'md' | 'lg';
  /** Layout: `chips` (default, a wrapping row of pills) or `list` (full-width left-aligned rows with a leading icon). */
  layout?: 'chips' | 'list';
  /** Full-width left-aligned rows instead of pills. */
  block?: boolean;
  /** Substring to highlight within each suggestion. */
  highlight?: string;
}

/** Events fired by `<kai-suggestions>`. */
interface Events {
  /** A suggestion was clicked. */
  'kai-select': { value: string };
}

const labelOf = (s: Item) => (typeof s === 'string' ? s : s.label);
const valueOf = (s: Item) => (typeof s === 'string' ? s : s.value ?? s.label);
const iconOf = (s: Item) => (typeof s === 'string' ? undefined : s.icon);

/** Parse a single `<kai-suggestion>` node into an `Item` descriptor. */
export function parseSuggestionNode(n: Element): Item {
  const text = n.textContent?.trim() ?? '';
  const value = n.getAttribute('value') ?? text;
  return { label: text, value, icon: n.getAttribute('icon') ?? undefined };
}
// `layout="list"` renders the vertical list (leading icon, label, hover background) instead of
// pills. Chips may also arrive as `<kai-suggestion>` light-DOM children, which are hidden data
// carriers; when both are present the property's suggestions come first.
/**
 * A row or list of suggestion chips.
 */
defineWebComponent<Props, Events>('kai-suggestions', {
  suggestions: [],
  variant: 'outline',
  size: 'md',
  layout: 'chips',
  block: false,
  highlight: undefined,
}, (props, { dispatch, flag, element }) => {
  // Read declarative <kai-suggestion> children from light DOM.
  // Shadow DOM with no <slot> suppresses them visually — they're invisible data carriers.
  const [slottedSuggestions, setSlottedSuggestions] = createSignal<Item[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-suggestion')];
      setSlottedSuggestions(nodes.map(parseSuggestionNode));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Merge prop suggestions (first) with declarative children (after).
  const allSuggestions = () => [...(props.suggestions ?? []), ...slottedSuggestions()];

  const isList = () => props.layout === 'list';

  const containerClass = () =>
    isList() ? 'flex flex-col gap-0.5'
      : flag('block') ? 'flex flex-col gap-2'
        : 'flex flex-wrap gap-2';

  return (
    <div class={containerClass()}>
      <For each={allSuggestions()}>
        {(s) => (
          <PromptSuggestion
            variant={props.variant}
            size={props.size}
            icon={iconOf(s)}
            block={flag('block')}
            list={isList()}
            highlight={props.highlight}
            onClick={() => dispatch('kai-select', { value: valueOf(s) })}
          >
            {labelOf(s)}
          </PromptSuggestion>
        )}
      </For>
    </div>
  );
});
