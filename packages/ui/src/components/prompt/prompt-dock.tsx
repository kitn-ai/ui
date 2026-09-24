import { type JSX, Show } from 'solid-js';
import { cn } from '../../utils/cn';

/** How the tray frames the input: the SPATIAL axis (padding/inset only).
 *  Orthogonal to {@link PromptDockAppearance}, which controls the surface.
 *  - `inset` (default): uniform inset frames the input on ALL edges (the classic look).
 *  - `edge`: top/bottom inset only; the input sits FLUSH left/right so the lips span
 *    the full width.
 *  - `none`: no inset at all; the lips attach directly to the input as a plain stack. */
export type PromptDockFrame = 'inset' | 'edge' | 'none';

/** How the tray surface looks: the VISUAL axis (background / border / radius only).
 *  Orthogonal to {@link PromptDockFrame}, which controls the spatial inset. Works like
 *  a button variant.
 *  - `soft` (default): sunken surface + border + radius (the classic look).
 *  - `outlined`: transparent surface + border + radius.
 *  - `filled`: sunken surface, no border, + radius.
 *  - `plain`: transparent surface, no border, no radius (truly bare). */
export type PromptDockAppearance = 'soft' | 'outlined' | 'filled' | 'plain';

export interface PromptDockProps {
  /** Content for the recessed band above the input (a notice, a hint); omitted, no top lip renders. */
  top?: JSX.Element;
  /** Content for the recessed band below the input (a mode or control row); omitted, no bottom lip renders. */
  bottom?: JSX.Element;
  // The eventual `kai-prompt-dock` element exposes this region as `::part(top)`. A
  // tinted notice here leaves the bottom lip alone.
  /** Extra classes for the top lip wrapper, merged over the default band styling. */
  topClass?: string;
  // The eventual `kai-prompt-dock` element exposes this region as `::part(bottom)`.
  /** Extra classes for the bottom lip wrapper, merged over the default band styling. */
  bottomClass?: string;
  /** How the tray frames the input, spatial inset only. Defaults to `'inset'`. */
  frame?: PromptDockFrame;
  /** The tray's surface treatment, independent of the frame. Defaults to `'soft'`. */
  appearance?: PromptDockAppearance;
  /** The prompt input: the raised card that floats on the tray. */
  children: JSX.Element;
  /** Extra classes for the outer tray. */
  class?: string;
}

/** Shared base styling for a lip region; per-region classes append/override it. */
const LIP_BASE = 'px-3 py-2 text-sm leading-snug text-muted-foreground';

/**
 * PromptDock - a recessed tray that frames a prompt input and can extend with optional
 * "lip" regions above and/or below it.
 *
 * The input stays the prominent, fully-rounded RAISED card; the lips sit in a slightly
 * darker, RECESSED band above and/or below it, sharing the tray's outer rounding so the
 * whole thing reads as one control. With nothing slotted, only the input shows.
 *
 * Two ORTHOGONAL axes, so framing and surface are set independently (a button's size vs.
 * its variant). `frame` is the SPATIAL inset: `inset` (default), `edge` (top/bottom only)
 * or `none` (a plain stack). `appearance` is the SURFACE: `soft` (default), `outlined`,
 * `filled` or `plain`, differing in sunken fill, border and radius.
 *
 * Surface, border, radius and inset each come from a CSS custom-property TOKEN, read with a
 * fallback so each resolves stand-alone, which makes the chrome tunable from outside:
 * `--kai-prompt-dock-surface`, `--kai-prompt-dock-border`, `--kai-prompt-dock-radius`
 * (1.25rem) and `--kai-prompt-dock-inset` (0.375rem). `topClass` / `bottomClass` style the
 * two lips independently; the element exposes the same regions as `::part(tray|top|bottom)`.
 */
export function PromptDock(props: PromptDockProps) {
  const frame = (): PromptDockFrame => props.frame ?? 'inset';
  const appearance = (): PromptDockAppearance => props.appearance ?? 'soft';
  // `appearance` drives the surface (background / border / radius); `frame` drives the
  // inset (padding). The two axes are independent.
  const filled = () => appearance() === 'soft' || appearance() === 'filled';
  const bordered = () => appearance() === 'soft' || appearance() === 'outlined';
  return (
    <div
      data-prompt-dock
      part="tray"
      // Surface / border / radius / inset live in the tokenized inline style so the
      // var fallbacks resolve and external overrides win; only the structural
      // flex + gap stay in classes.
      class={cn('flex flex-col gap-1.5', props.class)}
      style={{
        background: filled()
          ? 'var(--kai-prompt-dock-surface, var(--color-surface-sunken))'
          : 'transparent',
        border: bordered()
          ? '1px solid var(--kai-prompt-dock-border, var(--color-border))'
          : '0',
        'border-radius':
          appearance() === 'plain' ? '0' : 'var(--kai-prompt-dock-radius, 1.25rem)',
        padding:
          frame() === 'none'
            ? '0'
            : frame() === 'edge'
              ? 'var(--kai-prompt-dock-inset, 0.375rem) 0'
              : 'var(--kai-prompt-dock-inset, 0.375rem)',
      }}
    >
      <Show when={props.top}>
        <div part="top" class={cn(LIP_BASE, props.topClass)}>{props.top}</div>
      </Show>
      {props.children}
      <Show when={props.bottom}>
        <div part="bottom" class={cn(LIP_BASE, props.bottomClass)}>{props.bottom}</div>
      </Show>
    </div>
  );
}
