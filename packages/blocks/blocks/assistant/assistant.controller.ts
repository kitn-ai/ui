/**
 * assistant, the framework-neutral controller.
 *
 * The contract (spec 2026-09-02 section 3.2):
 *
 *   createController(deps) => { state(): State; actions: Actions; subscribe(fn): () => void }
 *
 * Everything the imperative `assistant.js` did to the DOM is now either a
 * field of `State` (bound onto an element with `.prop=` / `:attr=`) or an
 * `actions` entry (bound with `@kai-event=`). The ONLY DOM this file touches
 * is through `deps.refs()`, and only for the two facts the page's grammar has
 * no declarative equivalent for: the composer's clear()/focus() methods, and
 * the row-menu SHORTCUTS, a keydown listener on the document that stands down
 * for any key aimed outside this block (see `onShortcut`).
 *
 * WHAT THIS BLOCK ADDED TO THE CONTRACT'S EVIDENCE, over support-widget's
 * conversion:
 *
 * 1. The rail's search filter WAS a DOM query. `assistant.js` read
 *    `item.textContent` off every rendered row and set `item.hidden`, which
 *    the contract forbids for good reason: it reaches past the state the
 *    renderers agree about into whatever the browser happened to lay out. It
 *    is now `query` plus a `conversationRows` list that is already filtered,
 *    which is what "State is a view model" means in practice. The rows the
 *    filter drops are not rendered at all rather than rendered hidden, so the
 *    block's stylesheet no longer needs its `[hidden]` rule either.
 * 2. `.prop` on a LEAF element with no navigation. `models` and
 *    `currentModel` drive kai-model-switcher; there is no view stack on this
 *    page and no ref for one.
 * 3. THE ROW MENU IS THE CONSUMER'S OWN MARKUP, WITH ITS FOCUS CONTRACT HONOURED.
 *    `kai-dropdown` renders no items of its own; the page's rows carry
 *    `role="menuitem"` and `tabindex="-1"` so they join its roving focus, and
 *    the ones that act are kai-buttons because a binding event only exists on a
 *    kai element. A row that cannot act is plain markup with aria-disabled and a
 *    tooltip saying why: a disabled row with no handler cannot be mistaken for
 *    one that did something.
 * 4. AND THE ROW'S IDENTITY REACHES THE ACTION THROUGH THE ELEMENT THE PAGE
 *    BOUND. Inside a `*for`, a bound prop is the only per-row channel the
 *    grammar has (a literal is cloned identically into every row), and an action
 *    is handed an event rather than an argument - so the row's id rides on the
 *    item as a bound attribute and the action reads it off `event.currentTarget`,
 *    which is exactly that element because kai-* events do not bubble. The op is
 *    a literal, because the op IS fixed per row.
 * 5. THE SHELL IS SOMEBODY ELSE'S STATE, MIRRORED. kai-workspace owns the
 *    aside's collapse (its breakpoint, its drawer, its methods), so the block
 *    does not keep a second opinion: `asideToggle` is fed by kai-aside-toggle
 *    and the value it reports is what the rail's controlled `collapsed` and the
 *    top bar's reopen button read. The way IN is a method call - the rail's own
 *    toggle would otherwise fold the rail inside a column the page keeps - and
 *    that call is the second reason this controller declares a ref.
 * 6. THE COLOR SCHEME IS PER ELEMENT, AND THE BLOCK SAYS SO ON EVERY ONE. The
 *    kit's `theme` prop (`light` | `dark` | `auto`) is on every kai element and
 *    the tokens live inside each shadow root, so nothing about the scheme
 *    inherits: a page that owns the choice has to set it on every element it
 *    renders (the kit's own theming doc says the same). `theme` is the choice in
 *    the menu's vocabulary and `themeMode` is the same choice in the kit's, one
 *    field each because a binding holds a field and never an expression.
 */
import { createAssistantStream } from '@kitn.ai/ui/state';
import type { ChatMessage } from '@kitn.ai/ui/state';
import { readOpenAIStream, type StreamSource } from '@kitn.ai/ui/wire';
import {
  localStorageStore,
  createConversationController,
  isConversationUnread,
  type ConversationSummary,
} from '@kitn.ai/ui/stores';
import type {
  KaiPromptInputElement,
  KaiVoiceInputElement,
  KaiWorkspaceElement,
} from '@kitn.ai/ui/web-components';
// THE DATA-MODE SEAM. One specifier, resolved by whichever form rendered this
// block: its manifest declares the scripted mock, the `--gateway` fetch and the
// `--no-mock` stub as three sources for this one name, and exactly one of them
// is written here. Nothing below imports the mock, which is what makes a
// mock-free install compile.
// The waiver is on the statement itself because that is where the guard reads it,
// and the target really is generated: wiring.modeTarget names the file `add`
// writes, and no authored source carries that name (the sources are
// wiring.modeFiles, one per mode).
import { transport } from './assistant.transport'; // lint:dangling-imports: allowed -- generated name, written by `create-kai add` from wiring.modeFiles

/** One entry of the model switcher's `models` property. Declared here, with the
 *  list: it types a State field, and the seam's three sources come and go while
 *  the composition is what every mode ships. */
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

const SUGGESTIONS = ['Summarize a document', 'Draft the Q3 board update', 'Compare two options'];

/** The placeholder the composer shows at rest, and the one it shows while the
 *  mic is open. The composer's own mic has no recording affordance of its own
 *  (the kit paints no state on it), so the block says it in the one place a
 *  reader is already looking. */
const PROMPT_PLACEHOLDER = 'Ask anything';
const LISTENING_PLACEHOLDER = 'Listening. Click the mic again to stop';

/** What the record-only voice path says, and it is the honest version of the
 *  kit's documented fallback: with no `transcribe` property and a browser
 *  without speech recognition, kai-voice-input records and emits
 *  `kai-audio-captured` with no text at all. The block has no transcription
 *  service to offer, so it reports the capture rather than pretending the
 *  silence was a transcript. */
