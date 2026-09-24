import { defineWebComponent } from '../define/define';
import { Kbd, type KbdPlatform } from '../../components/kbd/kbd';

interface Props extends Record<string, unknown> {
  /** Shortcut spec: tokens joined by `+` (e.g. `Mod+Shift+K`). Omit it to show
   *  default-slot content instead. Display only; the element does not bind keys. */
  keys?: string;
  /** `mac` uses ⌘/⌥, `other` uses Ctrl. `auto` (default) sniffs the OS. */
  platform?: KbdPlatform;
  /** Cap size. Defaults to `md`. */
  size?: 'sm' | 'md';
}

/**
 * A keyboard-shortcut display: one inset cap per key, in the platform's own glyphs.
 */
defineWebComponent<Props>('kai-kbd', {
  keys: undefined,
  platform: 'auto',
  size: 'md',
}, (props) => (
  <>
    {/* Base sets `:host{display:block}`; a shortcut hint flows inline like a chip. */}
    <style>{':host{display:inline-flex}'}</style>
    <Kbd
      keys={props.keys as string | undefined}
      platform={(props.platform as KbdPlatform) ?? 'auto'}
      size={(props.size as 'sm' | 'md') ?? 'md'}
    >
      <slot />
    </Kbd>
  </>
));
