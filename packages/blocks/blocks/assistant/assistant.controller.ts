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
 * is through `deps.refs()`, and only to call an element METHOD that has no
 * declarative equivalent: the composer's clear().
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
 * 3. THE SHELL IS SOMEBODY ELSE'S STATE, MIRRORED. kai-workspace owns the
 *    aside's collapse (its breakpoint, its drawer, its methods), so the block
 *    does not keep a second opinion: `asideToggle` is fed by kai-aside-toggle
 *    and the value it reports is what the rail's controlled `collapsed` and the
 *    top bar's reopen button read. The way IN is a method call - the rail's own
 *    toggle would otherwise fold the rail inside a column the page keeps - and
 *    that call is the second reason this controller declares a ref.
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
import type { KaiPromptInputElement, KaiWorkspaceElement } from '@kitn.ai/ui/web-components';
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

// KNOWN RESIDUAL: the "2m ago" formatter is internal to the Solid layer and
// is not exported from @kitn.ai/ui/stores, so the block restates it. Delete
// this when the kit ships it beside byRecency.
function relativeTimeShort(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((now - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** One entry of the model switcher's `models` property. Declared here, with the
 *  list: it types a State field, and the seam's three sources come and go while
 *  the composition is what every mode ships. */
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

const SUGGESTIONS = ['Summarize a document', 'Draft the Q3 board update', 'Compare two options'];

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

/** One rendered row of the rail. Every field is already a string or a
 *  boolean, because `*for` bodies get bindings, not expressions. */
export interface ConversationRow {
  id: string;
  title: string;
  preview: string;
  previewHidden: boolean;
  time: string;
  unread: boolean;
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
}

/** The element handles the controller calls methods on. Nullable because no
 *  framework has them at construction: React's ref is null through the first
 *  render, Vue's until mount. */
export interface AssistantRefs {
  prompt: KaiPromptInputElement | null;
  workspace: KaiWorkspaceElement | null;
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
    // The shell's documented pair, one page's worth: below 720 the rail goes,
    // below 640 an expanded rail is an overlay drawer.
    collapseBelow: 720,
    drawerBelow: 640,
    railCollapsed: false,
    railReopenHidden: true,
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

  /** The old script matched the row's whole `textContent`: the title, the
   *  preview line and the relative time, concatenated with NO separator. Same
   *  three fields here, read off the row model instead of off the DOM, and
   *  joined with spaces -- so a query is no longer able to match across a
   *  boundary the reader never sees ("just now" against a title ending in
   *  "ju"). That is a deliberate difference and the better behaviour. */
  const filterRows = (rows: ConversationRow[], query: string): ConversationRow[] =>
    query === ''
      ? rows
      : rows.filter((row) => `${row.title} ${row.preview} ${row.time}`.toLowerCase().includes(query));

  const store = localStorageStore(deps.storageKey ?? 'assistant');

  const controller = createConversationController(store, {
    onMessagesLoad: (msgs) => setMessages(msgs),
    onSummariesChange: (summaries) => patch(projectSummaries(summaries)),
  });

  function projectSummaries(summaries: ConversationSummary[]): Partial<AssistantState> {
    allRows = summaries.map((s) => {
      // Display dedupe: the store titles a conversation from message text, so
      // the title and the trailing preview can be the same string.
      const preview = s.trailing && s.trailing !== s.title ? s.trailing : '';
      return {
        id: s.id,
        title: s.title,
        preview,
        previewHidden: preview === '',
        time: relativeTimeShort(s.updatedAt ?? s.lastMessageAt),
        unread: isConversationUnread(s),
      };
    });
    return { conversationRows: filterRows(allRows, state.query), activeId: controller.activeId() };
  }

  const actions: AssistantActions = {
    modelChange(event) {
      // The scripted mock ignores the selection (it is a script); a real
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

    async submit(event) {
      const text = event.detail.value.trim();
      if (!text || state.loading) return;
      // The composer does not clear itself on submit - clearing is the host's
      // call, made through the element's public clear() method. That call is
      // the one DOM leak this controller has, and it is why it declares a ref.
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