const VOICE_NO_TRANSCRIPT =
  'Voice was captured but not transcribed: this browser has no speech recognition, and this block ships no transcription service.';

/** One entry of an entity trigger's menu. Mirrors the kit's TriggerItem
 *  (`@kitn.ai/ui`'s composer) structurally, declared here as the block's own
 *  shape: State carries it, and the kit's composer prop is typed structurally,
 *  so the two agree without the block reaching into the kit's internals. */
export interface EntityTriggerItem {
  id: string;
  label: string;
  /** An IMAGE SOURCE for a chip-kind item: a URL or data URI, because the kit
   *  renders it as `<img src>`. A skill or agent needs none -- those pills carry
   *  their kind's sigil and the menu row its kind's glyph. */
  icon?: string;
  /** Muted second line in the trigger menu. */
  description?: string;
  /** What the pill EXPANDS to on submit, when that differs from the label. */
  promptText?: string;
}

/** A `char`-triggered entity menu in the composer: `/` for skills, `@` for
 *  agents (the kit's own convention: `kindSigil` maps `skill` to `/` and
 *  `agent` to `@`). */
export interface EntityTrigger {
  char: string;
  kind: string;
  items?: EntityTriggerItem[];
}

// SAMPLE DATA, THREE OF EACH, AND DELETE THEM: a consumer's real skills and
// agents come from their own registry, and these exist so the trigger menus
// have something to demonstrate. The `promptText` on a skill is the interesting
// half: the pill reads `/summarize` in the composer and the SENT message carries
// the expansion (the composer flattens an entity to `promptText ?? label`).
//
// THE TWO KINDS ARE THE KIT'S, and that is what makes the pills read: `skill`
// is the `/` kind and `agent` is the `@` kind, and each has a "light" pill with
// its own sigil and a built-in glyph in the trigger menu (composer-dom.ts's
// `kindSigil` / `kindGlyph`). A kind outside that vocabulary gets the richer
// CHIP branch instead, which resolves an icon: the item's own `icon` first,
// and that prop is an IMAGE SOURCE (an <img src>), never an icon name. So the
// items below carry no `icon` at all -- a Lucide name there renders a broken
// image, and the kind's own glyph is the better signal anyway.
const TRIGGERS: EntityTrigger[] = [
  {
    char: '/',
    kind: 'skill',
    items: [
      { id: 'sample-summarize', label: 'summarize', description: 'Summarize the open document', promptText: 'Summarize the document we are reading.' },
      { id: 'sample-outline', label: 'outline', description: 'Outline a document', promptText: 'Outline the main sections of the document.' },
      { id: 'sample-answer', label: 'answer', description: 'Answer from the attached files', promptText: 'Answer using only the attached files.' },
    ],
  },
  {
    char: '@',
    kind: 'agent',
    items: [
      { id: 'sample-metrics', label: 'q3-metrics.pdf', description: 'Sample file, three pages' },
      { id: 'sample-board-deck', label: 'board-deck.md', description: 'Sample file' },
      { id: 'sample-handbook', label: 'team-handbook.md', description: 'Sample file' },
    ],
  },
];

// The model switcher recipe's data. Both entries name the SCRIPTED mock, which
// is the honest option while no provider is contacted either way: a real backend
// reads the selected id off the request and routes accordingly, so these become
// real model ids the day the block is installed with a gateway.
const MODELS: ModelOption[] = [
  { id: 'kai-mock', name: 'Mock Standard', description: 'The scripted local responder' },
  { id: 'kai-mock-thinking', name: 'Mock Thinking', description: 'Same script, same mock' },
];

/** The seam's contract, declared HERE because the controller is the one file
 *  every data mode ships: the three sources are interchangeable, so the shape
 *  they have to share belongs with the thing that consumes it. Each source
 *  imports this type; a source that drifts fails that mode's compile. */
export interface AssistantTransport {
  /** The reply to one turn, as a source the wire reader accepts: a Response, a
   *  ReadableStream, or an async iterable of SSE text. */
  reply(messages: ChatMessage[]): Promise<StreamSource> | StreamSource;
  /** What a tool call the stream announced settles to, or undefined to leave it
   *  announced (the consumer's own loop answers it later). */
  toolOutput(toolType: string): Record<string, unknown> | undefined;
}

const ASSISTANT_ACTIONS = ['copy', 'like', 'dislike'] as const;
const USER_ACTIONS = ['edit'] as const;

/** The kit's card-tool convention: a tool named `kai_<type>` produces a card of
 *  that type, and the CALL'S OWN ARGUMENTS are the card's data. The kit implements
 *  this once, as `cardFromToolCall` in its `schemas` entry - which a block cannot
 *  import: a paste form may only name the entries its self-contained CDN bundle
 *  proves, and `schemas` is not one of them (the block generator refuses it by
 *  name). So the three lines are restated here rather than a fourth path
 *  invented. There is nothing to decide in them: a prefix and a field copy. */
const KAI_CARD_TOOL_PREFIX = 'kai_';

/** The operations a rail row's menu can perform, in the order the menu renders
 *  them (Share is not here: it has no handler to name). */
type RowMenuOp = 'rename' | 'pin' | 'archive' | 'delete';
const ROW_MENU_OPS: readonly string[] = ['rename', 'pin', 'archive', 'delete'];

/** The color scheme the reader picked in the settings menu. `system` is a real
 *  choice rather than a spelling of the kit's `auto`: the block keeps the CHOICE
 *  and hands each binding the value ITS attribute accepts (see `themeMode`). */
export type ThemeChoice = 'light' | 'dark' | 'system';

/** One entry of a footer menu. Mirrors the kit's `KaiMenuItem` structurally and
 *  deliberately: the block never imports the kit's internals, and the kit types
 *  this prop structurally, so the two agree by shape. Items are DATA, which is
 *  what the delivery forms carry best (a prop, not authored rows), and it is
 *  why `kai-menu` is the element these menus use. */
