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
 * is through `deps.refs()`, and only for the three facts the page's grammar has
 * no declarative equivalent for: the composer's clear()/focus() methods, the
 * rail's focus() for the section label's filter control, and the row-menu
 * SHORTCUTS, a keydown listener on the document that stands down for any key
 * aimed outside this block (see `onShortcut`).
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
 * 6. THE RAIL'S SECTIONS ARE DERIVED FROM ITS ROWS. A conversation's project is
 *    a field of the row, and the projects a section each are read back off the
 *    rows in the same pass that orders them - so there is one ordering, and a
 *    row cannot sit in a section the rail does not render. The demo files a
 *    conversation by its opening turn (see `PROJECTS`); a consumer's own
 *    `groupId` on the summary works the same way.
 * 7. THE COLOR SCHEME IS PER ELEMENT, AND THE BLOCK SAYS SO ON EVERY ONE. The
 *    kit's `theme` prop (`light` | `dark` | `auto`) is on every kai element and
 *    the tokens live inside each shadow root, so nothing about the scheme
 *    inherits: a page that owns the choice has to set it on every element it
 *    renders (the kit's own theming doc says the same). `theme` is the choice in
 *    the menu's vocabulary and `themeMode` is the same choice in the kit's, one
 *    field each because a binding holds a field and never an expression.
 * 8. THE RAIL'S CHROME IS A PROJECTION OF THE RAIL'S OWN STATE. The kebab on a
 *    section label changes two fields, and the label over the folders, the folder
 *    headings, the Show more row, the row order AND the indent all follow from
 *    them - so "by project" and "one list" are one derivation read two ways
 *    rather than two rails to keep in step. Its rows are an items array, which is
 *    the shape that holds a section label, a single-choice row, a divider, a
 *    disabled row and a sentence in one prop, and that is why that menu is a
 *    kai-menu rather than authored markup. The trailing actions themselves sit in
 *    the row's own menu region, which the container's item-mode contract excludes
 *    from activation and from the arrow walk: a row's chrome can therefore be
 *    keyboard reachable without joining the walk.
 */
import { createAssistantStream } from '@kitn.ai/ui/state';
import type { ChatMessage } from '@kitn.ai/ui/state';
import { readOpenAIStream, type StreamSource } from '@kitn.ai/ui/wire';
import { cardFromToolCall } from '@kitn.ai/ui/schemas';
import {
  localStorageStore,
  createConversationController,
  byPinnedThenRecency,
  byRecency,
  isConversationUnread,
  type ConversationSummary,
} from '@kitn.ai/ui/stores';
import type {
  KaiConversationsElement,
  KaiDialogElement,
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

const SUGGESTIONS = ['Summarize a document', 'Make a task list', 'Compare two options', 'Draft a short brief'];

/** One card on the empty state, and the conversation it opens. The four are a
 *  PATH in the order a developer meets them: get it running, point it at a
 *  model, add voice, then send a card. Each guide's own last turn offers the
 *  next one, which is why the order is here rather than in the markup. */
export interface GuideCard {
  id: string;
  title: string;
  summary: string;
}

/** What a card click puts in the thread: the question the card ASKS. The answer
 *  is not here, and deliberately - a click sends the question through the same
 *  reply path a typed message takes, so the guide's opening sentence exists once,
 *  in the transport that scripts it. A card that carried its own copy of the
 *  answer would be a second place for that sentence to drift. */
interface Guide extends GuideCard {
  question: string;
}

const GUIDES: readonly Guide[] = [
  {
    id: 'get-it-running',
    title: 'Get it running',
    summary: 'Replace the scripted mock with your backend by swapping one file.',
    question: 'How do I get this talking to my own backend?',
  },
  {
    id: 'wire-a-model',
    title: 'Wire a model',
    summary: 'Point the thread at OpenRouter, Anthropic, or your own route.',
    question: 'Which provider does this use? I want to point it at OpenRouter.',
  },
  {
    id: 'add-voice',
    title: 'Add voice',
    summary: 'Record and transcribe speech, and the events that drive your UI.',
    question: 'Can users talk to this instead of typing?',
  },
  {
    id: 'send-a-card',
    title: 'Send a card',
    summary: 'Let a tool return a card the thread renders and reads back.',
    question: 'Can the model send a form instead of another paragraph?',
  },
];

/** The cards the empty state renders. Projected rather than handed the GUIDES
 *  array so the view model carries what the markup binds and nothing else. */
function projectGuides(): GuideCard[] {
  return GUIDES.map((g) => ({ id: g.id, title: g.title, summary: g.summary }));
}

/** The labels under the composer after each assistant turn, per conversation,
 *  verbatim from the reviewed storyboard.
 *
 *  KEYED BY THE CONVERSATION'S MOST RECENT OPENING — the last user turn whose
 *  text is itself one of these keys — and indexed by how many assistant turns
 *  have landed since that turn, so one entry per TURN, not one per
 *  conversation. That makes a turn nobody wrote a line for a visible hole in
 *  this table rather than a silence on screen, and it is what makes a
 *  CROSS-LINK work: the labels at the end of an arc are the other openers, and
 *  clicking one sends it as a user turn, which is the new conversation's key.
 *  Keying on the THREAD's first user turn instead would leave the click reading
 *  the arc it just finished (`NEXT_LINE_BY_OPENING[key][2]` is past the end of a
 *  two-turn row) and the thread would offer nothing to click ever again. A
 *  thread the reader typed themselves matches no key and gets no labels, which
 *  is right: there is no script for it to follow.
 *
 *  The last entry of each conversation is the cross-links — the other openers —
 *  and they are last deliberately: offering a different topic mid-thread breaks
 *  the thread the reader is in, and offering one when a topic has finished is
 *  the natural moment. `Send a card` ends on `Get it running` rather than
 *  dead-ending, so the four guides are walkable as a loop.
 *
 *  A card's own answers are labels here too (`Use Postgres`), which is how a
 *  scripted conversation handles the fact that it cannot branch: the card asks,
 *  the answer is offered, and the next turn plays either way.
 *
 *  AN ARC'S FIRST LABEL IS THE READER'S INTENT, never the question the arc's next
 *  turn leaves unanswered: `Post it to #metrics` is what the confirm card is for,
 *  and `Use what I typed` is the one line a form can echo back. */
const NEXT_LINE: Record<string, readonly (readonly string[])[]> = {
  // the guides, opened from a card
  'How do I get this talking to my own backend?': [
    ['Show the real transport'],
    ['Where does it get parsed?'],
    ['Wire a model', 'Add voice', 'Send a card'],
  ],
  'Which provider does this use? I want to point it at OpenRouter.': [
    ['Show the OpenRouter route'],
    ['What changes for Anthropic?'],
    ['What about the model ids?'],
    ['Add voice', 'Send a card', 'Get it running'],
  ],
  'Can users talk to this instead of typing?': [
    ['Use my own transcriber'],
    ['What events does it fire?'],
    ['Send a card', 'Get it running', 'Wire a model'],
  ],
  'Can the model send a form instead of another paragraph?': [
    ['How does the model know?'],
    ['Show me the tool loop'],
    ['What about citations?'],
    ['Get it running', 'Wire a model', 'Add voice'],
  ],
  // the suggestions, opened by clicking one
  'Summarize a document': [
    ['Post it to #metrics'],
    ['Make a task list', 'Compare two options', 'Draft a short brief'],
  ],
  'Make a task list': [
    ['Mark the first one done'],
    ['Summarize a document', 'Compare two options', 'Draft a short brief'],
  ],
  'Compare two options': [
    ['Use Postgres', 'Use SQLite'],
    ['Summarize a document', 'Make a task list', 'Draft a short brief'],
  ],
  'Draft a short brief': [
    ['Use what I typed'],
    ['Summarize a document', 'Make a task list', 'Compare two options'],
  ],
};

/** Case and spacing cannot make two spellings of one label miss each other. */
const foldOpening = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, ' ');

/** The table the LOOKUP reads, folded once here.
 *
 *  The literal keys above are there to be read, and a thread's opening text is
 *  folded before it is looked up — which is how the first version of this missed
 *  every conversation: the literals are mixed case and the key was lowercase, so
 *  `NEXT_LINE[key]` was always undefined. THE CHECK BELOW READS THIS MAP TOO, so
 *  what it verifies is what the lookup does; checking a different table is how a
 *  guard passes over a lookup that never matches. */
const NEXT_LINE_BY_OPENING: Record<string, readonly (readonly string[])[]> = Object.fromEntries(
  Object.entries(NEXT_LINE).map(([key, line]) => [foldOpening(key), line]),
);

/** Every key must be something the page can actually send: a card's question, or
 *  one of the openers. A key nobody can send is a conversation whose follow-ups
 *  never appear, and nothing else would say so — so it is checked here rather
 *  than left for a reader to notice. */
{
  const sendable = new Set([...GUIDES.map((guide) => foldOpening(guide.question)), ...SUGGESTIONS.map(foldOpening)]);
  for (const key of Object.keys(NEXT_LINE_BY_OPENING)) {
    if (!sendable.has(key)) {
      throw new Error(
        `assistant: nothing opens a conversation with ${JSON.stringify(key)}, so its follow-ups could never be shown`,
      );
    }
  }
}

/** Which conversation a thread is, and how many of that conversation's answers
 *  have landed: the LAST user turn whose text is a key of the table above, and
 *  the assistant turns after it.
 *
 *  THE LAST KEY, NOT THE FIRST. Both ways into a conversation write a user turn
 *  (`openGuide` asks the card's question, `submit` sends one the reader typed),
 *  and a cross-link is a submit whose text IS another conversation's key — so
 *  "the last key-bearing user turn" is the conversation the thread is in now,
 *  whether it was opened at the top or twenty turns in. Everything a
 *  conversation says in between (`Post it to #metrics`, a card's own answer) is
 *  not a key, so a mid-arc turn keeps the opening it belongs to. */
const conversationOf = (messages: ChatMessage[]): { key: string; answers: number } | undefined => {
  let key: string | undefined;
  let at = -1;
  messages.forEach((message, index) => {
    if (message.role !== 'user') return;
    const part = message.parts.find((candidate) => candidate.type === 'text');
    if (part?.type !== 'text') return;
    const text = foldOpening(part.text);
    if (NEXT_LINE_BY_OPENING[text] !== undefined) {
      key = text;
      at = index;
    }
  });
  if (key === undefined) return undefined;
  return { key, answers: messages.slice(at + 1).filter((message) => message.role === 'assistant').length };
};

/** The labels a thread offers right now.
 *
 *  READ OFF THE MESSAGES rather than stored beside them, so one derivation
 *  covers every way a thread changes — a card opening a guide, a submit, a
 *  streamed chunk, a loaded conversation, a new chat. Three answers, and the
 *  middle one is the case worth naming: a trailing USER turn means the answer is
 *  still coming, so there is nothing to click yet.
 *
 *  AND ONE SILENCE, stated rather than implied: a conversation whose script has
 *  run out — a reader typing on after a finished arc — has no row at
 *  `answers - 1` and so offers nothing. The claim is narrower than "every
 *  assistant turn": every SCRIPTED turn offers its next step, and a thread no
 *  script covers offers none (see spec 2026-09-26-empty-state-and-guides §5). */
const suggestionsFor = (messages: ChatMessage[], streaming: boolean): string[] | undefined => {
  if (streaming) return undefined;
  if (messages.length === 0) return [...SUGGESTIONS];
  if (messages[messages.length - 1]?.role !== 'assistant') return undefined;
  const conversation = conversationOf(messages);
  const line = conversation === undefined
    ? undefined
    : NEXT_LINE_BY_OPENING[conversation.key]?.[conversation.answers - 1];
  // A fresh array every time: the lists are reference-keyed, and handing back the
  // table's own row would make a second render of the same turn a no-op.
  return line === undefined ? undefined : [...line];
};

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

/** The operations a rail row's menu can perform, in the order the menu renders
 *  them (Share is not here: it has no handler to name). */
type RowMenuOp = 'rename' | 'pin' | 'archive' | 'delete';
const ROW_MENU_OPS: readonly string[] = ['rename', 'pin', 'archive', 'delete'];

/** The color scheme the reader picked in the settings menu. `system` is a real
 *  choice rather than a spelling of the kit's `auto`: the block keeps the CHOICE
 *  and hands each binding the value ITS attribute accepts (see `themeMode`). */
export type ThemeChoice = 'light' | 'dark' | 'system';

/** How the rail ORGANIZES its rows, in the organizer menu's own vocabulary: by
 *  the project each conversation is filed under, or one flat list. It is a
 *  field rather than two rails because both are the same rows - the difference
 *  is which row the rail emits ahead of them, which is the state a heading
 *  already is (see `railNodes`). */
export type RailOrganizer = 'project' | 'list';

/** The order the rail's rows come in. `priority` is the kit's own list-order
 *  rule (pinned first, then most recent) and `updated` is pure recency with the
 *  pins ignored, so the two are DIFFERENT orders whenever a pinned row is not
 *  also the newest one - which is why both are worth offering at all. */
export type RailSort = 'priority' | 'updated';

/** The choices each menu group offers, in the order the menu reads them, so the
 *  action's membership test and the menu's rows read one list. */
const RAIL_ORGANIZERS: readonly RailOrganizer[] = ['project', 'list'];
const RAIL_SORTS: readonly RailSort[] = ['priority', 'updated'];

/** The comparator each sort choice reads. The kit's own two, imported rather
 *  than restated, so a rail ordered by this menu and a list ordered by the kit
 *  cannot come to disagree about what "most recent" means. */
const RAIL_SORT_COMPARATORS: Record<RailSort, (a: ConversationSummary, b: ConversationSummary) => number> = {
  priority: byPinnedThenRecency,
  updated: byRecency,
};

/** One entry of a footer menu or of the rail's organizer menu. Mirrors the kit's
 *  `KaiMenuItem` structurally and deliberately: the block never imports the kit's
 *  internals, and the kit types this prop structurally, so the two agree by shape.
 *  Items are DATA, which is what the delivery forms carry best (a prop, not
 *  authored rows), and it is why `kai-menu` is the element these menus use.
 *
 *  THE FIELDS ARE THE MENU'S WHOLE VOCABULARY, so a row's shape is readable here:
 *  `heading` and `separator` are the section label and the divider, `radioGroup`
 *  with `checked` is a single-choice row (the kit draws its dot), `checked` alone
 *  is a toggle whose trailing glyph is `control`, `description` is the muted second
 *  line, `disabled` marks a row that is visibly unavailable, and `note` is a
 *  non-interactive sentence - where a row's REASON goes when the reason is longer
 *  than a second line. */
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
  /** The muted second line under the label: what the row means, or why it cannot act. */
  description?: string;
  /** The trailing glyph a togglable row shows: the kit's check by default, or a
   *  switch for a capability rather than a choice. */
  control?: 'check' | 'switch';
  /** A non-interactive muted sentence (uses `label`), for a reason too long for a row. */
  note?: true;
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

/** The two single-choice groups the organizer menu holds, spelled once so the
 *  rows' `radioGroup` and nothing else decides which rows are one choice. */
const RAIL_ORGANIZER_GROUP = 'rail-organizer';
const RAIL_SORT_GROUP = 'rail-sort';

/** `organizer-list` / `sort-updated`: THE ID CARRIES THE CHOICE, so the menu's
 *  rows and the action that reads them need no second table to keep in step (the
 *  same rule the settings menu's theme rows follow, where the id IS the choice). */
const organizerId = (choice: RailOrganizer): string => `organizer-${choice}`;
const sortId = (choice: RailSort): string => `sort-${choice}`;

/** The two rows that cannot act, named so the action can say they are not its
 *  own: a disabled row never emits `kai-select` (the kit skips it), and an id no
 *  action claims is a choice that silently did nothing. */
const RAIL_MANUAL_ID = 'sort-manual';
const RAIL_NEW_PROJECT_ID = 'new-project';

/**
 * The organizer menu, projected from State: the section label's kebab opens it,
 * and it holds the rail's own two settings, then a plus section under a divider.
 *
 * EVERY ROW EITHER DOES SOMETHING OR SAYS WHY IT CANNOT, and the two that cannot
 * are the two the data does not support:
 *
 *  - `Manual order` is DISABLED with its reason on the row, because this store
 *    keeps no manual position. A conversation's place is derived from its pin and
 *    its last write, and the one `sortOrder` the data carries orders conversation
 *    GROUPS, not chats - so a live row here would reorder nothing and report
 *    nothing, which is the failure this block treats as its worst.
 *  - the plus row MAKES A PROJECT: it opens the block's own create dialog, which
 *    names a project, writes it under the block's demo key and re-projects the
 *    rail. Where it is kept is said in the row's note, because that is the part a
 *    consumer has to replace - the kit has no group-persistence API, so the key
 *    stands in for the endpoint a real app owns.
 *
 * The rows that DO act are the same rows the rail is already made of: the two
 * organizers and the two sorts are a state change and a comparator, and both are
 * read off the rows the rail has already ordered.
 */
function projectRailMenu(
  organizer: RailOrganizer,
  sort: RailSort,
  projectsKey: string,
): Pick<AssistantState, 'railOrganizer' | 'railSort' | 'railItems'> {
  return {
    railOrganizer: organizer,
    railSort: sort,
    railItems: [
      { heading: true, label: 'Organizer sidebar' },
      {
        id: organizerId('project'),
        label: 'By project',
        icon: 'folder',
        radioGroup: RAIL_ORGANIZER_GROUP,
        checked: organizer === 'project',
        description: 'Group the rail by the project each chat is filed under',
      },
      {
        id: organizerId('list'),
        label: 'One list',
        icon: 'list-filter',
        radioGroup: RAIL_ORGANIZER_GROUP,
        checked: organizer === 'list',
        description: 'Every chat in one flat list, with no folders',
      },
      { heading: true, label: 'Sort chats by' },
      {
        id: sortId('priority'),
        label: 'Priority',
        icon: 'flag',
        radioGroup: RAIL_SORT_GROUP,
        checked: sort === 'priority',
        description: 'Pinned chats first, then the most recent',
      },
      {
        id: sortId('updated'),
        label: 'Last updated',
        icon: 'clock',
        radioGroup: RAIL_SORT_GROUP,
        checked: sort === 'updated',
        description: 'Most recently written first, pinned or not',
      },
      {
        id: RAIL_MANUAL_ID,
        label: 'Manual order',
        radioGroup: RAIL_SORT_GROUP,
        checked: false,
        disabled: true,
        description: 'This store keeps no manual position to order by',
      },
      { separator: true },
      {
        id: RAIL_NEW_PROJECT_ID,
        label: 'New project',
        icon: 'plus',
        description: 'Name a project, and the rail grows a folder for it',
      },
      // A note, not a disabled row's second line: where a created project is KEPT
      // is a fact about this block rather than about the row, and the kit renders
      // it as the muted non-interactive line the composer's own disabled
      // capability already uses. It says the whole truth rather than the
      // reassuring half: the kit stores which group a conversation is in and
      // nothing about the groups themselves, so these names live in the block's
      // own demo key and a real app points this row at its own endpoint.
      { note: true, label: `This block keeps the projects you make in its own demo key (${projectsKey}). The kit stores a conversation's group, not the groups themselves, so a real app points this row at the endpoint that owns them.` },
    ],
  };
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

/** The guide a clicked card names. Same shape as `rowMenuTarget`, and for the
 *  same reason: the binding grammar hands the action one event, so which card it
 *  was has to travel on the element. */
function guideTarget(event: Event): string | undefined {
  const element = event.currentTarget as HTMLElement | null;
  const id = element?.dataset.guide;
  return id && GUIDES.some((g) => g.id === id) ? id : undefined;
}

/** SAMPLE DATA, DELETE IT -- the Projects section's folders.
 *
 *  A sidebar's projects are the developer's own and this block ships no project
 *  picker, so these three exist to give the section something to be. Their names
 *  read as one developer's own work because the demo's conversations are about
 *  these subjects, and each project's `topics` are the words the demo files a
 *  conversation by.
 *
 *  HOW A CONVERSATION IS FILED, which is the demo's stand-in for a real app's:
 *  a real one files the conversation when the reader creates it inside a
 *  project. This one reads `topics` off the conversation's OPENING turn at the
 *  moment that turn is saved (`projectOfOpening`, called from the save path)
 *  and files it through the store's own `groupId` (`controller.setGroup`), so
 *  there is ONE place a filing lives and the store round-trips it like a pin.
 *  An already-filed conversation is left where it is, which keeps a later turn,
 *  a rename and a reload from moving a row. An opening that names no project's
 *  subject stays ungrouped and lands in Recents, which is where a reader's own
 *  typed conversations mostly go.
 *
 *  A group the catalogue cannot name is NOT dropped: it gets a folder of its
 *  own, labelled with the id it carries (see `sectionLabel`), because where a
 *  conversation is filed is the reader's own decision and a row this block
 *  cannot name is still a row the reader put somewhere. */
interface DemoProject {
  id: string;
  name: string;
  /** Matched as whole words, lower case, against the opening turn. */
  topics: readonly string[];
}

const PROJECTS: readonly DemoProject[] = [
  {
    id: 'assistant-ui',
    name: 'Assistant UI',
    topics: ['assistant', 'backend', 'card', 'model', 'provider', 'talk', 'voice'],
  },
  {
    id: 'docs',
    name: 'Docs and briefs',
    topics: ['brief', 'document', 'draft', 'outline', 'summarize', 'summary'],
  },
  { id: 'kanban', name: 'Kanban board', topics: ['kanban', 'sprint', 'task'] },
];

/** THE PROJECTS A READER CREATED, kept beside `PROJECTS` and for the same
 *  reason: a project is a NAME over the group ids the store already carries, so
 *  the block keeps the names and nothing else. They live under the block's own
 *  demo key (`kai:<storageKey>:projects`, see `projectKey`), which is a DEMO
 *  decision and is said out loud in the dialog that writes it: THE KIT HAS NO
 *  GROUP-PERSISTENCE API. `ConversationStore` persists a conversation's
 *  `groupId` and nothing about the groups themselves, so a project exists
 *  nowhere a consumer's backend could hand back; this key is a stand-in for the
 *  endpoint a real app owns, and it is why a created project is the reader's for
 *  this browser and no other.
 *
 *  A project created here carries NO TOPICS, so the demo's opening-turn filing
 *  rule can never file into it. That is the honest shape: nothing on this page
 *  asks which project a new chat belongs to, and topics inferred from a name
 *  would file conversations for a reason nobody could see. A conversation
 *  reaches such a project the way the store already supports - `setGroup` writes
 *  its id onto a row - and the folder is then labelled with the name kept here. */
const projectKey = (storageKey: string): string => `kai:${storageKey}:projects`;

/** What the block can read back from its own key: entries that carry both a name
 *  and an id. Anything else is dropped rather than trusted, because this key is
 *  plain storage a reader (or a half-finished write) can leave in any shape, and
 *  a project with no name would be a folder with no label. */
function storedProjects(key: string): DemoProject[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const candidate = entry as Partial<DemoProject> | null;
      return typeof candidate?.id === 'string' && typeof candidate?.name === 'string' && candidate.id !== ''
        ? [{ id: candidate.id, name: candidate.name, topics: [] }]
        : [];
    });
  } catch {
    return [];
  }
}

