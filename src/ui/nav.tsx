import { For, Show, type JSX, createSignal, splitProps } from 'solid-js';
import { ChevronRight } from 'lucide-solid';
import { cn } from '../utils/cn';
import { renderIcon } from './icon';
import { Badge } from './badge';

/** Status tone for a nav item's dot. `primary` is the theme accent; the rest use
 *  the kit's tool hues (the same colors as kai-status / kai-progress-bar). Generic
 *  enough for thread/onboarding states (success = "Completed", info = "Working")
 *  and task-run states (neutral = queued, info = running, success = done,
 *  error = failed). */
export type NavStatusTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral';

/** Dot hue per `tone`, mirroring the kai-status / kai-progress-bar token map. */
const STATUS_DOT_BG: Record<NavStatusTone, string> = {
  primary: 'bg-primary',
  info: 'bg-tool-blue',
  success: 'bg-tool-green',
  warning: 'bg-tool-amber',
  error: 'bg-tool-red',
  neutral: 'bg-muted-foreground',
};

/** A small colored status indicator on a nav row. The `label` (when set) is folded
 *  into the row's accessible name; `pulse` adds an animated ping ring. */
export interface NavItemStatus {
  tone: NavStatusTone;
  /** Short status word ("Working", "Failed"). Shown as muted text and announced. */
  label?: string;
  /** Animated ping ring (disabled under prefers-reduced-motion). */
  pulse?: boolean;
}

export interface KaiNavItem {
  id: string;
  label?: string;
  /** Leading icon: a named icon, an image URL / data-URI, or plain text. */
  icon?: string;
  /** Trailing text pill (e.g. "Beta"). */
  badge?: string;
  /** Trailing icon (a named icon), e.g. an edit/compose affordance. */
  trailing?: string;
  disabled?: boolean;
  /** Nested items. When present, the row becomes a collapsible group: a parent
   *  row with a disclosure chevron over an indented child list. Recurses for
   *  arbitrary depth (primarily 2 levels, e.g. project -> threads). */
  children?: KaiNavItem[];
  /** A small colored status dot (+ optional label) on the row. */
  status?: NavItemStatus;
  /** Right-aligned muted trailing text (e.g. a relative time, "24d ago").
   *  Distinct from `trailing` (a hover icon). */
  meta?: string;
}

export interface NavProps extends JSX.HTMLAttributes<HTMLElement> {
  items?: KaiNavItem[];
  /** Active item id (drives aria-current + the selected look). */
  value?: string;
  onItemSelect?: (id: string) => void;
  /** Ids of group items collapsed on first render. Groups default to expanded. */
  defaultCollapsed?: string[];
}

export function Nav(props: NavProps) {
  const [local, rest] = splitProps(props, [
    'items', 'value', 'onItemSelect', 'defaultCollapsed', 'class',
  ]);

  // Groups default to expanded; `defaultCollapsed` seeds the closed set. Using a
  // Set keyed by item id keeps expand state independent of the items reference,
  // so late-arriving items (the element sets `items` post-construction) are open.
  const [collapsed, setCollapsed] = createSignal<Set<string>>(
    new Set(local.defaultCollapsed ?? []),
    { equals: false },
  );
  const isExpanded = (id: string) => !collapsed().has(id);
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav {...rest} class={cn('flex flex-col gap-0.5', local.class)}>
      <NavRows
        items={local.items ?? []}
        depth={0}
        value={local.value}
        onItemSelect={local.onItemSelect}
        isExpanded={isExpanded}
        toggle={toggle}
      />
    </nav>
  );
}

interface NavRowsProps {
  items: KaiNavItem[];
  depth: number;
  value?: string;
  onItemSelect?: (id: string) => void;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
}