export interface MenuItem {
  /** Emitted back in `kai-select`. */
  id?: string;
  label?: string;
  /** A named icon (`'sun'`), an image URL/data-URI, or plain text. */
  icon?: string;
  /** The right-aligned muted shortcut chip, in the kit's `keys` syntax. */
  shortcut?: string;
  /** With `radioGroup`, marks the SELECTED row of that single-choice group. */
  checked?: boolean;
  /** Membership in a single-choice group (`role="menuitemradio"`). */
  radioGroup?: string;
  disabled?: boolean;
  /** A divider. */
  separator?: boolean;
  /** A non-interactive section label. */
  heading?: boolean;
}

/** One entry of the composer's `+` menu. Declared here for the reason `MenuItem`
 *  is: the block hands the kit its own object and the kit types the prop by
 *  shape, so the two agree without the block importing anything the paste form
 *  cannot inline.
 *
 *  The fields below are the composer menu's whole vocabulary, which is what makes
 *  this list worth reading: `items` makes a submenu, `checked` makes a toggle
 *  (`control: 'switch'` draws it as a switch rather than a checkmark), `heading`
 *  and `separator` are the section label and the divider, `note` is a
 *  non-interactive sentence (a disabled row's reason), `description` is the muted
 *  second line, and `disabled` marks a row that is visibly unavailable. */
export interface ComposerTool {
  id?: string;
  label?: string;
  icon?: string;
  description?: string;
  shortcut?: string;
  checked?: boolean;
  control?: 'check' | 'switch';
  disabled?: boolean;
  separator?: boolean;
  heading?: boolean;
  note?: true;
  items?: ComposerTool[];
  /** Also show this entry's ON state as a removable chip in the composer's row,
   *  so a capability is visible without opening the menu. Off unless asked for,
   *  which is why the kit's default stays quiet. */
  chip?: boolean;
}

/** The three choices, in the order the menu reads them, with the glyph each row
 *  leads with. */
const THEME_CHOICES: readonly { id: ThemeChoice; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'monitor' },
];

/** Which theme a settings-menu id names, or undefined for an id this menu does
 *  not own. The choice IS the id, so there is no second vocabulary to drift. */
function themeOf(id: string | undefined): ThemeChoice | undefined {
  const match = THEME_CHOICES.find((c) => c.id === id);
  return match?.id;
}

/**
 * The footer's two menus, projected from State. Both are `kai-menu` ITEMS rather
 * than authored rows, for the reason the kit's own lab puts them there: the
 * identity trigger is slotted content, and an items array is one prop the
 * delivery forms can carry, with no per-row bindings to keep in step.
 */
function projectMenus(choice: ThemeChoice): Pick<AssistantState, 'theme' | 'themeMode' | 'accountItems' | 'settingsItems'> {
  return {
    theme: choice,
    // `system` in the kit's vocabulary is `auto`: the element then watches
    // prefers-color-scheme itself, which is exactly what "follow the system"
    // means and is why this is not a fourth mode.
    themeMode: choice === 'system' ? 'auto' : choice,
    // The identity menu: the plan line this placeholder pretends to have, one
    // item the block can really do, and the one it cannot - and the reason is
    // IN the label, because a `kai-menu` item has no tooltip field and a
    // disabled row with nothing to say would be a mystery. (The row menu's
    // authored Share row is where the reason-in-a-tooltip pattern lives.)
    accountItems: [
      { heading: true, label: 'Demo plan' },
      { id: 'new-chat', label: 'Start a new chat', icon: 'plus' },
      { id: 'account-settings', label: "Account settings (your app's)", icon: 'settings', disabled: true },
    ],
    // The settings menu, and the whole of what this block owns: the scheme. The
    // heading names the group so the rows read as one choice; the kit's radio
    // items carry the checked state and the checkmark.
    settingsItems: [
      { heading: true, label: 'Theme' },
      ...THEME_CHOICES.map((c) => ({
        id: c.id as string,
        label: c.label,
        icon: c.icon,
        radioGroup: 'theme',
        checked: c.id === choice,
      })),
    ],
  };
}

/** What a menu row writes into the composer. The id is `skill:<item id>` or
 *  `file:<item id>`, and the payload comes from the SAME `TRIGGERS` list the `/`
 *  and `@` pickers use, so the two cannot drift: a skill expands to its
 *  `promptText` exactly as submitting a `/` pill would, and a file becomes the
 *  `@` mention the agent trigger would have written. */
function toolInsertText(id: string): string | undefined {
  const at = id.indexOf(':');
  if (at < 0) return undefined;
  const kind = id.slice(0, at);
  if (kind !== 'skill' && kind !== 'file') return undefined;
  const trigger = TRIGGERS.find((t) => t.kind === (kind === 'file' ? 'agent' : 'skill'));
  const item = trigger?.items?.find((i) => i.id === id.slice(at + 1));
  if (!item) return undefined;
  return kind === 'file' ? `@${item.label}` : item.promptText;
}

/** The composer's `+` menu. Tree-shaped rather than a flag per capability,
 *  because the menu is the one surface that can hold sections, submenus and a
 *  toggle's own state together - and this list is meant to be read as much as
 *  used: between them the entries are the menu's whole vocabulary, so a reader
 *  can see each shape, delete what they do not need and add their own.
 *
 *  EVERY ENTRY EITHER DOES SOMETHING OR IS VISIBLY DISABLED WITH ITS REASON. A
 *  row that looked live and did nothing is the one thing a template must never
 *  teach, because a reader copies it. `shortcut` is deliberately absent for the
 *  same reason: nothing here has a key to press, and a shortcut chip that does
 *  nothing is that same lie in smaller type. */