/** The id a project's name gets: the name folded to a slug, and a numeric
 *  suffix while that slug is taken. Derived from the name rather than minted at
 *  random because the id is the label a folder falls back to (see `sectionLabel`)
 *  when the catalogue cannot name it - a uuid there is a folder named after
 *  nothing. */
function projectId(name: string, taken: readonly DemoProject[]): string {
  const slug = foldOpening(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  let id = slug;
  for (let n = 2; taken.some((project) => project.id === id); n += 1) id = `${slug}-${n}`;
  return id;
}

/** The project whose subject the opening names, or undefined for a subject the
 *  catalogue does not know (Recents). The catalogue's own order is the
 *  tie-break: the first project that claims a word keeps it. */
function projectOfOpening(opening: string, catalogue: readonly DemoProject[]): string | undefined {
  const words = new Set(foldOpening(opening).split(/[^a-z0-9]+/));
  return catalogue.find((project) => project.topics.some((topic) => words.has(topic)))?.id;
}

/** The text of the conversation's FIRST user turn: what the demo files by.
 *  Deliberately not the stored title, which the store derives from the thread's
 *  LATEST message and which a rename replaces. */
function openingOf(messages: readonly ChatMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const part = message.parts.find((candidate) => candidate.type === 'text');
    if (part?.type === 'text') return part.text;
  }
  return '';
}

