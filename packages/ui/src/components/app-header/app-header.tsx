/**
 * `AppHeader`, the workspace's app-level top bar: a top-level strip ABOVE the split (a
 * sibling of `WorkspaceShell`, not inside it), so it persists through the work surface's
 * Expand toggle. It does NOT replace `ChatThread`'s own header row; both ship together.
 *
 * The arrangement is NOT configurable, deliberately: title on the left, a utility cluster
 * (search, theme toggle), a divider, the header actions row, another divider, then the
 * compact user cluster (initials avatar and chevron only, with the name and plan still
 * feeding the initials and the accessible name). Dividers render only between two groups
 * that both have visible content, so switching one off leaves no orphan divider.
 *
 * MENU HONESTY: an affordance with nothing behind it must not render. `showSearch` without
 * `onSearch`, `actions` without `onActionSelect`, `user` without `onUserMenuSelect` and
 * `showThemeToggle` without `onToggleDark` each render NOTHING rather than a control that
 * swallows its own click.
 *
 * The theme toggle is icon-only, showing the icon for the mode you would switch TO, and
 * `dark` is CONTROLLED: the host flips it and this component only reports the click. The
 * strip paints its own `bg-background` so it does not depend on its host for a floor.
 */
import { type JSX, Show, For } from 'solid-js';
import { Search, Sun, Moon, ChevronDown, Settings, CircleHelp, LogOut } from 'lucide-solid';
import { cn } from '../../utils/cn';
import { Button } from '../button/button';
import { Separator } from '../separator/separator';
import { Tooltip } from '../tooltip/tooltip';
import { Avatar } from '../avatar/avatar';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '../dropdown/dropdown';
import type { ButtonVariantName } from '../button/button-variant-names';

/** One header action button. `variant` is the kit Button's OWN variant name:
 *  the construct schema's `header.actions[].variant` enum is built from the
 *  same `BUTTON_VARIANT_NAMES` list, so there is no second vocabulary here to
 *  keep in step. */
export interface AppHeaderAction {
  label: string;
  variant?: ButtonVariantName;
}

/** The user menu's fixed recipe rows. A closed union rather than an authored
 *  list: a construct has no app code to run a custom row, so offering one
 *  would be the dead affordance this component's doc comment rejects. */
export type AppHeaderUserMenuItem = 'settings' | 'help' | 'log-out';

const USER_MENU_ITEMS: readonly {
  id: AppHeaderUserMenuItem;
  label: string;
  Icon: typeof Settings;
  separatorBefore?: boolean;
}[] = [
  { id: 'settings', label: 'Settings', Icon: Settings },
  { id: 'help', label: 'Get help', Icon: CircleHelp },
  { id: 'log-out', label: 'Log out', Icon: LogOut, separatorBefore: true },
];

export interface AppHeaderProps {
  /** Rendered on the left; absent or empty renders no title and no gap. */
  title?: string;

  /** Shows the search affordance, only when `onSearch` is also given. */
  showSearch?: boolean;
  /** Fires when the search affordance is used; both real call sites open the command palette. */
  onSearch?: () => void;

  /** Shows the theme toggle, only when `onToggleDark` is also given. */
  showThemeToggle?: boolean;
  /** Resolved mode, controlled here; drives the icon and the accessible name. */
  dark?: boolean;
  onToggleDark?: () => void;

  /** The ordered action row, rendered only when `onActionSelect` is given. */
  actions?: readonly AppHeaderAction[];
  onActionSelect?: (action: AppHeaderAction) => void;

  // `name` feeds the initials and the accessible name; `plan` only the accessible
  // name, since the compact cluster shows no text.
  /** The signed-in user, rendered only when `onUserMenuSelect` is given. */
  user?: { name: string; plan?: string };
  onUserMenuSelect?: (item: AppHeaderUserMenuItem) => void;

  class?: string;
}

export function AppHeader(props: AppHeaderProps): JSX.Element {
  const searchVisible = (): boolean => !!props.showSearch && !!props.onSearch;
  const themeVisible = (): boolean => !!props.showThemeToggle && !!props.onToggleDark;
  const utilityVisible = (): boolean => searchVisible() || themeVisible();
  const actionsVisible = (): boolean => !!props.actions?.length && !!props.onActionSelect;
  const userVisible = (): boolean => !!props.user && !!props.onUserMenuSelect;

  const themeLabel = (): string => (props.dark ? 'Switch to light mode' : 'Switch to dark mode');
  const userLabel = (): string => {
    const user = props.user;
    if (!user) return 'Account menu';
    return `${user.name}${user.plan ? `, ${user.plan}` : ''} account menu`;
  };

  return (
    <header
      class={cn(
        'flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4',
        props.class,
      )}
      data-kai-app-header
    >
      <div class="flex min-w-0 items-center gap-2">
        <Show when={props.title}>
          <span class="truncate text-sm font-semibold text-foreground" data-kai-app-header-title>
            {props.title}
          </span>
        </Show>
      </div>

      <div class="flex items-center gap-2">
        <Show when={utilityVisible()}>
          <div class="flex items-center gap-1" data-kai-app-header-utility>
            <Show when={searchVisible()}>
              <Tooltip content="Search commands">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Search commands"
                  onClick={() => props.onSearch?.()}
                >
                  <Search size={14} aria-hidden="true" />
                </Button>
              </Tooltip>
            </Show>
            <Show when={themeVisible()}>
              <Tooltip content={themeLabel()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={themeLabel()}
                  onClick={() => props.onToggleDark?.()}
                >
                  {props.dark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
                </Button>
              </Tooltip>
            </Show>
          </div>
        </Show>

        <Show when={utilityVisible() && (actionsVisible() || userVisible())}>
          <Separator orientation="vertical" class="h-5" />
        </Show>

        <Show when={actionsVisible()}>
          <div class="flex items-center gap-2" data-kai-app-header-actions>
            <For each={props.actions}>
              {(action) => (
                <Button type="button" variant={action.variant} size="sm" onClick={() => props.onActionSelect?.(action)}>
                  {action.label}
                </Button>
              )}
            </For>
          </div>
        </Show>

        <Show when={actionsVisible() && userVisible()}>
          <Separator orientation="vertical" class="h-5" />
        </Show>

        <Show when={userVisible()}>
          <Dropdown>
            <DropdownTrigger
              as={(triggerProps: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => (
                <button
                  type="button"
                  aria-label={userLabel()}
                  class="flex min-w-0 items-center gap-2 rounded-md p-1 text-left hover:bg-muted"
                  data-kai-app-header-user
                  {...triggerProps}
                >
                  <Avatar fallback={props.user!.name.slice(0, 2).toUpperCase()} size="sm" />
                  <ChevronDown size={13} class="shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              )}
            />
            <DropdownContent>
              <For each={USER_MENU_ITEMS}>
                {(item) => (
                  <>
                    <Show when={item.separatorBefore}>
                      <DropdownSeparator />
                    </Show>
                    <DropdownItem onSelect={() => props.onUserMenuSelect?.(item.id)}>
                      <item.Icon size={14} class="mr-2 size-3.5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </DropdownItem>
                  </>
                )}
              </For>
            </DropdownContent>
          </Dropdown>
        </Show>
      </div>
    </header>
  );
}
