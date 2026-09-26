import { Show } from 'solid-js';
import { MoreHorizontal } from 'lucide-solid';
import { Dropdown, DropdownTrigger, DropdownContent, type DropdownController } from '../../components/dropdown/dropdown';
import { renderIcon } from '../../components/icon/icon';
import { cn } from '../../utils/cn';
import { defineWebComponent } from '../define/define';
import { wireDisclosure } from '../disclosure/disclosure';

interface Props extends Record<string, unknown> {
  /** Built-in trigger: leading icon (a named icon like `"plus"`, an image
   *  URL/data-URI, or text). A slotted `slot="trigger"` overrides it. */
  triggerIcon?: string;
  // This is the trigger's VISIBLE text, so it is also its accessible name, and `label`
  // does not override it: an accessible name that does not contain the visible text is
  // unreachable by speech input (WCAG 2.5.3, Label in Name). Same rule `kai-menu` follows.
  /** Built-in trigger: a text label. */
  triggerLabel?: string;
  /** Built-in trigger: a trailing icon (e.g. `"chevron-down"` for a select look). */
  triggerIconTrailing?: string;
  // It DOES name a slotted `slot="trigger"`, which is VISUAL content with the name
  // supplied separately: the same two-slot distinction `kai-menu` documents.
  /** Accessible name for a trigger with no visible label. Ignored when `triggerLabel` is set. */
  label?: string;
  /** Stretch the trigger to the full width of its container (a block row).
   *  Attribute: `full`. */
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

/** Events fired by `<kai-dropdown>`. */
interface Events {
  /** The menu opened or closed (click, keyboard, Escape, outside-click, or a method). */
  'kai-open-change': { open: boolean };
}

/**
 * A trigger with a floating surface you fill with your own markup. `kai-menu` is the
 * same surface driven by an item list.
 */
defineWebComponent<Props, Events>('kai-dropdown', {
  triggerIcon: undefined,
  triggerLabel: undefined,
  triggerIconTrailing: undefined,
  label: undefined,
  full: false,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
}, (props, ctx) => {
  const { flag } = ctx;
  let api: DropdownController | undefined;

  // The standard overlay surface: settable+reflecting `open`, kai-open-change,
  // show/hide/toggle, disabled-gating. See ./disclosure.
  wireDisclosure(ctx, () => api, () => props.open);

  return (
    <>
      {/* The host shrinks to the trigger by default (UA inline); `full` makes it a
          block whose trigger fills the width — the kai-button/kai-menu pattern. */}
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
          // A visible `triggerLabel` IS the name, so `label` must not be layered
          // over it: aria-label REPLACES the computed name, locking speech-input
          // users out (WCAG 2.5.3). Same rule kai-menu and kai-button follow.
          aria-label={props.triggerLabel ? undefined : (props.label ?? 'Open menu')}
        >
          <slot name="trigger">
            <Show when={props.triggerIcon}>{renderIcon(props.triggerIcon, { class: 'size-4 shrink-0' })}</Show>
            <Show when={props.triggerLabel}>{props.triggerLabel}</Show>
            <Show when={props.triggerIconTrailing}>{renderIcon(props.triggerIconTrailing, { class: 'size-3.5 shrink-0 opacity-60' })}</Show>
            <Show when={!props.triggerIcon && !props.triggerLabel}><MoreHorizontal class="size-4" /></Show>
          </slot>
        </DropdownTrigger>
        <DropdownContent class="min-w-[10rem]">
          <slot />
        </DropdownContent>
      </Dropdown>
    </>
  );
});