/** The rail's ONE row order, for the organizer and the sort the menu chose: the
 *  projects in the catalogue's order, the ungrouped remainder last, and inside
 *  each of those the sort's own comparator. So a pinned conversation sorts first
 *  WITHIN its project under `priority`, pinning one never lifts it out of the
 *  project it belongs to, and no pin moves a project: the section order is the
 *  catalogue's, not the rows'.
 *
 *  ONE LIST IS THE SAME FUNCTION'S FLAT BRANCH, not a second order: with no
 *  folders there is nothing for the catalogue's rank to do, so the sort choice
 *  decides the whole list. Both branches read the comparators above, which is why
 *  a rail organizing one way and sorting another cannot disagree about what the
 *  sort means. */
function orderRows(
  summaries: readonly ConversationSummary[],
  organizer: RailOrganizer,
  sort: RailSort,
  catalogue: readonly DemoProject[],
): ConversationSummary[] {
  const compare = RAIL_SORT_COMPARATORS[sort];
  if (organizer === 'list') return [...summaries].sort(compare);
  const rank = (groupId: string | undefined): number => {
    const at = catalogue.findIndex((project) => project.id === groupId);
    if (at !== -1) return at;
    // A group the catalogue does not know still gets a folder of its own, ahead
    // of the remainder: a consumer's own store can carry its own groups, and a
    // row the catalogue cannot name is reachable rather than filed in Recents.
    // The conversations with no group at all sort last.
    return groupId === undefined ? catalogue.length + 1 : catalogue.length;
  };
  return [...summaries].sort((a, b) => {
    const byProject = rank(a.groupId) - rank(b.groupId);
    if (byProject !== 0) return byProject;
    // The subgroup's id is the last tiebreak, and it is what makes every folder
    // ONE run: two groups the catalogue does not know would otherwise interleave
    // by recency, and a folder split around another folder's rows renders as two
    // folders with one label.
    const byGroup = (a.groupId ?? '').localeCompare(b.groupId ?? '');
    return byGroup !== 0 ? byGroup : compare(a, b);
  });
}

