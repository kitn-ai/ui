import { test, expect, type Page } from '@playwright/test';
import {
  BASELINE_PLATFORM,
  BASELINE_SKIP_REASON,
  captureBaseline,
  reportBaselineCaptures,
} from './screenshot-baselines';

/**
 * Captures kai-prompt-input in key states. SHOT names the OUTPUT directory under
 * `__screenshots__/promptinput/` and nothing else — it does NOT select a variant.
 * The textarea→composer swap it was built for has landed, so there is one render,
 * and the default `baseline` is the only directory the suite writes to.
 *
 * CAPTURE-ONLY: nothing here asserts an image, so the captures are artifacts.
 * A plain run writes them beside the evidence tree and compares them against the
 * committed PNGs; `KAI_SCREENSHOT_UPDATE=1` re-records the committed ones. See
 * `screenshot-baselines.ts` for both the shape and the platform rule below.
 */
const SHOT = process.env.SHOT || 'baseline';
const REL = `tests/e2e/__screenshots__/promptinput/${SHOT}`;

// Off darwin the committed baselines hold a different rasteriser's output, so a
// capture here is not comparable to anything. Skips VISIBLY (reported as
// `N skipped`), before a page is loaded.
test.beforeEach(() => {
  test.skip(process.platform !== BASELINE_PLATFORM, BASELINE_SKIP_REASON);
});

test.afterAll(() => reportBaselineCaptures('promptinput-shot'));
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

function host(page: Page) {
  return page.locator('[data-prompt-input]').first();
}

async function shot(page: Page, name: string) {
  await expect(host(page)).toBeVisible();
  // settle layout/fonts
  await page.waitForTimeout(250);
  await captureBaseline(host(page), `${REL}/${name}.png`);
}

test('basic — empty (placeholder)', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--basic-input'));
  await shot(page, 'basic-empty');
});

test('basic — short text', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--basic-input'));
  await expect(host(page)).toBeVisible();
  await host(page).click();
  await page.keyboard.type('Write me a haiku about the sea');
  await shot(page, 'basic-typed');
});

test('basic — long multiline (scroll at max-height)', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--basic-input'));
  await expect(host(page)).toBeVisible();
  await host(page).click();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.type(`Line ${i + 1} of a fairly long multi-line prompt that should grow`);
    await page.keyboard.press('Shift+Enter');
  }
  await shot(page, 'basic-multiline');
});

test('with-suggestions', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--with-suggestions'));
  await shot(page, 'with-suggestions');
});

test('with-action-buttons', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--with-action-buttons'));
  await shot(page, 'with-action-buttons');
});

test('with-file-attachments', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--with-file-attachments'));
  await shot(page, 'with-attachments');
});

test('stoppable-streaming (loading + stop)', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--stoppable-streaming'));
  await shot(page, 'stoppable');
});

test('full-example', async ({ page }) => {
  await page.goto(story('test-fixtures-prompt-input-variants--full-example'));
  await shot(page, 'full-example');
});