function projectTools(state: Pick<AssistantState, 'density' | 'codeHighlight'>): ComposerTool[] {
  const skills = TRIGGERS.find((t) => t.kind === 'skill')?.items ?? [];
  const files = TRIGGERS.find((t) => t.kind === 'agent')?.items ?? [];
  return [
    // "Add files or photos" is NOT declared here: the composer prepends its own
    // file item whenever attachments are enabled, so a second one would be a
    // picker wired to nothing.
    {
      id: 'highlighting',
      label: 'Highlighting',
      icon: 'code',
      description: 'Colour code blocks in replies',
      checked: state.codeHighlight,
      chip: true,
    },
    {
      id: 'density',
      label: 'Compact spacing',
      icon: 'sliders-horizontal',
      description: 'Tighter rhythm between turns',
      checked: state.density === 'compact',
      control: 'switch',
    },
    { separator: true },
    { heading: true, label: 'Insert' },
    {
      id: 'skills',
      label: 'Skills',
      icon: 'sparkles',
      description: 'Reusable prompts for this assistant',
      items: skills.map((s) => ({
        id: `skill:${s.id}`,
        label: s.label,
        description: s.description,
      })),
    },
    {
      id: 'files',
      label: 'Files',
      icon: 'file-text',
      description: 'Mention a document in the thread',
      items: files.map((f) => ({
        id: `file:${f.id}`,
        label: f.label,
        description: f.description,
      })),
    },
    { separator: true },
    // The shape for a capability this app does not have yet: a row that cannot
    // act, with its reason in the sentence beneath it rather than in a tooltip.
    {
      id: 'add-url',
      label: 'Add from a URL',
      icon: 'link',
      description: 'Fetch a page into the turn',
      disabled: true,
    },
    {
      id: 'add-url-why',
      note: true,
      label: 'Not in this template: add a fetch step to your transport',
    },
  ];
}

/** `{ op, conversationId }` for a row-menu item, read off the element the page
 *  bound. The op is a `data-op` LITERAL on the item (the op is fixed per row, so
 *  the same literal in every cloned row is the correct value); the conversation
 *  id is a BOUND attribute, because inside a `*for` a binding is the only
 *  per-row channel the page grammar has. kai-* events do not bubble, so
 *  `event.currentTarget` is exactly that element - and the react form hands the
 *  real event through and writes data-* to the host, so one action reads both the
 *  same way in every delivery form. */
function rowMenuTarget(event: Event): { op: RowMenuOp; conversationId: string } | undefined {
  const element = event.currentTarget as HTMLElement | null;
  const op = element?.dataset.op;
  const conversationId = element?.dataset.conversationId;
  if (!op || !conversationId || !ROW_MENU_OPS.includes(op)) return undefined;
  return { op: op as RowMenuOp, conversationId };
}

/** One rendered row of the rail. Every field is already a string or a
 *  boolean, because `*for` bodies get bindings, not expressions. */
export interface ConversationRow {
  id: string;
  title: string;
  preview: string;
  previewHidden: boolean;
  unread: boolean;
  /** The row's own menu trigger, named for the row it belongs to: every row has
   *  one, so one shared label would make five identical accessible names. */
  menuLabel: string;
  /** This row is the one being renamed, so its title is a field and not text. */
  renaming: boolean;
  /** The rename field's own `hidden`. Both flags read the same fact, spelled the
   *  way each binding needs it (the title hides while the field shows). */
  renameFieldHidden: boolean;
  /** The pin item's label: the same item offers Pin or Unpin, and which one is
   *  the row's own state. */
  pinLabel: string;
  /** The four items that act, per row: an operation the store does not implement
   *  gets no row at all, rather than a button that does nothing. */
  renameItemHidden: boolean;
  pinItemHidden: boolean;
  archiveItemHidden: boolean;
  deleteItemHidden: boolean;
  /** Whether the conversation is pinned: read by the pin shortcut, and by the pin
   *  item's label. */
  pinned: boolean;
}

export interface AssistantState {
  // thread
  messages: ChatMessage[];
  suggestions: string[] | undefined;
  loading: boolean;
  // the model switcher recipe
  models: ModelOption[];
  currentModel: string;
  // the rail
  activeId: string | undefined;
  /** The rail's search box, lowercased and trimmed. A FIELD rather than a
   *  read of the input, because the controller owns no DOM: the rows below
   *  are already filtered by it. */
  query: string;
  /** The rows the rail renders: the summaries, projected and then FILTERED
   *  by `query`. The old script rendered them all and hid the misses. */
  conversationRows: ConversationRow[];
  // The composer
  /** The composer's controlled text mirror. It is a field rather than a DOM read
   *  because the voice transcript has to WRITE into the composer, and the kit's
   *  only channel for that is the `value` prop. */
  promptValue: string;
  /** The composer's placeholder: it carries the one recording signal the kit's
   *  own mic does not paint. */
  promptPlaceholder: string;
  /** Entity triggers: `/` for skills, `@` for agents. */
  triggers: EntityTrigger[];
  /** The composer's `+` menu. A tree rather than a flag per capability, because
   *  the menu is the only surface that can hold sections, submenus and a
   *  capability's state at once. */
  tools: ComposerTool[];
  /** How much air the message list has. A FIELD rather than the literal this
   *  block used to carry, because the menu can now change it. */
  density: 'default' | 'compact';
  /** Whether replies highlight their code blocks. */
  codeHighlight: boolean;
  /** The `tabindex` every menu row carries, and it is a FIELD rather than a
   *  literal attribute for the reason the shell's breakpoints are: a numeric
   *  literal does not survive the react form, which can only take a number on a
   *  prop typed number. Row markup reads `:tabIndex="menuItemTabIndex"`. */
  menuItemTabIndex: number;
  /** What the voice path last had to say (a failure, or a capture with no
   *  transcript). Empty means nothing to say. */
  voiceStatus: string;
  voiceStatusHidden: boolean;
  // the shell. Its two breakpoints are FIELDS rather than literal attributes
  // for one reason: a binding holds a field name and never an expression, and a
  // literal numeric attribute does not survive the react form (it is emitted as
  // a string on a prop typed number).
  /** Auto-collapse the rail below this shell width in px. */
  collapseBelow: number;
  /** Paint the rail as an overlay drawer below this shell width in px. */
  drawerBelow: number;
  /** The shell's start aside, mirrored from `kai-aside-toggle`. The SHELL holds
   *  the truth (its breakpoint moves it without this block asking); this is the
   *  copy the parts bind to. */
  railCollapsed: boolean;
  /** Hide the top bar's reopen button. The shell does not paint a collapsed
   *  aside at all, so the page supplies the way back - and shows it only while
   *  there is something to come back from. */
  railReopenHidden: boolean;
  // The settings menu (the gear beside the identity row). Both spellings of the
  // one fact are fields for the reason the row projection carries both `renaming`
  // and `renameFieldHidden`: a binding holds a field, never an expression, and
  // each attribute has to be handed the value IT accepts.
  /** The scheme the reader picked. */
  theme: ThemeChoice;
  /** That choice in the kit's vocabulary, which is what every kai element's
   *  `theme` attribute takes. */
  themeMode: 'light' | 'dark' | 'auto';
  /** The identity menu's items (the plan line, new chat, the account row). */
  accountItems: MenuItem[];
  /** The settings menu's items (the theme group). */
  settingsItems: MenuItem[];
}

