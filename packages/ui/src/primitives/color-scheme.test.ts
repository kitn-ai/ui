import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { createResolvedColorScheme } from './color-scheme';

/** jsdom has no `light-dark()` cascade, so the inherited knob is stubbed on getComputedStyle. */
let knob = '';
let osDark = false;
let mqListeners: Array<(e: { matches: boolean }) => void> = [];

beforeEach(() => {
  knob = '';
  osDark = false;
  mqListeners = [];
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () => ({ getPropertyValue: (n: string) => (n === '--kai-color-scheme' ? knob : '') }) as unknown as CSSStyleDeclaration,
  );
  window.matchMedia = ((q: string) => ({
    // A live MediaQueryList: `matches` is read at access time, like the real one.
    get matches() { return q.includes('dark') && osDark; },
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) => mqListeners.push(l),
    removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => { mqListeners = mqListeners.filter((x) => x !== l); },
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { vi.restoreAllMocks(); document.documentElement.className = ''; });

const scheme = (el = document.createElement('div')) => {
  let dispose = () => {};
  const get = createRoot((d) => { dispose = d; return createResolvedColorScheme(el); });
  return { get, dispose };
};
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createResolvedColorScheme', () => {
  it('an inherited --kai-color-scheme: dark wins', () => {
    knob = ' dark ';
    expect(scheme().get()).toBe('dark');
  });
  it('an inherited light beats a dark OS', () => {
    knob = 'light'; osDark = true;
    expect(scheme().get()).toBe('light');
  });
  it('empty knob follows the OS: dark', () => {
    osDark = true;
    expect(scheme().get()).toBe('dark');
  });
  it('empty knob follows the OS: light', () => {
    expect(scheme().get()).toBe('light');
  });
  it('a garbage knob value is ignored, not trusted', () => {
    knob = 'sepia'; osDark = true;
    expect(scheme().get()).toBe('dark');
  });
  it('a documentElement class change re-reads after the MutationObserver flush', async () => {
    const s = scheme();
    expect(s.get()).toBe('light');
    knob = 'dark';
    document.documentElement.className = 'dark';
    await flush();
    expect(s.get()).toBe('dark');
    s.dispose();
  });
  it('an ANCESTOR that is not the root re-reads too', async () => {
    const wrap = document.createElement('div');
    const el = document.createElement('span');
    wrap.append(el); document.body.append(wrap);
    const s = scheme(el as unknown as HTMLElement);
    knob = 'dark';
    wrap.className = 'dark';
    await flush();
    expect(s.get()).toBe('dark');
    s.dispose(); wrap.remove();
  });
  it('an OS preference change re-reads when nothing is set', () => {
    const s = scheme();
    expect(s.get()).toBe('light');
    osDark = true;
    mqListeners.forEach((l) => l({ matches: true }));
    expect(s.get()).toBe('dark');
    s.dispose();
  });
  it('cleans up its matchMedia listener', () => {
    const s = scheme();
    expect(mqListeners.length).toBe(1);
    s.dispose();
    expect(mqListeners.length).toBe(0);
  });
});
