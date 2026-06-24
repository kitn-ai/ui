import type { Component, JSX } from 'solid-js';
import {
  Plus, Paperclip, Github, Globe, Sparkles, Settings,
  FileText, Folder, Monitor, MessageCircle, Search,
} from 'lucide-solid';

type IconComponent = Component<{ class?: string }>;

/** Curated name → lucide-solid component map for item icons in kai-menu /
 *  kai-command. Extend here when new named icons are needed. */
const NAMED_ICONS: Record<string, IconComponent> = {
  plus: Plus,
  paperclip: Paperclip,
  github: Github,
  globe: Globe,
  sparkles: Sparkles,
  settings: Settings,
  'file-text': FileText,
  folder: Folder,
  monitor: Monitor,
  'message-circle': MessageCircle,
  search: Search,
};

/** Render an item icon.
 *
 *  Resolution order:
 *  1. Known icon name (e.g. `"paperclip"`) → lucide-solid component.
 *  2. URL / absolute path / data-URI → `<img>`.
 *  3. Anything else → `<span>` text fallback.
 *  Returns `null` when `icon` is undefined/empty.
 *
 *  The img and span branches render different markup, so they accept different
 *  class options: `imgClass` for the `<img>`, `spanClass` for the `<span>`.
 *  `class` is a shared fallback. Pass `ariaHidden` to mark the span decorative. */
export function renderIcon(
  icon: string | undefined,
  opts?: { class?: string; imgClass?: string; spanClass?: string; ariaHidden?: boolean },
): JSX.Element {
  if (!icon) return null;
  const Named = NAMED_ICONS[icon];
  if (Named) {
    return <Named class={opts?.imgClass ?? opts?.class ?? 'mr-2 size-4 shrink-0'} />;
  }
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
