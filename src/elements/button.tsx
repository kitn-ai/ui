import { Show } from 'solid-js';
import { Button } from '../ui/button';
import { renderIcon } from '../ui/icon';
import { defineWebComponent } from './define';

interface Props extends Record<string, unknown> {
  /** Visual style. `default` (filled), `subtle` (muted text, hover tint — the
   *  toolbar icon look), `ghost` (transparent, hover fill), `outline`, or
   *  `destructive`. Defaults to `default`. */
  variant?: 'default' | 'subtle' | 'ghost' | 'outline' | 'destructive';
  /** Size token. `icon` / `icon-sm` are square (for icon-only buttons); `sm` /
   *  `md` / `lg` size text buttons. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  /** Leading icon: a named icon (e.g. `"mic"`, `"plus"`), an image URL/data-URI,
   *  or plain text. Renders before any slotted label. */
  icon?: string;
  /** Trailing icon, after the label (e.g. `"chevron-down"` for a menu affordance). */
  iconTrailing?: string;
  /** Accessible name. REQUIRED for icon-only buttons (no visible text); ignored
   *  when you slot visible text, which already names the button. */
  label?: string;
  /** Disable the button (non-interactive, dimmed). */
  disabled?: boolean;
  /** Native button `type`. Defaults to `button` (so it never submits a form). */
  type?: 'button' | 'submit' | 'reset';
}

/** Events fired by `<kai-button>`. */
interface Events {
  /** The button was activated (pointer or keyboard). Carries no detail. The
   *  native `click` also bubbles (composed) for consumers who prefer it. */
  'kai-click': void;
}

/**
 * `<kai-button>` — the kit's button as a drop-in element, so consumers compose
 * polished, theme-aware controls instead of hand-rolling `<button>` + inline
 * hover styles. Put the label as light-DOM text; use `icon` for a leading glyph
 * and `label` to name an icon-only button.
 *
 * ```html
 * <kai-button variant="subtle" size="icon" icon="mic" label="Voice input"></kai-button>
 * <kai-button variant="ghost" icon-trailing="chevron-down">High</kai-button>
 * <kai-button>Send</kai-button>
 * <kai-button label="Ship"><svg slot="icon" viewBox="0 0 24 24">…</svg></kai-button>
 * ```
 *
 * The `icon` prop renders a curated/URL icon; for anything else, slot your own
 * inline SVG via `slot="icon"` (it wins over `icon`). Restyle via `::part(button)`.
 * Emits `kai-click`.
 */
defineWebComponent<Props, Events>('kai-button', {
  variant: 'default',
  size: 'md',
  icon: undefined,
  iconTrailing: undefined,
  label: undefined,
  disabled: false,
  type: 'button',
}, (props, { dispatch, flag }) => {
  return (
    <Button
      part="button"
      variant={props.variant ?? 'default'}
      size={props.size ?? 'md'}
      type={props.type ?? 'button'}
      disabled={flag('disabled')}
      aria-label={props.label}
      onClick={() => dispatch('kai-click')}
    >
      {/* Leading icon: a slotted SVG (slot="icon") wins — drop in any icon
          library or your own; otherwise the `icon` prop renders a curated/URL one. */}
      <slot name="icon">
        <Show when={props.icon}>
          {renderIcon(props.icon, { class: 'size-4 shrink-0', imgClass: 'size-4 shrink-0', spanClass: 'inline-flex size-4 shrink-0 items-center justify-center', ariaHidden: true })}
        </Show>
      </slot>
      <slot />
      <Show when={props.iconTrailing}>
        {renderIcon(props.iconTrailing, { class: 'size-4 shrink-0 opacity-60', imgClass: 'size-4 shrink-0', spanClass: 'inline-flex size-4 shrink-0 items-center justify-center', ariaHidden: true })}
      </Show>
    </Button>
  );
});