/** The rows a query leaves, in the one order. The search is the only narrowing
 *  the rail has, and it runs in the same pass that derives the sections, so a
 *  folder whose rows all missed is not a folder the rail still offers.
 *
 *  THE QUERY IS MATCHED AGAINST THE TITLE ALONE, which is all a rail row shows:
 *  a match on text nobody can see is a row the reader cannot tell apart from one
 *  that should never have matched, and the row IS one line (see `projectSummaries`). */
function narrow(rows: readonly ConversationRow[], query: string): readonly ConversationRow[] {
  return query === ''
    ? rows
    : rows.filter((row) => row.title.toLowerCase().includes(query));
}

/** What a folder heading reads: the project's own name, or - for a group the
 *  catalogue does not name - the id the row carries, so a consumer's own group
 *  is a folder with a label rather than a blank row. */
function sectionLabel(group: string, groupName: string): string {
  return groupName !== '' ? groupName : group;
}

/** The shape every row that is NOT a conversation starts from: the conversation
 *  parts off, and the four a control row can have (a caret, a menu, a rename
 *  field, the items that act) off too, plus the trailing ACTIONS, which only the
 *  two section labels show. The three builders below turn on the ones their own
 *  kind needs, so a field added to the row cannot be forgotten in one of them. */
function controlNode(id: string, kind: ConversationRow['kind'], title: string, group: string, groupName: string): ConversationRow {
  return {
    id,
    kind,
    title,
    unread: false,
    menuLabel: '',
    renaming: false,
    renameFieldHidden: true,
    pinLabel: 'Pin',
    renameItemHidden: true,
    pinItemHidden: true,
    archiveItemHidden: true,
    deleteItemHidden: true,
    pinned: false,
    group,
    groupName,
    caretHidden: true,
    caretName: '',
    menuHidden: true,
    trioHidden: true,
    trioMenuLabel: '',
  };
}

/** A rail row that is not a conversation: a folder's heading, or the Show more
 *  row. Both are rendered by the SAME repeat the conversations are, because the
 *  page grammar clones one element per repeat and has no way to interleave a
 *  second kind of row between them - so the heading is a rail row, and its
 *  `conversation-id` names the folder rather than a conversation, which is how
 *  activation tells the two apart. */
function folderNode(
  kind: 'folder' | 'more',
  group: string,
  groupName: string,
  open: boolean,
  empty = false,
): ConversationRow {
  const heading = kind === 'folder';
  const title = heading ? (group === '' ? RECENTS_LABEL : sectionLabel(group, groupName)) : SHOW_MORE_LABEL;
  return {
    ...controlNode(`${heading ? FOLDER_HEADING_NODE : FOLDER_MORE_NODE}${group}`, kind, title, group, groupName),
    // A folder's heading leads its own run with a caret that IS its open state;
    // the Show more row that ends a run has none.
    //
    // AN EMPTY FOLDER HAS NONE EITHER (`empty`): a heading over no rows would
    // carry a caret that reveals nothing, which is a control that lies about
    // what is under it. A folder grows its caret in the same pass that emits the
    // rows, so a project starts without one the moment it holds its first
    // conversation.
    caretHidden: !heading || empty,
    caretName: heading && !empty ? (open ? 'chevron-down' : 'chevron-right') : '',
    // THE RECENTS HEADING IS THE RAIL'S SECOND SECTION LABEL, so it carries the
    // same trailing actions the Projects label does; a folder INSIDE Projects
    // heads a folder rather than a section and carries none.
    trioHidden: !(heading && group === ''),
    trioMenuLabel: `Rail options for ${title}`,
  };
}

/** THE LABEL OVER THE FOLDERS: one row, the Projects heading, emitted ahead of
 *  the first folder. It is a rail row for the same reason a folder's heading is
 *  (the repeat renders one element kind), and it is a LABEL rather than a
 *  control: no caret, activation does nothing - what is under it is the folders,
 *  and they are already each their own control. It DOES carry the trailing
 *  actions, because the rail's own two settings belong to the rail rather than to
 *  any one folder. */
function sectionNode(label: string): ConversationRow {
  return {
    ...controlNode(`${SECTION_NODE}${label.toLowerCase()}`, 'section', label, '', ''),
    trioHidden: false,
    trioMenuLabel: `Rail options for ${label}`,
  };
}

/** The rail's ONE flat repeat, expanded from the ordered conversations into the
 *  rows the rail renders: for every folder, its heading and - while it is open -
 *  its conversations, then the Show more row when the folder holds more than the
 *  rail shows. Nothing wraps anything, so every row is a direct child of the
 *  list and the container's roving focus and activation cover the headings too.
 *
 *  Open/closed is therefore which rows this emits at all: a closed folder is its
 *  heading and nothing else. A search opens every folder it has a match in,
 *  because a match the reader cannot see is a match that does not exist.
 *
 *  ONE LIST EMITS THE ROWS AND NOTHING ELSE - no section label, no folder
 *  heading, no Show more, and the closed/expanded sets unread. There is no folder
 *  for a heading to head, and a row the reader cannot file has nothing to reveal
 *  from, so the flat branch is the whole of what "one list" means here.
 *
 *  A RAIL WITH NO ROWS AT ALL IS THE FIXTURE (`fixtureRail`), and the reader's
 *  own projects that hold nothing lead the folders either way. */
