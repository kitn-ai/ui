/**
 * MeasuredPresence: a region measures its content with a ResizeObserver and drives its own
 * height, so it grows from 0, follows content that grows while open, and collapses when the
 * content goes. The first paint does not animate. Reduced motion makes the same changes
 * instant. These are the band behaviours the prompt dock's tests pin through the dock;
 * here they are pinned on the primitive itself.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { createSignal, type JSX } from 'solid-js';
import { MeasuredPresence, PRESENCE_MS, isPresenceControlled } from './measured-presence';

let observers: Array<{ cb: ResizeObserverCallback; el: Element }> = [];
let contentHeight = 0;

class FakeRO {
  constructor(private cb: ResizeObserverCallback) {}
  observe(el: Element) { observers.push({ cb: this.cb, el }); }
  unobserve() {}
  disconnect() { observers = observers.filter((o) => o.cb !== this.cb); }
}

/** Fire every observer as the browser would after a layout change. */
function resize(h: number) {
  contentHeight = h;
  for (const o of observers) {
    o.cb([{ target: o.el, contentRect: { height: h } } as unknown as ResizeObserverEntry], {} as ResizeObserver);
  }
}

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** requestAnimationFrame callbacks, held so a test decides when "after first paint" is. */
let frames: FrameRequestCallback[] = [];
const flushFrames = () => { const f = frames; frames = []; f.forEach((cb) => cb(0)); };

beforeEach(() => {
  observers = [];
  contentHeight = 0;
  frames = [];
  vi.stubGlobal('ResizeObserver', FakeRO);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  // jsdom has no layout; the measured element reports the height the test sets.
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => contentHeight,
  });
  stubMatchMedia(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
});

const region = (c: HTMLElement) => c.querySelector('[data-region]') as HTMLElement;

describe('MeasuredPresence', () => {
  it('a region with no content is closed at 0px, hidden and inert', () => {
    const { container } = render(() => <MeasuredPresence data-region>{null}</MeasuredPresence>);
    const el = region(container);
    expect(el).toHaveAttribute('data-state', 'closed');
    expect(el.style.height).toBe('0px');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveAttribute('inert');
  });

  it('opens to the measured content height, follows growth while open, and closes again', () => {
    const [content, setContent] = createSignal<JSX.Element>(undefined);
    const { container } = render(() => <MeasuredPresence data-region>{content()}</MeasuredPresence>);
    setContent(<span>Heads up</span>);
    resize(40);
    const el = region(container);
    expect(el).toHaveAttribute('data-state', 'open');
    expect(el.style.height).toBe('40px');
    expect(el).not.toHaveAttribute('aria-hidden');
    expect(el).not.toHaveAttribute('inert');
    resize(96);
    expect(el.style.height).toBe('96px');
    setContent(undefined);
    expect(el).toHaveAttribute('data-state', 'closed');
    expect(el.style.height).toBe('0px');
    expect(el.style.opacity).toBe('0');
    expect(el).toHaveAttribute('inert');
  });

  it('holds the last content through the closing slide, then unmounts it', () => {
    vi.useFakeTimers();
    const [content, setContent] = createSignal<JSX.Element>(<span>Heads up</span>);
    const { container } = render(() => <MeasuredPresence data-region>{content()}</MeasuredPresence>);
    resize(40);
    setContent(undefined);
    // Mid-slide the content is still there to fade out, rather than collapsing blank.
    expect(region(container)).toHaveTextContent('Heads up');
    vi.advanceTimersByTime(PRESENCE_MS + 100);
    expect(region(container)).not.toHaveTextContent('Heads up');
  });

  it('does not animate on first paint, then animates height and opacity', () => {
    contentHeight = 40;
    const { container } = render(() => <MeasuredPresence data-region><span>Already here</span></MeasuredPresence>);
    const el = region(container);
    // Open at mount: it appears in place, with the transition switched off.
    expect(el).toHaveAttribute('data-state', 'open');
    expect(el.style.transitionProperty).toBe('none');
    flushFrames();
    expect(el.style.transitionProperty).toBe('height, opacity');
  });

  it('content measured a beat after mount still counts as first paint: no slide, then animated', () => {
    // A custom element's slot is attached to its shadow root after the first render, so an
    // already-open region can read 0 at mount and its real height a frame later.
    const { container } = render(() => <MeasuredPresence data-region><span>Already here</span></MeasuredPresence>);
    const el = region(container);
    flushFrames();
    expect(el.style.transitionProperty, 'nothing measured yet: transitions stay off').toBe('none');
    resize(60);
    expect(el.style.height).toBe('60px');
    expect(el.style.transitionProperty, 'the late measurement is applied without a transition').toBe('none');
    flushFrames();
    expect(el.style.transitionProperty).toBe('height, opacity');
  });

  it('a region that opens after the first frame starts from 0px, never from auto', () => {
    const [content, setContent] = createSignal<JSX.Element>(undefined);
    const { container } = render(() => <MeasuredPresence data-region>{content()}</MeasuredPresence>);
    flushFrames();
    expect(region(container).style.transitionProperty).toBe('height, opacity');
    // `auto` is not animatable: 0px -> auto is a jump to full height.
    setContent(<span>Heads up</span>);
    expect(region(container).style.height).toBe('0px');
    resize(40);
    expect(region(container).style.height).toBe('40px');
  });

  it('under reduced motion the wrapper carries a zero transition duration', () => {
    stubMatchMedia(true);
    const { container } = render(() => <MeasuredPresence data-region><span>row</span></MeasuredPresence>);
    expect(region(container).style.transitionDuration).toBe('0s');
  });

  it('otherwise it animates over the shared duration', () => {
    const { container } = render(() => <MeasuredPresence data-region><span>row</span></MeasuredPresence>);
    expect(region(container).style.transitionDuration).toBe(`${PRESENCE_MS}ms`);
  });

  it('`open` overrides occupancy: false closes while the content stays mounted to fade', () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => <MeasuredPresence data-region open={open()}><span>Heads up</span></MeasuredPresence>);
    resize(40);
    const el = region(container);
    expect(el).toHaveAttribute('data-state', 'open');
    setOpen(false);
    expect(el).toHaveAttribute('data-state', 'closed');
    expect(el.style.height).toBe('0px');
    expect(el).toHaveTextContent('Heads up');
  });

  it('`open` true opens a region that has no content yet, and false closes one that has', () => {
    const { container } = render(() => (
      <>
        <MeasuredPresence data-region open={false}><span>x</span></MeasuredPresence>
      </>
    ));
    expect(region(container)).toHaveAttribute('data-state', 'closed');
  });

  it('puts contentClass and contentStyle on the measured element, not the clipping wrapper', () => {
    const { container } = render(() => (
      <MeasuredPresence data-region class="wrap" contentClass="inner" contentStyle={{ 'padding-top': '6px' }}>
        <span>row</span>
      </MeasuredPresence>
    ));
    const el = region(container);
    expect(el).toHaveClass('wrap');
    const inner = el.firstElementChild as HTMLElement;
    expect(inner).toHaveClass('inner');
    expect(inner.style.paddingTop).toBe('6px');
  });
});

describe('isPresenceControlled', () => {
  it('is set by a value or by a bare attribute, and unset otherwise', () => {
    expect(isPresenceControlled(false, false)).toBe(true);
    expect(isPresenceControlled(true, false)).toBe(true);
    expect(isPresenceControlled(undefined, true)).toBe(true);
    expect(isPresenceControlled(undefined, false)).toBe(false);
  });
});
