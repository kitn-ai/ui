import { test, expect, type Page } from '@playwright/test';

/**
 * Captures kai-prompt-input in key states for before/after visual comparison of
 * the textarea→composer swap. SHOT env var selects the output subdir.
 *   SHOT=baseline → current textarea ; SHOT=after → composer-backed
 */
const SHOT = process.env.SHOT || 'baseline';
const dir = `tests/e2e/__screenshots__/promptinput/${SHOT}`;
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

function host(page: Page) {
  return page.locator('[data-prompt-input]').first();
}

async function shot(page: Page, name: string) {
  await expect(host(page)).toBeVisible();
  // settle layout/fonts
  await page.waitForTimeout(250);
  await host(page).screenshot({ path: `${dir}/${name}.png` });
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
