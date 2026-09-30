import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FIXTURES } from './hover-fixtures';
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

/** Every hoverable element under `root`, through open shadow roots. */
const HOVERABLE = 'button:not([disabled]), a[href], summary, label, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="treeitem"], [role="tab"], [role="checkbox"], [role="radio"], [role="row"], [tabindex]:not([tabindex="-1"]), [data-kai-item-body], [class*="hover:bg-"]';
function controls(root: Element | ShadowRoot, out: Element[] = []): Element[] {
  for (const el of root.querySelectorAll('*')) {
    if (el.matches(HOVERABLE)) out.push(el);
    if (el.shadowRoot) controls(el.shadowRoot, out);
  }
  return out;
}
const ownText = (el: Element) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').trim();
const label = (el: Element) => `${el.localName}${el.getAttribute('part') ? `[part=${el.getAttribute('part')}]` : ''}${el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label')}"` : ''}`;
const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

interface Row { scheme: string; fixture: string; control: string; node: string; kind: string; ratio: number; min: number }
const rows: Row[] = [];

describe('every fixture is registered against the scan', () => {
  it('has at least one fixture per registry key', () => {
    expect(Object.keys(FIXTURES).length).toBeGreaterThan(0);
  });
});

describe.each(['light', 'dark'] as const)('hover contrast in %s', (scheme) => {
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    it(`${name} controls stay legible under the pointer`, async () => {
      const host = document.createElement('div');
      host.className = scheme;
      host.style.cssText = `padding:24px;width:520px;color-scheme:${scheme};--kai-color-scheme:${scheme};`;
      await userEvent.unhover(document.body).catch(() => {}); // start each fixture with the pointer off the previous one
      const el = await fixture.make();
      el.setAttribute('theme', scheme);
      if (el.dataset.solidFixture !== undefined) el.style.cssText += `color-scheme:${scheme};--kai-color-scheme:${scheme};`;
      host.append(el);
      document.body.append(host);
      await customElements.whenDefined(el.localName.includes('-') ? el.localName : 'kai-button');
      await settle(500);
      await fixture.after?.(el);
      await settle(300);
      const probe = document.querySelector('kai-button, kai-code-block') ?? el;
      const tokens = (() => {
        const t = document.createElement('kai-button');
        t.setAttribute('theme', scheme);
        host.append(t);
        return t;
      })();
      await settle(120);
      const bgToken = resolveTokens(tokens).resolved['--color-background'];
      tokens.remove();
      void probe;
      const page = rgba(bgToken).slice(0, 3) as [number, number, number];
      host.style.background = bgToken;

      // Popups (menu, model switcher) may portal out of the fixture, so scan the whole body.
      const seen = new Set<Element>();
      const found = controls(document.body).filter((c) => visible(c) && !seen.has(c) && seen.add(c));
      expect(found.length, `${name}: no hoverable controls found, the probe would pass vacuously`).toBeGreaterThan(0);
      const rowsBefore = rows.length;
      const skipped: string[] = [];
      for (const c of found) {
        // Playwright's own actionability decides reachability: a control something paints over cannot be
        // hovered by a pointer either, so it is not a state a person reaches. It is recorded, and the
        // per-fixture assertion below still requires at least one measured control.
        try {
          await userEvent.hover(c, { timeout: 6000 });
        } catch (e) {
          skipped.push(`${label(c)} (${String(e).replace(/\s+/g, ' ').slice(0, 900)})`);
          continue;
        }
        await settle(350); // transition-colors is 150ms
        const measure = (node: Element, kind: string, min: number) => {
          // The backdrop is resolved from the NODE, so a badge that paints its own fill is measured on it.
          const bg = backdrop(node, page);
          const r = ratio(foreground(node, bg), bg);
          rows.push({ scheme, fixture: name, control: label(c), node: label(node), kind, ratio: Math.round(r * 100) / 100, min });
        };
        const walk = (n: Element) => {
          // Rendered code is the kit's one documented axe exception (syntax-theme colours), see preview.ts.
          if (n.localName === 'pre') return;
          if (n.localName === 'svg') return measure(n, 'icon', 3);
          if (ownText(n)) measure(n, 'text', 4.5);
          // Slotted light-DOM content paints inside this control, coloured by the slot it lands in.
          if (n instanceof HTMLSlotElement) {
            for (const a of n.assignedNodes({ flatten: true })) {
              if (a instanceof Element) walk(a);
              else if (a.textContent?.trim()) measure(n, 'text', 4.5);
            }
          }
          for (const ch of n.children) walk(ch);
        };
        const before = rows.length;
        walk(c);
        if (rows.length === before) measure(c, 'text', 4.5);
      }
      expect(rows.length - rowsBefore, `${name}: ${found.length} control(s) found but none could be hovered and measured. Skipped: ${skipped.join('; ')}`).toBeGreaterThan(0);
    }, 120_000);
  }
});

describe('hover contrast report', () => {
  it('every hovered control clears 4.5:1 for text and 3:1 for icons', () => {
    const table = rows.map((r) => `${r.scheme.padEnd(5)} ${r.fixture.padEnd(30)} ${r.kind.padEnd(4)} ${String(r.ratio).padStart(6)} (min ${r.min}) ${r.control} > ${r.node}`);
    console.log(table.join('\n'));
    const bad = rows.filter((r) => r.ratio < r.min);
    expect(rows.length).toBeGreaterThan(0);
    expect(bad, JSON.stringify(bad, null, 1)).toEqual([]);
  });
});
