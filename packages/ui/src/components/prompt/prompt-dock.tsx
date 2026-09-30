import { type JSX, createEffect, createMemo, createSignal, on, onCleanup, onMount } from 'solid-js';
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

/** Slide duration for a band opening, closing or resizing. */
const BAND_MS = 180;

/**
 * One animated band. The wrapper clips and owns the height; the measured child holds the
 * content plus the tray gap on its inner edge, so a closed band takes no space at all
 * (the tray has no flex gap of its own). Height comes from the content's `scrollHeight`,
 * re-read by a ResizeObserver while open, so content that grows (a panel switching tabs)
 * animates to its new height instead of clipping. Reduced motion zeroes the duration.
 * The last content stays mounted for the length of the closing slide.
 */
function Band(props: {
  name: 'top' | 'bottom';
  content: JSX.Element;
  class?: string;
}) {
  // One evaluation of the content prop: it may build DOM, so it is read exactly once.
  const content = createMemo(() => props.content);
  const open = () => !!content();
  // Keep the last content mounted while the band slides shut, so it fades out rather
  // than collapsing blank. Dropped once the slide has finished.
  const [held, setHeld] = createSignal<JSX.Element>(undefined);
  let release: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const c = content();
    clearTimeout(release);
    if (c) setHeld(() => c);
    else release = setTimeout(() => setHeld(undefined), BAND_MS + 60);
  });
  onCleanup(() => clearTimeout(release));
  const [height, setHeight] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  const [reduced, setReduced] = createSignal(false);
  let wrapper!: HTMLDivElement;
  let measured!: HTMLDivElement;

  const measure = () => setHeight(measured.scrollHeight);

  onMount(() => {
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
    if (mq) {
      setReduced(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener?.('change', onChange);
      onCleanup(() => mq.removeEventListener?.('change', onChange));
    }
    // A band that is already open on first paint must not animate in from nothing.
    measure();
    // Bound at setup: a teardown path must not resolve a DOM global by bare name.
    const cancel = cancelAnimationFrame;
    const raf = requestAnimationFrame(() => setReady(true));
    onCleanup(() => cancel(raf));
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => {
        if (open()) measure();
      });
      ro.observe(measured);
      onCleanup(() => ro.disconnect());
    }
  });
  // The content mounts in the same flush as the state change, so this reads the new height.
  createEffect(on(open, (o) => { if (o) measure(); }, { defer: true }));
  createEffect(() => {
    // Closed bands keep focusable content out of the tab order.
    if (open()) wrapper.removeAttribute('inert');
    else wrapper.setAttribute('inert', '');
  });

  return (
    <div
      ref={wrapper}
      data-dock-band={props.name}
      data-state={open() ? 'open' : 'closed'}
      aria-hidden={open() ? undefined : 'true'}
      style={{
        overflow: 'hidden',
        height: open() ? (height() > 0 ? `${height()}px` : 'auto') : '0px',
        opacity: open() ? '1' : '0',
        'transition-property': ready() ? 'height, opacity' : 'none',
        'transition-duration': reduced() ? '0s' : `${BAND_MS}ms`,
        'transition-timing-function': 'ease-out',
      }}
    >
      <div
        ref={measured}
        style={{ [props.name === 'top' ? 'padding-bottom' : 'padding-top']: '0.375rem' }}
      >
        {/* Literal `part` values: the parts registry checks the source for them. */}
        {props.name === 'top' ? (
          <div part="top" class={cn(LIP_BASE, props.class)}>{content() ?? held()}</div>
        ) : (
          <div part="bottom" class={cn(LIP_BASE, props.class)}>{content() ?? held()}</div>
        )}
      </div>
    </div>
  );
}

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
      // flex stays in a class (the band gap lives inside each band, so a closed band is free).
      class={cn('flex flex-col', props.class)}
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
      <Band name="top" content={props.top} class={props.topClass} />
      {props.children}
      <Band name="bottom" content={props.bottom} class={props.bottomClass} />
    </div>
  );
}
