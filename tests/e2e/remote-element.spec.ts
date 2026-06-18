import { test, expect, type Page, type FrameLocator } from '@playwright/test';

/**
 * REAL cross-origin Card-transport matrix.
 *
 *   host  → http://localhost:6006  (examples/remote-host)
 *   frame → http://localhost:6007  (examples/remote-provider)
 *
 * Each test drives the host page (the iframe + the routed-event log + the test
 * controls) and asserts on the HOST's observed behavior, exercising the genuine
 * cross-origin postMessage path that jsdom/same-origin Storybook cannot.
 */

const HOST = 'http://localhost:6006';

/** Read the host's routed-event log (the events that passed every host gate). */
async function routedEvents(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => (window as unknown as { __routedEvents: () => unknown[] }).__routedEvents() as Array<Record<string, unknown>>);
}

/** Wait until the host bridge reaches the given state (polled from #status). */
async function waitForState(page: Page, state: string): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute('data-state', state, { timeout: 15_000 });
}

function frame(page: Page): FrameLocator {
  return page.frameLocator('#card iframe');
}

test('handshake completes — bridge reaches "open" and the framed card renders', async ({ page }) => {
  await page.goto(`${HOST}/`);
  await waitForState(page, 'open');
  // The provider's <kai-form> renders its Send button inside the frame (shadow DOM
  // is pierced by Playwright's role locators).
  await expect(frame(page).getByRole('button', { name: 'Send' })).toBeVisible();
});

test('cross-origin <kai-form> submit reaches the host onSubmit', async ({ page }) => {
  await page.goto(`${HOST}/`);
  await waitForState(page, 'open');

  const f = frame(page);
  await f.getByLabel('Email').fill('user@example.com');
  await f.getByRole('button', { name: 'Send' }).click();

  // The submit crosses the origin boundary, passes the host's origin+source+nonce
  // +schema gates, and is routed through CardPolicy.onSubmit → logged.
  await expect.poll(async () => (await routedEvents(page)).some((e) => e.kind === 'submit')).toBe(true);
  const events = await routedEvents(page);
  const submit = events.find((e) => e.kind === 'submit');
  expect(submit?.cardId).toBe('host-form-1');
  expect((submit?.data as Record<string, unknown>)?.email).toBe('user@example.com');
});

test('auto-height: the host iframe grows when the framed card grows', async ({ page }) => {
  // Use the self-contained info card whose <details> forecast toggle deterministically
  // grows the content height — the runtime reports a larger `resize`, and the host
  // SDK enlarges the iframe (measured via clientHeight; jsdom has no layout, so this
  // is the value-add of the real-browser matrix).
  await page.goto(`${HOST}/?card=info`);
  await waitForState(page, 'open');

  const iframe = page.locator('#card iframe');
  await expect(iframe).toBeVisible();
  await page.waitForTimeout(400); // let the initial resize settle
  const before = await iframe.evaluate((el) => (el as HTMLIFrameElement).clientHeight);
  expect(before).toBeGreaterThan(0);

  // Expand the forecast <details> → card grows → resize → host enlarges the iframe.
  await frame(page).locator('summary').click();

  await expect
    .poll(async () => iframe.evaluate((el) => (el as HTMLIFrameElement).clientHeight), { timeout: 5_000 })
    .toBeGreaterThan(before);
});

test('theme push: toggling host theme re-themes the framed card live', async ({ page }) => {
  // The info card paints its own light/dark surface from host.context().theme, so a
  // theme push re-renders it with a different background — measurable across origins.
  await page.goto(`${HOST}/?card=info`);
  await waitForState(page, 'open');

  const region = frame(page).getByRole('region', { name: /Weather/ });
  const bgBefore = await region.evaluate((el) => getComputedStyle(el).backgroundColor);

  // Toggle host theme → host re-pushes `context` → runtime re-renders → new surface.
  await page.getByRole('button', { name: 'Toggle theme' }).click();

  await expect
    .poll(async () => region.evaluate((el) => getComputedStyle(el).backgroundColor), { timeout: 5_000 })
    .not.toBe(bgBefore);
});

test('wrong-origin / wrong-nonce postMessage is ignored by the host', async ({ page }) => {
  await page.goto(`${HOST}/`);
  await waitForState(page, 'open');

  const before = (await routedEvents(page)).length;
  // The "Inject wrong-origin message" button posts a forged up-frame to the host
  // window with a bogus nonce. Origin+source+nonce pinning must drop it.
  await page.getByRole('button', { name: 'Inject wrong-origin message' }).click();
  await page.waitForTimeout(300);
  const after = (await routedEvents(page)).length;
  expect(after).toBe(before);
  // And specifically: no forged submit leaked through.
  expect((await routedEvents(page)).some((e) => (e.data as Record<string, unknown>)?.hacked)).toBe(false);
});

test('bad src → handshake times out → inline fallback + Retry', async ({ page }) => {
  await page.goto(`${HOST}/?bad=1`);
  // The provider path 404s, the iframe never replies ready, the handshake times
  // out (1.5s in the host page), and the SDK swaps in the inline fallback.
  await waitForState(page, 'error');
  const fallback = page.locator('#card [data-kc-remote-fallback]');
  await expect(fallback).toBeVisible();
  await expect(fallback.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('self-contained display card renders without a round-trip (only ready)', async ({ page }) => {
  await page.goto(`${HOST}/?card=info`);
  await waitForState(page, 'open');
  // The weather card renders rich read-only content...
  await expect(frame(page).getByRole('region', { name: /Weather/ })).toBeVisible();
  // ...and emits nothing routable beyond the lifecycle (no submit/action).
  await page.waitForTimeout(300);
  const events = await routedEvents(page);
  expect(events.some((e) => e.kind === 'submit' || e.kind === 'action')).toBe(false);
});
