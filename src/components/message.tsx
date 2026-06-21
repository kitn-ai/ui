import { type JSX, For, createSignal, splitProps, Show } from "solid-js";
import { Tooltip } from "../ui/tooltip";
import { Copy, Check } from "lucide-solid";
import { cn } from "../utils/cn";
import { Markdown } from "./markdown";
import { Button } from "../ui/button";
import { actionIcon, BUILTIN_ACTION_LABEL } from "../ui/action-icons";
import type { ChatMessageAction, CustomAction, FeedbackVote } from "../elements/chat-types";
import { useChatConfig, textClass } from "../primitives/chat-config";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "./reasoning";
import { Tool, type ToolPart } from "./tool";
import { Attachments, Attachment, AttachmentPreview, AttachmentInfo, type AttachmentData } from "./attachments";

// --- Message ---

export interface MessageProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

function Message(props: MessageProps) {
  const [local, rest] = splitProps(props, ["children", "class"]);
  return (
    <div class={cn("flex items-start gap-3", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

// --- MessageAvatar ---

export interface MessageAvatarProps {
  src: string;
  alt: string;
  fallback?: string;
  class?: string;
}

function MessageAvatar(props: MessageAvatarProps) {
  return (
    <div
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
          alt={props.alt}
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
}

function MessageContent(props: MessageContentProps) {
  const [local, rest] = splitProps(props, ["children", "markdown", "class"]);
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
        <div class={classNames()} {...rest}>
          {local.children}
        </div>
      }
    >
      <Markdown content={local.children as string} class={classNames()} />
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
  /** `'always'` (default) keeps the bar visible; `'hover'` reveals it on
   *  parent `.group` hover. */
  reveal?: 'always' | 'hover';
  /** Fired with the built-in name or the custom action id when a button is clicked. */
  onAction: (id: string) => void;
  /** The active feedback vote. When `'like'`/`'dislike'` is set, that button is
   *  marked pressed (filled) and the OTHER vote button animates out. `undefined`
   *  shows both. Pure/prop-driven so the bar survives re-renders. */
  activeFeedback?: FeedbackVote;
  /** When true, the `copy` button shows its emerald check icon instead of the
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
 * The shared message action toolbar. Renders one ghost icon button per entry —
 * built-in names pull their label+icon from the curated registry; custom
 * descriptors use their `label` plus `actionIcon(icon)` (label-only when the
 * icon is unknown or absent). `reveal="hover"` makes the bar fade in on the
 * parent `.group`'s hover.
 *
 * Pure/prop-driven: feedback (`activeFeedback`) and copy (`copied`) state are
 * owned by the parent facade and passed in — the bar holds no internal signals,
 * so it survives the new-array-per-chunk re-renders of a streaming thread. With
 * a vote active, the chosen `like`/`dislike` button is marked `aria-pressed` +
 * filled and the other vote button collapses its width (sliding the active thumb
 * into its place) via a 0fr↔1fr grid transition. The
 * `copy` button swaps to an emerald check while `copied`.
 */
function MessageActionBar(props: MessageActionBarProps) {
  return (
    <MessageActions
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
                <Check class="size-3.5 text-emerald-400" />
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
  /** The message text/markdown. */
  content: string;
  /** Optional collapsible reasoning block, rendered above the content. */
  reasoning?: { text: string; label?: string };
  /** Tool-call parts, rendered above the content. */
  tools?: ToolPart[];
  /** Inline attachment previews, rendered above the content. */
  attachments?: AttachmentData[];
  /** Whether this is a user message (right-aligned bubble) vs an assistant
   *  message (full-width transparent). */
  isUser: boolean;
  /** Whether the content renders as markdown. */
  markdown: boolean;
  /** Action-bar entries — built-in names and/or custom descriptors. When empty
   *  the bar is not rendered. */
  actions?: (ChatMessageAction | CustomAction)[];
  /** `'always'` (default) keeps the bar visible; `'hover'` reveals it on parent
   *  `.group` hover. */
  actionsReveal?: 'always' | 'hover';
  /** Fired with the built-in name or custom id when an action is clicked. */
  onAction?: (id: string) => void;
  /** The currently-active feedback vote, so the bar can mark like/dislike and
   *  hide the other. */
  activeFeedback?: FeedbackVote;
  /** When true, the copy button shows its "copied" check icon. */
  copied?: boolean;
}

/**
 * The shared message body: an optional reasoning block, tool calls, inline
 * attachments, the content bubble, and the action bar — in that order. This is
 * the single source of truth for how a message renders, consumed by `ChatThread`
 * (the `<For>` over `messages`), the standalone `<kai-message>` facade, and (in
 * future) `kai-compare` for each candidate. Pure/prop-driven: all interaction
 * state (copied, feedback vote) is owned above and passed in.
 */
function MessageBody(props: MessageBodyProps) {
  return (
    <>
      <Show when={props.reasoning}>
        {(r) => (
          <Reasoning class="mb-2 w-full">
            <ReasoningTrigger>{r().label ?? 'Reasoning'}</ReasoningTrigger>
            <ReasoningContent markdown>{r().text}</ReasoningContent>
          </Reasoning>
        )}
      </Show>
      <For each={props.tools ?? []}>{(tp) => <Tool toolPart={tp} class="mb-2 w-full" />}</For>
      <Show when={props.attachments?.length}>
        <Attachments variant="inline" class={props.isUser ? 'mb-2 justify-end' : 'mb-2'}>
          <For each={props.attachments!}>
            {(att) => (<Attachment data={att}><AttachmentPreview /><AttachmentInfo /></Attachment>)}
          </For>
        </Attachments>
      </Show>
      <MessageContent
        markdown={props.markdown}
        class={props.isUser
          ? 'bg-muted text-primary max-w-[85%] rounded-2xl px-4 py-2'
          : 'bg-transparent p-0'}
      >
        {props.content}
      </MessageContent>
      <Show when={(props.actions?.length ?? 0) > 0}>
        <MessageActionBar
          actions={props.actions!}
          reveal={props.actionsReveal === 'hover' ? 'hover' : 'always'}
          activeFeedback={props.activeFeedback}
          copied={props.copied}
          onAction={(id) => props.onAction?.(id)}
        />
      </Show>
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
        <Check size={iconSize()} class="text-emerald-400" />
      </Show>
    </button>
  );
}

export { Message, MessageAvatar, MessageContent, MessageActions, MessageActionBar, MessageBody, MessageAction, MessageCopyButton };
