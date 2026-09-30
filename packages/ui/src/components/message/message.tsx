import { type JSX, For, Index, Switch, Match, createMemo, createSignal, createEffect, splitProps, Show } from "solid-js";
import { Tooltip } from "../tooltip/tooltip";
import { Copy, Check } from "lucide-solid";
import { cn } from "../../utils/cn";
import { Markdown } from "../markdown/markdown";
import { Button } from "../button/button";
import { actionIcon, BUILTIN_ACTION_LABEL } from "../action-icons/action-icons";
import type { ChatMessageAction, CustomAction, FeedbackVote, MessagePart, MessageSource } from "../../web-components/chat/chat-types";
import { useChatConfig, textClass } from "../../primitives/chat-config";
import { Activity } from "../activity/activity";
import { TagRenderer } from "../renderer/tag-renderer";
import { resolveRenderer, type RendererMap } from "../../primitives/renderer-registry";
import { activityStepsFromParts } from "../../primitives/activity";
import { ASK_TOOL_NAME } from "../../primitives/questions";
import { resolveThreadDensity, THREAD_DENSITY_CLASSES, type ThreadDensity } from "../chat/thread-density";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  AttachmentHoverCardContent,
  getAttachmentLabel,
  getMediaCategory,
  useAttachmentsContext,
  type AttachmentData,
  type AttachmentImagePreview,
} from "../attachments/attachments";
import {
  Lightbox,
  LightboxTrigger,
  LightboxContent,
} from "../lightbox/lightbox";
import { Source, SourceTrigger, SourceContent, SourceList } from "../source/source";
import { CardRenderer, type CardSchemaMap } from "../card/card-renderer";
import type { CardComponentMap } from "../card/card-registry";

// --- Message ---

/** Who is speaking in a message row. This is the SEMANTIC role of the message,
 *  not an ARIA role; see `MessageProps['role']`. */
export type MessageRole = 'user' | 'assistant' | 'system';

/** The accessible name given to a row that declares a speaker. `role="article"`
 *  supports naming; the bare `<div>` a role-less `<Message>` renders does not,
 *  so the label is only attached alongside that role. */
const MESSAGE_ROLE_LABEL: Record<MessageRole, string> = {
  user: 'User message',
  assistant: 'Assistant message',
  system: 'System message',
};

export interface MessageProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'role'> {
  children: JSX.Element;
  // WHY `role` SHADOWS ARIA, kept out of the generated prop table on purpose: this
  // comment is invisible to docgen, while a doc comment here lands in the component
  // meta, llms-full.txt, the MCP catalog, the docs prop table and Storybook at once.
  //
  // The prop shadows the inherited ARIA `role` attribute, which is why
  // `JSX.HTMLAttributes` is `Omit`ted above. Before it existed, `role` resolved to ARIA
  // and was spread onto the row, so `<Message role="user">` shipped `role="user"` on a
  // div: not a valid ARIA role, and a critical axe `aria-roles` violation ("Role must
  // be one of the valid ARIA roles: user") on every message that used it. Chromium
  // discards the unknown token and computes `generic`, so the damage was a failed a11y
  // audit and a row with no accessible role or name, not a mis-announced one.
  //
  // It is consumed here and never reaches the DOM. The row gets a valid ARIA role that
  // can carry a name (`role="article"` plus an `aria-label` naming the speaker) and
  // `data-role` for styling and querying. Omitted, the row stays an unlabelled `<div>`,
  // so the many role-less call sites are untouched. The trade-off: the row's ARIA role
  // cannot be set through this prop, and any other ARIA attribute passed still wins,
  // because the spread runs after what this computes.
  /** Who is speaking. NOT an ARIA role: the row gets `role="article"` with a named
   *  `aria-label`, and the ARIA `role` attribute is shadowed. */
  role?: MessageRole;
  // The row's gap is the thread density axis one scale down, not a second axis: a
  // thread passes its RESOLVED value down (`thread.tsx` / `chat-app.tsx`) so a
  // compact thread is compact at the avatar gap too. `thread-density.ts` owns the class
  // table, which is why this prop takes that axis' type rather than a boolean or its
  // own `'tight' | 'loose'`. Rendered outside a thread, omitted means `default`, which
  // is the shipped `gap-3` byte for byte.
  /** How much air the row has between the avatar (or role marker) and the content,
   *  as the thread's density. Omitted keeps the shipped spacing. */
  density?: ThreadDensity;
}

