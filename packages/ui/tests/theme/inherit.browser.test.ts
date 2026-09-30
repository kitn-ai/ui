import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import fixture from './token-values.fixture.json';
import { mount, resolveTokens, settle, wrapperOf } from './token-probe';

const F = fixture as unknown as { light: Record<string, string>; dark: Record<string, string> };
const TAGS = ['kai-button', 'kai-thread', 'kai-prompt-input'];

/** Painted proof, not just a token read: the wrapper's `color` is `var(--color-foreground)`. */
const fg = (el: Element) => getComputedStyle(wrapperOf(el)).color;
const bg = (el: Element) => resolveTokens(el).resolved['--color-background'];
const LIGHT = { bg: F.light['--color-background'], fg: F.light['--color-foreground'] };
const DARK = { bg: F.dark['--color-background'], fg: F.dark['--color-foreground'] };

const html = document.documentElement;
const live: Element[] = [];
const track = <T extends Element>(e: T) => (live.push(e), e);
const emulate = (scheme: 'light' | 'dark' | 'no-preference') =>
  cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });

beforeEach(async () => { await emulate('light'); });
afterEach(async () => {
  live.splice(0).forEach((e) => e.remove());
  html.classList.remove('dark', 'light');
  html.style.removeProperty('--kai-color-scheme');
  html.style.removeProperty('--kai-color-background');
  await emulate('no-preference');
});

describe('root scheme reaches every element with no theme prop', () => {
  for (const tag of TAGS) {
    it(`${tag}: --kai-color-scheme on :root`, async () => {
      const el = track(await mount(tag));
      expect([bg(el), fg(el)]).toEqual([LIGHT.bg, LIGHT.fg]);
      html.style.setProperty('--kai-color-scheme', 'dark');
      await settle();
      expect([bg(el), fg(el)]).toEqual([DARK.bg, DARK.fg]);
      html.style.setProperty('--kai-color-scheme', 'light');
      await settle();
      expect([bg(el), fg(el)]).toEqual([LIGHT.bg, LIGHT.fg]);
    });
    it(`${tag}: <html class="dark"> and <html class="light">`, async () => {
      const el = track(await mount(tag));
      html.classList.add('dark');
      await settle();
      expect([bg(el), fg(el)]).toEqual([DARK.bg, DARK.fg]);
      html.classList.replace('dark', 'light');
      await settle();
      expect([bg(el), fg(el)]).toEqual([LIGHT.bg, LIGHT.fg]);
    });
  }
});

describe('the theme prop is a local override', () => {
  for (const tag of TAGS) {
    it(`${tag} theme="light" inside a dark root stays light; theme="dark" inside a light root stays dark`, async () => {
      html.classList.add('dark');
      const a = track(await mount(tag));
      const b = track(await mount(tag, { theme: 'light' }));
      expect(bg(a)).toBe(DARK.bg);
      expect(bg(b)).toBe(LIGHT.bg);
      expect(fg(b)).toBe(LIGHT.fg);
      html.classList.replace('dark', 'light');
      const c = track(await mount(tag, { theme: 'dark' }));
      await settle();
      expect(bg(c)).toBe(DARK.bg);
      expect(bg(a)).toBe(LIGHT.bg);
    });
    it(`${tag}: switching the theme attribute at runtime, and back to auto`, async () => {
      html.classList.add('dark');
      const el = track(await mount(tag, { theme: 'light' }));
      expect(bg(el)).toBe(LIGHT.bg);
      el.setAttribute('theme', 'auto');
      await settle();
      expect(bg(el)).toBe(DARK.bg);
      el.setAttribute('theme', 'dark');
      await settle();
      expect(bg(el)).toBe(DARK.bg);
    });
  }
});

describe('an ancestor that is not the root scopes its subtree', () => {
  for (const tag of TAGS) {
    it(`${tag}: .dark wrapper and inline --kai-color-scheme wrapper`, async () => {
      const outside = track(await mount(tag));
      const wrap = track(document.createElement('div'));
      wrap.className = 'dark';
      document.body.append(wrap);
      const inside = track(await mount(tag, {}, wrap));
      expect(bg(outside)).toBe(LIGHT.bg);
      expect(bg(inside)).toBe(DARK.bg);
      wrap.className = '';
      wrap.style.setProperty('--kai-color-scheme', 'dark');
      await settle();
      expect(bg(inside)).toBe(DARK.bg);
      // A nested light wrapper inside a dark one wins for its own subtree.
      const inner = track(document.createElement('div'));
      inner.className = 'light';
      wrap.append(inner);
      const nested = track(await mount(tag, {}, inner));
      expect(bg(nested)).toBe(LIGHT.bg);
    });
  }
});

describe('with and without prefers-color-scheme', () => {
  for (const tag of TAGS) {
    it(`${tag}: nothing set follows the OS; an explicit scheme beats the OS`, async () => {
      await emulate('dark');
      expect(matchMedia('(prefers-color-scheme: dark)').matches).toBe(true);
      const el = track(await mount(tag));
      expect(bg(el)).toBe(DARK.bg);
      html.classList.add('light');
      await settle();
      expect(bg(el)).toBe(LIGHT.bg); // root beats OS
      html.classList.remove('light');
      const lit = track(await mount(tag, { theme: 'light' }));
      expect(bg(lit)).toBe(LIGHT.bg); // theme beats OS
      await emulate('light');
      await settle();
      expect(bg(el)).toBe(LIGHT.bg);
      await emulate('no-preference');
      await settle();
      expect(bg(el)).toBe(LIGHT.bg); // no preference = light, same as before
    });
    it(`${tag}: OS dark with the OS flipping at runtime updates an auto element`, async () => {
      const el = track(await mount(tag));
      expect(bg(el)).toBe(LIGHT.bg);
      await emulate('dark');
      await settle();
      expect(bg(el)).toBe(DARK.bg);
    });
  }
});

describe('consumer --kai-color-* overrides still win in both schemes', () => {
  it('--kai-color-background on :root', async () => {
    html.style.setProperty('--kai-color-background', 'rgb(1, 2, 3)');
    for (const scheme of ['light', 'dark']) {
      html.style.setProperty('--kai-color-scheme', scheme);
      for (const tag of TAGS) {
        const el = track(await mount(tag));
        expect(bg(el)).toBe('rgb(1, 2, 3)');
      }
    }
  });
});
