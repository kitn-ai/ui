import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { defineWebComponent } from './define';
import { DefaultPromptInput } from './default-input';
import type { AttachmentData } from '../components/attachments';
import type { SlashCommandItem } from '../components/slash-command';
import type { CustomAction } from './chat-types';
import type { TriggerDef, ComposerChange } from '../components/composer';
import { type ComposerDoc, type EntityRef, normalizeValue } from '../primitives/composer-model';

/** Parse a single light-DOM `<kai-slash-command>` element into a SlashCommandItem.
 *  Attribute mapping:
 *   - `command`     → SlashCommandItem.id       (required; empty string fallback)
 *   - textContent   → SlashCommandItem.label    (primary); `label` attr as fallback
 *   - `description` → SlashCommandItem.description
 *   - `category`    → SlashCommandItem.category
 */
export function parseKaiSlashCommandElement(n: Element): SlashCommandItem {
  return {
    id: n.getAttribute('command') ?? '',
    label: n.textContent?.trim() || n.getAttribute('label') || n.getAttribute('command') || '',
    description: n.getAttribute('description') ?? undefined,
    category: n.getAttribute('category') ?? undefined,
  };
}

interface Props extends Record<string, unknown> {
  /** Controlled value of the input. When set, the host owns the text and must
   *  update it on `kai-value-change`; leave unset for uncontrolled behavior. */
  value?: string;
  /** Placeholder text shown in the empty input. */
  placeholder?: string;
  /** Disable the input and submit button entirely (non-interactive). */
  disabled?: boolean;
  /** Show the loading/streaming state and block submit (use while awaiting a
   *  reply). */
  loading?: boolean;
  /** Starter prompts shown above the input. Clicking one follows
   *  `suggestionMode`. Set as a JS property. */
  suggestions?: string[];
  /** What clicking a suggestion does: `'submit'` (default) sends it immediately
   *  as if typed and submitted; `'fill'` just places it in the input. */
  suggestionMode?: 'submit' | 'fill';
  /** Slash commands — when set, typing `/` opens the command palette. Set as a
   *  JS property. */
  slashCommands?: SlashCommandItem[];
  /** Command ids to highlight as active. */
  slashActiveIds?: string[];
  /** Single-line palette rows. */
  slashCompact?: boolean;
  /** Show a Search (Globe) button in the left toolbar; clicking it fires a
   *  `search` event. */
  search?: boolean;
  /** Show a Voice (Mic) button in the left toolbar; clicking it fires a `voice`
   *  event. */
  voice?: boolean;
  /** When set and `loading` is true, the send button is replaced by a Stop
   *  button (square icon, "Stop" aria-label). Clicking it fires `kai-stop`. */
  stoppable?: boolean;
  /** Attachments to seed the input with (so a consumer can pre-populate staged
   *  files without an upload). Set as a JS property; the element then manages its
   *  own attachment state from there (add via the paperclip, remove per chip). */
  attachments?: AttachmentData[];
  /** Rich entity triggers — each `{ char, kind, items }` opens a caret-anchored
   *  menu that inserts an atomic pill. Convention: `/` → skills, `@` → agents
   *  (plugins are the grouping/provenance of those items). Set as a JS property. */
  triggers?: TriggerDef[];
}

/** Events fired by `<kai-prompt-input>`. */
interface Events {
  /** The user submitted the prompt (Enter or send button). `value` is the
   *  flattened text (back-compat); `doc` is the structured document and
   *  `entities` the inserted pills (skills/agents) for downstream expansion. */
  'kai-submit': { value: string; doc: ComposerDoc; entities: EntityRef[]; attachments: AttachmentData[] };
  /** The input changed (fires on every edit). Carries the flattened `value`
   *  plus the structured `doc` + `entities`. */
  'kai-value-change': { value: string; doc: ComposerDoc; entities: EntityRef[] };
  /** A suggestion was clicked while `suggestion-mode="fill"`. */
  'kai-suggestion-click': { value: string };
  /** A slash command was chosen from the palette. */
  'kai-slash-select': { command: SlashCommandItem };
  /** The Search (Globe) toolbar button was clicked. */
  'kai-search': Record<string, never>;
  /** The Voice (Mic) toolbar button was clicked. */
  'kai-voice': Record<string, never>;
  /** The Stop button was clicked while `stoppable` and `loading` are both true. */
  'kai-stop': Record<string, never>;
  /** A custom `<kai-action>` toolbar button was clicked. `action` is the `id` of
   *  the `<kai-action>` element that was clicked. */
  'kai-toolbar-action': { action: string };
}

