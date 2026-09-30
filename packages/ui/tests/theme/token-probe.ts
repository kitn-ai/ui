import themeCss from '../../theme.css?raw';
// Import ONLY the three facades under test, not register-impl: the register-all graph took >2 minutes to
// transform under the shared box's load and hung the file past any sane budget.
import '../../src/web-components/button/button';
import '../../src/web-components/thread/thread';
import '../../src/web-components/prompt/prompt-input';

/** Every `--color-*` token name theme.css declares, in either scope. Derived, never typed. */
export const COLOR_TOKENS: string[] = [...new Set([...themeCss.matchAll(/^\s*(--color-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))].sort();

export const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

/** Mount a kai element (kai-button by default) and wait for its facade to render. */
export async function mount(tag: string, attrs: Record<string, string> = {}, parent: Element = document.body): Promise<HTMLElement> {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (tag === 'kai-button') el.textContent = 'x';
  parent.append(el);
  await customElements.whenDefined(tag);
  await settle();
  return el;
}

/** The facade's `display:contents` wrapper, the node that carries the token scope. */
export const wrapperOf = (el: Element): HTMLElement => {
  const w = el.shadowRoot?.firstElementChild as HTMLElement | null;
  if (!w) throw new Error(`${el.localName}: no shadow wrapper rendered`);
  return w;
};

/**
 * The RESOLVED colour of a token as the engine paints it, read through a probe node inside the
 * wrapper. `getPropertyValue('--color-x')` returns the token STREAM (`light-dark(a, b)` stays a
 * string until a real property consumes it), so it cannot compare a migrated token with the old
 * one. A probe consuming it does: the browser resolves `light-dark()` against the probe's used
 * colour-scheme and `color-mix()` against the resolved inputs.
 */
export function resolveTokens(el: Element): { raw: Record<string, string>; resolved: Record<string, string> } {
  const w = wrapperOf(el);
  const probe = document.createElement('div');
  w.append(probe);
  const raw: Record<string, string> = {};
  const resolved: Record<string, string> = {};
  const wcs = getComputedStyle(w);
  for (const t of COLOR_TOKENS) {
    raw[t] = wcs.getPropertyValue(t).trim();
    probe.style.backgroundColor = '';
    probe.style.backgroundColor = `var(${t})`;
    resolved[t] = getComputedStyle(probe).backgroundColor;
  }
  probe.remove();
  return { raw, resolved };
}