/** The element handles the controller calls methods on. Nullable because no
 *  framework has them at construction: React's ref is null through the first
 *  render, Vue's until mount. */
export interface AssistantRefs {
  prompt: KaiPromptInputElement | null;
  workspace: KaiWorkspaceElement | null;
  /** The recorder the composer's own mic drives (see `voiceToggle`). */
  voice: KaiVoiceInputElement | null;
}

export interface AssistantDeps {
  refs: () => AssistantRefs;
  /** Storage key; the block's default is its own id. */
  storageKey?: string;
}

export interface AssistantActions {
  /** `@kai-model-change` on the switcher. */
  modelChange(event: CustomEvent<{ modelId: string }>): void;
  /** `@kai-aside-toggle` on the shell: the one source of the rail's collapsed
   *  state, however it happened (the rail's toggle, the breakpoint, the
   *  drawer's Escape). */
  asideToggle(event: CustomEvent<{ collapsed: boolean }>): void;
  /** `@kai-toggle-sidebar` on the rail's built-in header toggle: collapses the
   *  SHELL, so the column goes and main reflows. */
  collapseRail(): void;
  /** `@kai-click` on the top bar's reopen button: expands the SHELL. */
  expandRail(): void;
  /** `@kai-conversation-select` on the rail. */
  openConversation(event: CustomEvent<{ id: string }>): Promise<void>;
  /** `@kai-new-chat` on the rail. */
  newChat(): void;
  /** `@kai-search` on the rail's built-in search box. */
  search(event: CustomEvent<{ query: string }>): void;
  /** `@kai-submit` on the prompt input. */
  submit(event: CustomEvent<{ value: string; attachments?: unknown[] }>): Promise<void>;
  /** `@kai-value-change` on the prompt input: the composer's text mirror. */
  valueChange(event: CustomEvent<{ value: string }>): void;
  /** `@kai-select` on the prompt input: a `+` menu row was chosen. `checked` is
   *  present only when the row is a toggle, and it carries the NEW state. */
  toolSelect(event: CustomEvent<{ id: string; checked?: boolean }>): void;
  // VOICE. The composer's own mic fires kai-voice with no detail (it is one
  // button, not a state machine), so this block owns the start/stop decision and
  // the kit's kai-voice-input does the recording.
  /** `@kai-voice` on the prompt input: start recording, or stop it when one is
   *  already running. */
  voiceToggle(): void;
  /** `@kai-recording-change` on the recorder. */
  voiceRecording(event: CustomEvent<{ recording: boolean }>): void;
  /** `@kai-transcription` on the recorder: the transcript, into the composer. */
  voiceTranscript(event: CustomEvent<{ text: string }>): void;
  /** `@kai-voice-error` on the recorder. */
  voiceError(event: CustomEvent<{ message: string }>): void;
  /** `@kai-audio-captured` on the recorder: the record-only path, which is the
   *  one case where audio arrives with no transcript coming at all. */
  voiceCaptured(): void;
  /** `@kai-rename` on a row's inline editor. The row is `renamingId`, which F2
   *  and the row menu are the only writers of, so the event carries the new
   *  title and nothing else. */
  renameCommit(event: CustomEvent<{ value: string }>): Promise<void>;
  /** `@kai-cancel` on a row's inline editor. */
  renameCancel(): void;
  /** `@kai-click` on any row-menu item that acts: Rename, Pin or Unpin, Archive,
   *  Delete. The item carries its op and its row (see `rowMenuTarget`), because
   *  `@event` binds one action name and hands it the event. */
  rowMenuAction(event: Event): Promise<void>;
  /** `@kai-select` on the identity menu (the placeholder account row's menu). */
  accountMenuSelect(event: CustomEvent<{ id: string }>): void;
  /** `@kai-select` on the settings menu: the theme group's Light, Dark or
   *  System. The item's id IS the choice. */
  settingsMenuSelect(event: CustomEvent<{ id: string; radioGroup?: string }>): void;
  /** Mount hook: hydrate from storage. Not a binding - the host calls it. */
  boot(): Promise<void>;
}

export interface AssistantController {
  state(): AssistantState;
  actions: AssistantActions;
  subscribe(listener: () => void): () => void;
}

