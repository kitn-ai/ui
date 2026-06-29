import { For, Show } from 'solid-js';
import { MoreHorizontal } from 'lucide-solid';
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownSeparator, DropdownLabel, DropdownCheckboxItem, DropdownRadioItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
  type DropdownController,
} from '../ui/dropdown';
import { renderIcon } from '../ui/icon';
import { Kbd } from '../ui/kbd';
import { cn } from '../utils/cn';
import { defineWebComponent } from './define';
import { wireDisclosure } from './disclosure';

export interface KaiMenuItem {
  /** Emitted in `kai-select` for actionable items. */
  id?: string;
  label?: string;
  /** Named icon (e.g. "paperclip"), image URL / data-URI, or plain text. */
  icon?: string;
  /** e.g. '⌘U' — shown right-aligned, muted. */
  shortcut?: string;
  /** Presence ⇒ a checkbox item (role=menuitemcheckbox). With `radioGroup` set,
   *  marks the SELECTED radio item in that group instead. */
  checked?: boolean;
  /** Membership in a single-select group (role=menuitemradio). Items sharing a
   *  `radioGroup` are mutually exclusive — the one with `checked: true` shows the
   *  checkmark; selecting one emits `{ id, radioGroup }` so the consumer moves
   *  the checkmark (the consumer owns state, like checkbox items). */
  radioGroup?: string;
  disabled?: boolean;
  /** A divider (ignores other fields). */
  separator?: boolean;
  /** A non-interactive section label (uses `label`). */
  heading?: boolean;
  /** ⇒ a submenu. */
  items?: KaiMenuItem[];
}

interface Props extends Record<string, unknown> {
  /** Tree of menu items. Set as a JS property — not an HTML attribute. */
  items?: KaiMenuItem[];
  /** Optional placement hint (unused by the underlying Dropdown which always
   *  positions bottom-start, kept for future extension). */
  placement?: string;
  /** Built-in trigger: leading icon (a named icon like `"plus"`, an image
   *  URL/data-URI, or text). Use this instead of slotting `slot="trigger"` for
   *  the common case — a slotted trigger overrides it. */
  triggerIcon?: string;
  /** Built-in trigger: a text label (e.g. `"High"`). */
  triggerLabel?: string;
  /** Built-in trigger: a trailing icon (e.g. `"chevron-down"` for a select look). */
  triggerIconTrailing?: string;
  /** Accessible name for an icon-only trigger (no visible label). */
  label?: string;
  /** Drive/observe open state (Shoelace-style: settable + reflected to the `open`
   *  attribute, the menu still self-manages on click/keyboard). Set `el.open = true`,
   *  or `<kai-menu open>`; listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Disable the trigger — click/keyboard and `show()` no longer open the menu. */
  disabled?: boolean;
}

