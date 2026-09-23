import { For, Show } from 'solid-js';
import { MoreHorizontal } from 'lucide-solid';
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownSeparator, DropdownLabel, DropdownCheckboxItem, DropdownRadioItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
  type DropdownController,
} from '../../components/dropdown/dropdown';
import { renderIcon } from '../../components/icon/icon';
import { Kbd } from '../../components/kbd/kbd';
import { cn } from '../../utils/cn';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';
import type { KaiMenuItem } from '../web-component/web-component-data-types';

// The item shape lives in ./web-component-data-types so the ROOT entry can re-export it
// (a per-web-component module's shipped .d.ts is `export {};`). Re-exported here so
// `import type { KaiMenuItem } from './menu'` keeps working.
export type { KaiMenuItem } from '../web-component/web-component-data-types';

interface Props extends Record<string, unknown> {
  /** Tree of menu items. Set as a JS property, not an HTML attribute. */
  items?: KaiMenuItem[];
  /** Optional placement hint (unused by the underlying Dropdown which always
   *  positions bottom-start, kept for future extension). */
  placement?: string;
  /** Built-in trigger: a leading icon (a named icon, an image URL/data-URI, or text). A slotted trigger overrides it. */
  triggerIcon?: string;
  // This is the trigger's VISIBLE text, so it is also its accessible name, and `label`
  // does not override it: an accessible name that does not contain the visible text is
  // unreachable by speech input, which is what WCAG 2.5.3 (Label in Name) exists for. A
  // slotted `slot="trigger"` replaces this built-in trigger entirely and is named
  // differently; see `label`.
  /** Built-in trigger: a text label. */
  triggerLabel?: string;
  /** Built-in trigger: a trailing icon (e.g. `"chevron-down"` for a select look). */
  triggerIconTrailing?: string;
  // Named separately from the slot, and that is a difference in what the two slots MEAN,
  // not a limitation. `<kai-button>`'s slot IS the button's label, so text slotted there
  // is the name and `label` steps aside. This slot is VISUAL content, a `+` or an `<svg>`,
  // with the name supplied separately: decoration beside a name, never a second name
  // competing with one. So `label` names the trigger here by design.
  //
  // Slotting a real WORD rather than a glyph makes that word a visible label, and an
  // accessible name has to contain the visible text. Then either drop `label` or make it
  // contain the word you slotted.
  /** Accessible name for a trigger with no visible label. Ignored when `triggerLabel` is set. */
  label?: string;
  /** Stretch the trigger to the full width of its container (a block row). Attribute: `full`. */
  full?: boolean;
  // Shoelace-style: settable and reflected to the `open` attribute, while the menu
  // still self-manages on click/keyboard.
  /** Drive/observe the open state: `el.open = true` or the bare `open` attribute. Listen for `kai-open-change`. */
  open?: boolean;
  /** Initial open state on mount (uncontrolled seed). */
  defaultOpen?: boolean;
  /** Disable the trigger: click/keyboard and `show()` no longer open the menu. */
  disabled?: boolean;
}

interface Events {
  // A radio item carries `radioGroup`, and the CONSUMER marks `id` as the selected one in
  // that group and clears the others; the element keeps no radio state of its own.
  /** A leaf item was selected. Plain: `{ id }`; checkbox: `{ id, checked }` with the NEW state; radio: `{ id, radioGroup }`. */
  'kai-select': { id: string; checked?: boolean; radioGroup?: string };
  /** The menu opened or closed (by click, keyboard, Escape, outside-click, or a method). */
  'kai-open-change': { open: boolean };
}
// The element supplies its own trigger button (accessible and keyboard-wired); `slot="trigger"` is
// VISUAL content only (an icon, text, an `<svg>`), never your own `<button>`/`<a>`, which would
// nest interactive elements. Slotting a real word makes it a visible label, and the accessible
// name then has to contain it. Radio items carry no state: the consumer marks the selected `id`
// in the group and clears the others.
/**
 * A cascading action menu driven by an items tree.
 */
defineWebComponent<Props, Events>('kai-menu', {
  items: undefined,
  placement: undefined,
  triggerIcon: undefined,
  triggerLabel: undefined,
  triggerIconTrailing: undefined,
  label: undefined,
  full: false,
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
    <>
      {/* The host shrinks to the trigger by default (UA inline); `full` makes it
          a block whose trigger button fills the width — the kai-button pattern
          (`:host([full])`), for sidebar-footer account rows and other stretched
          placements. */}
      <style>{':host([full]){display:block}'}</style>
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
          flag('full') && 'w-full',
        )}
        // A visible `triggerLabel` IS the name (name-from-contents reaches the
        // slotted/shadow text), so `label` must not be layered over it: aria-label
        // REPLACES the computed name, and a trigger reading "High" that answers to
        // "Reasoning effort" locks speech-input users out (WCAG 2.5.3). Same rule
        // kai-checkpoint and kai-button follow.
        //
        // A SLOTTED trigger keeps `label`, and that is the contract rather than a
        // gap: kai-button's slot IS the label, so text there is the name; this
        // slot is visual content with the name supplied separately. Two slots,
        // two meanings, so the same rule should not apply to both. See `label`.
        aria-label={props.triggerLabel ? undefined : (props.label ?? 'Open menu')}
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
    </>
  );
});
