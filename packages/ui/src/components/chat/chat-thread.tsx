import { createSignal, createEffect, createComputed, createMemo, For, Show, Switch, Match, onMount, untrack } from 'solid-js';
import { ChatConfig, useChatConfig } from '../../primitives/chat-config';
import { type ComposerDoc, normalizeValue, serializeToText } from '../../primitives/composer-model';
import { ChatContainer, ChatContainerContent, ChatContainerScrollAnchor } from './chat-container';
import { Message, MessageAvatar, MessageBody } from '../message/message';
import { type AttachmentData, type AttachmentImagePreview } from '../attachments/attachments';
import { createMessageFeedback, type MessageActionDetail } from '../../primitives/message-feedback';
import { ModelSwitcher } from '../model/model-switcher';
import { ScrollButton } from '../scroll/scroll-button';
import {
  Context, ContextTrigger, ContextContent, ContextContentHeader,
  ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage,
} from '../context/context';
import { DefaultPromptInput, type RejectedAttachment } from '../prompt/default-input';
import type { MediaTypeFilter } from '../../wire/media-types';
import type { TriggerDef } from '../composer/composer';
import type { ChatMessage, ChatMessageAction, CustomAction } from '../../web-components/chat/chat-types';
import type { ProseSize } from '../../primitives/chat-config';
import type { ModelOption } from '../../types';
import type { CardComponentMap } from '../card/card-registry';
import type { CardSchemaMap } from '../card/card-renderer';
import type { JSX } from 'solid-js';
import type { ConversationStore } from '../../primitives/conversation-store';
import { ConversationPanel } from '../conversation/conversation-panel';
import type { ConversationSummary } from '../../types';
import { MessagesSquare, ArrowLeft } from 'lucide-solid';
import { Button } from '../button/button';
import { HomePanel } from '../home/home-panel';
import { WidgetTabBar } from '../widget-tab-bar/widget-tab-bar';
import { Panel, PanelHeader, PanelBody, PanelFooter } from '../panel/panel';
import { createViewStack, type ViewEntry } from '../view/view-stack';
import { createConversationController, type ConversationController } from '../../stores/conversation-controller';
import type { HomeConfig, HomeLinkEntry } from '../../types';

export interface ChatThreadContextUsage {
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
}

