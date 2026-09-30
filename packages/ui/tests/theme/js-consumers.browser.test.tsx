import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import { createRoot } from 'solid-js';
import { defineWebComponent } from '../../src/web-components/define/define';
import { createResolvedColorScheme } from '../../src/primitives/color-scheme';
import { settle } from './token-probe';

/**
 * The JS half of the scheme contract, in a real cascade. `ctx.dark()` is what `kai-audio-visualizer`
 * (and through it the aurora shader), and the same rule in `kai-remote`, read: a `.dark` on <html> or
 * on an ancestor, an inherited `--kai-color-scheme`, `theme`, and the OS must each reach it live.
 */
defineWebComponent<{ theme?: string }>('kai-scheme-probe', {}, (_props, ctx) => (
  <span data-dark={String(ctx.dark())}>{ctx.dark() ? 'dark' : 'light'}</span>
));

const html = document.documentElement;
const live: Element[] = [];
const emulate = (v: 'light' | 'dark' | 'no-preference') =>
  cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });
const dark = (el: Element) => el.shadowRoot!.querySelector('span')!.getAttribute('data-dark');
const probe = async (parent: Element = document.body, attrs: Record<string, string> = {}) => {
  const el = document.createElement('kai-scheme-probe');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.append(el); live.push(el);
  await customElements.whenDefined('kai-scheme-probe');
  await settle(80);
  return el;
};
beforeEach(async () => { await emulate('light'); });
afterEach(async () => {
  live.splice(0).forEach((e) => e.remove());
  html.classList.remove('dark', 'light');
  html.style.removeProperty('--kai-color-scheme');
  await emulate('no-preference');
});

describe('ctx.dark() follows the resolved scheme', () => {
  it('<html class="dark"> and back, live', async () => {
    const el = await probe();
    expect(dark(el)).toBe('false');
    html.classList.add('dark');
    await settle();
    expect(dark(el)).toBe('true');
    html.classList.replace('dark', 'light');
    await settle();
    expect(dark(el)).toBe('false');
  });
  it('an inherited --kai-color-scheme on <html>', async () => {
    const el = await probe();
    html.style.setProperty('--kai-color-scheme', 'dark');
    await settle();
    expect(dark(el)).toBe('true');
  });
  it('a .dark ancestor that is not the root', async () => {
    const wrap = document.createElement('div'); document.body.append(wrap); live.push(wrap);
    const inside = await probe(wrap);
    const outside = await probe();
    wrap.className = 'dark';
    await settle();
    expect([dark(inside), dark(outside)]).toEqual(['true', 'false']);
  });
  it('theme="dark" on a light page, theme="light" on a dark page', async () => {
    const d = await probe(document.body, { theme: 'dark' });
    expect(dark(d)).toBe('true');
    html.classList.add('dark');
    const l = await probe(document.body, { theme: 'light' });
    await settle();
    expect([dark(d), dark(l)]).toEqual(['true', 'false']);
  });
  it('the OS, when nothing is set, and an explicit scheme beats it', async () => {
    const el = await probe();
    await emulate('dark');
    await settle();
    expect(dark(el)).toBe('true');
    html.classList.add('light');
    await settle();
    expect(dark(el)).toBe('false');
  });
});

describe('createResolvedColorScheme on a plain light-DOM element', () => {
  it('reads the real cascade and re-reads on a class change', async () => {
    const el = document.createElement('div'); document.body.append(el); live.push(el);
    let dispose = () => {};
    const scheme = createRoot((d) => { dispose = d; return createResolvedColorScheme(el); });
    expect(scheme()).toBe('light');
    html.classList.add('dark');
    await settle();
    expect(scheme()).toBe('dark');
    dispose();
  });
});
