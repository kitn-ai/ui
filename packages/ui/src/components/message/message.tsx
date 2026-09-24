import { type JSX, For, Index, Switch, Match, createMemo, createSignal, splitProps, Show } from "solid-js";
import { Tooltip } from "../tooltip/tooltip";
import { Copy, Check } from "lucide-solid";
import { cn } from "../../utils/cn";
import { Markdown } from "../markdown/markdown";
import { Button } from "../button/button";
import { actionIcon, BUILTIN_ACTION_LABEL } from "../action-icons/action-icons";
import type { ChatMessageAction, CustomAction, FeedbackVote, MessagePart, MessageSource } from "../../web-components/chat/chat-types";
import { useChatConfig, textClass } from "../../primitives/chat-config";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "../reasoning/reasoning";
import { Loader } from "../loader/loader";
import { Tool } from "../tool/tool";
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
}

function Message(props: MessageProps) {
  const [local, rest] = splitProps(props, ["children", "class", "role"]);
  return (
    <div
      part="row"
      class={cn("flex items-start gap-3", local.class)}
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
 * parent `.group`'s hover.
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
        props.reveal === 'hover' && 'opacity-0 transition-opacity group-hover:opacity-100',
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
  /** Whether the bar stays visible or appears on pointer-over; defaults to staying visible. */
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
  // caller owns the definition of "streaming": for `ChatThread` that is `loading` plus
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

/** One render group over an ordered `parts` array. Two part types collapse runs:
 *  consecutive `file` parts become a single `'files'` group so they share one
 *  `<Attachments>` row (matching the pre-parts layout) instead of each opening
 *  its own, and consecutive `source` parts become a single `'sources'` group so
 *  the N citations one search produced are ONE wrapped row rather than N stacked
 *  rows. Every other part is its own `'single'` group. Pure and order-preserving:
 *  it only decides where the wrapper boundaries fall, never reorders or drops
 *  anything, so a group sits exactly where its parts sat in `parts`. */
export type MessagePartGroup =
  | { kind: 'single'; part: Exclude<MessagePart, { type: 'file' } | { type: 'source' }> }
  | { kind: 'files'; parts: Extract<MessagePart, { type: 'file' }>[] }
  | { kind: 'sources'; parts: Extract<MessagePart, { type: 'source' }>[] };

export function groupMessageParts(parts: MessagePart[]): MessagePartGroup[] {
  const groups: MessagePartGroup[] = [];
  for (const part of parts) {
    if (part.type === 'file') {
      const last = groups[groups.length - 1];
      if (last?.kind === 'files') {
        groups[groups.length - 1] = { kind: 'files', parts: [...last.parts, part] };
        continue;
      }
      groups.push({ kind: 'files', parts: [part] });
      continue;
    }
    if (part.type === 'source') {
      const last = groups[groups.length - 1];
      if (last?.kind === 'sources') {
        groups[groups.length - 1] = { kind: 'sources', parts: [...last.parts, part] };
        continue;
      }
      groups.push({ kind: 'sources', parts: [part] });
      continue;
    }
    groups.push({ kind: 'single', part });
  }
  return groups;
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

/**
 * The shared message body: the message's `parts` rendered in a single ordered
 * pass (text, reasoning, tool calls, generative-UI cards, citations and file
 * attachments interleaved exactly as they appear), followed by the action bar.
 * Runs of `source` and `file` parts each collapse into one row. This is the
 * single source of truth for how a message renders, consumed by `ChatThread`
 * (the `<For>` over `messages`), the standalone `<kai-message>` facade, and (in
 * future) `kai-compare` for each candidate. Pure/prop-driven: all interaction
 * state (copied, feedback vote) is owned above and passed in.
 */
function MessageBody(props: MessageBodyProps) {
  const groups = createMemo(() =>
    groupMessageParts(props.parts).filter((g) => !(props.hideSources === true && g.kind === 'sources')),
  );
  return (
    <>
      {/* before-body (inject): a per-message header above everything else. */}
      <Show when={props.beforeBody}>{props.beforeBody}</Show>
      {/* <Index>, NOT <For>, on purpose — this is load-bearing.
       *
       *  A streaming message re-renders once per delta with a brand-new `parts`
       *  array (a new reference IS the re-render signal), and
       *  `groupMessageParts` allocates fresh wrapper objects on top of that. A
       *  <For> is REFERENCE-keyed, so every chunk looks like an entirely new
       *  list and every row is torn down and rebuilt. Everything the user has
       *  done inside a row dies with it: expanding a tool panel or a reasoning
       *  block mid-stream silently did nothing, because the disclosure opened
       *  and was discarded microseconds later by the next token (a live probe
       *  caught the collapsibles' `createUniqueId()` walking cl-9 -> cl-11 ->
       *  cl-15 across three deltas).
       *
       *  <Index> keys by POSITION and hands each row its value as a SIGNAL, so
       *  a row stays mounted while its content keeps updating. That is exactly
       *  the shape of a stream: the folds behind `parts`
       *  (appendTextPart/appendReasoningPart/upsertToolPart) only ever append
       *  to the end or replace one part IN PLACE with the same variant — never
       *  reorder, never change a part's type — so a part's position is a stable
       *  identity, and a growing text/reasoning block or a tool patched from
       *  `input-streaming` to `output-available` reaches the DOM through the
       *  accessor instead of through a remount.
       *
       *  The trade-off of position-keying: splicing a part out of the MIDDLE of
       *  a message shifts the rows after it, so their local state (an open
       *  disclosure) stays with the position rather than following the part.
       *  <For> got that right for a STATIC array and got streaming wrong every
       *  single time — no consumer splices mid-message, every consumer streams.
       *
       *  This only works while the children read through the accessors below:
       *  capturing `g().part` once re-freezes the row at its first delta. */}
      <Index each={groups()}>
        {(group) => (
          <Switch fallback={null}>
            <Match when={groupAs(group(), 'files')}>
              {(g) => (
                /* `grid`, NOT `inline`. The inline chip gives an image a 20x20
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
                   get either. */
                <Attachments variant="grid" imagePreview={props.imagePreview} class={props.isUser ? 'mb-2 ml-auto' : 'mb-2'}>
                  {/* Reference-keyed <For> is right HERE: the run's part objects
                      are carried over untouched by the folds, and an attachment
                      holds no state worth preserving. */}
                  <For each={g().parts}>
                    {(fp) => <AttachmentTile data={fp.attachment} />}
                  </For>
                </Attachments>
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
              )}
            </Match>
            <Match when={groupAs(group(), 'single')}>
              {(g) => {
                // An ACCESSOR, never a captured value: the row outlives the
                // delta that rebuilt this part, so every read below has to go
                // through here for the new content to land. `partAs` does the
                // type test and the narrowing cast in one read (see its note).
                const part = () => g().part;
                const reasoning = () => partAs(part(), 'reasoning');
                // A reasoning part with NO text is a round-trip carrier, not
                // something to show. Anthropic's redacted_thinking blocks carry
                // an opaque blob with no readable text, and the block assembled
                // at content_block_stop carries the verbatim payload the encoder
                // must echo back. Both are empty-text parts that MUST stay in
                // `parts` (the encoder needs them, in order) and must not render
                // a blank disclosure.
                const carrierOnly = () => { const r = reasoning(); return r !== false && r.text === ''; };
                const shownReasoning = () => { const r = reasoning(); return r !== false && r.text !== '' && r; };
                return (
                  <Switch fallback={null}>
                    <Match when={partAs(part(), 'text')}>
                      {(p) => (
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
                      )}
                    </Match>
                    <Match when={carrierOnly()}>{null}</Match>
                    <Match when={shownReasoning()}>
                      {(p) => {
                        // Default 'full' is the pre-existing DISPLAY MODE byte
                        // for byte; the OPEN behavior changed under Task 19f —
                        // it no longer auto-opens while streaming by default
                        // (owner ruling 2026-08-26). `reasoningDefaultOpen`
                        // reproduces the old always-auto-opens behavior when set.
                        const mode = () => props.reasoningMode ?? 'full';
                        return (
                          <Switch fallback={null}>
                            <Match when={mode() === 'full'}>
                              <Reasoning
                                class="mb-2 w-full"
                                isStreaming={props.isStreaming}
                                defaultOpen={props.reasoningDefaultOpen}
                                openOnStream={props.reasoningDefaultOpen}
                              >
                                <ReasoningTrigger>{p().label ?? 'Reasoning'}</ReasoningTrigger>
                                <ReasoningContent markdown>{p().text}</ReasoningContent>
                              </Reasoning>
                            </Match>
                            {/* 'compact': the same "Thinking…" shimmer the full
                                disclosure's trigger shows while streaming — no
                                <Reasoning>/<ReasoningContent>, so there is no
                                expandable detail and nothing left once the part
                                settles (isStreaming false → this Match doesn't
                                fire, matching 'off'). 'off' never reaches here:
                                its Match doesn't fire either. */}
                            <Match when={mode() === 'compact' && props.isStreaming}>
                              <Loader variant="text-shimmer" text={p().label ?? 'Reasoning'} class="mb-2" />
                            </Match>
                          </Switch>
                        );
                      }}
                    </Match>
                    <Match when={partAs(part(), 'tool')}>
                      {(p) => <Tool toolPart={p().tool} class="mb-2 w-full" />}
                    </Match>
                    <Match when={partAs(part(), 'card')}>
                      {(p) => <CardRenderer envelope={p().envelope} types={props.cardTypes} schemas={props.cardSchemas} hostElement={props.cardHostElement} />}
                    </Match>
                    {/* No `source` match here on purpose: source parts never
                        reach a 'single' group — they are collapsed into a
                        'sources' run above and rendered as one citation row. */}
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
          reveal={props.actionsReveal === 'hover' ? 'hover' : 'always'}
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
