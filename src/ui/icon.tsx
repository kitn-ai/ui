import type { JSX } from 'solid-js';

/** Render an item icon: a URL / absolute path / data-URI becomes an <img>;
 *  anything else (emoji or short text) becomes a <span>. null when no icon.
 *
 *  The two branches render different markup, so they take different classes:
 *  `imgClass` for the <img>, `spanClass` for the emoji/text <span>. `class`
 *  is a shared fallback for either when its specific class isn't given.
 *  Pass `ariaHidden` to mark the text/emoji <span> decorative. */
export function renderIcon(
  icon: string | undefined,
  opts?: { class?: string; imgClass?: string; spanClass?: string; ariaHidden?: boolean },
): JSX.Element {
  if (!icon) return null;
  const isUrl = /^(https?:|\/|data:)/.test(icon);
  return isUrl
    ? <img src={icon} alt="" class={opts?.imgClass ?? opts?.class ?? 'size-4 shrink-0'} />
    : (
      <span
        class={opts?.spanClass ?? opts?.class ?? 'size-4 shrink-0'}
        aria-hidden={opts?.ariaHidden ? 'true' : undefined}
      >
        {icon}
      </span>
    );
}
