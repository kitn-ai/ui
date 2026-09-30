import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import '../../src/web-components/input/input';
import '../../src/web-components/select/select';
import '../../src/web-components/message/message-skills';
import '../../src/web-components/link-preview/link-preview';
import '../../src/web-components/composer/composer';
import '../../src/web-components/confirm-card/confirm-card';
import { settle } from './token-probe';

/**
 * The styling that used to hang off a `.dark` ancestor (`dark:` utilities, `.dark .kai-composer-pill`)
 * and so went LIGHT under `<html class="dark">` and under `theme="dark"` once the facade wrapper lost
 * its `.dark` class. Each row asserts BOTH scenarios paint the value the old `.dark` rule painted, and
 * that light still paints the old light value.
 *
 * The expected colours are the OLD rules' own literals, written here as independent CSS and put through
 * the same canvas normaliser as the measured value, so neither side is a copy of the other and
 * `color-mix()` / `oklch()` forms compare as the RGBA the user sees.
 */
const cv = document.createElement('canvas');
cv.width = cv.height = 1;
const ctx = cv.getContext('2d', { willReadFrequently: true })!;
const norm = (css: string): string => {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `${r},${g},${b},${a}`;
};

const RED400 = 'oklch(0.704 0.191 22.216)';
const DESTRUCTIVE = { light: 'hsl(0 72% 45%)', dark: 'hsl(0 62.8% 30.6%)' };
const mix = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`;

type Row = {
  name: string;
  mount: () => Promise<HTMLElement>;
  find: (root: ShadowRoot) => Element | null;
  prop: 'color' | 'backgroundColor' | 'borderTopColor';
  light: string;
  dark: string;
};

const make = async (tag: string, set: (el: any) => void, attrs: Record<string, string> = {}): Promise<HTMLElement> => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  set(el);
  document.body.append(el);
  await customElements.whenDefined(tag);
  await settle(120);
  return el;
};
const doc = [
  { type: 'text', text: 'ask ' },
  { type: 'entity', entity: { kind: 'skill', id: 's', label: 'Deploy' } },
  { type: 'entity', entity: { kind: 'agent', id: 'a', label: 'Reviewer' } },
];
const pill = (kind: string) => (r: ShadowRoot) => r.querySelector(`.kai-composer-pill[data-kind="${kind}"]`);
const sigil = (kind: string) => (r: ShadowRoot) => r.querySelector(`.kai-composer-pill[data-kind="${kind}"] .kai-composer-pill-sigil`);

const ROWS: Row[] = [
  { name: 'kai-input invalid border', mount: () => make('kai-input', () => {}, { invalid: '' }), find: (r) => r.querySelector('[class*="border-[color:light-dark"]'), prop: 'borderTopColor', light: DESTRUCTIVE.light, dark: mix(RED400, 70) },
  { name: 'kai-select invalid border', mount: () => make('kai-select', (e) => { e.options = [{ value: 'a', label: 'A' }]; }, { invalid: '' }), find: (r) => r.querySelector('[class*="border-[color:light-dark"]'), prop: 'borderTopColor', light: DESTRUCTIVE.light, dark: mix(RED400, 70) },
  { name: 'kai-skills badge text', mount: () => make('kai-skills', (e) => { e.skills = [{ name: 'search' }]; }), find: (r) => r.querySelector('span[class*="violet"]'), prop: 'color', light: 'oklch(0.541 0.281 293.009)', dark: 'oklch(0.702 0.183 293.541)' },
  { name: 'kai-link-preview invalid chip background', mount: () => make('kai-link-preview', (e) => { e.data = { url: 'javascript:alert(1)' }; }), find: (r) => r.querySelector('[role="img"]'), prop: 'backgroundColor', light: mix(DESTRUCTIVE.light, 10), dark: mix(DESTRUCTIVE.dark, 20) },
  { name: 'kai-link-preview invalid chip border', mount: () => make('kai-link-preview', (e) => { e.data = { url: 'javascript:alert(1)' }; }), find: (r) => r.querySelector('[role="img"]'), prop: 'borderTopColor', light: mix(DESTRUCTIVE.light, 40), dark: mix(RED400, 50) },
  { name: 'kai-composer skill pill', mount: () => make('kai-composer', (e) => { e.value = doc; }), find: pill('skill'), prop: 'color', light: '#2563eb', dark: '#6ea8fe' },
  { name: 'kai-composer skill sigil', mount: () => make('kai-composer', (e) => { e.value = doc; }), find: sigil('skill'), prop: 'color', light: '#2563eb', dark: '#6ea8fe' },
  { name: 'kai-composer agent pill', mount: () => make('kai-composer', (e) => { e.value = doc; }), find: pill('agent'), prop: 'color', light: '#7c3aed', dark: '#c4a7fc' },
  { name: 'kai-composer agent sigil', mount: () => make('kai-composer', (e) => { e.value = doc; }), find: sigil('agent'), prop: 'color', light: '#7c3aed', dark: '#c4a7fc' },
  { name: 'form/card error box background (kai-confirm, invalid data)', mount: () => make('kai-confirm', (e) => { e.data = { nonsense: 1 }; }), find: (r) => r.querySelector('[role="alert"]'), prop: 'backgroundColor', light: mix(DESTRUCTIVE.light, 10), dark: mix(DESTRUCTIVE.dark, 15) },
];

const html = document.documentElement;
const live: Element[] = [];
const emulate = (v: 'light' | 'dark' | 'no-preference') =>
  cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });
beforeEach(async () => { await emulate('light'); });
afterEach(async () => {
  live.splice(0).forEach((e) => e.remove());
  html.classList.remove('dark', 'light');
  await emulate('no-preference');
});

const measure = async (row: Row, setup: (el: HTMLElement) => void) => {
  const el = await row.mount();
  live.push(el);
  setup(el);
  await settle(80);
  const node = row.find(el.shadowRoot!);
  expect(node, `${row.name}: rendered node not found`).not.toBeNull();
  return norm(getComputedStyle(node!)[row.prop]);
};

describe('dark-only styling follows the resolved scheme, not a .dark ancestor', () => {
  for (const row of ROWS) {
    it(`${row.name}: <html class="dark">, no theme prop`, async () => {
      html.classList.add('dark');
      expect(await measure(row, () => {})).toBe(norm(row.dark));
    });
    it(`${row.name}: theme="dark" on a LIGHT page`, async () => {
      expect(await measure(row, (el) => el.setAttribute('theme', 'dark'))).toBe(norm(row.dark));
    });
    it(`${row.name}: OS dark, nothing set`, async () => {
      await emulate('dark');
      expect(await measure(row, () => {})).toBe(norm(row.dark));
    });
    it(`${row.name}: light page and theme="light" on a dark page keep the light value`, async () => {
      expect(await measure(row, () => {})).toBe(norm(row.light));
      html.classList.add('dark');
      expect(await measure(row, (el) => el.setAttribute('theme', 'light'))).toBe(norm(row.light));
    });
  }
  it('the two values of every row really differ (the comparison is not vacuous)', () => {
    for (const row of ROWS) expect(norm(row.light), row.name).not.toBe(norm(row.dark));
  });
});
