import { Show, splitProps, createMemo, type JSX } from 'solid-js';
import { MessageSquare } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { isConversationUnread } from '../../primitives/conversation-store';
import { interactiveInside } from '../../primitives/focusable-child';
import type { ConversationSummary } from '../../types';

/**
 * Row density, the public axis.
 * `default` and `compact` are the two boxes this row always had; `panel` is
 * the widget-panel presentation: the exact row box of the facade's
 * `ConversationPanel` (conversation-panel.tsx), whose `px-3 py-2.5` interior
 * class was PRIVATE until now. That measurement could
 * only match it by smuggling padding through slotted spans around host
 * padding; this axis deletes that contortion.
 */
export type ConversationRowDensity = 'default' | 'compact' | 'panel';

/**
 * The row box (padding) per density, all three on the one density scale
 * (`--spacing` re-points at `--kai-density`, theme.css). `panel` restates
 * conversation-panel.tsx's row class `px-3 py-2.5` (12px/10px; with the 20px
 * text-sm line, the measured 40px row). A copy by necessity: Tailwind utilities
 * compile from literal class strings, so it cannot be imported from the panel at
 * runtime. `conversation-item-density.test.tsx` derives the expected utilities
 * from conversation-panel.tsx's SOURCE and fails if the two drift.
 *
 * `default` is what every consumer gets with no density set, `px-2.5 py-1.5`
 * (10px inline, 6px block). Its inline half is the `px-2.5` this axis has always
 * carried, so a consumer that moved to `compact` and back keeps its rows'
 * leading edge; only the block half moved, one step down from `py-2` (8px).
 *
 * `compact` is the dense single-line box, `px-2 py-0.5` (8px/2px, a 24px row),
 * deliberately the tightest box on the axis rather than one step below
 * `default`: a rail row is furniture listed one under another, so its height
 * comes from its padding rather than a fixed box.
 */
export const DENSITY_ROW_BOX: Record<ConversationRowDensity, string> = {
  default: 'px-2.5 py-1.5',
  compact: 'px-2 py-0.5',
  panel: 'px-3 py-2.5',
};

/** Resolve the density axis against the legacy `compact` boolean: an explicit
 *  `density` wins; `compact` alone keeps meaning what it always did. */
export function resolveRowDensity(
  density?: ConversationRowDensity,
  compact?: boolean,
): ConversationRowDensity {
  return density ?? (compact ? 'compact' : 'default');
}

/** The unread indicator dot: visible dot plus a screen-reader label, the same
 *  pair `ConversationPanel` and `HomePanel` render. */
function UnreadDot() {
  return (
    <>
      <span part="unread" aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-unread" />
      <span class="sr-only">Unread</span>
    </>
  );
}

export interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  // What compact drops, precisely: one line instead of two, so the message-count subline
  // goes and the title gains a leading icon. The trailing edge and the unread dot STAY on
  // that line, so a consumer who wanted the timestamp gone would get a one-line row with a
  // timestamp still on it: that is `showTrailing`'s job, not this flag's.
  /** Dense single-line row: a leading icon + title, no message count. */
  compact?: boolean;
  // `panel` is the widget-panel presentation matching `ConversationPanel`'s measured row
  // box (single semibold title line, right-aligned time, optional preview line). An explicit
  // density wins over `compact`.
  /** Row density. */
  density?: ConversationRowDensity;
  // Why a render prop rather than a sentinel value: "paint nothing here" is a fact about
  // this row's presentation, not about the conversation, and `ConversationSummary.trailing`
  // already means two different things by density (the field's own doc) while the store
  // writes one on every save, so gating only the DERIVED time would leave those summaries
  // showing something on the edge anyway. The part name is the generic `Row`'s, so `false`
  // paints no node for a `::part(trailing)` rule to hit. In the `panel` density this
  // empties the right-aligned time and leaves the field's other rendering, the preview line
  // under the title: that line is the row's preview rather than its trailing edge, and
  // omitting the field already removes it.
  /** Paint the row's trailing edge, `part="trailing"`, or leave the edge empty. Default `true`. */
  showTrailing?: boolean;
  class?: string;
}

/**
 * Short relative time from an ISO date string: "just now", "5m ago", "3h ago",
 * "2d ago", "24d ago". Pure: it snapshots `now` (defaults to `Date.now()`) at
 * call time, so it re-derives whenever the list re-renders; there is no internal
 * ticking clock. Returns '' for a missing or unparseable date.
 */
