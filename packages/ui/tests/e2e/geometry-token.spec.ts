import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * `--kai-spacing` must reach the geometry INSIDE a shadow root, and the bare
 * `--spacing` variable must NOT.
 *
 * Colour, type and radius were tokenized from the start; geometry was not. The
 * consequence was a theme surface that looked complete and was not: a consumer
 * could set `:root { --spacing: 1rem }` — the documented Tailwind variable, the
 * one an experienced consumer reaches for first — and nothing moved. The reason
 * is structural rather than a missing declaration. Tailwind emits its theme block
 * as `:root,:host{...}`, so the compiled sheet declares `--spacing` ON THE HOST
 * ELEMENT; a declaration on the element itself beats an inherited value, so the
 * consumer's `:root` value is discarded inside every shadow root. Re-pointing the
 * variable at a `--kai-*` token (`--spacing: var(--kai-spacing, 0.25rem)`) is what
 * turns "silently ignored" into "overridable", and both halves of that claim are
 * asserted below — the positive one and, more importantly, the negative one, since
 * the negative one is the trap the token exists to close.
 *
 * This has to run against the BUILT bundle in a bare, Tailwind-free harness, for
 * the reason `message-text-token.spec.ts` and `focus-ring-paints.spec.ts` document:
 * a real consumer app never loads Tailwind at document level, and this guard is
 * about what a custom property RESOLVES to for a shadow-root element. Only the real
 * cascade can settle that. `tests/styles/geometry-tokens.test.ts` pins the source
 * and compiled declarations in jsdom (and is where a missing `:host` shows up as a
 * one-line failure); this is the end-to-end proof that the plumbing works.
 *
 * THE MATCHED PAIR IS THE POINT. A positive-only test would pass against a build
 * where `--spacing` had simply been widened globally, or against a Storybook page
 * where document-level Tailwind leaks in. So each test names what must move and,
 * in the same run, what must stay put.
 *
 * Needs a build first (`nx build ui`): it drives `dist/`, and the config-wide
 * globalSetup refuses to run against a stale bundle.
 * Run: `npm run test:geometry-token` inside packages/ui.
 */

/**
 * One step of Tailwind's spacing scale: `--spacing` is 0.25rem, or 4px at a 16px
 * root font size. Utilities multiply it — `px-4` is `calc(0.25rem * 4)` = 1rem =
 * 16px — which is why this is the STEP and not "the value of --spacing in px".
 * Getting that wrong is how this test first failed: it expected 64px for `px-4`.
 */
const SPACING_STEP_PX = 4;
/** `md` size is `h-9` = calc(var(--spacing) * 9): 2.25rem, or 36px, by default. */
const BUTTON_MD_HEIGHT_PX = 9 * SPACING_STEP_PX;

async function setRootVar(page: Page, name: string, value: string) {
  await page.evaluate(([n, v]) => document.documentElement.style.setProperty(n, v), [name, value] as const);
}

async function clearRootVar(page: Page, name: string) {
  await page.evaluate((n) => document.documentElement.style.removeProperty(n), name);
}

async function mountButton(page: Page) {
  await page.evaluate(() => {
    const mounts = document.getElementById('mounts')!;
    mounts.replaceChildren();
    const btn = document.createElement('kai-button') as HTMLElement;
    btn.textContent = 'Send';
    mounts.appendChild(btn);
  });
  await page.waitForTimeout(150);
}

/**
 * The host's box AND the shadow root's own button box. The second one is what
 * makes this a test of the shadow boundary rather than of the light DOM: a rule
 * that only reached the host could still resize the host through some other route.
 */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector('kai-button') as HTMLElement;
    const inner = host.shadowRoot?.querySelector('button') as HTMLElement | null;
    const hostRect = host.getBoundingClientRect();
    const innerStyle = inner ? getComputedStyle(inner) : null;
    return {
      hostHeight: Math.round(hostRect.height),
      hostWidth: Math.round(hostRect.width),
      innerHeight: inner ? Math.round(inner.getBoundingClientRect().height) : null,
      innerPaddingLeft: innerStyle ? Math.round(Number.parseFloat(innerStyle.paddingLeft)) : null,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__kaiReady === true, undefined, { timeout: 30_000 });
  await page.waitForTimeout(300);
});

test('the kit ships Tailwind geometry by default: nothing moves if a consumer overrides nothing', async ({ page }) => {
  // The fallback IS the API. If `--kai-spacing` defaulted to anything but
  // Tailwind's own 0.25rem, every consumer's layout would shift on upgrade with no
  // change of their own — which is why this is asserted at the DEFAULT, before any
  // override in this file.
  await mountButton(page);
  const box = await geometry(page);
  expect(box.hostHeight, 'h-9 must still be 2.25rem by default').toBe(BUTTON_MD_HEIGHT_PX);
  expect(box.innerPaddingLeft, 'px-4 must still be 1rem by default').toBe(4 * SPACING_STEP_PX);
});

test('--kai-spacing on :root moves geometry INSIDE the shadow root', async ({ page }) => {
  await mountButton(page);
  const before = await geometry(page);

  // 2x, set on the document root — the way a consumer brands a theme.
  await setRootVar(page, '--kai-spacing', '0.5rem');
  await page.waitForTimeout(100);
  const after = await geometry(page);

  expect(after.hostHeight, 'the host must grow with the token').toBe(before.hostHeight * 2);
  expect(after.innerHeight, 'and so must the element INSIDE the shadow root').toBe(before.innerHeight! * 2);
  expect(after.innerPaddingLeft, 'px-4 is calc(var(--spacing) * 4) and must follow').toBe(before.innerPaddingLeft! * 2);
  expect(after.hostWidth, 'the box grows in both axes').toBeGreaterThan(before.hostWidth);

  // Tightening is the direction a real "denser" theme asks for, and it is the one
  // a floor-sized default could silently refuse.
  await setRootVar(page, '--kai-spacing', '0.125rem');
  await page.waitForTimeout(100);
  const tighter = await geometry(page);
  expect(tighter.hostHeight, 'a denser theme must shrink the same box').toBe(before.hostHeight / 2);
});

test('the bare --spacing variable does NOT work — the trap the token exists to close', async ({ page }) => {
  await mountButton(page);
  const before = await geometry(page);

  // The documented Tailwind variable, set exactly as a consumer would set it.
  // The compiled sheet declares `--spacing` on the host, so this is overridden
  // inside every shadow root. If this assertion ever flips to "it works", the
  // token has stopped being necessary and this guard should say so loudly rather
  // than keep asserting a redundancy.
  await setRootVar(page, '--spacing', '0.5rem');
  await page.waitForTimeout(100);
  const after = await geometry(page);

  expect(after.hostHeight, 'a bare :root{--spacing} must NOT reach the shadow root').toBe(before.hostHeight);
  expect(after.innerPaddingLeft).toBe(before.innerPaddingLeft);

  // ...and the token, set alongside it, is what does work: same page, same run, so
  // "nothing moved" cannot be explained by the page not re-rendering.
  await setRootVar(page, '--kai-spacing', '0.5rem');
  await page.waitForTimeout(100);
  const withToken = await geometry(page);
  expect(withToken.hostHeight, 'the kit token must move what the bare variable could not').toBe(before.hostHeight * 2);
  await clearRootVar(page, '--kai-spacing');
});
