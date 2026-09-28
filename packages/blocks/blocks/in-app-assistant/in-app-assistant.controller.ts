/**
 * in-app-assistant, the framework-neutral controller.
 *
 * The contract (spec 2026-09-02 section 3.2):
 *
 *   createController(deps) => { state(): State; actions: Actions; subscribe(fn): () => void }
 *
 * Everything the imperative `in-app-assistant.js` did to the DOM is now
 * either a field of `State` (bound onto an element with `.prop=` / `:attr=`)
 * or an `actions` entry (bound with `@kai-event=`). The ONLY DOM this file
 * touches is through `deps.refs()`, and only to call element METHODS that
 * have no declarative equivalent: the stack's push/back and the composer's
 * clear().
 *
 * WHAT THIS BLOCK ADDED TO THE CONTRACT'S EVIDENCE, over support-widget's
 * conversion: `:hidden` on a PLAIN `<span>`. The unread dot beside the
 * history button is not a kai element, and the binding kinds are element
 * agnostic by construction: the binder writes an attribute, and a `<span>`
 * takes one exactly as a `<kai-button>` does.
 */
import { createAssistantStream } from '@kitn.ai/ui/state';
import type { ChatMessage } from '@kitn.ai/ui/state';
import { readOpenAIStream } from '@kitn.ai/ui/wire';
import type { StreamSource } from '@kitn.ai/ui/wire';
import {
  localStorageStore,
  createConversationController,
  isConversationUnread,
  type ConversationSummary,
} from '@kitn.ai/ui/stores';
import type { KaiPromptInputElement, KaiViewStackElement } from '@kitn.ai/ui/web-components';
// THE SEAM. One extensionless specifier, and one authored source per data mode
// written at that name by `create-kai add` (wiring.modeTarget / wiring.modeFiles
// in registry-item.json). The mock form is what an install without flags gets;
// `--gateway` writes the route form and `--no-mock` the one that throws with the
// file to write named. This one specifier is what makes all three real, so it
// must not name a file any mode leaves out.
import { transport } from './in-app-assistant.transport'; // lint:dangling-imports: allowed -- generated name, written by `create-kai add` from wiring.modeFiles

/** The suggestion chips the empty thread offers. IN THE CONTROLLER, not in the
 *  mock: the chips are chrome rather than scripted data, and the two mock-free
 *  modes ship no mock file at all. */
const SUGGESTIONS = ['Deploy payments to production', 'Check the canary status'];

/** One entry of the composer's `triggers` property. Here rather than in the mock
 *  for the same reason as the chips: the trigger vocabulary is chrome, and the
 *  controller carries the list as a State field. */
export interface ComposerTrigger {
  char: string;
  kind: string;
  items: { id: string; label: string; description?: string }[];
}

// Composer triggers (the in-app assistant template's set): slash commands and
// mention targets, inserted as atomic pills. Presentation vocabulary for the
// composer; a real backend expands the entities server-side.
const TRIGGERS: ComposerTrigger[] = [
  {
    char: '/',
    kind: 'skill',
    items: [
      { id: 'summarize', label: 'summarize', description: 'Summarize the thread so far' },
      { id: 'explain', label: 'explain', description: 'Explain the current page' },
    ],
  },
  {
    char: '@',
    kind: 'agent',
    items: [
      { id: 'docs', label: 'docs', description: 'Search the documentation' },
      { id: 'support', label: 'support', description: 'Hand off to a person' },
    ],
  },
];

/**
 * The transport contract, and the ONE thing a block's data axis changes.
 *
 * `reply` answers a turn with whatever the kit's reader folds: a `Response`, a
 * stream, or an async iterable of SSE text. `toolOutput` settles a tool call the
 * stream only ever ANNOUNCES, which is the host's side of the wire's seam.
 *
 * It lives on the CONTROLLER because the controller owns the thread's shape: the
 * three mode files import this type, so a mode that answers differently still
 * answers the same question.
 */
export interface InAppAssistantTransport {
  reply(messages: ChatMessage[]): Promise<StreamSource> | StreamSource;
  toolOutput(toolType: string): Record<string, unknown> | undefined;
}

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

const ASSISTANT_ACTIONS = ['copy', 'like', 'dislike'] as const;
const USER_ACTIONS = ['edit'] as const;

/** One rendered row of the drilled history list. Every field is already a
 *  string or a boolean, because `*for` bodies get bindings, not expressions. */
export interface ConversationRow {
  id: string;
  title: string;
  preview: string;
  previewHidden: boolean;
  time: string;
  unread: boolean;
}