function railNodes(
  rows: readonly ConversationRow[],
  closed: readonly string[],
  expanded: readonly string[],
  query: string,
  organizer: RailOrganizer,
  created: readonly DemoProject[],
  fixture: boolean,
): ConversationRow[] {
  // ONE LIST IS THE ROWS UNDER ONE LABEL AND NOTHING ELSE: no folder headings, no
  // Show more, and the closed/expanded sets unread, because there is no folder for
  // a heading to head and nothing for a row to be revealed from.
  //
  // THE LABEL STAYS, and it is the one thing the flat list cannot drop: the
  // rail's own settings live in the actions a section label carries, so a list
  // with no label at all would have no way back to the organizer that made it -
  // a state the reader can enter and not leave. Its heading is the flat list's
  // own name rather than a project's, which is what makes it honest.
  if (organizer === 'list') return [sectionNode(ONE_LIST_LABEL), ...rows];
  // THE SHAPE BEFORE THE HISTORY: with an empty STORE and no search, this is what
  // a profile that has never stored anything sees. Gated on the STORE rather than
  // on the rows, and that is the difference a reader meets by archiving: an
  // archived conversation leaves the rows (which is what archiving means) while
  // staying in the store - so a fixture gated on rows would put the demo's sample
  // projects back in front of someone who still has their chat, with the same
  // headings a brand-new reader sees. Read here rather than in the state script,
  // because the rail a reader gets on their first visit is the rail's own shape.
  if (fixture && rows.length === 0 && query === '') return fixtureRail(created);
  const shut = new Set(closed);
  const grown = new Set(expanded);
  const out: ConversationRow[] = [];
  // THE READER'S OWN PROJECTS LEAD, and they are on the rail whether or not they
  // hold a row: a project the reader named exists from the moment they named it,
  // which is the whole point of the dialog that makes one. An empty one is headed
  // and nothing else (see `folderNode`). The demo's three sample projects are NOT
  // here - they are data, and data with no conversation in it is not a folder this
  // rail claims holds something.
  const empty = created.filter((project) => !rows.some((row) => row.group === project.id));
  let labelled = empty.length > 0;
  if (labelled) out.push(sectionNode(PROJECTS_LABEL));
  for (const project of empty) out.push(folderNode('folder', project.id, project.name, false, true));
  let at = 0;
  while (at < rows.length) {
    const group = rows[at].group;
    let end = at;
    while (end < rows.length && rows[end].group === group) end += 1;
    const run = rows.slice(at, end);
    const groupName = run[0].groupName;
    const open = query !== '' || !shut.has(group);
    // THE PROJECTS LABEL, once, over the first folder - and the ungrouped
    // remainder is not one, so a rail holding only Recents has no label over
    // nothing. Emitted here rather than declared beside the rows, so a query that
    // leaves no folder also leaves no label.
    if (group !== '' && !labelled) {
      out.push(sectionNode(PROJECTS_LABEL));
      labelled = true;
    }
    out.push(folderNode('folder', group, groupName, open));
    if (open) {
      const shown = grown.has(group) ? run : run.slice(0, FOLDER_LIMIT);
      out.push(...shown);
      if (shown.length < run.length) out.push(folderNode('more', group, groupName, false));
    }
    at = end;
  }
  return out;
}

/** A RAIL THAT HAS NEVER STORED ANYTHING STILL SHOWS THE SHAPE IT IS A RAIL
 *  OF, which is the whole of what this fixture is for. The rail's folders are
 *  read off the conversation ROWS, so a profile with no history had no folders,
 *  no `Projects` label and no `Recents` - and the only way to meet the demo's
 *  projects was to have already had the conversations it files. A DEMO THAT
 *  SHOWS ITS CONCEPT ONLY TO PEOPLE WHO ALREADY HAVE CHAT HISTORY SHOWS
 *  NOTHING.
 *
 *  WHY A FIXTURE AND NOT A SEED IN THE STORE. A seed written at boot was tried
 *  and reverted: it became the rail's FIRST row and took the subject away from
 *  whatever state was running (see `openGuide`). Fixture nodes avoid that by
 *  construction - they never touch storage, so they cannot become the active
 *  conversation, cannot be saved, and cannot be renamed, pinned or deleted. The
 *  moment the store holds ONE conversation the fixture is gone and the real rows
 *  rule, which is what makes it honest rather than a lie about history.
 *
 *  WHAT IT SHOWS IS STRUCTURE AND NOT THREADS: the reader's own projects, the
 *  demo's three, and the `Recents` heading. A sample CONVERSATION row would be a
 *  row with no thread behind it - clicking it could load nothing - and this block
 *  will not invent chats the reader did not have. So the folders are empty and
 *  their headings carry no caret (see `folderNode`).
 *
 *  The `Projects` label is here for the same reason it is over real folders: the
 *  rail's own settings live in the actions it carries, and one of them is the way
 *  to make a project. */
function fixtureRail(created: readonly DemoProject[]): ConversationRow[] {
  return [
    sectionNode(PROJECTS_LABEL),
    ...[...created, ...PROJECTS].map((project) => folderNode('folder', project.id, project.name, false, true)),
    // The remainder's heading, so the section a reader's own typed chats land in
    // is on screen before the first of them exists.
    folderNode('folder', '', '', false, true),
  ];
}

/** The rail's rows and the projects those rows make, from the ONE ordered list
 *  and at most one narrowing: the search. One list has no sections at all, so the
 *  section list is empty there rather than describing folders the rail does not
 *  render. */
function railFrom(
  rows: readonly ConversationRow[],
  query: string,
  closed: readonly string[],
  expanded: readonly string[],
  organizer: RailOrganizer,
  created: readonly DemoProject[],
  fixture: boolean,
): Pick<AssistantState, 'conversationRows' | 'conversationSections'> {
  const matched = narrow(rows, query);
  const nodes = railNodes(matched, closed, expanded, query, organizer, created, fixture);
  return {
    conversationRows: nodes,
    // The sections describe the folders the rail RENDERS, so the fixture's empty
    // ones are in here too rather than the two disagreeing about what is on
    // screen - and in one list there is nothing to describe.
    conversationSections: organizer === 'list'
      ? []
      : nodes.filter((node) => node.kind === 'folder').flatMap((node) => (node.group === '' ? [] : [{
        id: node.group,
        name: node.title,
        count: matched.filter((row) => row.group === node.group).length,
      }])),
  };
}

/** One project the rail shows, with what the rows in it come to right now.
 *  Derived from the rows on every change, so a project holding no row is not a
 *  section at all, and it moves with the search. Recents is not here: it is the
 *  remainder the rows with no group make, and the rail renders it last. */
export interface ConversationSection {
  id: string;
  name: string;
  /** How many rows it holds, after the search filter. */
  count: number;
}

/** One rendered row of the rail. Every field is already a string or a
 *  boolean, because `*for` bodies get bindings, not expressions.
 *
 *  A row is not always a conversation: a folder's heading, its Show more row and
 *  the Projects label over the folders are rail rows too, so `kind` says which of
 *  the four it is and the fields decide what it shows. That is why the control
 *  rows carry the whole shape with the conversation parts hidden rather than a
 *  shape of their own - the repeat renders one element. */
