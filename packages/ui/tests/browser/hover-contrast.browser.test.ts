import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/web-components/button/button';
import '../../src/web-components/code-block/code-block';
import '../../src/web-components/file-tree/file-tree';
import '../../src/web-components/embed/embed';
import '../../src/web-components/screen/screen';
import { resolveTokens } from '../theme/token-probe';

/**
 * Hover-state contrast, measured in real Chromium.
 *
 * axe only audits the resting state, so a `hover:bg-muted` over muted text passes CI in both schemes
 * and still fails for the person whose pointer is on it. This hovers every interactive control inside
 * the fixtures below (a real pointer move, so :hover applies and the colour transition settles), then
 * computes the WCAG ratio of the control's text (4.5:1) and of an icon-only glyph (3:1, SC 1.4.11)
 * against the background actually painted behind it, in light AND dark.
 *
 * Colours are read through a canvas so every CSS colour syntax the engine returns (`color-mix()` gives
 * `oklab()`) reduces to sRGB, and translucent layers are composited by hand up the ancestor chain,
 * crossing shadow roots.
 */
afterEach(() => document.body.replaceChildren());

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
type RGBA = [number, number, number, number];

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
/** Any CSS colour to non-premultiplied sRGB + alpha, by painting it over white then black. */
function rgba(css: string): RGBA {
  const over = (base: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data;
  };
  const w = over('#fff');
  const k = over('#000');
  const a = 1 - (w[0] - k[0]) / 255;
  if (a <= 0.004) return [0, 0, 0, 0];
  return [k[0] / a, k[1] / a, k[2] / a, a];
}
const over = (top: RGBA, under: [number, number, number]): [number, number, number] => [
  top[0] * top[3] + under[0] * (1 - top[3]),
  top[1] * top[3] + under[1] * (1 - top[3]),
  top[2] * top[3] + under[2] * (1 - top[3]),
];
const lum = (c: number[]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const parentOf = (n: Node): Element | null => {
  const p = (n as Element).parentElement;
  if (p) return p;
  const root = n.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
};

/** The colour painted behind `el`: every ancestor background, composited, over the page background. */
function backdrop(el: Element, page: [number, number, number]): [number, number, number] {
  const layers: RGBA[] = [];
  for (let n: Element | null = el; n; n = parentOf(n)) {
    const c = rgba(getComputedStyle(n).backgroundColor);
    if (c[3] > 0) layers.push(c);
    if (c[3] >= 0.99) break;
  }
  return layers.reduceRight((under, l) => over(l, under), page);
}
/** Foreground as painted: the resolved colour, times every ancestor's opacity, over the backdrop. */
function foreground(el: Element, bg: [number, number, number]): [number, number, number] {
  const c = rgba(getComputedStyle(el).color);
  let alpha = c[3];
  for (let n: Element | null = el; n; n = parentOf(n)) alpha *= Number(getComputedStyle(n).opacity);
  return over([c[0], c[1], c[2], alpha], bg);
}

/** Every interactive element in a subtree, through open shadow roots. */
function controls(root: Element | ShadowRoot, out: Element[] = []): Element[] {
  for (const el of root.querySelectorAll('*')) {
    if (el.matches('button:not([disabled]), a[href], [role="button"], [role="menuitem"], [role="option"], [role="treeitem"], summary')) out.push(el);
    if (el.shadowRoot) controls(el.shadowRoot, out);
  }
  if (root instanceof Element && root.shadowRoot) controls(root.shadowRoot, out);
  return out;
}
const ownText = (el: Element) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').trim();
const label = (el: Element) => `${el.localName}${el.getAttribute('part') ? `[part=${el.getAttribute('part')}]` : ''}${el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label')}"` : ''}`;

const FIXTURES: Record<string, () => HTMLElement> = {
  'kai-code-block': () => Object.assign(document.createElement('kai-code-block'), { code: 'const a = 1;', language: 'ts', copy: true }),
  'kai-file-tree': () =>
    Object.assign(document.createElement('kai-file-tree'), {
      summary: true,
      defaultExpanded: ['src'],
      files: [
        { path: 'src/a.ts', code: 'a', additions: 2, deletions: 1, status: 'modified' },
        { path: 'src/b.ts', code: 'b', status: 'added' },
        { path: 'README.md', code: 'r' },
      ],
    }),
  'kai-embed': () => Object.assign(document.createElement('kai-embed'), { data: { provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'A video' } }),
  'kai-screen': () => {
    const s = Object.assign(document.createElement('kai-screen'), { open: true, back: true, headline: 'Screen' });
    s.style.cssText = 'position:relative;display:block;height:240px;';
    return s;
  },
  'kai-button ghost': () => btn('ghost'),
  'kai-button subtle': () => btn('subtle'),
  'kai-button outline': () => btn('outline'),
};
function btn(variant: string) {
  const b = document.createElement('kai-button');
  b.setAttribute('variant', variant);
  b.textContent = 'Label';
  return b;
}

interface Row { scheme: string; fixture: string; control: string; kind: string; ratio: number; min: number }
const rows: Row[] = [];

describe.each(['light', 'dark'] as const)('hover contrast in %s', (scheme) => {
  for (const [name, make] of Object.entries(FIXTURES)) {
    it(`${name} controls stay legible under the pointer`, async () => {
      const host = document.createElement('div');
      host.className = scheme;
      host.style.cssText = 'padding:24px;width:520px;';
      const el = make();
      el.setAttribute('theme', scheme);
      host.append(el);
      document.body.append(host);
      await customElements.whenDefined(el.localName);
      await settle(400);
      const tokens = resolveTokens(el).resolved['--color-background'];
      const page = rgba(tokens).slice(0, 3) as [number, number, number];
      host.style.background = tokens;

      const found = controls(el);
      expect(found.length, `${name}: no interactive controls found, the probe would pass vacuously`).toBeGreaterThan(0);
      for (const c of found) {
        await userEvent.hover(c);
        await settle(350); // transition-colors is 150ms
        const bg = backdrop(c, page);
        const measure = (node: Element, kind: string, min: number) => {
          const r = ratio(foreground(node, bg), bg);
          rows.push({ scheme, fixture: name, control: label(c), kind, ratio: Math.round(r * 100) / 100, min });
        };
        const text = ownText(c) || [...c.querySelectorAll('span,div')].some((n) => ownText(n));
        if (text) measure(c, 'text', 4.5);
        c.querySelectorAll('svg').forEach((svg) => measure(svg, 'icon', 3));
        if (!text && !c.querySelector('svg')) measure(c, 'text', 4.5);
      }
    }, 60_000);
  }
});

describe('hover contrast report', () => {
  it('every hovered control clears 4.5:1 for text and 3:1 for icons', () => {
    console.table(rows.map((r) => ({ ...r, pass: r.ratio >= r.min ? 'yes' : 'NO' })));
    const bad = rows.filter((r) => r.ratio < r.min);
    expect(rows.length).toBeGreaterThan(0);
    expect(bad, JSON.stringify(bad, null, 1)).toEqual([]);
  });
});
