/**
 * The dock's bands animate presence: a band wrapper measures its content with a
 * ResizeObserver and drives its own height, so it slides open from 0, follows content
 * that grows while open, and collapses when the content goes. Reduced motion makes the
 * same changes instant.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { createSignal, type JSX } from 'solid-js';
import { PromptDock } from './prompt-dock';

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

beforeEach(() => {
  observers = [];
  contentHeight = 0;
  vi.stubGlobal('ResizeObserver', FakeRO);
  // jsdom has no layout; the measured element reports the height the test sets.
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => contentHeight,
  });
  stubMatchMedia(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
});

const band = (c: HTMLElement, name: 'top' | 'bottom') =>
  c.querySelector(`[data-dock-band="${name}"]`) as HTMLElement;

describe('PromptDock band presence', () => {
  it('a band with no content is closed at 0px', () => {
    const { container } = render(() => <PromptDock><input /></PromptDock>);
    const top = band(container, 'top');
    expect(top).toHaveAttribute('data-state', 'closed');
    expect(top.style.height).toBe('0px');
    expect(top).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens to the measured content height, follows growth, and closes again', async () => {
    const [top, setTop] = createSignal<JSX.Element>(undefined);
    const { container } = render(() => <PromptDock top={top()}><input /></PromptDock>);
    setTop(<span>Heads up</span>);
    resize(40);
    const el = band(container, 'top');
    expect(el).toHaveAttribute('data-state', 'open');
    expect(el.style.height).toBe('40px');
    expect(el).not.toHaveAttribute('aria-hidden');
    resize(96);
    expect(el.style.height).toBe('96px');
    setTop(undefined);
    expect(el).toHaveAttribute('data-state', 'closed');
    expect(el.style.height).toBe('0px');
    expect(el.style.opacity).toBe('0');
  });

  it('under reduced motion the wrapper carries a zero transition duration', () => {
    stubMatchMedia(true);
    const { container } = render(() => <PromptDock bottom={<span>row</span>}><input /></PromptDock>);
    expect(band(container, 'bottom').style.transitionDuration).toBe('0s');
  });

  it('otherwise it animates over 180ms', () => {
    const { container } = render(() => <PromptDock bottom={<span>row</span>}><input /></PromptDock>);
    expect(band(container, 'bottom').style.transitionDuration).toBe('180ms');
  });
});