export interface ConversationRow {
  id: string;
  /** Which of the four rows this is. A conversation is activated by loading it; a
   *  heading and a Show more row are activated as the folder control they are;
   *  the section label heads the folders and is activated as nothing. */
  kind: 'conversation' | 'folder' | 'more' | 'section';
  title: string;
  unread: boolean;
  /** The row's own menu trigger, named for the row it belongs to: every
   *  conversation row has one, so one shared label would make five identical
   *  accessible names. Empty on a control row, whose menu is hidden. */
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
  /** The project this row is filed under, or '' for the ungrouped remainder.
   *  The id the section carries, so the two are the same fact spelled once. */
  group: string;
  /** That project's label, or ''. Empty for a group the catalogue cannot name,
   *  which a heading then labels with the id instead (`sectionLabel`). */
  groupName: string;
  /** Whether the leading caret is hidden: only a folder heading shows one. */
  caretHidden: boolean;
  /** The caret's icon name, which is the folder's open state. Empty where the
   *  caret is hidden; a binding holds a field, never an expression. */
  caretName: string;
  /** Whether the row menu is hidden: a control row carries no kebab, and the
   *  heading's own activation is the folder control. */
  menuHidden: boolean;
  /** Whether the row's TRAILING ACTIONS are hidden. The rail's two section labels
   *  - the Projects label and the Recents heading - carry them, and nothing else
   *  does: a folder heads a folder, and a conversation row's own kebab is its
   *  menu. */
  trioHidden: boolean;
  /** The trailing menu's accessible name, named for the row it belongs to: two
   *  rows carry the same menu, so one shared name would leave a screen reader with
   *  two identical controls and no way to tell which row each belongs to. Empty
   *  where the actions are hidden. */
  trioMenuLabel: string;
}

/** How many of a folder's conversations the rail shows before it offers the
 *  `Show more` row. A folder's screenful is small on purpose - the reference
 *  sidebar shows three or four - and the demo's biggest folder holds one more
 *  than this, so the row has something to reveal. */
const FOLDER_LIMIT = 4;

/** The id a folder heading's and a Show more row's rail row carries. A
 *  conversation id is a uuid, so neither prefix can collide with one. */
const FOLDER_HEADING_NODE = 'folder:';
const FOLDER_MORE_NODE = 'folder-more:';

/** The ungrouped remainder's heading, and a folder's reveal control. Both are
 *  the block's own words, which is the point of the heading being a row: the
 *  element has no label of its own for either. */
const RECENTS_LABEL = 'Recents';
const SHOW_MORE_LABEL = 'Show more';

/** The heading one flat list carries. It is the rail's own name for the rows
 *  under it rather than a project's, because there is no project being grouped:
 *  the list IS every chat, which is what the organizer chose. */
const ONE_LIST_LABEL = 'All chats';

/** The label over the folders, in the register the Recents heading already uses:
 *  the muted heading over a group of rows. The folders below it are the projects
 *  the conversations are filed into, and this says so. */
const PROJECTS_LABEL = 'Projects';

/** The id the Projects label's rail row carries. A conversation id is a uuid and
 *  the two folder node prefixes are `folder:`/`folder-more:`, so none can
 *  collide with it. */
const SECTION_NODE = 'section:';

export interface AssistantState {
  // thread
  messages: ChatMessage[];
  /** The assistant's labels under the composer: the four openers while the
   *  thread is empty, and a conversation's own next line after each of its
   *  assistant turns. A FIELD rather than a getter because the renderers bind
   *  it, but read off the messages on every change (`suggestionsFor`) rather
   *  than tracked beside them, so a turn boundary cannot leave a stale pair
   *  behind. */
  suggestions: string[] | undefined;
  /** The EMPTY state's cards: a developer's entry points into the guides. They
   *  render only while the thread has no messages, because a card that seeded a
   *  conversation has done its job once. */
  guides: GuideCard[];
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
  /** The rows the rail renders: the summaries, projected, narrowed by `query`,
   *  and expanded into the folder headings and Show more rows the rail draws.
   *  The old script rendered them all and hid the misses. */
  conversationRows: ConversationRow[];
  /** The projects those rows make, in the order the rail renders them: one per
   *  project that holds a row, derived in the same pass as the rows themselves
   *  (`railFrom`), so the two can never disagree. Empty in one list, which has no
   *  sections. */
  conversationSections: ConversationSection[];
  /** How the rail organizes its rows: the projects each chat is filed under, or
   *  one flat list. A field because the organizer menu changes it, and because
   *  both organizations render the SAME rows - the difference is the headings the
   *  rail emits ahead of them. */
  railOrganizer: RailOrganizer;
  /** The order the rail's rows come in, which is the sort group's choice. */
  railSort: RailSort;
  /** The organizer menu's items: the two settings, the divider, and the plus
   *  section under it. An items array, like the footer menus, because that is the
   *  shape the delivery forms carry best and the kit's item vocabulary can hold
   *  every row this menu has (a section label, a single-choice row, a divider, a
   *  disabled row and a note). */
  railItems: MenuItem[];
  // The create-project dialog, which is the whole of what this block owns beyond
  // the store: the name being typed, and the one thing that can be wrong with it.
  // The dialog's OPEN state is not here on purpose - the element owns it (see
  // `AssistantRefs.projectDialog`), and a field nothing binds is not part of the
  // view model.
  /** The name being typed in it. */
  projectDraft: string;
  /** What is wrong with that name, empty when nothing is. Non-empty flips the
   *  field invalid through the input's own `error`, which is the kit's treatment
   *  for a rejected value rather than a sentence this page paints itself. */
  projectNameError: string;
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
  /** The rail. Its own search box is the rail's filter, and the element exposes
   *  the focus method that reaches it: the box lives in the rail's shadow root,
   *  which is why the block asks the element rather than the DOM. */
  conversations: KaiConversationsElement | null;
  /** The create-project dialog, and the ONE reason this block drives a surface by
   *  method rather than by a bound prop: `kai-dialog` reports Escape and a
   *  backdrop press through `kai-open-change` while it owns its own open state,
   *  and binding `open` would not take those away - the facade does not forward
   *  the prop to the primitive, so the element keeps self-managing and the events
   *  keep arriving. The binding would control nothing while reading as control,
   *  which is worse than useless. The element self-managing is the kit's
   *  documented shape for this surface, so the block uses it and mirrors nothing. */
  projectDialog: KaiDialogElement | null;
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
  /** `@kai-select` on the rail's organizer menu (the kebab on a section label).
   *  The item's id CARRIES its choice, so nothing here re-reads an attribute, and
   *  a row this action does not own is ignored rather than half-applied. */
  railMenuSelect(event: CustomEvent<{ id: string; radioGroup?: string }>): void;
  /** `@kai-open-change` on the create-project dialog: the kit's own ways out of a
   *  modal - Escape, a backdrop press - arrive here. The element owns whether it is
   *  open; what this clears is the DRAFT, so the next open starts on an empty field
   *  and a clean validation state. */
  projectDialogToggle(event: CustomEvent<{ open: boolean }>): void;
  /** `@kai-input` on the dialog's name field. */
  projectNameInput(event: CustomEvent<{ value: string }>): void;
  /** `@kai-click` on the dialog's Cancel button: close it, through the element's
   *  own method, so the close path is the same one Escape takes. */
  cancelProject(): void;
  /** `@kai-click` on the dialog's Create button: name it, keep it, show it. */
  createProject(): void;
  /** `@kai-click` on a section label's filter control. The rail's filter IS its
   *  own search box, so the honest thing this control can do is hand that box the
   *  caret - through the element's public focus method, because the box lives in
   *  the rail's shadow root. */
  filterChats(): void;
  /** `@kai-click` on an empty-state card. The card carries its guide id, which
   *  is the only thing this needs to know. */
  openGuide(event: Event): Promise<void>;
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

