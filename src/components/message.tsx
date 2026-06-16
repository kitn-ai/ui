import { type JSX, For, createSignal, splitProps, Show } from "solid-js";
import { Tooltip } from "../ui/tooltip";
import { Copy, Check } from "lucide-solid";
import { cn } from "../utils/cn";
import { Markdown } from "./markdown";
import { Button } from "../ui/button";
import { actionIcon, BUILTIN_ACTION_LABEL } from "../ui/action-icons";
import type { ChatMessageAction, CustomAction } from "../elements/chat-types";
import { useChatConfig, textClass } from "../primitives/chat-config";

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
  class?: string;
}

/** Normalize a bar entry (string built-in or custom object) to a uniform shape. */
function normalizeAction(a: ChatMessageAction | CustomAction) {
  if (typeof a === 'string') {
    return { id: a, label: BUILTIN_ACTION_LABEL[a], Icon: actionIcon(a) };
  }
  return { id: a.id, label: a.label, Icon: actionIcon(a.icon) };
}

/**
 * The shared message action toolbar. Renders one ghost icon button per entry —
 * built-in names pull their label+icon from the curated registry; custom
 * descriptors use their `label` plus `actionIcon(icon)` (label-only when the
 * icon is unknown or absent). `reveal="hover"` makes the bar fade in on the
 * parent `.group`'s hover.
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
          // Factory (not a shared node): each Show branch gets its own Button so
          // the eager DOM node is never referenced from two places.
          const button = () => (
            <Button
              variant="ghost"
              size="icon-sm"
              class="rounded-full"
              data-action={item.id}
              aria-label={item.label}
              onClick={() => props.onAction(item.id)}
            >
              <Show when={item.Icon} fallback={<span class="px-1 text-xs">{item.label}</span>}>
                {(Icon) => {
                  const I = Icon();
                  return <I class="size-3.5" />;
                }}
              </Show>
            </Button>
          );
          // Icon-only buttons get a tooltip; label-only buttons (text already
          // visible) don't.
          return (
            <Show when={item.Icon} fallback={button()}>
              <Tooltip content={tooltipText()}>{button()}</Tooltip>
            </Show>
          );
        }}
      </For>
    </MessageActions>
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

export { Message, MessageAvatar, MessageContent, MessageActions, MessageActionBar, MessageAction, MessageCopyButton };