export interface ChatThreadProps {
  /** Extra classes for the thread root (e.g. `h-full`). */
  class?: string;
  /** The message thread to render, newest last. A new array reference is what
   *  re-renders. */
  messages: ChatMessage[];
  /** Adds or overrides the component that draws a `card` part, keyed by card type. */
  cardTypes?: CardComponentMap;
  // The companion of `cardTypes`: that says what DRAWS a card, this says what a VALID
  // one looks like. Without it the kit validates only its own built-ins and leaves your
  // own card type unchecked.
  /** JSON Schemas keyed by card envelope type; each wins over a built-in of the same
   *  name. `createCardRegistry(...).validationSchemas` is this shape. */
  cardSchemas?: CardSchemaMap;
  /** Host element that card events are emitted from when no `CardProvider` is present. */
  cardHostElement?: HTMLElement;
  /** Value of the input: a string is controlled, a `ComposerDoc` is a one-time seed
   *  that pre-populates pills, unset is uncontrolled. */
  value?: string | ComposerDoc;
  /** Placeholder text shown in the empty input. */
  placeholder?: string;
  /** Disables submit and shows the streaming state. */
  loading?: boolean;
  /** Starter prompts shown above the input while the thread is empty. */
  suggestions?: string[];
  /** What clicking a suggestion does. Default sends it immediately; `'fill'`
   *  places it in the input without sending. */
  suggestionMode?: 'submit' | 'fill';
  /** Keep suggestions visible after the conversation starts; they otherwise hide
   *  once `messages` is non-empty. Default false. */
  persistSuggestions?: boolean;
  /** Body/prose font scale for rendered markdown. Defaults to `'sm'`. */
  proseSize?: ProseSize;
  /** Shiki theme name for syntax-highlighted code blocks (e.g.
   *  `'github-dark-dimmed'`). */
  codeTheme?: string;
  // Forwarded to every `MessageBody` this thread renders; inert for non-image tiles,
  // which keep the hover card.
  /** How an image tile reveals full size. `'lightbox'` is the only value keyboard
   *  and touch can reach. Default `'hover'`. */
  imagePreview?: AttachmentImagePreview;
  /** Renders plain `<pre>` blocks with no highlighter load when false. Default true. */
  codeHighlight?: boolean;
  // Forwarded to every `MessageBody` as `reasoningMode`.
  /** How reasoning parts render. Default is the collapsible disclosure. */
  reasoning?: 'full' | 'compact' | 'off';
  // Forwarded to every `MessageBody` as `reasoningDefaultOpen`.
  /** Seeds the reasoning disclosure open and keeps it tracking the stream. Default
   *  false; inert unless `reasoning` is `'full'`. */
  reasoningOpen?: boolean;
  /** Title shown at the start of the header bar. */
  chatTitle?: string;
  /** Model list; more than one renders a switcher in the header. */
  models?: ModelOption[];
  /** The currently selected model id (pairs with `models`). */
  currentModel?: string;
  /** Token usage, shown as a context meter in the header. */
  context?: ChatThreadContextUsage;
  /** Show the scroll-to-bottom button inside the scroll area. Default true. */
  scrollButton?: boolean;
  /** Whether `slot="header-start"` content is projected, which forces the header
   *  row open. */
  headerStart?: boolean;
  /** Whether the host has `slot="header-end"` content (right of the controls). */
  headerEnd?: boolean;
  // A Solid caller composing ChatThread directly has no shadow-DOM host, so there is
  // no light-DOM node to slot; the docked construct widget is the motivating case.
  /** JSX rendered after `slot="header-end"` in the header row rather than replacing
   *  it, which forces the header open. */
  headerEndContent?: JSX.Element;
  // Without `onConversationLoad` a caller has no path to actually receive a loaded
  // conversation's messages back (this component never mutates `props.messages`), so a
  // row-select would fire and do nothing visible. An active id auto-restored at mount
  // could then be clobbered by the save effect with whatever the caller drives in next.
  /** Turns on the prior-conversations list. Requires both `store` and
   *  `onConversationLoad`: with either missing it logs once and stays off. */
  conversations?: boolean;
  // `list()` on mount and on every list-view open, `load(id)` on row select,
  // `save(id, messages)` on every message-array change for the active conversation. A
  // kit-owned interface: invocation, transport, auth and retention are the dev's.
  /** The adapter this thread persists through when `conversations` is on.
   *  `localStorageStore` and `fetchStore` ship with the kit. */
  store?: ConversationStore;
  /** Fires when a loaded conversation is about to replace `messages`; the caller
   *  owns and re-renders them. Required when `conversations` is on. */
  onConversationLoad?: (messages: ChatMessage[], id?: string) => void;
  // The seam for whatever chrome hosts this thread, which ChatThread knows nothing
  // about. Third leg of "seen": the active conversation is marked read (and
  // `store.markRead` called for it) only while it is the active one AND the chat view
  // (not the list) shows AND this is true. A consumer that never wires it simply never
  // distinguishes closed from open, which beats marking a message read behind a closed
  // widget.
  /** Whether the chrome hosting this thread is visible to the visitor; `undefined`
   *  means always visible. Consulted only when `conversations` is on. */
  hostOpen?: boolean;
  /** Fires when any conversation other than the active one becomes unread or read.
   *  Never fires unless `conversations` is on. */
  onUnreadChange?: (unread: boolean) => void;
  // The prior-conversations list moves from the header toggle onto the Messages tab;
  // a drilled-into chat (list row, recent card, "new conversation") hides the tab bar
  // and shows a back arrow in the header instead.
  /** The widget home screen shown before the first message. Off by default. */
  home?: HomeConfig;
  /** Fires when a `home.links` entry with no `href` is activated; one with an `href`
   *  navigates instead. Only meaningful when `home` is set. */
  onHomeLink?: (entry: HomeLinkEntry) => void;
  // ── Composition slots ─────────────────────────────────────────────────────
  // Each flag below is set by the `<kai-chat>` facade when matching light-DOM
  // `slot="…"` content is projected, and gates one composition slot. Two kinds:
  //   • INJECT  — additive: project YOUR markup into a region (sidebar, footer,
  //               composer-actions, header-start/-end).
  //   • REPLACE — substitutive: your markup stands in for a whole region
  //               (header, empty, composer). A replaced region's projected
  //               content owns its own data/events — a slotted (light-DOM) node
  //               can't read this component's reactive state. That boundary is
  //               the whole reason `messages` stays a data prop, not a slot.
  /** Replaces the built-in header bar with `slot="header"` content. */
  headerFull?: boolean;
  // Set by the facade when light-DOM `slot="home"` content is projected; the tab bar
  // and navigation stay the kit's own.
  /** Replaces the built-in home screen with `slot="home"` content, while the home
   *  view shows. */
  homeFull?: boolean;
  /** Whether `slot="sidebar"` content is projected, which shows the left sidebar column. */
  sidebar?: boolean;
  /** Replaces the empty-state message area with `slot="empty"` content. The composer
   *  still renders. */
  empty?: boolean;
  // `slot="empty"` only ever receives light-DOM children of the shadow HOST, and those
  // sit outside the shadow root's adopted stylesheets, so Tailwind-class content there
  // renders bare; content passed here renders inside this tree and stays styled.
  /** The empty-state content as JSX, taking priority over `empty`. */
  emptyContent?: JSX.Element;
  /** Replaces the built-in composer with `slot="composer"` content, which wires its
   *  own submit. */
  composer?: boolean;
  /** Whether `slot="composer-actions"` content is projected, which shows the row above the composer. */
  composerActions?: boolean;
  /** Whether `slot="footer"` content is projected, which shows the footer row below the composer. */
  footer?: boolean;
  /** Attachment media types the user may stage, in HTML `accept` syntax; omitted
   *  means no filter. Narrowed by what the encoders can send. */
  accept?: MediaTypeFilter;
  /** Files the composer refused because `accept` excluded them. */
  onAttachmentsRejected?: (rejected: RejectedAttachment[]) => void;
  /** Hides the built-in paperclip attach button; only an explicit `false` hides it.
   *  Default true. */
  attach?: boolean;
  /** Show a web-search (Globe) button in the input toolbar; calls `onWebSearch`. */
  webSearch?: boolean;
  /** Show a voice-input button in the input toolbar; calls `onVoice`. */
  voice?: boolean;
  /** Rich entity triggers. Each opens a menu at the caret that inserts an atomic pill. */
  triggers?: TriggerDef[];
  /** Default icon per entity kind (kind → image src) for pills/menu items. */
  kindIcons?: Record<string, string>;
  /** Whether each message's action bar is visible at rest or revealed on pointer-over.
   *  Visible at rest by default. */
  actionsReveal?: 'always' | 'hover';
  /** Default action bar for user messages that have no `actions` of their own; a
   *  message's own `actions` replaces it. */
  userActions?: (ChatMessageAction | CustomAction)[];
  /** Default action bar for assistant messages, as `userActions` is for user ones. */
  assistantActions?: (ChatMessageAction | CustomAction)[];
  /** Hide the citations row that consecutive `source` parts collapse into; absent or
   *  `false` renders it. */
  hideSources?: boolean;
  /** JSX rendered immediately before the composer region. JSX-only, so never
   *  reachable through `<kai-chat>`. */
  composerStart?: JSX.Element;
  /** JSX rendered after the composer region. */
  composerEnd?: JSX.Element;
  // callbacks (the facade maps these to dispatch())
  onValueChange?: (value: string) => void;
  onSubmit?: (detail: { value: string; attachments: AttachmentData[] }) => void;
  onAttachmentsChange?: (attachments: AttachmentData[]) => void;
  onSuggestionClick?: (value: string) => void;
  onModelChange?: (modelId: string) => void;
  onMessageAction?: (detail: MessageActionDetail) => void;
  onWebSearch?: () => void;
  onVoice?: () => void;
  /** Receive the imperative controller once mounted. */
  controllerRef?: (controller: ChatThreadController) => void;
}