  // The reader's own projects, read once here and written on every create. Read
  // at construction rather than in `boot()` because a name has to be resolvable
  // the first time the rail projects a row: a conversation filed under a created
  // project on a LATER visit would otherwise show up under the id it carries
  // (`sectionLabel`) until the next boot - a folder named `release-notes` where
  // the reader named it "Release notes".
  const createdKey = projectKey(deps.storageKey ?? 'assistant');
  let createdProjects: DemoProject[] = storedProjects(createdKey);
  // WHETHER THE STORE HOLDS ANYTHING AT ALL, which is not the same question as
  // whether the rail has rows: an ARCHIVED conversation leaves the rows and stays
  // in the store. Seeded `true` because a controller is constructed before its
  // first read, and `boot()` settles it from the store itself.
  let storeIsEmpty = true;

  let state: AssistantState = {
    messages: [],
    suggestions: SUGGESTIONS,
    guides: projectGuides(),
    loading: false,
    models: MODELS,
    currentModel: MODELS[0].id,
    activeId: undefined,
    query: '',
    conversationRows: [],
    conversationSections: [],
    projectDraft: '',
    projectNameError: '',
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
    // And on the rail's own defaults: the projects the demo files its
    // conversations into, in the kit's own pinned-first order.
    ...projectRailMenu('project', 'priority', createdKey),
  };

  // A NEW state object every patch: the snapshot getter is compared by
  // identity by useSyncExternalStore, and the kai- reactivity contract wants a
  // new array reference for `messages` anyway.
  const patch = (next: Partial<AssistantState>): void => {
    state = { ...state, ...next };
    for (const l of listeners) l();
  };

  const setMessages = (messages: ChatMessage[]): void =>
    patch({ messages, suggestions: suggestionsFor(messages, state.loading) });

  // The UNFILTERED projection, kept beside State rather than in it: nothing
  // binds it, and a field nothing binds is not part of the view model.
  let allRows: ConversationRow[] = [];
  // The folders the reader has closed, and the ones whose Show more row has been
  // used. Both are beside State for the reason `renamingId` is: nothing binds
  // them, and the rows the rail renders are their projection. Empty means every
  // folder is open and none of them has grown, which is how a fresh rail reads.
  let closedGroups: string[] = [];
  let expandedGroups: string[] = [];
  // The last summaries the store handed up, kept for the same reason as
  // `allRows`: the row projection is re-run when the RENAME state moves, not
  // only when the summaries do.
  let lastSummaries: ConversationSummary[] = [];
  /** Re-read what the store holds and re-project if the answer moved. Asked after
   *  the two operations that can empty the rail while leaving the store alone (an
   *  ARCHIVE) or empty both (a DELETE): the fixture is gated on the store rather
   *  than on the rows, so the rail has to be told what the store now holds rather
   *  than inferring it from an empty row list. A store that cannot list is not an
   *  empty one, which is why the failure keeps the last answer instead of
   *  flashing the demo's projects at a reader whose store just refused a read. */
  const refreshStoreEmptiness = async (): Promise<void> => {
    let empty: boolean;
    try {
      empty = (await store.list()).length === 0;
    } catch {
      return;
    }
    if (empty === storeIsEmpty) return;
    storeIsEmpty = empty;
    patch(projectSummaries(lastSummaries));
  };

  /** Open a conversation's folder however the reader left it, and re-project:
   *  the row that just became active has to be reachable, and a row filed into a
   *  closed folder would sit where the reader cannot see it. */
  const revealGroup = (group: string): void => {
    if (group === '' || !closedGroups.includes(group)) return;
    closedGroups = closedGroups.filter((id) => id !== group);
    patch(projectSummaries(lastSummaries));
  };

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

  const store = localStorageStore(deps.storageKey ?? 'assistant');

  /** The projects this rail can NAME, the reader's own first: they are read by
   *  the filing rule (`projectOfOpening`), the row order (`orderRows`) and every
   *  folder label, so one list keeps a created project from being a folder of its
   *  own in one place and an unknown id in another. */
  const catalogue = (): readonly DemoProject[] => [...createdProjects, ...PROJECTS];

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

  function projectSummaries(
    summaries: ConversationSummary[],
    query: string = state.query,
    organizer: RailOrganizer = state.railOrganizer,
    sort: RailSort = state.railSort,
  ): Partial<AssistantState> {
    lastSummaries = summaries;
    // Where a row is filed is the summary's OWN `groupId`, the field the store
    // writes, round-trips and hands back: one source of truth, and the same one
    // `orderRows` reads its order from.
    const projected = orderRows(summaries, organizer, sort, catalogue()).map((s) => {
      // ONE LINE PER ROW, and that is a decision about the rail rather than about
      // the data: the kit paints a row's `meta` slot as a second line, and a
      // sidebar row that carries its own last message reads as a feed rather than
      // as a list of conversations. The summary still carries its trailing text -
      // the store's field, and what the demo titles a conversation from - and the
      // row simply does not render it.
      const renaming = renamingId === s.id;
      const group = s.groupId ?? '';
      return {
        id: s.id,
        kind: 'conversation' as const,
        title: s.title,
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
        group,
        groupName: catalogue().find((project) => project.id === group)?.name ?? '',
        caretHidden: true,
        caretName: '',
        menuHidden: false,
        // A conversation's trailing edge is its own menu and nothing else, so the
        // section labels' actions are off here; they are on the controlNode's
        // default and turned on by the two builders that head a section.
        trioHidden: true,
        trioMenuLabel: '',
      };
    });
    // The unfiltered conversation rows, which is what the row menu and the two
    // shortcuts act on. What the rail renders is the projection below, which
    // narrows and expands them in the same pass as the sections.
    allRows = projected;
    return { ...railFrom(projected, query, closedGroups, expandedGroups, organizer, createdProjects, storeIsEmpty), activeId: controller.activeId() };
  }

  /** One reader choice from the organizer menu, applied in ONE patch: the choice
   *  itself (which moves the checked row), and the rail re-projected with it.
   *
   *  THE TWO ARE PASSED IN RATHER THAN READ BACK OFF STATE, and that is the whole
   *  reason `projectSummaries` takes them: a patch is applied by the next render,
   *  so reading `state` inside the same call would re-project the rail in the OLD
   *  organization and the rail would lag one click behind its own menu. */
  const applyRailMenu = (next: { organizer?: RailOrganizer; sort?: RailSort }): void => {
    const organizer = next.organizer ?? state.railOrganizer;
    const sort = next.sort ?? state.railSort;
    patch({
      ...projectRailMenu(organizer, sort, createdKey),
      ...projectSummaries(lastSummaries, state.query, organizer, sort),
    });
  };

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