export interface InAppAssistantState {
  // thread
  messages: ChatMessage[];
  suggestions: string[] | undefined;
  triggers: ComposerTrigger[];
  loading: boolean;
  // panel chrome
  backHidden: boolean;
  historyHidden: boolean;
  historyDotHidden: boolean;
  // drilled history
  activeId: string | undefined;
  conversationRows: ConversationRow[];
}

/** The element handles the controller calls methods on. Nullable because no
 *  framework has them at construction: React's ref is null through the first
 *  render, Vue's until mount. */
export interface InAppAssistantRefs {
  stack: KaiViewStackElement | null;
  prompt: KaiPromptInputElement | null;
}

export interface InAppAssistantDeps {
  refs: () => InAppAssistantRefs;
  /** Storage key; the block's default is its own id. */
  storageKey?: string;
}

export interface InAppAssistantActions {
  /** `@kai-view-change` on the view stack. */
  viewChange(event: CustomEvent<{ view?: string; drilled: boolean }>): void;
  /** `@kai-click` on the header back button. */
  back(): void;
  /** `@kai-click` on the header history button. */
  openHistory(): void;
  /** `@kai-click` on the "New conversation" pill. */
  startNew(): void;
  /** `@kai-conversation-select` on the drilled list. */
  openConversation(event: CustomEvent<{ id: string }>): Promise<void>;
  /** `@kai-submit` on the prompt input. */
  submit(event: CustomEvent<{ value: string; attachments?: unknown[] }>): Promise<void>;
  /** Mount hook: hydrate from storage. Not a binding - the host calls it. */
  boot(): Promise<void>;
}

export interface InAppAssistantController {
  state(): InAppAssistantState;
  actions: InAppAssistantActions;
  subscribe(listener: () => void): () => void;
}

export function createController(deps: InAppAssistantDeps): InAppAssistantController {
  const listeners = new Set<() => void>();

  let state: InAppAssistantState = {
    messages: [],
    suggestions: SUGGESTIONS,
    triggers: TRIGGERS,
    loading: false,
    backHidden: true,
    historyHidden: false,
    historyDotHidden: true,
    activeId: undefined,
    conversationRows: [],
  };

  // A NEW state object every patch: the snapshot getter is compared by
  // identity by useSyncExternalStore, and the kai- reactivity contract wants a
  // new array reference for `messages` anyway.
  const patch = (next: Partial<InAppAssistantState>): void => {
    state = { ...state, ...next };
    for (const l of listeners) l();
  };

  const setMessages = (messages: ChatMessage[]): void =>
    patch({ messages, suggestions: messages.length === 0 ? SUGGESTIONS : undefined });

  const store = localStorageStore(deps.storageKey ?? 'in-app-assistant');

  const controller = createConversationController(store, {
    onMessagesLoad: (msgs) => setMessages(msgs),
    onSummariesChange: (summaries) => patch(projectSummaries(summaries)),
    onUnreadChange: (anyUnread) => patch({ historyDotHidden: !anyUnread }),
  });

  function projectSummaries(summaries: ConversationSummary[]): Partial<InAppAssistantState> {
    const rows: ConversationRow[] = summaries.map((s) => {
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
    return { conversationRows: rows, activeId: controller.activeId() };
  }

  const actions: InAppAssistantActions = {
    viewChange(event) {
      const { view, drilled } = event.detail;
      // The stack's one rule, CONSUMED not restated: drilled shows the back
      // arrow and hides the history button.
      patch({ backHidden: !drilled, historyHidden: drilled });
      // Only 'chat' satisfies the seen rule's view leg. An UNRESOLVED view is
      // deliberately skipped rather than defaulted: the old imperative code
      // passed `undefined` straight through, where the leg simply failed, and
      // defaulting to 'chat' would ASSERT the chat view is showing when the
      // stack resolved none -- marking an active conversation read with
      // nothing on screen.
      if (view) void controller.setView(view);
    },

    back() {
      deps.refs().stack?.back();
    },

    openHistory() {
      deps.refs().stack?.push('history');
    },

    startNew() {
      controller.startNew();
      deps.refs().stack?.back();
    },

    async openConversation(event) {
      await controller.select(event.detail.id);
      deps.refs().stack?.back();
    },

    async submit(event) {
      const text = event.detail.value.trim();
      if (!text || state.loading) return;
      // The composer does not clear itself on submit - clearing is the host's
      // call, made through the element's public clear() method.
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
        await readOpenAIStream(await transport.reply(state.messages), stream);
        for (const part of state.messages.find((m) => m.id === stream.id)?.parts ?? []) {
          if (part.type !== 'tool' || part.tool.state !== 'input-available' || !part.tool.toolCallId) continue;
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