interface Events {
  /**
   * Fired when the user selects a leaf item.
   * - Plain items: `{ id }`.
   * - Checkbox items: `{ id, checked }` where `checked` is the NEW state.
   * - Radio items: `{ id, radioGroup }` — the consumer marks `id` as the selected
   *   one in `radioGroup` and clears the others.
   */
  'kai-select': { id: string; checked?: boolean; radioGroup?: string };
  /** The menu opened or closed (by click, keyboard, Escape, outside-click, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * `<kai-menu>` — a cascading action menu driven by a JSON items-tree.
 *
 * Set the `items` property in JavaScript (array, not attribute). The trigger
 * is slotted — put your icon/button content in `slot="trigger"`:
 *
 * ```html
 * <kai-menu>
 *   <button slot="trigger" aria-label="Open menu">+</button>
 * </kai-menu>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 *   const menu = document.querySelector('kai-menu');
 *   menu.items = [
 *     { heading: true, label: 'Actions' },
 *     { id: 'attach', label: 'Add files', icon: 'paperclip', shortcut: 'Mod+U' },
 *   ];
 *   menu.addEventListener('kai-select', (e) => console.log(e.detail));
 * </script>
 * ```
 */
defineWebComponent<Props, Events>('kai-menu', {
  items: undefined,
  placement: undefined,
  triggerIcon: undefined,
  triggerLabel: undefined,
  triggerIconTrailing: undefined,
  label: undefined,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { dispatch, flag } = ctx;
  let api: DropdownController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  function renderItems(items: KaiMenuItem[]) {
    return (
      <For each={items}>
        {(item) => {
          if (item.separator) {
            return <DropdownSeparator />;
          }
          if (item.heading) {
            return <DropdownLabel>{item.label}</DropdownLabel>;
          }
          if (item.items && item.items.length > 0) {
            return (
              <DropdownSub>
                <DropdownSubTrigger>
                  <Show when={item.icon}>{renderIcon(item.icon, { imgClass: 'mr-2 size-4 shrink-0', spanClass: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm' })}</Show>
                  {item.label}
                </DropdownSubTrigger>
                <DropdownSubContent>
                  {renderItems(item.items)}
                </DropdownSubContent>
              </DropdownSub>
            );
          }
          if (item.radioGroup !== undefined) {
            return (
              <DropdownRadioItem
                checked={item.checked}
                disabled={item.disabled}
                onSelect={() => {
                  if (item.id) dispatch('kai-select', { id: item.id, radioGroup: item.radioGroup });
                }}
              >
                <Show when={item.icon}>{renderIcon(item.icon, { imgClass: 'mr-2 size-4 shrink-0', spanClass: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm' })}</Show>
                {item.label}
              </DropdownRadioItem>
            );
          }
          if (item.checked !== undefined) {
            return (
              <DropdownCheckboxItem
                checked={item.checked}
                disabled={item.disabled}
                onSelect={() => {
                  if (item.id) dispatch('kai-select', { id: item.id, checked: !item.checked });
                }}
              >
                <Show when={item.icon}>{renderIcon(item.icon, { imgClass: 'mr-2 size-4 shrink-0', spanClass: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm' })}</Show>
                {item.label}
              </DropdownCheckboxItem>
            );
          }
          return (
            <DropdownItem
              disabled={item.disabled}
              onSelect={() => { if (item.id) dispatch('kai-select', { id: item.id }); }}
            >
              <Show when={item.icon}>{renderIcon(item.icon, { imgClass: 'mr-2 size-4 shrink-0', spanClass: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-sm' })}</Show>
              {item.label}
              <Show when={item.shortcut}>
                <span part="shortcut" class="ml-auto pl-4 text-muted-foreground">
                  <Kbd keys={item.shortcut!} platform="auto" size="sm" />
                </span>
              </Show>
            </DropdownItem>
          );
        }}
      </For>
    );
  }

  return (
    <Dropdown
      defaultOpen={flag('defaultOpen')}
      disabled={flag('disabled')}
      controllerRef={(a) => (api = a)}
    >
      <DropdownTrigger
        class={cn(
          'inline-flex items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          props.triggerLabel
            ? 'gap-1.5 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground'
            : 'justify-center p-1.5 text-foreground hover:bg-muted',
        )}
        aria-label={props.label ?? (props.triggerLabel ? undefined : 'Open menu')}
      >
        {/* Slotted trigger wins; otherwise build one from the trigger* props;
            otherwise fall back to a "more" glyph. */}
        <slot name="trigger">
          <Show when={props.triggerIcon}>{renderIcon(props.triggerIcon, { class: 'size-4 shrink-0' })}</Show>
          <Show when={props.triggerLabel}>{props.triggerLabel}</Show>
          <Show when={props.triggerIconTrailing}>{renderIcon(props.triggerIconTrailing, { class: 'size-3.5 shrink-0 opacity-60' })}</Show>
          <Show when={!props.triggerIcon && !props.triggerLabel}><MoreHorizontal class="size-4" /></Show>
        </slot>
      </DropdownTrigger>
      <DropdownContent class="min-w-[15rem]">
        {renderItems((props.items as KaiMenuItem[] | undefined) ?? [])}
      </DropdownContent>
    </Dropdown>
  );
});