export function createController(deps: AssistantDeps): AssistantController {
  const listeners = new Set<() => void>();

  let state: AssistantState = {
    messages: [],
    suggestions: SUGGESTIONS,
    loading: false,
    models: MODELS,
    currentModel: MODELS[0].id,
    activeId: undefined,
    query: '',
    conversationRows: [],
    promptValue: '',
    promptPlaceholder: PROMPT_PLACEHOLDER,
    triggers: TRIGGERS,
    tools: projectTools({ density: 'compact', codeHighlight: true }),
    density: 'compact',
    codeHighlight: true,
    menuItemTabIndex: -1,
    voiceStatus: '',
    voiceStatusHidden: true,
    // The shell's documented pair, one page's worth: below 720 the rail goes,
    // below 640 an expanded rail is an overlay drawer.
    collapseBelow: 720,
    drawerBelow: 640,
    railCollapsed: false,
    railReopenHidden: true,
    // The block starts on the system's scheme, which is what the kit's own
    // `auto` default does and what the page did before the menu existed.
    ...projectMenus('system'),
  };

  // A NEW state object every patch: the snapshot getter is compared by
  // identity by useSyncExternalStore, and the kai- reactivity contract wants a
  // new array reference for `messages` anyway.
  const patch = (next: Partial<AssistantState>): void => {
    state = { ...state, ...next };
    for (const l of listeners) l();
  };

  const setMessages = (messages: ChatMessage[]): void =>
    patch({ messages, suggestions: messages.length === 0 ? SUGGESTIONS : undefined });

  // The UNFILTERED projection, kept beside State rather than in it: nothing
  // binds it, and a field nothing binds is not part of the view model.
  let allRows: ConversationRow[] = [];
  // The last summaries the store handed up, kept for the same reason as
  // `allRows`: the row projection is re-run when the RENAME state moves, not
  // only when the summaries do.
  let lastSummaries: ConversationSummary[] = [];
  /** The conversation whose inline rename field is open, or undefined. Beside
   *  State for the same reason as `allRows`: nothing binds it directly; the rows
   *  carry it, projected. */
  let renamingId: string | undefined;
  /** Whether the recorder is running. Beside State because nothing binds it:
   *  the placeholder is what a reader sees. */
  let recording = false;
  /** `boot()` is called once per host by contract, and react's StrictMode runs
   *  the effect that calls it TWICE. A second keydown listener would fire every
   *  shortcut twice, which for a toggle is a silent no-op (pin, unpin). */
  let booted = false;

  /** The old script matched the row's whole `textContent`: the title and the
   *  preview line, concatenated with NO separator. The same fields here, read off
   *  the row model instead of off the DOM, and joined with spaces -- so a query is
   *  no longer able to match across a boundary the reader never sees. */
  const filterRows = (rows: ConversationRow[], query: string): ConversationRow[] =>
    query === ''
      ? rows
      : rows.filter((row) => `${row.title} ${row.preview}`.toLowerCase().includes(query));

  const store = localStorageStore(deps.storageKey ?? 'assistant');

  // WHAT THE STORE CAN DO, read off the store itself. The four operations are
  // OPT-IN on ConversationStore, and ConversationController refuses LOUDLY when
  // one is missing - but a report is not an affordance: a menu row for an
  // operation the store cannot perform is a button that does nothing, so the
  // block asks first and offers nothing. These flags gate the rows AND the two
  // shortcuts, so a store without them shows no row and binds no key.
  const storeOps = {
    rename: typeof store.rename === 'function',
    pin: typeof store.setPinned === 'function',
    archive: typeof store.setArchived === 'function',
    remove: typeof store.remove === 'function',
  };

  const controller = createConversationController(store, {
    onMessagesLoad: (msgs) => setMessages(msgs),
    onSummariesChange: (summaries) => patch(projectSummaries(summaries)),
  });

  function projectSummaries(summaries: ConversationSummary[]): Partial<AssistantState> {
    lastSummaries = summaries;
    allRows = summaries.map((s) => {
      // Display dedupe: the store titles a conversation from message text, so
      // the title and the trailing preview can be the same string.
      const preview = s.trailing && s.trailing !== s.title ? s.trailing : '';
      const renaming = renamingId === s.id;
      return {
        id: s.id,
        title: s.title,
        preview,
        previewHidden: preview === '',
        unread: isConversationUnread(s),
        menuLabel: `Actions for ${s.title}`,
        renaming,
        renameFieldHidden: !renaming,
        pinLabel: s.pinned ? 'Unpin' : 'Pin',
        renameItemHidden: !storeOps.rename,
        pinItemHidden: !storeOps.pin,
        archiveItemHidden: !storeOps.archive,
        deleteItemHidden: !storeOps.remove,
        pinned: s.pinned === true,
      };
    });
    return { conversationRows: filterRows(allRows, state.query), activeId: controller.activeId() };
  }

  /** Open (id) or close (undefined) the one inline rename field. Re-projects
   *  every row, because the edit flags are per row and the kai- reactivity
   *  contract is reference-keyed: patching the rows in place would hand every
   *  renderer the same objects it already had, which reads as "nothing
   *  changed". */
  const applyRenaming = (id: string | undefined): void => {
    renamingId = id;
    patch(projectSummaries(lastSummaries));
  };

  /** Close the inline field when its row is the one leaving the list (archived or
   *  deleted): the field is keyed by conversation id, and its row is gone. */
  const closeRenaming = (id: string): void => {
    if (renamingId === id) applyRenaming(undefined);
  };

  /** The row model for the ACTIVE conversation, or undefined when there is none:
   *  an empty thread, or a conversation whose row left the one list order (an
   *  archived one, which `orderedSummaries` excludes). */
  const activeRow = (): ConversationRow | undefined =>
    allRows.find((row) => row.id === state.activeId);

  /**
   * The three row shortcuts, and the facts that decide their shape.
   *
   * WHERE THEY LISTEN: the document, guarded to this block's own keys. A block
   * that IS the page owns its document, and the keys have to work when nothing
   * inside the app holds focus - which is the ordinary case here, because the
   * suggestion list unmounts on the first turn and hands focus back to the body.
   * A listener on the block element alone (tried first, and measured failing
   * exactly that way) works only while some control inside the block is focused.
   * The guard is what keeps the document listener a citizen: the key must be
   * aimed at this block (its retargeted target is inside the shell) or at the
   * body itself (nothing focused). A key aimed at another part of the page is
   * somebody else's. Two copies of the block on one page would both answer the
   * nothing-focused case; that is the composition's problem to scope, and the
   * block says so rather than guessing.
   *
   * WHAT THEY ACT ON: `state.activeId`, the conversation that is open. The menu's
   * rows act on the row they were opened from; a key has no row, so the block
   * answers with the one conversation that is unambiguous, and with none it does
   * nothing rather than guessing a neighbour. The menu's chips are exactly these
   * keys: F2, Mod+Shift+P, Mod+Shift+A. Cmd+R and Cmd+P are NOT bound (reload,
   * print), and Cmd+P is why the pin is Mod+SHIFT+P.
   *
   * A key whose operation the store does not implement is not handled at all:
   * the same rule the menu follows (no row, no key), rather than a shortcut that
   * reports a refusal the reader can see no reason for.
   */
  const onShortcut = (event: KeyboardEvent): void => {
    const target = event.target as Node | null;
    const owner = deps.refs().workspace;
    if (target && target !== document.body && target !== document.documentElement
      && !(owner?.contains(target) ?? false)) return;

    const mod = event.metaKey || event.ctrlKey;
    if (!mod && !event.shiftKey && event.key === 'F2') {
      const id = state.activeId;
      if (id === undefined || !storeOps.rename) return;
      event.preventDefault();
      applyRenaming(id);
      return;
    }
    if (!mod || !event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 'p') {
      const row = activeRow();
      if (!row || !storeOps.pin) return;
      event.preventDefault();
      void controller.setPinned(row.id, !row.pinned);
    } else if (key === 'a') {
      const row = activeRow();
      if (!row || !storeOps.archive) return;
      event.preventDefault();
      closeRenaming(row.id);
      // Always `true`: an archived conversation is in no list this block renders,
      // so there is no row to unarchive from and no state to read. The controller
      // is what unlists it and clears the active pointer.
      void controller.setArchived(row.id, true);
    }
  };

  /** Write text into the composer. `promptValue` is the block's controlled mirror
   *  of the composer's text, so it is the only channel a block has into it — and
   *  APPENDING is the honest behaviour: the caret lives inside the element's shadow
   *  root and the block cannot ask where it is, so anything cleverer would be
   *  guessing at a position it cannot read. */
  function insertIntoPrompt(text: string): void {
    const current = state.promptValue;
    const gap = current && !/\s$/.test(current) ? ' ' : '';
    patch({ promptValue: `${current}${gap}${text}` });
  }

  const actions: AssistantActions = {
    modelChange(event) {      // The scripted mock ignores the selection (it is a script); a real
      // transport encodes the thread for a backend that routes on the id its
      // request carries.
      patch({ currentModel: event.detail.modelId });
    },

    // One aside is projected (start), so the value the shell reports IS the
    // rail's; a second aside would have to filter on `detail.side` here.
    asideToggle(event) {
      patch({ railCollapsed: event.detail.collapsed, railReopenHidden: !event.detail.collapsed });
    },

    collapseRail() {
      deps.refs().workspace?.collapseAside('start');
    },

    expandRail() {
      deps.refs().workspace?.expandAside('start');
    },

    async openConversation(event) {
      await controller.select(event.detail.id);
    },

    newChat() {
      controller.startNew();
    },

    search(event) {
      const query = event.detail.query.trim().toLowerCase();
      patch({ query, conversationRows: filterRows(allRows, query) });
    },

    valueChange(event) {
      patch({ promptValue: event.detail.value });
    },

    // The composer's `+` menu, one handler for every row: the id says both what
    // was chosen and what to do about it, so there is no second table of ids to
    // keep in step with the tree above.
    toolSelect(event) {
      const { id, checked } = event.detail;
      if (id === 'highlighting' || id === 'density') {
        const next =
          id === 'highlighting'
            ? { codeHighlight: checked ?? false }
            : { density: (checked ?? false) ? ('compact' as const) : ('default' as const) };
        // The tree is rebuilt with the new state rather than patched beside it,
        // because the menu row and the chip are two views of ONE field: leaving
        // them to be updated separately is how they come to disagree.
        const merged = { density: state.density, codeHighlight: state.codeHighlight, ...next };
        patch({ ...merged, tools: projectTools(merged) });
        return;
      }
      const text = toolInsertText(id);
      if (text) insertIntoPrompt(text);
    },

    // The composer's mic and the recorder are two elements on purpose: the mic is
    // a button in the composer's own toolbar (the kit paints it, the block cannot
    // reach inside), and <kai-voice-input> is the element that owns
    // getUserMedia/SpeechRecognition. `kai-voice` carries no detail, so the block
    // keeps the one bit that decides what the click means.
    voiceToggle() {
      const voice = deps.refs().voice;
      if (!voice) return;
      if (recording) voice.stop();
      else voice.start();
    },

    voiceRecording(event) {
      recording = event.detail.recording;
      patch({ promptPlaceholder: recording ? LISTENING_PLACEHOLDER : PROMPT_PLACEHOLDER });
    },

    voiceTranscript(event) {
      const text = event.detail.text.trim();
      // An empty transcript is not an error: the kit reports that case through
      // kai-voice-error (`no-result`), and this action only ever adds text.
      if (text === '') return;
      const draft = state.promptValue.trim();
      patch({
        promptValue: draft === '' ? text : `${draft} ${text}`,
        promptPlaceholder: PROMPT_PLACEHOLDER,
        voiceStatus: '',
        voiceStatusHidden: true,
      });
      // The transcript is the reader's to edit, so the caret goes where the text
      // landed: the composer does not take focus when its value changes.
      deps.refs().prompt?.focus();
    },

    voiceError(event) {
      patch({ voiceStatus: `Voice failed: ${event.detail.message}`, voiceStatusHidden: false });
    },

    voiceCaptured() {
      patch({ voiceStatus: VOICE_NO_TRANSCRIPT, voiceStatusHidden: false });
    },

    async renameCommit(event) {
      const title = event.detail.value.trim();
      const id = renamingId;
      applyRenaming(undefined);
      // An emptied field is a cancel, not a request for a blank title: the
      // store's own title policy (the latest message text) is the fallback. The
      // field is already closed either way, which is what the page shows.
      if (id === undefined || title === '') return;
      await controller.rename(id, title);
    },

    renameCancel() {
      applyRenaming(undefined);
    },

    // The settings menu's theme group: the item's id IS the choice, so nothing
    // here re-reads an attribute - `kai-select` carries the id the kit emitted.
    settingsMenuSelect(event) {
      const choice = themeOf(event.detail.id);
      if (choice === undefined) return;
      patch(projectMenus(choice));
    },

    // The identity menu: one item that acts. The account row is disabled, so the
    // kit never emits it - `account-settings` is matched here only to say so out
    // loud if that ever changes.
    accountMenuSelect(event) {
      if (event.detail.id === 'new-chat') controller.startNew();
    },

    // One action for the four items that act, because the binding grammar binds
    // one action name per element and hands it the event: the op is a literal on
    // the item and the row is the item's bound conversation id (see
    // `rowMenuTarget`). Each op then takes the same road the shortcut takes, so
    // a menu click and a key press cannot drift apart.
    async rowMenuAction(event) {
      const target = rowMenuTarget(event);
      if (!target) return;
      switch (target.op) {
        case 'rename':
          if (storeOps.rename) applyRenaming(target.conversationId);
          return;
        case 'pin': {
          if (!storeOps.pin) return;
          const row = allRows.find((r) => r.id === target.conversationId);
          await controller.setPinned(target.conversationId, !(row?.pinned ?? false));
          return;
        }
        case 'archive':
          if (!storeOps.archive) return;
          closeRenaming(target.conversationId);
          await controller.setArchived(target.conversationId, true);
          return;
        case 'delete':
          if (!storeOps.remove) return;
          closeRenaming(target.conversationId);
          await controller.remove(target.conversationId);
          return;
      }
    },

    async submit(event) {
      const text = event.detail.value.trim();
      if (!text || state.loading) return;
      patch({ voiceStatus: '', voiceStatusHidden: true });
      // THE MENTION PILL SURVIVES AS TEXT, and this is where the kit decides it:
      // kai-prompt-input flattens its document with the composer model's
      // serializeToText, which writes `promptText ?? label` for every entity, so
      // `detail.value` already contains the pill (and the skill's expansion, when
      // the trigger item declares one). The structured `entities` array is NOT
      // carried past this line: ChatMessage has no metadata field and MessagePart
      // has no entity variant, so a mention is text in the sent message, exactly
      // as it is text in the composer's own serialization.
      // The composer does not clear itself on submit - clearing is the host's
      // call, made through the element's public clear() method. That method, and
      // the document keydown listener in boot(), are the two DOM touches this
      // controller has, and they are why it declares its refs.
      deps.refs().prompt?.clear();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        actions: [...USER_ACTIONS],
        parts: [
          { type: 'text', text },
          ...((event.detail.attachments ?? []) as never[]).map((attachment) => ({
            type: 'file' as const,
            attachment,
          })),
        ],
      };
      setMessages([...state.messages, userMessage]);
      patch({ loading: true });

      const stream = createAssistantStream((update) => setMessages(update(state.messages)));
      try {
        // The whole thread, including the turn just added: the scripted mock
        // ignores it, and a real backend has to be sent it.
        await readOpenAIStream(await transport.reply(state.messages), stream);
        for (const part of state.messages.find((m) => m.id === stream.id)?.parts ?? []) {
          if (part.type !== 'tool' || part.tool.state !== 'input-available' || !part.tool.toolCallId) continue;
          // The wire announces a call; answering it is the host's side of the
          // seam, so which mode is installed decides what happens here. The
          // scripted mock settles it, a real backend leaves it to the server's
          // tool loop, and the composition-only mode throws by name.
          const output = transport.toolOutput(part.tool.type);
          // A CARD TOOL IS NOT A TOOL RESULT: `kai_<type>` names a card, and the
          // envelope comes from the call's own arguments (see the prefix's note
          // above). It is deliberately the ONLY card path here, because a card
          // built this way replaces itself in place when the same call is
          // revised: `upsertCardPart` keys on the envelope id, which is the
          // provider's own call id.
          const card = part.tool.type.startsWith(KAI_CARD_TOOL_PREFIX)
            ? {
                type: part.tool.type.slice(KAI_CARD_TOOL_PREFIX.length),
                id: part.tool.toolCallId ?? part.tool.type,
                data: part.tool.input ?? {},
              }
            : undefined;
          if (card && part.tool.toolCallId) {
            stream.addCard(card);
            // The call PRODUCED the card, so it settles - what is still pending
            // is the USER's answer, and that is recorded in the output rather
            // than in the state: the kit's own example for this path carries
            // `{ status: 'awaiting_user' }`, and `output` is where a value the
            // app reads belongs. The tool row stays a real, settled call.
            stream.upsertTool(part.tool.toolCallId, {
              state: 'output-available',
              output: { status: 'awaiting_user', card: card.id },
            });
            continue;
          }
          if (output) stream.upsertTool(part.tool.toolCallId, { state: 'output-available', output });
        }
        stream.done();
        setMessages(
          state.messages.map((m) => (m.id === stream.id ? { ...m, actions: [...ASSISTANT_ACTIONS] } : m)),
        );
        // Mints the id on the first turn, saves, marks read while seen.
        await controller.saveTurn(state.messages);
      } catch (err) {
        stream.abort(err instanceof Error ? err.message : String(err));
      } finally {
        patch({ loading: false });
      }
    },

    async boot() {
      if (!booted) {
        booted = true;
        // Never removed: the controller contract has no teardown hook, and the
        // host owns the document for as long as the block is on it.
        document.addEventListener('keydown', onShortcut);
      }
      setMessages([]);
      await controller.refresh();
      await controller.restore();
    },
  };

  return {
    state: () => state,
    actions,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