  /**
   * One turn's reply, from the transport to the thread: the reader folds the
   * transport's frames in, every announced call is answered, and the labels
   * belong to the turn that LANDED.
   *
   * ONE PIPELINE FOR BOTH WAYS IN. `submit` sends a message the reader wrote and
   * `openGuide` asks the question a card names; the only two differences between
   * them are where their user turn came from and whether the turn is SAVED
   * (`save`), so the answer path itself exists once. The labels are patched here
   * rather than in `setMessages` because that runs on every streamed chunk, where
   * the trailing assistant message is one the reader has not finished reading.
   * An aborted turn earns nothing: a scripted next step is not an answer to a
   * failure.
   */
  async function replyToTurn(save: boolean): Promise<void> {
    const stream = createAssistantStream((update) => setMessages(update(state.messages)));
    // Set once the turn has landed, so the `finally` can tell a finished turn
    // from an aborted one without reading the error.
    let landed = false;
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
        // envelope comes from the call's own arguments. `cardFromToolCall` is the
        // kit's one implementation of that mapping, imported rather than restated,
        // and it returns null for a name that is not a card tool. It is
        // deliberately the ONLY card path here, because a card built this way
        // replaces itself in place when the same call is revised: `upsertCardPart`
        // keys on the envelope id, which is the provider's own call id.
        const card = cardFromToolCall(part.tool.type, part.tool.input, {
          id: part.tool.toolCallId ?? part.tool.type,
        });
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
      landed = true;
      // Mints the id on the first turn, saves, marks read while seen. A turn a
      // card asked for writes nothing: the rail is the reader's own threads.
      if (save) {
        await controller.saveTurn(state.messages);
        // THE ONE MOMENT THE DEMO CAN FILE A CONVERSATION: the save has just
        // minted its id and the thread still carries its opening turn. The
        // filing is read back off the summary the store just handed up, so a
        // conversation already filed is left where it is - which is what keeps a
        // second turn, a rename or a reload from moving a row between projects.
        const id = controller.activeId();
        if (id !== undefined && lastSummaries.find((summary) => summary.id === id)?.groupId === undefined) {
          const project = projectOfOpening(openingOf(state.messages), catalogue());
          if (project !== undefined) {
            // The reader is looking at the conversation they have just made, so
            // its folder is opened however they left it: the row lands where they
            // can see it. `setGroup` refreshes the summaries, which re-projects
            // the rail, so the row reaches its folder on the turn that made it.
            revealGroup(project);
            await controller.setGroup(id, project);
          }
        }
      }
    } catch (err) {
      stream.abort(err instanceof Error ? err.message : String(err));
    } finally {
      patch({ loading: false, suggestions: landed ? suggestionsFor(state.messages, false) : undefined });
    }
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
      const id = event.detail.id;
      // The label over the folders heads them; it is not a control of its own, so
      // activating it does nothing - the folders under it are each their own.
      if (id.startsWith(SECTION_NODE)) return;
      // A heading is not a conversation: it names the folder it heads, so
      // activation opens or closes that folder rather than loading anything.
      if (id.startsWith(FOLDER_HEADING_NODE)) {
        const group = id.slice(FOLDER_HEADING_NODE.length);
        closedGroups = closedGroups.includes(group)
          ? closedGroups.filter((candidate) => candidate !== group)
          : [...closedGroups, group];
        patch(projectSummaries(lastSummaries));
        return;
      }
      // The Show more row names the folder that has to grow, which is the same
      // mechanic read the other way: the rows past the limit are emitted.
      if (id.startsWith(FOLDER_MORE_NODE)) {
        const group = id.slice(FOLDER_MORE_NODE.length);
        if (!expandedGroups.includes(group)) expandedGroups = [...expandedGroups, group];
        patch(projectSummaries(lastSummaries));
        return;
      }
      // The conversation's own folder is opened before the load, so the row the
      // reader just activated is on screen while its thread arrives.
      revealGroup(allRows.find((row) => row.id === id)?.group ?? '');
      await controller.select(id);
    },

    newChat() {
      controller.startNew();
    },

    search(event) {
      const query = event.detail.query.trim().toLowerCase();
      // The rows AND the sections, from the same pass: a query narrows both, so
      // a group whose rows all missed is not a folder the rail still offers - and
      // it opens every folder it has a match in (`railNodes`), because a match
      // behind a closed heading is a match the reader cannot see.
      patch({ query, ...projectSummaries(lastSummaries, query) });
    },

    // The organizer menu, one handler for the rows that act. The id is
    // `organizer-<choice>` or `sort-<choice>`, so the choice is read off it
    // rather than looked up, and a choice outside the two lists above is ignored:
    // the kit never emits a disabled row, so an id this action does not own means
    // the menu grew a row nobody wired rather than a reader asking for something.
    railMenuSelect(event) {
      const { id } = event.detail;
      if (id === RAIL_NEW_PROJECT_ID) {
        // A stale draft or a stale error from a dialog the reader left by Escape is
        // cleared BEFORE the field is shown, not after: the field must never show a
        // rejected name from the last visit.
        patch({ projectDraft: '', projectNameError: '' });
        deps.refs().projectDialog?.show();
        // AND THE CARET GOES IN, on a MACROTASK rather than in the kit's own
        // queued microtask. The dialog moves focus into its panel on open, but a
        // menu item ALSO restores focus to its trigger on close - the dropdown does
        // that in a microtask queued after the dialog's (measured: focus stayed on
        // `kai-menu`, so Escape never reached the dialog's own key handler and the
        // modal could not be left by keyboard). The dialog's panel keydown is what
        // reads Escape, so the caret has to be inside the panel for the modal to be
        // closable at all; a timeout is the one turn that lands after every
        // microtask the menu queued.
        setTimeout(() => deps.refs().projectDialog?.focus(), 0);
        return;
      }
      const organizerOf = (choice: string): RailOrganizer | undefined =>
        RAIL_ORGANIZERS.find((candidate) => candidate === choice);
      const sortOf = (choice: string): RailSort | undefined =>
        RAIL_SORTS.find((candidate) => candidate === choice);
      if (id.startsWith('organizer-')) {
        const organizer = organizerOf(id.slice('organizer-'.length));
        if (organizer !== undefined) applyRailMenu({ organizer });
        return;
      }
      if (id.startsWith('sort-')) {
        const sort = sortOf(id.slice('sort-'.length));
        if (sort !== undefined) applyRailMenu({ sort });
      }
    },

    // The dialog is self-managing (see `AssistantRefs.projectDialog`), so every way
    // it closes arrives here as `open: false` - Escape, a backdrop press, or a method
    // this block called. What is cleared is the DRAFT. An "open" report is not acted
    // on: nothing else opens it, and re-patching would re-render for no reason.
    projectDialogToggle(event) {
      if (event.detail.open) return;
      patch({ projectDraft: '', projectNameError: '' });
    },

    projectNameInput(event) {
      patch({ projectDraft: event.detail.value, projectNameError: '' });
    },

    cancelProject() {
      deps.refs().projectDialog?.hide();
    },

    // A BLANK NAME IS REFUSED IN THE FIELD RATHER THAN SILENTLY DROPPED: the
    // dialog stays open with the input marked invalid, because a press that
    // closed it would be a project the reader believes they made.
    createProject() {
      const name = state.projectDraft.trim();
      if (name === '') {
        patch({ projectNameError: 'Name the project first' });
        return;
      }
      createdProjects = [...createdProjects, { id: projectId(name, catalogue()), name, topics: [] }];
      try {
        localStorage.setItem(createdKey, JSON.stringify(createdProjects));
      } catch {
        // Storage unavailable: the project lives for this tab, the same
        // degradation the store's own `save()` takes rather than a dialog that
        // refuses a name the reader can see on screen.
      }
      // The new project is on the rail BEFORE the dialog goes: the re-projection is
      // what puts the folder there, and closing first would be two paints of a rail
      // that had not changed.
      patch({ ...projectSummaries(lastSummaries), projectDraft: '', projectNameError: '' });
      deps.refs().projectDialog?.hide();
    },

    filterChats() {
      deps.refs().conversations?.focus();
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
          await refreshStoreEmptiness();
          return;
        case 'delete':
          if (!storeOps.remove) return;
          closeRenaming(target.conversationId);
          await controller.remove(target.conversationId);
          await refreshStoreEmptiness();
          return;
      }
    },

    // A CARD CLICK ASKS THE QUESTION AND TAKES THE ANSWER FROM THE TRANSPORT.
    // The turn lands in `messages` the way a submitted one does, so the thread
    // renders it through the same path - and the guide's opening sentence comes
    // from the one place that has it, turn 1 of the guide's own script, rather
    // than from a copy carried here that had to be kept in step by hand. What a
    // click does NOT do is SAVE (see `replyToTurn`): that is the whole
    // difference from the boot-time seeding this block tried and reverted, where
    // a seed written at BOOT became the rail's first row and took the subject
    // away from whatever state was running. A question asked by a CLICK is one
    // the reader asked; the row appears when they send their own next message,
    // exactly as it does for anything else.
    async openGuide(event) {
      const id = guideTarget(event);
      const guide = GUIDES.find((g) => g.id === id);
      if (!guide || state.loading) return;
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        actions: [...USER_ACTIONS],
        parts: [{ type: 'text', text: guide.question }],
      };
      setMessages([...state.messages, userMessage]);
      patch({ loading: true });
      await replyToTurn(false);
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
      await replyToTurn(true);
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
      // THE STORE'S OWN ANSWER for whether the rail is looking at a profile that
      // has ever stored anything, which is what decides the fixture.
      await refreshStoreEmptiness();
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
