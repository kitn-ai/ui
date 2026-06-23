import { test, expect, type Page } from '@playwright/test';

/**
 * Behavioral parity for the prompt input after swapping the <textarea> for the
 * composer: typing, send-button enable/disable, Enter-to-submit + clear,
 * Shift+Enter newline, and disabled state. Runs against the real Solid
 * PromptInput primitives rendered by the variant stories.
 */
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;
const frame = (page: Page) => page.locator('[data-prompt-input]').first();

test('typing enables the send button; Enter submits and clears', async ({ page }) => {
  await page.goto(story('examples-prompt-input-variants--basic-input'));
  await expect(frame(page)).toBeVisible();
  const send = page.getByRole('button', { name: 'Send message' });
  await expect(send).toBeDisabled(); // empty

  await frame(page).click();
  await page.keyboard.type('hello world');
  await expect(frame(page)).toContainText('hello world');
  await expect(send).toBeEnabled();

  await page.keyboard.press('Enter');
  // BasicInput clears value on submit — the editable must reflect it even though
  // it's still focused (the controlled-value effect honors external clears).
  await expect(frame(page)).not.toContainText('hello world');
  await expect(send).toBeDisabled();
});

test('Shift+Enter inserts a newline without submitting', async ({ page }) => {
  await page.goto(story('examples-prompt-input-variants--basic-input'));
  await expect(frame(page)).toBeVisible();
  await frame(page).click();
  await page.keyboard.type('line one');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('line two');
  // Both lines remain (not submitted/cleared).
  await expect(frame(page)).toContainText('line one');
  await expect(frame(page)).toContainText('line two');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
});

test('clicking anywhere in the frame focuses the input (cursor-text)', async ({ page }) => {
  await page.goto(story('examples-prompt-input-variants--basic-input'));
  await expect(frame(page)).toBeVisible();
  // Click the frame (not the editable directly) — should focus the editable.
  await frame(page).click({ position: { x: 300, y: 10 } });
  await page.keyboard.type('focused via frame click');
  await expect(frame(page)).toContainText('focused via frame click');
});
