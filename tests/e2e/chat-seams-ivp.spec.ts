import { test, expect, type Page } from '@playwright/test';

/**
 * IVP (Independent Visual Proof) for the SPIKE slotted-shell composition model
 * on <kai-chat>. Drives the real web component rendered by Storybook and proves,
 * in a real browser, that consumer light-DOM is actually assigned to the
 * Solid-rendered shadow slots — something jsdom unit tests structurally cannot.
 *
 * Run: `npx playwright test --config playwright.seams.config.ts`
 * (Storybook must be serving on :6006.)
 */

const STORY = (id: string) => `/iframe.html?id=spikes-chat-seams--${id}&viewMode=story`;

/** Count light-DOM elements actually assigned to each named shadow slot. */
async function assignedCounts(page: Page, names: string[]) {
  return page.evaluate((slotNames) => {
    const host = document.querySelector('kai-chat');
    const root = host?.shadowRoot;
    const out: Record<string, number> = {};
    for (const n of slotNames) {
      const slot = root?.querySelector(`slot[name="${n}"]`) as HTMLSlotElement | null;
      out[n] = slot ? slot.assignedElements().length : -1;
    }
    return out;
  }, names);
}

test.describe('kai-chat composition seams IVP', () => {
  test('INJECT: sidebar + composer-actions + footer project into shadow slots', async ({ page }) => {
    await page.goto(STORY('inject'));
    await expect(page.locator('kai-chat')).toBeVisible();
    await page.waitForTimeout(700); // solid mount + MutationObserver flags the seams
    const counts = await assignedCounts(page, ['sidebar', 'composer-actions', 'footer']);
    expect(counts.sidebar, 'sidebar projected').toBeGreaterThan(0);
    expect(counts['composer-actions'], 'composer-actions projected').toBeGreaterThan(0);
    expect(counts.footer, 'footer projected').toBeGreaterThan(0);
    await page.screenshot({ path: 'spike-screens/seams-inject.png' });
  });

  test('REPLACE(empty): custom empty-state shows on an empty thread', async ({ page }) => {
    await page.goto(STORY('empty-state'));
    await expect(page.locator('kai-chat')).toBeVisible();
    await page.waitForTimeout(700);
    const counts = await assignedCounts(page, ['empty']);
    expect(counts.empty, 'empty-state projected').toBeGreaterThan(0);
    await expect(page.getByText('How can we help?')).toBeVisible();
    await page.screenshot({ path: 'spike-screens/seams-empty.png' });
  });

  test('REPLACE(header+composer): custom form stands in and drives the thread', async ({ page }) => {
    await page.goto(STORY('replace-composer'));
    await expect(page.locator('kai-chat')).toBeVisible();
    await page.waitForTimeout(700);
    const counts = await assignedCounts(page, ['header', 'composer']);
    expect(counts.header, 'custom header projected').toBeGreaterThan(0);
    expect(counts.composer, 'custom composer projected').toBeGreaterThan(0);

    // The slotted <form> owns submit (the data-flow wall) and drives the thread
    // by setting `messages` — prove the new turn renders in the shadow thread.
    await page.locator('form[slot="composer"] input').fill('Show me the breakdown');
    await page.getByTestId('custom-send').click();
    await expect(page.getByText('Show me the breakdown')).toBeVisible();
    await page.screenshot({ path: 'spike-screens/seams-replace.png' });
  });
});