defineWebComponent<Props, Events>('kai-prompt-input', {
  value: undefined,
  placeholder: 'Send a message...',
  disabled: false,
  loading: false,
  suggestions: undefined,
  suggestionMode: 'submit',
  slashCommands: undefined,
  slashActiveIds: undefined,
  slashCompact: false,
  search: false,
  voice: false,
  stoppable: false,
  attachments: undefined,
  triggers: undefined,
}, (props, { dispatch, flag, element }) => {
  const [internal, setInternal] = createSignal(props.value ?? '');
  // Seed staged attachments from the `attachments` property; the element manages
  // its own state from there (paperclip adds, per-chip remove deletes).
  const [attachments, setAttachments] = createSignal<AttachmentData[]>(props.attachments ?? []);
  // Re-seed when the `attachments` property is (re)assigned by the consumer
  // (e.g. set via a `ref` after mount). Subsequent in-element edits stay local.
  createEffect(() => {
    if (props.attachments) setAttachments(props.attachments);
  });

  // Read declarative <kai-action> and <kai-slash-command> children from light DOM —
  // same pattern as kai-message. Shadow DOM with no <slot> suppresses them visually;
  // they are invisible data carriers. One MutationObserver covers both element types.
  const [toolbarActions, setToolbarActions] = createSignal<CustomAction[]>([]);
  const [slottedSlashCommands, setSlottedSlashCommands] = createSignal<SlashCommandItem[]>([]);
  onMount(() => {
    const readActions = () => {
      const nodes = [...element.querySelectorAll('kai-action')];
      setToolbarActions(nodes.map(n => ({
        id: n.id || n.getAttribute('action') || '',
        label: n.textContent?.trim() || n.getAttribute('label') || n.id || '',
        icon: n.getAttribute('icon') ?? undefined,
        tooltip: n.getAttribute('tooltip') ?? undefined,
      })));
    };
    const readSlashCommands = () => {
      const nodes = [...element.querySelectorAll('kai-slash-command')];
      setSlottedSlashCommands(nodes.map(parseKaiSlashCommandElement));
    };
    const readAll = () => { readActions(); readSlashCommands(); };
    readAll();
    const observer = new MutationObserver(readAll);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  const current = () => props.value ?? internal();

  // Latest structured change from the composer (doc + entities). Captured before
  // the string value-change fires (the bridge calls onComposerChange first), so
  // the dispatched events can carry the doc. Reset to a text-only doc when a value
  // is set that didn't come from the composer (suggestion/slash insert).
  let lastChange: ComposerChange = { doc: [], text: '', entities: [] };

  const handleChange = (v: string) => {
    setInternal(v);
    if (v !== lastChange.text) lastChange = { doc: normalizeValue(v), text: v, entities: [] };
    dispatch('kai-value-change', { value: v, doc: lastChange.doc, entities: lastChange.entities });
  };
  const handleSubmit = () => {
    dispatch('kai-submit', { value: current(), doc: lastChange.doc, entities: lastChange.entities, attachments: attachments() });
    setAttachments([]);
  };
  const handleSuggestionClick = (v: string) => {
    if ((props.suggestionMode ?? 'submit') === 'fill') {
      handleChange(v);
      dispatch('kai-suggestion-click', { value: v });
    } else {
      // Default: behave as if the user typed the suggestion and pressed submit.
      dispatch('kai-submit', { value: v, doc: normalizeValue(v), entities: [], attachments: attachments() });
      setAttachments([]);
    }
  };

  // Prop slash commands take precedence; slotted children are appended after.
  const allSlashCommands = () => [
    ...(props.slashCommands ?? []),
    ...slottedSlashCommands(),
  ];

  return (
    <DefaultPromptInput
      value={current()}
      placeholder={props.placeholder}
      disabled={flag('disabled')}
      loading={flag('loading')}
      stoppable={flag('stoppable')}
      suggestions={props.suggestions}
      attachments={attachments()}
      slashCommands={allSlashCommands().length ? allSlashCommands() : undefined}
      slashActiveIds={props.slashActiveIds}
      slashCompact={flag('slashCompact')}
      search={flag('search')}
      voice={flag('voice')}
      toolbarActions={toolbarActions()}
      triggers={props.triggers}
      onComposerChange={(c) => { lastChange = c; }}
      onValueChange={handleChange}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
      onAttachmentsChange={setAttachments}
      onSearch={() => dispatch('kai-search')}
      onVoice={() => dispatch('kai-voice')}
      onStop={() => dispatch('kai-stop')}
      onSlashSelect={(command) => dispatch('kai-slash-select', { command })}
      onAction={(id) => dispatch('kai-toolbar-action', { action: id })}
    />
  );
});