/** Imperative handle exposed via `controllerRef`: the input half of the chat's
 *  interaction surface, forwarded onto `<kai-chat>` as instance methods. */
export interface ChatThreadController {
  focus(options?: FocusOptions): void;
  clear(): void;
  send(): void;
  scrollToBottom(behavior?: ScrollBehavior): void;
  // ChatThread knows nothing of whatever chrome hosts it, so it cannot know when that
  // host closes. A host that can hide and re-show calls this on every hide. Dock's own
  // `onOpenChange` fires on every close path (header X, launcher, Escape), so a single
  // `onOpenChange={(open) => !open && controller.closeConversationsList()}` covers all.
  /** Returns the widget to its default landing view: `'home'` when `home` is set,
   *  otherwise `'chat'`. */
  closeConversationsList(): void;
  /** Starts a fresh conversation: clears the active id, returns to the chat view and
   *  delivers `[]` through `onConversationLoad`. */
  startNewConversation(): void;
}

/**
 * THE MESSAGE LIST'S KEY, and why it is not the message object. This is the canonical note;
 * `thread.tsx` keys its identical list the same way and points here.
 *
 * `<For>` is reference-keyed, and a streaming assistant message gets a new object identity on
 * every delta, because a new reference IS the re-render signal. Keyed on objects, every chunk
 * looks like an entirely new list: the row is torn down and rebuilt, and anything the reader
 * did inside it dies (an expanded tool panel was discarded microseconds later by the next
 * token). So key on `message.id`, stable across the churn, and read the message through
 * `messages[i()]`, so the CONTENT updates while the DOM stays put. `id` must be unique per
 * message; the feedback state above this list already required that.
 */
/**
 * How an ASSISTANT row aligns its parts across the column.
 *
 * `stretch`, not `start`: under `items-start` every part is a fit-content flex item, so a
 * generative-UI card was as wide as its widest button while prose looked right. Stretching
 * applies only where the cross size is `auto`, leaving a part with its own width alone. The
 * card element lives inside `<kai-chat>`'s shadow root, so no consumer can reach this.
 */
const ASSISTANT_ALIGN = 'items-stretch';