function Message(props: MessageProps) {
  const [local, rest] = splitProps(props, ["children", "class", "role", "density"]);
  const messageGap = () => THREAD_DENSITY_CLASSES[resolveThreadDensity(local.density, 'Message')].messageGap;
  return (
    <div
      part="row"
      class={cn("flex items-start", messageGap(), local.class)}
      data-role={local.role}
      role={local.role ? 'article' : undefined}
      aria-label={local.role ? MESSAGE_ROLE_LABEL[local.role] : undefined}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- MessageAvatar ---

export interface MessageAvatarProps {
  /** Avatar image URL. Without one the component renders `fallback` (initials). */
  src?: string;
  /** Alt text for the image. Only meaningful alongside `src`; defaults to `''`
   *  so an avatar stays decorative rather than announcing a filename. */
  alt?: string;
  fallback?: string;
  class?: string;
}

function MessageAvatar(props: MessageAvatarProps) {
  return (
    <div
      part="avatar"
      class={cn("h-8 w-8 shrink-0 overflow-hidden rounded-full", props.class)}
    >
      <Show
        when={props.src}
        fallback={
          <Show when={props.fallback}>
            <div class="flex h-full w-full items-center justify-center bg-muted text-xs font-medium text-muted-foreground">
              {props.fallback}
            </div>
          </Show>
        }
      >
        <img
          src={props.src}
          alt={props.alt ?? ''}
          class="h-full w-full object-cover"
        />
      </Show>
    </div>
  );
}

// --- MessageContent ---

export interface MessageContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element | string;
  markdown?: boolean;
  /** `::part` name(s) exposed on the content node. */
  part?: string;
}

function MessageContent(props: MessageContentProps) {
  const [local, rest] = splitProps(props, ["children", "markdown", "class", "part"]);
  const config = useChatConfig();
  const classNames = () =>
    cn(
      "min-w-0 rounded-lg p-2 text-foreground bg-secondary max-w-none break-words whitespace-normal",
      textClass(config.proseSize()),
      local.class,
    );

  return (
    <Show
      when={local.markdown}
      fallback={
        <div part={local.part} class={classNames()} {...rest}>
          {local.children}
        </div>
      }
    >
      <Markdown part={local.part} content={local.children as string} class={classNames()} />
    </Show>
  );
}

// --- MessageActions ---

export interface MessageActionsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function MessageActions(props: MessageActionsProps) {
  const [local, rest] = splitProps(props, ["children", "class"]);
  return (
    <div
      class={cn(
        "flex items-center gap-0.5 mt-0.5",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// --- MessageActionBar ---

export interface MessageActionBarProps {
  /** Built-in action names and/or custom action descriptors, in order. */
  actions: (ChatMessageAction | CustomAction)[];
  /** Whether the bar stays visible or appears on pointer-over; defaults to staying visible. */
  reveal?: 'always' | 'hover';
  /** Fired with the built-in name or the custom action id when a button is clicked. */
  onAction: (id: string) => void;
  /** The active feedback vote. That button renders pressed and filled; the other vote
   *  animates out. `undefined` shows both. */
  activeFeedback?: FeedbackVote;
  /** When true, the `copy` button shows its success check icon instead of the
   *  copy glyph (cleared by the owner after ~2s). */
  copied?: boolean;
  class?: string;
}

/** Normalize a bar entry (string built-in or custom object) to a uniform shape. */
function normalizeAction(a: ChatMessageAction | CustomAction) {
  if (typeof a === 'string') {
    return { id: a, label: BUILTIN_ACTION_LABEL[a], Icon: actionIcon(a) };
  }
  return { id: a.id, label: a.label, Icon: actionIcon(a.icon) };
}

/** Is this entry one of the two feedback votes? */
function feedbackVoteOf(a: ChatMessageAction | CustomAction): FeedbackVote | undefined {
  return a === 'like' || a === 'dislike' ? a : undefined;
}

/**
 * The shared message action toolbar. Renders one ghost icon button per entry:
 * built-in names pull their label+icon from the curated registry; custom
 * descriptors use their `label` plus `actionIcon(icon)` (label-only when the
 * icon is unknown or absent). `reveal="hover"` makes the bar fade in on the
 * parent `.group`'s hover or focus-within.
 *
 * Pure/prop-driven: feedback (`activeFeedback`) and copy (`copied`) state are
 * owned by the parent facade and passed in: the bar holds no internal signals,
 * so it survives the new-array-per-chunk re-renders of a streaming thread. With
 * a vote active, the chosen `like`/`dislike` button is marked `aria-pressed` +
 * filled and the other vote button collapses its width (sliding the active thumb
 * into its place) via a 0fr↔1fr grid transition. The
 * `copy` button swaps to a success check while `copied`.
 */
function MessageActionBar(props: MessageActionBarProps) {
  return (
    <MessageActions
      part="actions"
      class={cn(
        'mt-1 flex gap-0',
        // The hover reveal, and three constraints a later reader will otherwise
        // simplify back into two accessibility failures:
        //  - `opacity`, never `display` or `visibility`: both of those take the
        //    control OUT of the accessibility tree, so the actions would vanish
        //    for a screen reader rather than for the eye.
        //  - the hidden state sits INSIDE the `hover: hover` media query (which is
        //    what `[@media(hover:hover)]` compiles to). A bare `opacity-0` leaves
        //    the bar permanently invisible on a touch device, where no hover ever
        //    arrives to reveal it.
        //  - `group-focus-within:opacity-100` is not decoration: without it a
        //    keyboard user tabs onto a control they cannot see (WCAG 2.4.7, Focus
        //    Visible). The row carrying the `group` is `chat-app`'s rowGroup,
        //    and the action bar is inside it, so focusing an action reveals it.
        // `group-hover:` is already hover-scoped by Tailwind, so only the base
        // state needs the query.
        props.reveal === 'hover' &&
          'transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0',
        props.class,
      )}
    >
      <For each={props.actions}>
        {(a) => {
          const item = normalizeAction(a);
          const tooltipText = () => (typeof a !== 'string' && a.tooltip) ? a.tooltip : item.label;
          const vote = feedbackVoteOf(a);
          // A vote button is the active one when it matches the resolved vote.
          const isActiveVote = () => vote !== undefined && props.activeFeedback === vote;
          // The COPY button reflects the copied check.
          const isCopy = item.id === 'copy';
          const showCheck = () => isCopy && props.copied === true;

          // Factory (not a shared node): each Show branch gets its own Button so
          // the eager DOM node is never referenced from two places.
          const button = () => (
            <Button
              variant="ghost"
              size="icon-sm"
              class={cn('rounded-full', isActiveVote() && 'text-primary')}
              data-action={item.id}
              aria-label={showCheck() ? 'Copied' : item.label}
              aria-pressed={vote !== undefined ? isActiveVote() : undefined}
              onClick={() => props.onAction(item.id)}
            >
              <Show
                when={showCheck()}
                fallback={
                  <Show when={item.Icon} fallback={<span class="px-1 text-xs">{item.label}</span>}>
                    {(Icon) => {
                      const I = Icon();
                      return <I class={cn('size-3.5', isActiveVote() && 'fill-current')} />;
                    }}
                  </Show>
                }
              >
                <Check class="size-3.5 text-success" />
              </Show>
            </Button>
          );
          // Icon-only buttons get a tooltip; label-only buttons (text already
          // visible) don't.
          const rendered = () => (
            <Show when={item.Icon} fallback={button()}>
              <Tooltip content={tooltipText()}>{button()}</Tooltip>
            </Show>
          );

          // When the OTHER vote is active, this vote button collapses — its WIDTH
          // animates to zero via a 0fr↔1fr grid so the remaining thumb slides into
          // its place, while it fades out; it slides + fades back on un-vote. (Kept
          // mounted-but-collapsed, not unmounted, so the sibling can slide.) No
          // vote active → both shown; non-vote entries always render.
          return (
            <Show when={vote !== undefined} fallback={rendered()}>
              {(() => {
                const show = () => props.activeFeedback === undefined || props.activeFeedback === vote;
                return (
                  <span
                    data-feedback-collapsed={show() ? undefined : ''}
                    class={cn(
                      'grid transition-[grid-template-columns,opacity] duration-300 ease-out',
                      show() ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0',
                    )}
                  >
                    <span class="min-w-0 overflow-hidden">{rendered()}</span>
                  </span>
                );
              })()}
            </Show>
          );
        }}
      </For>
    </MessageActions>
  );
}

// --- MessageBody ---

export interface MessageBodyProps {
  // A run of consecutive `source` parts renders as ONE citations row, placed OUTSIDE
  // the message bubble so a citation is never confused with a link the model typed into
  // its prose.
  /** The message's ordered parts, rendered in one pass in the order they appear. */
  parts: MessagePart[];
  /** Add/override card type -> component entries, forwarded to `CardRenderer`
   *  for `card` parts. */
  cardTypes?: CardComponentMap;
  // `cardTypes` keeps the cards; this swaps the rest. A `card:` key is refused LOUDLY (see
  // `warnCardRendererKeys`) because the card layer has its own registry and a second, silent
  // one would make `renderers['card:x']` look wired while drawing nothing.
  // NOT `.part`: `Element.part` is the platform's shadow-part token list, and assigning an
  // object to it stringifies into the `part` attribute and keeps nothing. So a `text` element
  // gets `.messagePart`; `tool`/`reasoning` elements render one activity step and get `.step`;
  // a `source`/`file` element gets the whole run as `.parts`.
  /** Custom elements for parts, keyed `tool:<name>`, `tool`, `reasoning`, `text`, `source`, `file`. */
  renderers?: RendererMap;
  // The companion of `cardTypes`: that says what DRAWS a card, this says what a VALID
  // one looks like. `createCardRegistry(...).validationSchemas` is exactly this shape.
  // Without it the kit validates its own seven built-ins and leaves the consumer's own
  // card type the only unchecked thing on screen. A schema here WINS over a built-in of
  // the same name.
  /** Card-type JSON Schemas keyed by envelope type; a schema here wins over a built-in of the same name. */
  cardSchemas?: CardSchemaMap;
  // The `<kai-chat>`/`<kai-message>`/`<kai-thread>` facades pass their own element, so
  // a `card` part's events leave as the bubbling `kai-card` CustomEvent instead of being
  // silently discarded when no `CardProvider` is above this body.
  /** Host node to emit card events off when no `CardProvider` is present. */
  cardHostElement?: HTMLElement;
  /** Whether this is a user message (right-aligned bubble) vs an assistant
   *  message (full-width transparent). */
  isUser: boolean;
  /** Whether text parts render as markdown. */
  markdown: boolean;
  /** Action-bar entries: built-in names and/or custom descriptors. When empty
   *  the bar is not rendered. */
  actions?: (ChatMessageAction | CustomAction)[];
  /** Whether the bar is visible at rest or on pointer-over; omitted keys the default to the
   *  turn, so a user row reveals and an assistant row stays visible. */
  actionsReveal?: 'always' | 'hover';
  // The parts STAY in `parts`: the wire encoder still needs them, in order.
  /** Skip the citations row that consecutive `source` parts collapse into. */
  hideSources?: boolean;
  /** Fired with the built-in name or custom id when an action is clicked. */
  onAction?: (id: string) => void;
  /** The currently-active feedback vote, so the bar can mark like/dislike and
   *  hide the other. */
  activeFeedback?: FeedbackVote;
  /** When true, the copy button shows its "copied" check icon. */
  copied?: boolean;
  // Forwarded to each reasoning part's `<Reasoning>` so the disclosure auto-opens while
  // the model is thinking and settles back once the stream ends; without it the reader
  // watches a static collapsed "Reasoning" label for the whole thinking window. The
  // caller owns the definition of "streaming": for `ChatApp` that is `loading` plus
  // being the last assistant message.
  /** Whether this message is the one currently streaming. */
  isStreaming?: boolean;
  // A display-mode fact about the medium, not a per-message toggle, so it applies
  // uniformly to every reasoning part in the body. `'compact'` drops the disclosure and
  // shows only a shimmer loader while the part streams, nothing once it settles; `'off'`
  // renders the part not at all, in either state.
  /** How a `reasoning` part renders; the `'full'` default is the collapsible disclosure. */
  reasoningMode?: 'full' | 'compact' | 'off';
  // Meaningless when `reasoningMode` is `'compact'`/`'off'`: there is no disclosure to
  // open.
  /** Seeds the reasoning disclosure open and tracks the stream: open while streaming,
   *  closed once it settles. Closed by default. */
  reasoningDefaultOpen?: boolean;
  // In the `<kai-message>` shadow this is `<slot name="before-body" />`. A per-message
  // header: a model-name label, a role plus timestamp line.
  /** Slot projected at the top of the body, above the reasoning, tools and content. */
  beforeBody?: JSX.Element;
  // In the `<kai-message>` shadow this is `<slot name="after-body" />`. A citation /
  // sources row, a token-cost / latency line.
  /** Slot projected at the bottom of the body, below the action bar. */
  afterBody?: JSX.Element;
  // The choice is published on context by the body's own `<Attachments>` grid, so it is
  // made in ONE place, the container.
  /** How an image tile in a message's attachment grid reveals its full size. Defaults to `'hover'`. */
  imagePreview?: AttachmentImagePreview;
}

/** One render group over an ordered `parts` array. Three part types collapse runs:
 *  consecutive `file` parts become a single `'files'` group so they share one
 *  `<Attachments>` row (matching the pre-parts layout) instead of each opening
 *  its own, consecutive `source` parts become a single `'sources'` group so
 *  the N citations one search produced are ONE wrapped row rather than N stacked
 *  rows, and consecutive `reasoning` and `tool` parts become one `'activity'`
 *  group, which renders as ONE quiet line. A `kai_ask` call joins the run it sits
 *  in without splitting it (the question panel owns it; see `activityStepsForGroup`).
 *  Every other part is its own `'single'` group. Pure and order-preserving:
 *  it only decides where the wrapper boundaries fall, never reorders or drops
 *  anything, so a group sits exactly where its parts sat in `parts`. */
export type MessagePartGroup =
  | { kind: 'single'; part: Exclude<MessagePart, { type: 'file' } | { type: 'source' } | { type: 'reasoning' } | { type: 'tool' }> }
  | { kind: 'files'; parts: Extract<MessagePart, { type: 'file' }>[] }
  | { kind: 'sources'; parts: Extract<MessagePart, { type: 'source' }>[] }
  | { kind: 'activity'; parts: Extract<MessagePart, { type: 'reasoning' | 'tool' }>[] };

type ActivityGroup = Extract<MessagePartGroup, { kind: 'activity' }>;
type RunKind = 'files' | 'sources' | 'activity';
const RUN_OF: Record<string, RunKind | undefined> = { file: 'files', source: 'sources', reasoning: 'activity', tool: 'activity' };

export function groupMessageParts(parts: MessagePart[]): MessagePartGroup[] {
  const groups: MessagePartGroup[] = [];
  for (const part of parts) {
    const run = RUN_OF[part.type];
    if (run) {
      const last = groups[groups.length - 1];
      if (last?.kind === run) {
        groups[groups.length - 1] = { kind: run, parts: [...last.parts, part] } as MessagePartGroup;
        continue;
      }
      groups.push({ kind: run, parts: [part] } as MessagePartGroup);
      continue;
    }
    groups.push({ kind: 'single', part } as MessagePartGroup);
  }
  return groups;
}

const warnedCardKeys = new Set<string>();

/** `card:*` renderer keys are not accepted: cards keep `cardTypes`, the card layer's own registry
 *  (the remote-card contract relies on it). Warn once per key, then ignore it. */
function warnCardRendererKeys(map: RendererMap | undefined): void {
  if (!map) return;
  for (const key of Object.keys(map)) {
    if (!key.startsWith('card:') || warnedCardKeys.has(key)) continue;
    warnedCardKeys.add(key);
    console.warn(
      `[kai] renderers["${key}"] is ignored: cards are customised through \`cardTypes\` (envelope type -> custom-element tag), not \`renderers\`.`,
    );
  }
}

const KNOWN_PART_TYPES: ReadonlySet<string> = new Set(['text', 'reasoning', 'tool', 'card', 'source', 'file']);

/** The steps one activity group shows. `kai_ask` is left out (C's question panel and answers row
 *  own it) and a reasoning part with no text is a round-trip carrier (redacted thinking), not a
 *  step. `reasoning: 'off'` drops reasoning steps, never tool steps. A non-final group is handed
 *  a trailing sentinel so `activityStepsFromParts` does not read its last untimed reasoning block
 *  as the one still being written. */
function activityStepsForGroup(
  parts: ActivityGroup['parts'],
  opts: { streaming: boolean; final: boolean; reasoningMode: 'full' | 'compact' | 'off' },
) {
  const shown: MessagePart[] = parts.filter((p) => {
    if (p.type === 'tool') return (p.tool as { type?: unknown } | undefined)?.type !== ASK_TOOL_NAME;
    return opts.reasoningMode !== 'off' && p.text !== '';
  });
  if (!opts.final) shown.push({ type: 'text', text: '' });
  return activityStepsFromParts(shown, { streaming: opts.streaming });
}

/** The citation chip's label. `index` when the model numbered its citations;
 *  otherwise `undefined` so `SourceTrigger` falls back to the domain. A source
 *  with NO url has no domain to fall back to, so its title (then a generic word)
 *  stands in rather than rendering an empty chip. */
function citationLabel(s: MessageSource): string | number | undefined {
  if (s.index !== undefined) return s.index;
  if (s.url) return undefined;
  return s.title || 'Source';
}

/** The hover card's headline. Every field is optional, so fall back through
 *  title -> url -> a generic word. */
function citationTitle(s: MessageSource): string {
  return s.title || s.url || 'Source';
}

/** Narrow a group to one variant IN A SINGLE READ.
 *
 *  The render body below reads its group/part through accessors (see the
 *  `<Index>` note in `MessageBody`), and TypeScript cannot narrow a
 *  discriminated union across two separate accessor CALLS:
 *  `g().kind === 'files' && g()` leaves the second call widened, because as far
 *  as the compiler knows the two calls could return different values. So the
 *  test and the cast happen together, on one already-read value. Returns
 *  `false` rather than `undefined` so it reads as a plain falsy `<Match when>`. */
function groupAs<T extends MessagePartGroup['kind']>(
  group: MessagePartGroup,
  kind: T,
): Extract<MessagePartGroup, { kind: T }> | false {
  return group.kind === kind ? (group as Extract<MessagePartGroup, { kind: T }>) : false;
}

/** The same single-read narrowing for `MessagePart`. */
function partAs<T extends MessagePart['type']>(
  part: MessagePart,
  type: T,
): Extract<MessagePart, { type: T }> | false {
  return part.type === type ? (part as Extract<MessagePart, { type: T }>) : false;
}

/**
 * One file tile in a message's attachment grid.
 *
 * ★ A COMPONENT OF ITS OWN, and for one reason: the lightbox is selected by
 * `AttachmentsContext.imagePreview`, which is provided by the `<Attachments>`
 * container FURTHER DOWN this same JSX tree. `useContext` reads from the owner
 * scope, so the read has to happen below that provider: inline in `MessageBody`
 * it would find no context and take the `'hover'` fallback every time, which is
 * a lightbox prop that looks wired and never opens.
 *
 * The value is read through the context getter rather than destructured, for the
 * same reason `<Attachment>` does not destructure `variant`: the container's prop
 * can change after mount and a captured value would freeze the tile at its first
 * render.
 *
 * ★ ONLY AN IMAGE GETS THE LIGHTBOX, and only when the container asked for it.
 * Every other tile keeps the hover card, which is a real upgrade for them rather
 * than a redundant one: it carries the filename and media type a grid tile could
 * not fit. A lightbox around a PDF tile would be a modal that opens onto an icon.
 */
function AttachmentTile(props: { data: AttachmentData }) {
  const ctx = useAttachmentsContext();
  const isImage = () =>
    getMediaCategory(props.data) === 'image' && props.data.type === 'file' && !!props.data.url;
  const label = () => getAttachmentLabel(props.data);

  return (
    <Attachment data={props.data}>
      <Show
        when={isImage() && ctx.imagePreview === 'lightbox'}
        fallback={
          <AttachmentHoverCard>
            <AttachmentHoverCardTrigger class="block size-full">
              <AttachmentPreview />
              <AttachmentInfo />
            </AttachmentHoverCardTrigger>
            <AttachmentHoverCardContent>
              {/* An image gets the full preview; everything else
                  gets the name and type the tile could not fit. */}
              <Show
                when={isImage()}
                fallback={
                  <>
                    <div class="text-body font-medium">{label()}</div>
                    <Show when={props.data.mediaType}>
                      <div class="text-muted-foreground text-caption">{props.data.mediaType}</div>
                    </Show>
                  </>
                }
              >
                <img
                  alt={label()}
                  class="block max-h-64 max-w-xs rounded object-contain"
                  src={props.data.url}
                />
              </Show>
            </AttachmentHoverCardContent>
          </AttachmentHoverCard>
        }
      >
        <Lightbox>
          <LightboxTrigger class="block size-full">
            <AttachmentPreview />
          </LightboxTrigger>
          <LightboxContent label={label()}>
            <img
              alt={label()}
              class="block"
              src={props.data.url}
            />
          </LightboxContent>
        </Lightbox>
      </Show>
    </Attachment>
  );
}

/** Resolve the action bar's reveal mode. An explicit value always wins; an OMITTED one is
 *  keyed to the turn, because the row already knows its own speaker. A user message is read
 *  back, so its actions wait for a hover or a focus; an assistant message's actions are the
 *  ones a reader reaches for while reading forward, so they stay put. One spelling of the
 *  rule, read by `MessageBody` and by every list that renders a row (`ChatApp`, `Thread`,
 *  and the `<kai-message>` facade) so the row's `group` class and the bar's own reveal can
 *  never disagree. */
export function resolveActionsReveal(
  reveal: 'always' | 'hover' | undefined,
  isUser: boolean,
): 'always' | 'hover' {
  return reveal ?? (isUser ? 'hover' : 'always');
}

/** One run of `source` or `file` parts, swapped for the consumer's element when `renderers` names
 *  one. The element gets the run as `.parts`; the built-in row shows until it is defined. */
function RunRenderer(props: { tag: string | undefined; parts: MessagePart[]; children: JSX.Element }) {
  return (
    <Show when={props.tag} fallback={props.children}>
      {(tag) => <TagRenderer tag={tag()} data={props.parts} prop="parts" fallback={props.children} />}
    </Show>
  );
}

/**
 * The shared message body: the message's `parts` rendered in a single ordered
 * pass (text, reasoning, tool calls, generative-UI cards, citations and file
 * attachments interleaved exactly as they appear), followed by the action bar.
 * Runs of `source` and `file` parts each collapse into one row. This is the
 * single source of truth for how a message renders, consumed by `ChatApp`
 * (the `<For>` over `messages`), the standalone `<kai-message>` facade, and (in
 * future) `kai-compare` for each candidate. Pure/prop-driven: all interaction
 * state (copied, feedback vote) is owned above and passed in.
 */
function MessageBody(props: MessageBodyProps) {
  const groups = createMemo(() =>
    groupMessageParts(props.parts).filter((g) => !(props.hideSources === true && g.kind === 'sources')),
  );
  createEffect(() => warnCardRendererKeys(props.renderers));
  // The consumer's element for a part, when `renderers` names one (most specific key first).
  const tagFor = (keys: readonly string[]) => resolveRenderer(props.renderers, keys);
  const reasoningMode = () => props.reasoningMode ?? 'full';
  return (
    <>
      {/* before-body (inject): a per-message header above everything else. */}
      <Show when={props.beforeBody}>{props.beforeBody}</Show>
      {/* <Index>, NOT <For>, on purpose: this is load-bearing.
       *
       *  A streaming message re-renders once per delta with a brand-new `parts` array (a
       *  new reference IS the re-render signal), and `groupMessageParts` allocates fresh
       *  wrapper objects on top of that. <For> is REFERENCE-keyed, so every chunk looks
       *  like an entirely new list and every row is torn down and rebuilt: expanding a
       *  tool panel or a reasoning block mid-stream silently did nothing, because the
       *  disclosure opened and was discarded microseconds later by the next token. <Index>
       *  keys by POSITION and hands each row its value as a SIGNAL, and that is the shape
       *  of a stream: the folds behind `parts` only ever append to the end or replace one
       *  part IN PLACE with the same variant, so a part's position is a stable identity.
       *  The trade-off is that a part spliced out of the MIDDLE shifts the rows after it,
       *  and no consumer splices mid-message while every consumer streams.
       *
       *  This only works while the children read through the accessors below: capturing
       *  `g().part` once re-freezes the row at its first delta. */}
      <Index each={groups()}>
        {(group, groupIndex) => (
          <Switch fallback={null}>
            <Match when={groupAs(group(), 'files')}>
              {(g) => (
                <RunRenderer tag={tagFor(['file'])} parts={g().parts}>
                {/* `grid`, NOT `inline`. The inline chip gives an image a 20x20
                   preview — a thumbnail nobody can read — while the 96px tile
                   and the hover-card full preview both already existed here and
                   the thread used neither.

                   WHY GRID AND NOT LIST, since `list` shows the filename
                   outright: `list` stacks (`flex-col`), so a message carrying
                   four attachments becomes four full-width rows and pushes the
                   conversation off screen. `grid` is `flex-wrap w-fit`, so the
                   same four are one 96px-tall row of tiles. Density is what
                   keeps a thread readable, and it is the whole reason the
                   thread is not the composer's chip strip.

                   A grid tile draws no filename of its own, and hiding one
                   behind the hover card is not good enough: that serves a
                   pointer and nothing else. So `<AttachmentInfo>` renders a
                   VISIBLE truncated caption on every non-image tile — no hover,
                   no focus, no tap required — and the hover card is an upgrade
                   to the full name and media type rather than the only way to
                   get either. */}
                <Attachments variant="grid" imagePreview={props.imagePreview} class={props.isUser ? 'mb-2 ml-auto' : 'mb-2'}>
                  {/* Reference-keyed <For> is right HERE: the run's part objects
                      are carried over untouched by the folds, and an attachment
                      holds no state worth preserving. */}
                  <For each={g().parts}>
                    {(fp) => <AttachmentTile data={fp.attachment} />}
                  </For>
                </Attachments>
                </RunRenderer>
              )}
            </Match>
            <Match when={groupAs(group(), 'sources')}>
              {(g) => (
                // OUTSIDE the bubble, deliberately. A citation nested inside
                // `MessageContent` is indistinguishable from a link the MODEL
                // typed into its prose — which is exactly how the first version
                // of the S12 conformance check passed while proving nothing.
                // `SourceList` is its own container, so the row is a sibling of
                // the content part, and `part="citations"` lets a consumer target
                // it through the shadow boundary.
                <RunRenderer tag={tagFor(['source'])} parts={g().parts}>
                <SourceList part="citations" class={props.isUser ? 'justify-end' : undefined}>
                  {/* Reference-keyed <For> is right HERE, as with files: the
                      run's part objects are carried over untouched by the folds. */}
                  <For each={g().parts}>
                    {(sp) => (
                      <Source href={sp.source.url}>
                        <SourceTrigger label={citationLabel(sp.source)} />
                        <SourceContent
                          title={citationTitle(sp.source)}
                          description={sp.source.snippet ?? ''}
                        />
                      </Source>
                    )}
                  </For>
                </SourceList>
                </RunRenderer>
              )}
            </Match>
            <Match when={groupAs(group(), 'activity')}>
              {(g) => {
                // Reasoning and tool calls are ONE quiet line, not a bold panel per call.
                // The steps are re-derived from `g().parts` on every delta (a fresh object per
                // step), and the row stays mounted because this is an <Index>: the line's own
                // open/closed state and the reader's expanded steps live in `Activity` and
                // survive the stream. `renderers` swaps single STEPS (`.step`), never the line.
                const isFinal = () => groupIndex === groups().length - 1;
                const steps = createMemo(() =>
                  activityStepsForGroup(g().parts, {
                    streaming: props.isStreaming === true,
                    final: isFinal(),
                    reasoningMode: reasoningMode(),
                  }),
                );
                const stepRenderers = () => {
                  const map = props.renderers;
                  if (!map) return undefined;
                  const out: RendererMap = {};
                  for (const k of Object.keys(map)) if (k === 'tool' || k === 'reasoning' || k.startsWith('tool:')) out[k] = map[k]!;
                  return out;
                };
                return (
                  <Show when={steps().length > 0}>
                    <Activity
                      class="mb-2"
                      steps={steps()}
                      streaming={props.isStreaming === true}
                      detail={reasoningMode() === 'compact' ? 'summary' : 'full'}
                      defaultOpen={props.reasoningDefaultOpen}
                      renderers={stepRenderers()}
                    />
                  </Show>
                );
              }}
            </Match>
            <Match when={groupAs(group(), 'single')}>
              {(g) => {
                // An ACCESSOR, never a captured value: the row outlives the
                // delta that rebuilt this part, so every read below has to go
                // through here for the new content to land. `partAs` does the
                // type test and the narrowing cast in one read (see its note).
                const part = () => g().part;
                return (
                  <Switch
                    fallback={
                      // A part this build does not know (a newer writer's variant, a corrupt
                      // save) is SHOWN as what it is, never dropped: decide loudly.
                      <Show when={!KNOWN_PART_TYPES.has(String((part() as { type?: unknown }).type))}>
                        <p class="mb-2 text-caption text-muted-foreground" data-kai-unknown-part="">
                          Unsupported content ({String((part() as { type?: unknown }).type).slice(0, 40)})
                        </p>
                      </Show>
                    }
                  >
                    <Match when={partAs(part(), 'text')}>
                      {(p) => {
                        const content = () => (
                          <MessageContent
                            part="bubble content"
                            markdown={props.markdown}
                            class={props.isUser
                              // Content token, not the brand token: `--color-primary`
                              // is the documented consumer brand override
                              // (theme.css `--kai-color-primary`), so toking message
                              // TEXT to it means every consumer that brands primary
                              // gets brand-colored message text. `text-foreground` is
                              // already `MessageContent`'s base color (matches the
                              // assistant path's `bg-transparent p-0`, which carries
                              // no color override and falls through to the same
                              // base) — dropping `text-primary` here just lets that
                              // base apply on the user bubble too.
                              ? 'bg-muted max-w-[85%] rounded-2xl px-4 py-2'
                              : 'bg-transparent p-0'}
                          >
                            {p().text}
                          </MessageContent>
                        );
                        return (
                          <Show when={tagFor(['text'])} fallback={content()}>
                            {(tag) => <TagRenderer tag={tag()} data={p()} prop="messagePart" fallback={content()} />}
                          </Show>
                        );
                      }}
                    </Match>
                    <Match when={partAs(part(), 'card')}>
                      {(p) => <CardRenderer envelope={p().envelope} types={props.cardTypes} schemas={props.cardSchemas} hostElement={props.cardHostElement} />}
                    </Match>
                    {/* No `source`, `reasoning` or `tool` match here on purpose: sources
                        collapse into a 'sources' run, and reasoning and tool parts into an
                        'activity' run, each above. */}
                  </Switch>
                );
              }}
            </Match>
          </Switch>
        )}
      </Index>
      <Show when={(props.actions?.length ?? 0) > 0}>
        <MessageActionBar
          actions={props.actions!}
          reveal={resolveActionsReveal(props.actionsReveal, props.isUser)}
          activeFeedback={props.activeFeedback}
          copied={props.copied}
          onAction={(id) => props.onAction?.(id)}
        />
      </Show>
      {/* after-body (inject): a citation row / cost line below the action bar. */}
      <Show when={props.afterBody}>{props.afterBody}</Show>
    </>
  );
}

// --- MessageAction ---

export interface MessageActionProps {
  tooltip: string;
  children: JSX.Element;
  side?: "top" | "bottom" | "left" | "right";
  class?: string;
}

function MessageAction(props: MessageActionProps) {
  return <>{props.children}</>;
}

// --- MessageCopyButton ---

export interface MessageCopyButtonProps {
  content: string;
  size?: number;
  class?: string;
}

function MessageCopyButton(props: MessageCopyButtonProps) {
  const [copied, setCopied] = createSignal(false);
  const iconSize = () => props.size ?? 14;

  return (
    <button
      class={props.class}
      aria-label={copied() ? 'Copied' : 'Copy message'}
      onClick={() => {
        navigator.clipboard.writeText(props.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <Show when={copied()} fallback={<Copy size={iconSize()} />}>
        <Check size={iconSize()} class="text-success" />
      </Show>
    </button>
  );
}

export { Message, MessageAvatar, MessageContent, MessageActions, MessageActionBar, MessageBody, MessageAction, MessageCopyButton };