export function relativeTimeShort(iso?: string, now: number = Date.now()): string {
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

// `isConversationUnread` moved to `primitives/conversation-store.ts` (beside
// the `ConversationStore` contract whose `markRead` writes the field it
// reads) so a consumer composing their own launcher can import it from the
// package root — it is headless data logic, not rendering. Re-exported here
// so this file's existing importers (ConversationPanel, HomePanel,
// ChatThread, tests) keep their paths.
export { isConversationUnread } from '../../primitives/conversation-store';

/**
 * The slotted-item shape rendered by `<kai-conversation-item>`: the composed
 * row of the consumer-owned loop. Distinct from the
 * data-mode `ConversationItem` above, which batteries mode keeps rendering
 * unchanged: this one takes REGIONS, not a `ConversationSummary`.
 *
 * Regions map 1:1 to the element's slots: `children` = the default slot (the
 * title), plus `leading`, `meta`, and `menu`. The `menu` region takes the
 * consumer's OWN popover (rename / fork / archive live there); the component
 * provides only the region plus focus and ARIA plumbing, never a declarative
 * actions prop. Activation has two modes: inside `<kai-conversations>` it
 * lives in the CONTAINER (`createConversationItemsController` in
 * conversation-list.tsx), which renders no handler on the row; the
 * `data-kai-item-menu` marker on the menu region is what the container's
 * activation guard keys off, so a click in the consumer's menu never also
 * selects the row. STANDALONE, `onActivate` makes the row body
 * its own tabbable button-role control: click / Enter / Space, with the menu
 * still outside the control as the body's sibling. That control yields to any
 * keyboard-reachable control inside it: an inline editor in the title region
 * keeps its own SPACE, Enter and clicks, via the same `interactiveInside` rule
 * the container applies.
 *
 * ARIA contract for direct Solid use: the row renders `role="listitem"` holding
 * a `role="button"` body (`aria-current` marks the active row, the same dialect
 * as the batteries-mode row above) with the menu as the body's tabbable SIBLING
 * (axe `nested-interactive` bans focusable descendants of
 * a control, and `aria-required-children` outlaws non-option content anywhere
 * inside a listbox, which is why the vocabulary is not listbox/option). Render
 * your loop's rows inside a `role="list"` ancestor; element mode has no such
 * burden: `<kai-conversations>`' items region provides it for slotted items.
 */
export interface SlottedConversationItemProps {
  /** The row's identity, handed to the container's selection contract. In the
   *  element this is the `conversation-id` attribute (host `id` is the fallback). */
  conversationId?: string;
  /** Selected state. Reflected as `aria-current` on the row body and a
   *  `data-active` styling hook on the row; the container drives it from its
   *  `activeId`. */
  active?: boolean;
  /** Dense single-line row padding. */
  compact?: boolean;
  // The explicit prop wins over `compact`.
  /** Row density. */
  density?: ConversationRowDensity;
  /** Show the unread indicator dot at the row's trailing edge (before the
   *  menu region), with a screen-reader "Unread" label. */
  unread?: boolean;
  /** Leading region before the title (an icon or avatar). */
  leading?: JSX.Element;
  /** Meta region under the title (a timestamp or status line). */
  meta?: JSX.Element;
  /** Your own row menu (a popover trigger). Never selects the row. */
  menu?: JSX.Element;
  /** The title (the element's default slot). */
  children?: JSX.Element;
  // The inner row then renders `role="presentation"` and the accessibility tree sees ONE
  // group (the host), never two. The `kai-conversation-item` facade sets it; Solid consumers
  // rendering the component directly leave it off, and the row itself is the group.
  /** Whether the element host carries the row-group semantics. */
  hostSemantics?: boolean;
  // With it set, the row body IS the activation control: `tabindex="0"` on the
  // `role="button"` body, and click / Enter / Space call this. The menu region never triggers
  // it, being the body's sibling rather than a descendant. Inside `<kai-conversations>` it
  // stays UNSET, because the container's controller owns activation (delegated click/keydown
  // to `kai-conversation-select`) and roving tabindex, and a handler here would double-fire;
  // the `kai-conversation-item` facade passes it only when the item is standalone.
  /** Activation handler for a standalone row. */
  onActivate?: () => void;
  class?: string;
}

export function SlottedConversationItem(props: SlottedConversationItemProps) {
  const [local] = splitProps(props, ['conversationId', 'active', 'compact', 'density', 'unread', 'leading', 'meta', 'menu', 'children', 'hostSemantics', 'onActivate', 'class']);
  const density = () => resolveRowDensity(local.density, local.compact);
  // The activation body, the boundary both handlers below are judged against: a
  // click or key that happened INSIDE a control in the title region is that
  // control's, not the row's (see `interactiveInside`). The element ref is used
  // rather than `event.currentTarget` because event delegation is not something
  // this handler should depend on for its own identity.
  let bodyEl: HTMLDivElement | undefined;
  const startedInsideControl = (e: Event): boolean =>
    bodyEl !== undefined && interactiveInside(e.composedPath(), bodyEl) !== undefined;
  return (
    // The sibling restructure: axe nested-interactive
    // bans focusable descendants of an activation control, so the control role
    // sits on the row BODY and the consumer's menu is its tabbable SIBLING
    // (the nav.tsx TrailingActions precedent). The vocabulary is
    // list/listitem/button + aria-current — NOT listbox/option, because axe
    // aria-required-children lets a listbox subtree own nothing but options
    // (and groups of options), which outlaws a sibling menu ANYWHERE inside
    // it; button + aria-current is also exactly what the batteries-mode
    // ConversationItem row above renders, so the two modes speak one dialect.
    <div
      part="row"
      role={local.hostSemantics ? 'presentation' : 'listitem'}
      data-active={local.active ? '' : undefined}
      data-conversation-id={local.conversationId}
      class={cn(
        'flex w-full items-center gap-2.5 rounded-lg text-left transition-colors',
        DENSITY_ROW_BOX[density()],
        local.active ? 'bg-muted' : 'hover:bg-muted/50',
        local.class,
      )}
    >
      <div
        part="body"
        ref={bodyEl}
        role="button"
        data-kai-item-body
        aria-current={local.active ? 'true' : 'false'}
        // Standalone activation only: with `onActivate` unset —
        // the inside-a-container case — no tabindex and no handlers render, so
        // the container's delegated activation stays the single path.
        //
        // Both handlers yield to a control inside the body, the same rule the
        // container applies over the same helper: an inline editor in the title
        // region (the documented place for it) keeps every SPACE — no
        // preventDefault — and a click in it does not select the row. Not a
        // capture-phase stopPropagation, which would kill that editor's own
        // keydown too.
        tabindex={local.onActivate ? 0 : undefined}
        onClick={(e: MouseEvent) => {
          if (startedInsideControl(e)) return;
          local.onActivate?.();
        }}
        onKeyDown={(e: KeyboardEvent) => {
          if (!local.onActivate) return;
          if (e.key === 'Enter' || e.key === ' ') {
            if (startedInsideControl(e)) return;
            e.preventDefault(); // Space must not scroll the page
            local.onActivate();
          }
        }}
        class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Show when={local.leading}>
          <span part="leading" class="flex shrink-0 items-center text-muted-foreground">{local.leading}</span>
        </Show>
        <div class="min-w-0 flex-1">
          <div part="title" class={cn('truncate text-sm', local.active ? 'font-medium text-foreground' : 'text-foreground/80')}>
            {local.children}
          </div>
          <Show when={local.meta}>
            <div part="meta" class="mt-0.5 truncate text-xs text-muted-foreground">{local.meta}</div>
          </Show>
        </div>
        {/* Unread dot: trailing edge of the BODY, so it stays inside the
            activation surface and before the menu sibling. */}
        <Show when={local.unread}>
          <UnreadDot />
        </Show>
      </div>
      <Show when={local.menu}>
        <span part="menu" data-kai-item-menu class="ml-auto flex shrink-0 items-center">{local.menu}</span>
      </Show>
    </div>
  );
}

export function ConversationItem(props: ConversationItemProps) {
  const [local] = splitProps(props, ['conversation', 'isActive', 'onSelect', 'compact', 'density', 'showTrailing', 'class']);
  const density = () => resolveRowDensity(local.density, local.compact);
  // Whether this row paints its trailing edge at all. Default-true, so the
  // written form is the opt-OUT (`showTrailing={false}`); every value other
  // than `false` leaves the row exactly as it was.
  const showTrailing = () => local.showTrailing !== false;
  // Unread dot: derived from the same public read primitive the
  // facade's panel and home surfaces use, never a second policy.
  const unread = createMemo(() => isConversationUnread(local.conversation));
  // The trailing edge's TEXT: the consumer's own `trailing` field, else an auto relative
  // time from updatedAt (fallback lastMessageAt); '' when the edge is opted out of. Never an
  // internal clock — it is a render-time snapshot.
  //
  // REACTIVITY, and the weaker version of this note is what shipped the stale dot:
  // a new `conversations` array reference is NOT sufficient. `ConversationList` renders
  // these rows through a reference-keyed `<For>` that captures `conv` as a VALUE, so a
  // row whose item object is unchanged is never re-invoked and never re-reads anything
  // below. The consumer needs BOTH — a new array (which is what notifies at all) and a
  // new object for the item that changed (which is what this row can see). Adds,
  // removes and reorders are fine on a fresh array alone, since those rows' identities
  // already differ. Pinned by `src/components/reactivity-contract/reactivity-contract.test.tsx`.
  const trailing = createMemo(
    () => (showTrailing()
      ? local.conversation.trailing ?? relativeTimeShort(local.conversation.updatedAt ?? local.conversation.lastMessageAt)
      : ''),
  );
  // The panel anatomy renders the time directly (never the consumer's
  // `trailing` field, which is the PREVIEW line there), same as
  // ConversationPanel. The same option empties THIS edge in this density: the
  // preview line under the title is not the trailing edge, so it stays.
  const panelTime = () => (showTrailing()
    ? relativeTimeShort(local.conversation.updatedAt ?? local.conversation.lastMessageAt)
    : '');
  return (
    <button
      data-conversation-id={local.conversation.id}
      data-unread={unread() ? '' : undefined}
      // `isActive` drives the selected LOOK below; it has to reach assistive tech
      // too, or the active conversation is visible only to sighted users. `true`
      // rather than `page` because this selects a conversation within the app, it
      // is not page navigation — same call as components/agent-card/agent-card.tsx and components/pane/pane-group.tsx
      // (components/nav/nav.tsx uses `page` because its items really are nav links).
      aria-current={local.isActive ? 'true' : undefined}
      onClick={() => local.onSelect(local.conversation.id)}
      class={cn(
        'w-full rounded-lg text-left transition-colors',
        density() === 'panel' && 'block',
        DENSITY_ROW_BOX[density()],
        local.isActive ? 'bg-muted' : 'hover:bg-muted/50',
        local.class,
      )}
    >
      <Show
        when={density() !== 'panel'}
        fallback={
          // The widget-panel presentation: ConversationPanel's row
          // anatomy, made public. Baseline row of semibold title + relative
          // time; the consumer's `trailing` field is the one-line preview
          // under it, with the unread dot at the preview line's end
          // (Intercom's own placement, per conversation-panel.tsx).
          <>
            <div class="flex items-baseline gap-2">
              <span class={cn('min-w-0 flex-1 truncate text-sm font-semibold', local.isActive ? 'text-foreground' : 'text-foreground/90')}>
                {local.conversation.title}
              </span>
              <Show when={panelTime()}>
                <span part="trailing" class="shrink-0 text-xs text-muted-foreground">{panelTime()}</span>
              </Show>
            </div>
            <Show when={local.conversation.trailing || unread()}>
              <div class="mt-0.5 flex items-center gap-1.5">
                <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{local.conversation.trailing}</span>
                <Show when={unread()}>
                  <UnreadDot />
                </Show>
              </div>
            </Show>
          </>
        }
      >
        <Show
          when={density() === 'compact'}
          fallback={
            <>
              <div class="flex items-center gap-2">
                <div class={cn('min-w-0 flex-1 truncate text-sm', local.isActive ? 'font-medium text-foreground' : 'text-foreground/80')}>{local.conversation.title}</div>
                <Show when={unread()}>
                  <UnreadDot />
                </Show>
                <Show when={trailing()}>
                  <span part="trailing" class="ml-auto shrink-0 text-xs text-muted-foreground">{trailing()}</span>
                </Show>
              </div>
              <div class={cn('mt-0.5 truncate text-xs', local.isActive ? 'text-foreground/70' : 'text-muted-foreground')}>{local.conversation.messageCount} messages</div>
            </>
          }
        >
          <div class="flex items-center gap-2.5">
            <MessageSquare class={cn('size-3.5 shrink-0', local.isActive ? 'text-foreground' : 'text-muted-foreground')} />
            <span class={cn('min-w-0 flex-1 truncate text-sm', local.isActive ? 'font-medium text-foreground' : 'text-foreground/80')}>{local.conversation.title}</span>
            <Show when={unread()}>
              <UnreadDot />
            </Show>
            <Show when={trailing()}>
              <span part="trailing" class="ml-auto shrink-0 text-xs text-muted-foreground">{trailing()}</span>
            </Show>
          </div>
        </Show>
      </Show>
    </button>
  );
}
