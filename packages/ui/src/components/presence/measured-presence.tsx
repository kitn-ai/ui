import { type JSX, createEffect, createMemo, createSignal, on, onCleanup, onMount, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';

/** Slide duration for a region opening, closing or resizing. */
export const PRESENCE_MS = 180;

/** Whether a region is driven by a prop rather than by content occupancy. `flagOn` is the
 *  element's `flag()`: a bare attribute parses to an `undefined` prop, so presence has to
 *  count as set too. Removing the attribute resets the prop to `undefined` (the declared
 *  default), which returns the region to occupancy. */
export function isPresenceControlled(value: unknown, flagOn: boolean): boolean {
  return value !== undefined || flagOn;
}

export interface MeasuredPresenceProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'style'> {
  // Set `false` while the content is still mounted to slide it shut with the content
  // fading; drop the content afterwards.
  /** Drives presence directly, overriding the occupancy rule (open while there is content). */
  open?: boolean;
  /** The content. Read once; it may build DOM. */
  children?: JSX.Element;
  /** Extra classes for the clipping wrapper, the element that owns the height. */
  class?: string;
  /** Extra classes for the measured element inside the wrapper. */
  contentClass?: string;
  /** Inline style for the measured element inside the wrapper (the dock puts its tray gap here). */
  contentStyle?: JSX.CSSProperties;
}

/**
 * A region that grows from nothing to its content's height, and back.
 *
 * The wrapper clips and owns the height; the measured child holds the content, so a
 * closed region takes no space at all (it carries no padding, gap or border of its
 * own). Height comes from the content's `scrollHeight`, re-read by a ResizeObserver
 * while open, so content that grows (a panel switching tabs) animates to its new height
 * instead of clipping. The first paint does not animate: a region that is already open
 * when it mounts appears in place. Reduced motion zeroes the duration, so the same
 * changes are instant. The last content stays mounted for the length of the closing
 * slide, so it fades out rather than collapsing blank, and a closed region is `inert`
 * so its focusable content leaves the tab order.
 */
export function MeasuredPresence(props: MeasuredPresenceProps) {
  const [local, rest] = splitProps(props, ['open', 'children', 'class', 'contentClass', 'contentStyle']);
  // One evaluation of the content prop: it may build DOM, so it is read exactly once.
  const content = createMemo(() => local.children);
  const open = () => local.open ?? !!content();
  // Keep the last content mounted while the region slides shut. Dropped once the slide
  // has finished.
  const [held, setHeld] = createSignal<JSX.Element>(undefined);
  let release: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const c = content();
    clearTimeout(release);
    if (c) setHeld(() => c);
    else release = setTimeout(() => setHeld(undefined), PRESENCE_MS + 60);
  });
  onCleanup(() => clearTimeout(release));
  const [height, setHeight] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  // True from the first frame when the region was ALREADY open but had no measurement yet,
  // until that measurement lands. A custom element's content can be assigned a beat after
  // it mounts (the slot is attached to the shadow root after the first render), so
  // "open at first paint" can be measured a frame late; that late measurement is still
  // the first paint's, and must not slide in.
  const [settling, setSettling] = createSignal(false);
  const [reduced, setReduced] = createSignal(false);
  let wrapper!: HTMLDivElement;
  let measured!: HTMLDivElement;

  // Bound at setup: a teardown path must not resolve a DOM global by bare name. Guarded
  // because setup is the component body and a server render runs component bodies, where
  // Node has no cancelAnimationFrame (and nothing can be scheduled to cancel).
  const cancel = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame.bind(globalThis)
    : () => {};
  let settle = 0;
  // Transitions are on once the first frame has passed and nothing is waiting on its first measurement.
  const animating = () => ready() && !settling();
  const measure = () => {
    const h = measured.scrollHeight;
    setHeight(h);
    // The measurement a settling region was waiting for: apply it with transitions still
    // off, and switch them on a frame later.
    if (h > 0 && settling() && !settle) settle = requestAnimationFrame(() => { settle = 0; setSettling(false); });
  };
  onCleanup(() => cancel(settle));

  onMount(() => {
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
    if (mq) {
      setReduced(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener?.('change', onChange);
      onCleanup(() => mq.removeEventListener?.('change', onChange));
    }
    // A region that is already open on first paint must not animate in from nothing.
    measure();
    const raf = requestAnimationFrame(() => {
      if (open() && height() === 0) setSettling(true);
      setReady(true);
    });
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
    // Closed regions keep focusable content out of the tab order.
    if (open()) wrapper.removeAttribute('inert');
    else wrapper.setAttribute('inert', '');
  });

  return (
    <div
      {...rest}
      ref={wrapper}
      class={local.class}
      data-state={open() ? 'open' : 'closed'}
      aria-hidden={open() ? undefined : 'true'}
      style={{
        overflow: 'hidden',
        // `auto` only while nothing has been measured AND animation is not yet on (first paint,
        // the late measurement of content assigned a beat after mount, or an environment with
        // no layout). Once animating, an open region with no measurement yet is one that is OPENING: it must sit at 0px until the measurement
        // lands in the same flush, because `auto` is not animatable and a transition from
        // 0px to `auto` is a jump to the full height.
        height: open() ? (height() > 0 ? `${height()}px` : animating() ? '0px' : 'auto') : '0px',
        opacity: open() ? '1' : '0',
        'transition-property': animating() ? 'height, opacity' : 'none',
        'transition-duration': reduced() ? '0s' : `${PRESENCE_MS}ms`,
        'transition-timing-function': 'ease-out',
      }}
    >
      <div ref={measured} class={cn(local.contentClass)} style={local.contentStyle}>
        {content() ?? held()}
      </div>
    </div>
  );
}