/** Render one nesting level. Recurses through `children`. */
function NavRows(props: NavRowsProps) {
  // When a level has any groups, every row reserves a chevron-width disclosure
  // column (chevron for groups, a spacer for leaves) so icons/labels line up.
  const hasGroups = () => props.items.some((i) => (i.children?.length ?? 0) > 0);
  return (
    <For each={props.items}>
      {(item) => {
        const isGroup = () => (item.children?.length ?? 0) > 0;
        const expanded = () => props.isExpanded(item.id);
        const active = () => props.value === item.id;
        const tone = () => item.status?.tone ?? 'neutral';
        // Fold the status word + meta into the accessible name so AT gets them
        // (the dot/label/meta nodes are aria-hidden to avoid double-announcing).
        const ariaLabel = () => {
          if (!item.status?.label && !item.meta) return undefined;
          return [item.label, item.status?.label, item.meta].filter(Boolean).join(', ');
        };
        const onClick = () => {
          if (item.disabled) return;
          if (isGroup()) props.toggle(item.id);
          else props.onItemSelect?.(item.id);
        };
        // Native buttons handle Enter/Space; add ArrowRight/Left for tree parity.
        const onKeyDown = (e: KeyboardEvent) => {
          if (!isGroup() || item.disabled) return;
          if (e.key === 'ArrowRight' && !expanded()) { e.preventDefault(); props.toggle(item.id); }
          else if (e.key === 'ArrowLeft' && expanded()) { e.preventDefault(); props.toggle(item.id); }
        };
        return (
          <>
            <button
              part="item"
              type="button"
              disabled={item.disabled}
              aria-current={active() ? 'page' : undefined}
              aria-expanded={isGroup() ? expanded() : undefined}
              aria-label={ariaLabel()}
              onClick={onClick}
              onKeyDown={onKeyDown}
              style={props.depth > 0 ? { 'padding-left': `${10 + props.depth * 16}px` } : undefined}
              class={cn(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                active() && 'bg-accent font-medium text-foreground',
              )}
            >
              <Show
                when={isGroup()}
                fallback={hasGroups() ? <span class="size-4 shrink-0" aria-hidden="true" /> : null}
              >
                <span
                  part="chevron"
                  aria-hidden="true"
                  class={cn('flex shrink-0 items-center opacity-60 transition-transform', expanded() && 'rotate-90')}
                >
                  <ChevronRight size={16} />
                </span>
              </Show>
              <Show when={item.icon}>{renderIcon(item.icon, { class: 'size-4 shrink-0' })}</Show>
              <span class="min-w-0 flex-1 truncate">{item.label}</span>
              <Show when={item.status}>
                <span part="status" class="flex shrink-0 items-center gap-1.5" aria-hidden="true">
                  <span class="relative inline-flex">
                    <Show when={item.status!.pulse}>
                      <span
                        class={cn(
                          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:hidden',
                          STATUS_DOT_BG[tone()],
                        )}
                      />
                    </Show>
                    <span class={cn('relative inline-block size-2 rounded-full', STATUS_DOT_BG[tone()])} />
                  </span>
                  <Show when={item.status!.label}>
                    <span class="text-xs text-muted-foreground">{item.status!.label}</span>
                  </Show>
                </span>
              </Show>
              <Show when={item.meta}>
                <span part="meta" class="shrink-0 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                  {item.meta}
                </span>
              </Show>
              <Show when={item.badge}>
                <Badge variant="default" class="px-1.5 py-0 text-[0.625rem] font-medium uppercase tracking-wide">{item.badge}</Badge>
              </Show>
              <Show when={item.trailing}>{renderIcon(item.trailing, { class: 'size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60' })}</Show>
            </button>
            <Show when={isGroup() && expanded()}>
              <div part="group" role="group">
                <NavRows
                  items={item.children!}
                  depth={props.depth + 1}
                  value={props.value}
                  onItemSelect={props.onItemSelect}
                  isExpanded={props.isExpanded}
                  toggle={props.toggle}
                />
              </div>
            </Show>
          </>
        );
      }}
    </For>
  );
}
