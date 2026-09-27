/**
 * `kai-empty`'s HOST is a flex item, and that is load-bearing for whoever projects it.
 *
 * WHY THIS FILE EXISTS. A Solid-level test of `Empty` cannot see this: the component's
 * own classes say `flex-1` + a flex column whatever the host is, and the host is what
 * actually stands in the consumer's layout. Without the rule the surface renders at its
 * CONTENT height inside the much taller region it is placed in — measured in a real
 * chromium, a 180px surface sitting at the top of 600px of room — and the guide cards the
 * assistant block renders in that slot all fall to the top with them.
 *
 * WHAT IT CANNOT DO, MEASURED RATHER THAN ASSUMED. jsdom lays nothing out AND its cascade
 * does not carry a shadow root's `:host` rule into `getComputedStyle` — this element's host
 * reports `undefined` for `display`, not `block` and not `flex`. So the assertion is on the
 * DECLARATION the element carries, which is the half jsdom can see, and the geometry is
 * measured by `scripts/probe-empty-state.mjs` in a real chromium. The pair is deliberate:
 * the probe proves the behaviour, and this file fails cheaply when somebody removes the host
 * rule — a removal that would otherwise leave every layout assertion passing on a page whose
 * cards have silently fallen to the top.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import '../../src/web-components/empty/empty';

const holders: HTMLElement[] = [];

async function mount(html: string): Promise<HTMLElement> {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  document.body.append(holder);
  holders.push(holder);
  const host = holder.firstElementChild as HTMLElement;
  // The facade renders after the element upgrades, so its shadow tree is a tick away.
  await new Promise((r) => setTimeout(r, 0));
  return host;
}

/** Every rule text the element carries in its own shadow root. */
const stylesOf = (host: HTMLElement): string =>
  [...(host.shadowRoot?.querySelectorAll('style') ?? [])].map((s) => s.textContent ?? '').join('\n');

afterEach(() => {
  for (const h of holders.splice(0)) h.remove();
});

describe('kai-empty: the host carries the box the layout needs', () => {
  it('upgrades and renders its own shadow tree', async () => {
    const host = await mount('<kai-empty empty-title="Nothing here"></kai-empty>');
    expect(customElements.get('kai-empty'), 'the element is registered').toBeTruthy();
    expect(host.shadowRoot, 'the facade rendered into a shadow root').toBeTruthy();
    expect(host.shadowRoot!.querySelector('[data-slot="empty"]')).toBeTruthy();
  });

  it('declares display:flex for the host itself, not only for its own classes', async () => {
    const host = await mount('<kai-empty></kai-empty>');
    const css = stylesOf(host);
    // The HOST box, which is the half a child-level class can never express.
    expect(css, 'the :host rule is present').toMatch(/:host\s*\{[^}]*display\s*:\s*flex/);
    // `flex: 1 1 auto` is what makes it the flex ITEM the region stretches; `display:flex`
    // alone would leave it content-height.
    expect(css, 'the host is a flex item, not just a flex container').toMatch(/:host\s*\{[^}]*flex\s*:\s*1/);
    // A column, because the title and the content stack rather than sit side by side.
    expect(css, 'the host is a column').toMatch(/:host\s*\{[^}]*flex-direction\s*:\s*column/);
  });

  it('states the host box in one rule, not scattered across its children', async () => {
    const host = await mount('<kai-empty></kai-empty>');
    // The shadow root carries OTHER `:host` blocks — the theme's own variable set is one
    // of them — so pick the rule that declares the box rather than the first `:host{`.
    const hostRules = [...stylesOf(host).matchAll(/:host\s*\{([^}]*)\}/g)].map((m) => m[1]);
    const boxRule = hostRules.find((r) => /display\s*:\s*flex/.test(r));
    expect(boxRule, 'a :host rule declares the host box').toBeTruthy();
    // The three properties live in the SAME block, which is what makes this a statement
    // about the box rather than three coincidences: three separate rules would satisfy the
    // assertions above and still leave whichever one a child could have expressed.
    expect(boxRule).toMatch(/flex\s*:\s*1/);
    expect(boxRule).toMatch(/flex-direction\s*:\s*column/);
  });
});