export function ChatThread(props: ChatThreadProps) {
  const outer = useChatConfig();
  const reveal = () => (props.actionsReveal === 'hover' ? 'hover' : 'always');
  const messageKeys = createMemo(() => props.messages.map((m) => m.id));
  // Feedback (copy + vote) state lives ABOVE the per-message <For>, so streaming
  // re-renders (a fresh `messages` array ref per chunk) don't wipe it.
  // The copy/feedback toasts scope to the chat (this thread's root) so they appear
  // in-chat rather than at the page top.
  let rootEl: HTMLElement | undefined;
  const feedback = createMessageFeedback({
    emit: (detail) => props.onMessageAction?.(detail),
    target: () => rootEl,
  });
  const [internal, setInternal] = createSignal<string | ComposerDoc>(props.value ?? '');
  const [attachments, setAttachments] = createSignal<AttachmentData[]>([]);
  // ── The widget view machine, on the shipped navigator
  // The routing STATE lives in `createViewStack`, so the facade and every
  // block share ONE navigation model: tab roots sit behind the tab bar, a
  // drilled view hides the tab bar and shows a back affordance, and a tab
  // switch clears the drill. Rendering stays a `<Switch>` (one view in the
  // DOM at a time) because that is this component's long-standing contract:
  // the list view REPLACES the composer in the DOM, it does not just hide it.
  //
  // View names, per grammar:
  //   home mode:  'home' (tab root) | 'messages' (tab root: the Messages tab,
  //               showing the conversations list when the store is wired and
  //               the root chat otherwise) | 'chat' (drill view: entered from
  //               home, the recent card, or a list row; hides the tab bar and
  //               shows the back arrow)
  //   plain mode: 'chat' (root) | 'list' (drilled off the header toggle)
  const homeEnabled = () => props.home != null;
  const conversationsReady = () => props.conversations === true && props.store != null && props.onConversationLoad != null;
  const viewEntries = createMemo<ViewEntry[]>(() =>
    homeEnabled()
      ? [
          { name: 'home', tabRoot: true },
          { name: 'messages', tabRoot: true },
          { name: 'chat', tabRoot: false },
        ]
      : [
          { name: 'chat', tabRoot: true },
          { name: 'list', tabRoot: false },
        ],
  );
  const nav = createViewStack({ entries: viewEntries });
  const view = nav.view;
  /** The chat surface is showing: the 'chat' view itself, or the Messages tab
   *  with no store wired (the root chat: tab bar stays, no back arrow). */
  const chatShowing = () => view() === 'chat' || (view() === 'messages' && !conversationsReady());
  /** The conversations list is showing (either grammar's spelling of it). */
  const listShowing = () => conversationsReady() && (view() === 'list' || view() === 'messages');
  const tabBarVisible = () => homeEnabled() && !nav.drilled();
  const activeTab = (): 'home' | 'messages' => (view() === 'home' ? 'home' : 'messages');
  /** Land on the chat surface: a drill when 'chat' is a drill view (home
   *  grammar), a root switch when it is the root (plain grammar). `navigate`
   *  resolves that from the registered entries, so this stays one call. */
  const goToChat = () => nav.navigate('chat');
  // The home-landing decision cannot be frozen at MOUNT: the `kai-` contract has
  // consumers set object props (like `home`) as JS properties AFTER the element is
  // appended (the React wrapper's `useLayoutEffect` runs post-mount), so `props.home`
  // is routinely still `undefined` on the first render. The navigator's untouched
  // default root already follows `viewEntries` reactively, which covers the common
  // late-set path; this computed handles the edges where the visitor has navigated.
  //
  // Rising edge: from the untouched default (root chat, no drill) land on 'home'.
  // Falling edge: `home` turning off while on 'home'/'messages' resets to 'chat',
  // re-drilling 'list' when the list was showing.
  //
  // NOT `on(homeEnabled, fn, { defer: true })`: Solid's `on()` skips its first real
  // call but does not capture the deferred read as `prevInput`, so `!isOn && wasOn`
  // can never be true and the falling edge never fires. The previous value is tracked
  // by hand: a closure variable seeded BEFORE the computed exists (so its first run
  // no-ops), updated at the end of every run.
  let wasHomeEnabled = untrack(homeEnabled);
  createComputed(() => {
    const isOn = homeEnabled();
    const wasOn = wasHomeEnabled;
    if (isOn !== wasOn) {
      if (isOn) {
        if (nav.view() === 'chat' && !nav.drilled()) nav.selectTab('home');
        else if (nav.view() === 'list') nav.selectTab('messages');
      } else {
        if (nav.view() === 'home') nav.selectTab('chat');
        else if (nav.view() === 'messages') {
          nav.selectTab('chat');
          if (untrack(conversationsReady)) nav.push('list');
        }
      }
    }
    wasHomeEnabled = isOn;
  });
  // ── Conversations: policy in the shipped controller ───
  // The lifecycle policy itself (the lazy-id mint, save-per-turn, mount
  // auto-restore, the three-leg seen rule for markRead, the unread
  // derivation, loud degradation) lives in `createConversationController`
  // (`@kitn.ai/ui/stores`), the same controller every composed block runs,
  // so facade and blocks cannot drift on policy. This component only adapts
  // its prop-driven surface onto the controller's explicit calls and mirrors
  // the controller's caches into signals for rendering.
  const [conversationSummaries, setConversationSummaries] = createSignal<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = createSignal<string | undefined>(undefined);
  const [anyUnread, setAnyUnread] = createSignal(false);
  // Armed right before a load/restore hands its messages to the caller via
  // `onConversationLoad`, and consumed (read-then-cleared) by the very next
  // run of the save effect below: the caller bounces those same messages
  // straight back in as a new `props.messages` reference (the reactivity
  // contract requires a fresh array on every change, load included), and
  // that bounce is a load ECHO, not a turn to persist — without this flag
  // the save effect would re-save on every load
  // final review: phantom-unreading a fully-read conversation on reload, a
  // needless full-thread PUT for fetchStore). This is the one piece of
  // save-gating that stays in the adapter: it exists only because this
  // surface is prop-driven; a block calling `saveTurn` explicitly per turn
  // has no echo to suppress. Plain closure variable, not a signal: it gates
  // a single effect run rather than driving any render.
  let loadEcho = false;

  const controller = createMemo<ConversationController | undefined>(() => {
    if (!conversationsReady()) return undefined;
    return createConversationController(props.store!, {
      initialView: untrack(() => view() ?? 'chat'),
      initialOpen: untrack(() => props.hostOpen !== false),
      onMessagesLoad: (messages, id) => {
        // Same order the pre-controller code kept: stamp the active id, land
        // on the chat surface, arm the echo skip, THEN hand the caller the
        // messages — so the flag is set no matter how synchronously the
        // caller re-renders.
        setActiveConversationId(id);
        goToChat();
        if (id !== undefined) loadEcho = true;
        props.onConversationLoad?.(messages, id);
      },
      onSummariesChange: (s) => setConversationSummaries(s),
      onUnreadChange: (unread) => setAnyUnread(unread),
      onError: (op, error) => {
        if (op === 'list') {
          // Note this can fire in the BACKGROUND (the controller refreshes
          // after every save to keep the badge cache fresh), not just from a
          // list open. Only bail OUT of the list view: a transient list()
          // blip mid-drilled-chat (or on the root/home views) must stay a
          // harmless no-op, not teleport the visitor; the list view itself
          // is the one view with nothing to show without a summaries array.
          console.warn('ChatThread: conversations list() failed; staying in chat-only mode.', error);
          if (listShowing()) nav.selectTab(homeEnabled() ? 'home' : 'chat');
        } else if (op === 'load') {
          console.warn('ChatThread: conversations load() failed.', error);
        } else {
          // Decide loudly (save/markRead): the thread stays usable, the
          // failure is surfaced, never a silent no-op.
          console.error(`ChatThread: conversations ${op}() failed.`, error);
        }
      },
    });
  });

  onMount(() => {
    if (props.conversations && !props.store) {
      console.error('ChatThread: `conversations` is true but no `store` was provided: the conversations feature needs a ConversationStore to persist to. Staying in chat-only mode.');
    } else if (props.conversations && props.store && !props.onConversationLoad) {
      console.error('ChatThread: `conversations` is true but no `onConversationLoad` handler was provided: row-select, "new conversation", and mount auto-restore would have nowhere to deliver the loaded messages, leaving row-tap/new/restore inert (and mount\'s auto-restore would still stamp an active conversation id the save effect could then clobber). Staying in chat-only mode.');
    }
  });

  const openList = () => { nav.push('list'); void controller()?.refresh(); };
  // Messages-tab entry point: the list moved off the header toggle onto
  // this tab. The 'messages' tab root renders the list when the store is
  // wired and the root chat (ambiguity 1: no back arrow, tab bar stays)
  // otherwise; either way it is a tab switch, so any drill clears.
  const openMessagesTab = () => {
    nav.selectTab('messages');
    if (conversationsReady()) void controller()?.refresh();
  };

  const startNewConversation = () => {
    // The lazy id lives in the controller: clearing the active id and delivering []
    // through `onMessagesLoad` is enough; the id itself is minted by the
    // first non-empty `saveTurn`.
    const ctrl = untrack(controller);
    if (ctrl) { ctrl.startNew(); return; }
    // No store wired (a home-only widget, or a caller without the
    // conversations feature): still land on the chat surface and hand the
    // caller a fresh empty thread, the pre-controller behavior of this seam.
    setActiveConversationId(undefined);
    goToChat();
    props.onConversationLoad?.([], undefined);
  };

  // Seen legs into the controller: the host-open leg and which view is
  // showing. The controller derives `seen` (active + chat view + open) and
  // gates `markRead` on it; entering the seen state marks the active
  // conversation read (the reopen-marks-read path).
  createEffect(() => { void controller()?.setOpen(props.hostOpen !== false); });
  createEffect(() => { void controller()?.setView(view() ?? 'chat'); });

  // Save per turn: every non-empty `props.messages` change that is not the
  // echo of a load (see `loadEcho`). The controller mints the lazy id
  // on the first non-empty save, saves, marks the conversation read while
  // seen, and refreshes the summary cache so the badge moves even for a
  // message landing while the host is closed.
  createEffect(() => {
    const ctrl = controller();
    if (!ctrl) return;
    const messages = props.messages;
    if (messages.length === 0) return; // nothing persists until the first message
    if (loadEcho) { loadEcho = false; return; }
    void ctrl.saveTurn(messages).then((id) => {
      // Mirror the minted id into the signal the toggle/list UI reads.
      if (id !== undefined) setActiveConversationId(id);
    });
  });

  // The header toggle's dot (rendered below) AND the value reported outward
  // via onUnreadChange are the SAME computation, the controller's — a Dock
  // (or any sibling control with no view into the summary cache) mirrors it
  // through the callback rather than reaching in. Fires the initial `false`
  // like every other render-derived callback here.
  createEffect(() => props.onUnreadChange?.(anyUnread()));

  // Visitor continuity: a plain-history construct
  // auto-restored the visitor's thread on mount, so upgrading to
  // `conversations` must not regress that — their most recent conversation
  // (migrated legacy thread included) has to reappear without an extra tap
  // into the list. The pick + load ride the controller (`refresh` sorts the
  // cache byRecency; `select` is the same single path as an explicit row
  // click, fresh-array contract included). The guards stay at this boundary
  // because they are about the CALLER's state, which the controller cannot
  // see: only when nothing is active yet (never fights startNew/a prior
  // select); only when `props.messages` is still empty (a parent that
  // seeded its own thread owns that choice); and only while the chat view
  // is (still) showing — re-checked AFTER the refresh await, so a visitor
  // who opened the list while mount's list() was in flight is not yanked
  // back out of it (select unconditionally lands on the chat surface).
  onMount(() => {
    const ctrl = untrack(controller);
    if (!ctrl) return;
    void (async () => {
      await ctrl.refresh();
      if (untrack(activeConversationId) !== undefined) return;
      if (props.messages.length !== 0) return;
      if (untrack(view) !== 'chat') return;
      const summaries = untrack(conversationSummaries);
      if (summaries.length === 0) return;
      await ctrl.select(summaries[0].id); // the controller cache is byRecency-sorted
    })();
  });
  // A string `value` is controlled; a ComposerDoc `value` is a one-time seed that
  // lives in `internal` so the user's (string) edits replace it without a fight.
  const current = (): string | ComposerDoc =>
    typeof props.value === 'string' ? props.value : internal();
  createEffect(() => {
    const v = props.value;
    if (v != null && typeof v !== 'string') setInternal(v);
  });
  const handleChange = (v: string) => { setInternal(v); props.onValueChange?.(v); };
  // After a send, reset the composer. Clear the internal draft ONLY when the value is
  // uncontrolled (props.value === undefined) — a controlled host owns its own value and
  // clears it itself. This lets the batteries-included hooks (useKaiChat/createKaiChat),
  // whose `bind` does not control `value`, get a clean composer after each submit.
  const afterSubmit = () => { setAttachments([]); if (props.value === undefined) setInternal(''); };
  const handleSubmit = () => { props.onSubmit?.({ value: serializeToText(normalizeValue(current())), attachments: attachments() }); afterSubmit(); };
  const handleSuggestionClick = (v: string) => {
    if ((props.suggestionMode ?? 'submit') === 'fill') { handleChange(v); props.onSuggestionClick?.(v); }
    else { props.onSubmit?.({ value: v, attachments: attachments() }); afterSubmit(); }
  };
  const showHeader = () => !!(
    props.chatTitle || props.models || props.context || props.headerStart || props.headerEnd
    || props.headerEndContent || conversationsReady()
    // The back arrow on a drilled chat needs the header row even with no
    // title/models/context/store — a home-only construct (no `conversations`)
    // whose "new conversation" card drills into chat still needs somewhere
    // to put it.
    || (homeEnabled() && nav.drilled())
  );
  // Recent-conversation card: only when explicitly opted into
  // (`home.recentConversation === true`), summaries are actually hydrated,
  // and at least one exists — the newest by the shared recency rule.
  const recentSummary = createMemo(() => {
    if (!homeEnabled() || props.home?.recentConversation !== true || !conversationsReady()) return undefined;
    const summaries = conversationSummaries();
    return summaries.length ? summaries[0] : undefined; // controller-sorted, newest first
  });
  // Suggestions are conversation starters: show only on an empty thread unless
  // the host opts into persisting them.
  const visibleSuggestions = () =>
    props.persistSuggestions || props.messages.length === 0 ? props.suggestions : undefined;
  const showScrollButton = () => props.scrollButton !== false;

  // Hand the imperative controller to the facade once mounted (rootEl is set).
  onMount(() => {
    props.controllerRef?.({
      focus: (options) =>
        rootEl
          ?.querySelector<HTMLElement>('[contenteditable]:not([contenteditable="false"]), textarea')
          ?.focus(options),
      clear: () => { setInternal(''); setAttachments([]); props.onValueChange?.(''); },
      send: () => handleSubmit(),
      scrollToBottom: (behavior) => {
        const vp = rootEl?.querySelector<HTMLElement>('.overflow-y-auto');
        vp?.scrollTo({ top: vp.scrollHeight, behavior: behavior ?? 'smooth' });
      },
      closeConversationsList: () => nav.selectTab(homeEnabled() ? 'home' : 'chat'),
      startNewConversation: () => startNewConversation(),
    });
  });

  return (
    <ChatConfig proseSize={props.proseSize} codeTheme={props.codeTheme} codeHighlight={props.codeHighlight !== false} portalMount={outer.portalMount()}>
      {/* The root is a ROW so a `sidebar` slot can sit beside the main column.
          With no sidebar projected it collapses to the original column. */}
      <div ref={(e) => (rootEl = e as HTMLElement)} class={`flex h-full bg-background ${props.class ?? ''}`}>
        <Show when={props.sidebar}>
          <aside part="sidebar" class="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border">
            <slot name="sidebar" />
          </aside>
        </Show>
        {/* The main column renders THROUGH the public Panel family:
            frameless, so inside an already-framed host (kai-dock's floating
            panel) it inherits that container's radius; the header row, view
            container and footer strip below are the same parts every composed
            block renders, so facade/block parity is structural. */}
        <Panel class="min-w-0 flex-1">
          {/* Header: a full `header` slot REPLACES the built-in bar; otherwise the
              built-in PanelHeader renders, itself carrying the header-start/
              header-end INJECT slots in its start/end regions. */}
          <Show
            when={props.headerFull}
            fallback={
              <Show when={showHeader()}>
                <PanelHeader
                  part="header-bar"
                  start={
                    /* Consumer-injected leading controls (sidebar-toggle, compose, a
                        popover title-button). Projects light-DOM `slot="header-start"`
                        children of <kai-chat>; inert outside a shadow root. */
                    <slot name="header-start" />
                  }
                  end={
                  <>
                    <Show when={props.models}>
                      <ModelSwitcher
                        models={props.models!}
                        currentModelId={props.currentModel ?? props.models![0]?.id ?? ''}
                        onModelChange={(modelId) => props.onModelChange?.(modelId)}
                      />
                    </Show>
                    <Show when={props.context}>
                      <Context
                        usedTokens={props.context!.usedTokens} maxTokens={props.context!.maxTokens}
                        inputTokens={props.context!.inputTokens} outputTokens={props.context!.outputTokens}
                        estimatedCost={props.context!.estimatedCost}
                      >
                        <ContextTrigger />
                        <ContextContent>
                          <ContextContentHeader />
                          <ContextContentBody><div class="space-y-1.5"><ContextInputUsage /><ContextOutputUsage /></div></ContextContentBody>
                          <ContextContentFooter />
                        </ContextContent>
                      </Context>
                    </Show>
                    {/* A chat-bubble glyph, not the "menu that does nothing" the retrofit
                        shipped (owner feedback: it "looks like nothing and isn't even
                        the same size as the X"). Same `Button variant="ghost"
                        size="icon-sm"` component AND the same 24px icon size as the
                        widget's own close X (`codegen.ts`'s `headerEndContent` button,
                        which renders `DockCloseGlyph` = `<X size={24} />`) — identical
                        hit-area and optical weight, so the two read as siblings.
                        Swaps to a back arrow while the list is open, returning to chat. */}
                    {/* Back arrow for a DRILLED chat: entered from home, the
                        recent card, or a list row/new-conversation pill while `home`
                        is set. Returns to whichever surface it was entered from. */}
                    <Show when={homeEnabled() && nav.drilled()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        data-kai-home-back
                        aria-label="Back"
                        onClick={() => nav.back()}
                      >
                        <ArrowLeft size={24} aria-hidden="true" />
                      </Button>
                    </Show>
                    {/* With `home` set, the prior-conversations list moved off this
                        header toggle onto the Messages tab — the toggle no longer renders
                        at all. */}
                    <Show when={props.conversations && props.store && !homeEnabled()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        class="relative"
                        data-kai-conversations-toggle
                        // `aria-label` WINS over any descendant text for a button's
                        // accessible name, so "unread" has to be folded in here rather
                        // than in a sr-only sibling span (which AT would never reach).
                        aria-label={
                          view() === 'list'
                            ? 'Back to chat'
                            : anyUnread() && view() === 'chat'
                              ? 'Conversations (unread)'
                              : 'Conversations'
                        }
                        onClick={() => (view() === 'list' ? nav.selectTab('chat') : openList())}
                      >
                        <Show when={view() === 'list'} fallback={<MessagesSquare size={24} aria-hidden="true" />}>
                          <ArrowLeft size={24} aria-hidden="true" />
                        </Show>
                        {/* Unread badge: ANY conversation other
                            than the active one is unread. Only over the chat-bubble glyph
                            — once the list is open showing the back arrow, the visitor is
                            already looking at the rows themselves, each carrying its own
                            dot (ConversationPanel), so a second badge on the arrow would be
                            redundant chrome. */}
                        <Show when={anyUnread() && view() === 'chat'}>
                          <span data-kai-conversations-unread aria-hidden="true" class="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-unread" />
                        </Show>
                      </Button>
                    </Show>
                    {/* Consumer-injected trailing controls (share, settings, …).
                        Projects light-DOM `slot="header-end"` children of <kai-chat>. */}
                    <slot name="header-end" />
                    {/* JSX escape hatch for a Solid-composed caller with no shadow-DOM
                        host to slot into (see the prop doc) — a docked widget's own
                        close affordance is the motivating case, sharing this row with
                        the title instead of floating as an unrelated second control. */}
                    {props.headerEndContent}
                  </>
                  }
                >
                  {props.chatTitle || undefined}
                </PanelHeader>
              </Show>
            }
          >
            <header part="header" class="shrink-0"><slot name="header" /></header>
          </Show>
          {/* The view container: ChatThread's old `relative flex-1
              overflow-hidden` body, now the public PanelBody part. */}
          <PanelBody>
            <Switch
              fallback={
                <ChatContainer class="h-full px-4 py-3">
              <ChatContainerContent class="mx-auto w-full max-w-3xl space-y-4">
                {/* REPLACE — custom empty-state content, shown only while the thread is
                    empty. The component still owns WHEN it shows (data state); the
                    consumer owns WHAT it looks like. `emptyContent` (JSX, rendered
                    in-tree and fully styled) wins over `empty`/`slot="empty"`
                    (light-DOM projection) when both are set — see the prop doc. */}
                <Show when={(props.empty || props.emptyContent) && props.messages.length === 0}>
                  <Show when={props.emptyContent} fallback={<slot name="empty" />}>
                    {props.emptyContent}
                  </Show>
                </Show>
                {/* Keyed by message id (see the note above this component), so a
                    streaming delta updates the row instead of replacing it. */}
                <For each={messageKeys()}>
                  {(_id, i) => (
                    // The row reads its message through <For>'s index accessor,
                    // never through a captured value: the row outlives the delta
                    // that replaced its object, so every read below has to go
                    // through `m()` for the new content to land. <Show> supplies
                    // the non-null accessor and covers the frame where a removal
                    // has shortened the array.
                    <Show when={props.messages[i()]}>
                      {(m) => {
                        const body = (
                          <MessageBody
                            parts={m().parts}
                            /* Streaming-ness = the thread's ONE existing
                               loading signal + being the last message and an
                               assistant turn. No second streaming source. The
                               reasoning disclosure no longer auto-opens on it
                               by default —
                               only the trigger's shimmer reflects streaming
                               unless `reasoningOpen` opts back in. */
                            isStreaming={props.loading === true && m().role === 'assistant' && i() === props.messages.length - 1}
                            reasoningMode={props.reasoning}
                            reasoningDefaultOpen={props.reasoningOpen}
                            imagePreview={props.imagePreview}
                            cardTypes={props.cardTypes}
                            cardSchemas={props.cardSchemas}
                            cardHostElement={props.cardHostElement}
                            isUser={m().role === 'user'}
                            markdown={m().role === 'assistant'}
                            actions={m().actions ?? (m().role === 'user' ? props.userActions : props.assistantActions)}
                            hideSources={props.hideSources}
                            actionsReveal={reveal()}
                            activeFeedback={feedback.resolveFeedback(m())}
                            copied={feedback.isCopied(m().id)}
                            onAction={(action) => feedback.handleAction(m(), action)}
                          />
                        );
                        const rowGroup = () => (reveal() === 'hover' ? 'group ' : '');
                        return (
                          // `role` is the SPEAKER, forwarded on BOTH branches —
                          // see the same note in thread.tsx. `Message` turns it
                          // into `role="article"` + an `aria-label`; without it the
                          // row is a bare div chromium prunes from the
                          // accessibility tree as "uninteresting".
                          <Show
                            when={m().avatar}
                            fallback={
                              <Message role={m().role} class={`${rowGroup()}${m().role === 'user' ? 'flex-col items-end' : `flex-col ${ASSISTANT_ALIGN}`}`}>
                                {body}
                              </Message>
                            }
                          >
                            {(av) => (
                              <Message role={m().role} class={rowGroup()}>
                                <MessageAvatar src={av().src ?? ''} alt={av().alt ?? ''} fallback={av().fallback} />
                                <div class={`flex min-w-0 flex-1 flex-col ${m().role === 'user' ? 'items-end' : ASSISTANT_ALIGN}`}>
                                  {body}
                                </div>
                              </Message>
                            )}
                          </Show>
                        );
                      }}
                    </Show>
                  )}
                </For>
                <ChatContainerScrollAnchor />
              </ChatContainerContent>
              <Show when={showScrollButton()}>
                <div class="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-center px-5">
                  {/* The button now owns its elevation (kai-elevation); a `shadow-sm`
                      here would set box-shadow a second time and the winner would
                      be stylesheet order, not this call site. */}
                  <ScrollButton />
                </div>
              </Show>
                </ChatContainer>
              }
            >
              <Match when={view() === 'home'}>
                {/* REPLACE — custom home-tab content (region slots). The
                    navigation (tab bar, drills, back) stays the kit's own; only
                    the home view's CONTENT is stood in for. */}
                <Show
                  when={props.homeFull}
                  fallback={
                    <HomePanel
                      greeting={props.home?.greeting}
                      recent={recentSummary()}
                      newChatLabel={props.home?.newConversation?.label}
                      links={props.home?.links}
                      onSelectRecent={(id) => void controller()?.select(id)}
                      onNewChat={() => startNewConversation()}
                      onLink={(entry) => props.onHomeLink?.(entry)}
                    />
                  }
                >
                  <slot name="home" />
                </Show>
              </Match>
              <Match when={listShowing()}>
                <ConversationPanel
                  conversations={conversationSummaries()}
                  activeId={activeConversationId()}
                  onSelect={(id) => void controller()?.select(id)}
                  onNewChat={() => startNewConversation()}
                />
              </Match>
            </Switch>
          </PanelBody>
          {/* The list view TAKES OVER the full content area (owner: "if we are
              looking at the conversations, i don't think i would see the
              suggestions nor the prompt input... the convo list would be taking
              over the full content area"). The retrofit only swapped the thread;
              this hides the composer-actions row, the composer itself and the
              footer too — nothing below the header renders except the panel. */}
          <Show when={chatShowing()}>
            {/* INJECT — accessory row above the composer (extra actions/toolbar). */}
            <Show when={props.composerActions}>
              <div class="shrink-0 px-4">
                <div class="mx-auto flex max-w-3xl items-center gap-2 pb-2"><slot name="composer-actions" /></div>
              </div>
            </Show>
            <div class="shrink-0 px-4 pb-4">
              <div class="mx-auto max-w-3xl">
                {/* JSX escape hatch, rendered immediately before the composer region
                    (built-in or `slot="composer"` replacement) — see the prop doc. */}
                <Show when={props.composerStart}>{props.composerStart}</Show>
                {/* REPLACE — a full `composer` slot stands in for the built-in input.
                    The slotted content owns its own submit/loading wiring. */}
                <Show
                  when={props.composer}
                  fallback={
                    <DefaultPromptInput
                      value={current()} placeholder={props.placeholder} loading={props.loading === true}
                      suggestions={visibleSuggestions()} attachments={attachments()}
                      accept={props.accept} onAttachmentsRejected={props.onAttachmentsRejected}
                      attach={props.attach} webSearch={props.webSearch === true} voice={props.voice === true}
                      triggers={props.triggers} kindIcons={props.kindIcons}
                      onValueChange={handleChange} onSubmit={handleSubmit} onSuggestionClick={handleSuggestionClick}
                      onAttachmentsChange={(a) => { setAttachments(a); props.onAttachmentsChange?.(a); }}
                      onWebSearch={() => props.onWebSearch?.()} onVoice={() => props.onVoice?.()}
                    />
                  }
                >
                  <slot name="composer" />
                </Show>
                {/* JSX escape hatch, rendered immediately after the composer region. */}
                <Show when={props.composerEnd}>{props.composerEnd}</Show>
              </div>
            </div>
            {/* INJECT: footer row below the composer, on the public
                PanelFooter part. */}
            <Show when={props.footer}>
              <PanelFooter part="footer" class="px-4 pb-3">
                <div class="mx-auto max-w-3xl text-center text-xs text-muted-foreground"><slot name="footer" /></div>
              </PanelFooter>
            </Show>
          </Show>
          {/* Home/Messages tab bar: shown on the tab roots (home,
              the Messages tab's list or root chat), hidden on a DRILLED chat
              so the back arrow above is the only way back — the navigator's
              own drilled flag IS that rule. */}
          <Show when={tabBarVisible()}>
            <PanelFooter>
              <WidgetTabBar
                active={activeTab()}
                onChange={(tab) => (tab === 'home' ? nav.selectTab('home') : openMessagesTab())}
                unread={anyUnread()}
              />
            </PanelFooter>
          </Show>
        </Panel>
      </div>
    </ChatConfig>
  );
}
