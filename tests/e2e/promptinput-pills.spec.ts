import { test, expect, type Page } from '@playwright/test';

/**
 * IVP: rich entity pills inside the REAL <kai-prompt-input> element.
 * `/` inserts a skill pill, `@` inserts an agent pill, and kai-submit carries
 * the structured doc + entities (kind + id) alongside the flattened value.
 */
const STORY = '/iframe.html?id=components-promptinput--with-entity-pills&viewMode=story';

const editable = (p: Page) => p.locator('[data-kai-composer-editable]').first();
const pills = (p: Page) => p.locator('[data-kai-entity]');
const options = (p: Page) => p.locator('[role="option"]');

test('/ inserts a skill pill, @ inserts an agent pill, submit carries the structured doc', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();

  // Capture kai-submit on the host element.
  await page.evaluate(() => {
    const host = document.querySelector('kai-prompt-input')!;
    (window as unknown as { __submit: unknown }).__submit = null;
    host.addEventListener('kai-submit', (e) => {
      (window as unknown as { __submit: unknown }).__submit = (e as CustomEvent).detail;
    });
  });

  await editable(page).click();

  // `/` → skill menu → select "Record & Replay"
  await page.keyboard.type('/');
  await expect(options(page).first()).toBeVisible();
  await expect(page.getByRole('option', { name: 'Record & Replay' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(1);
  await expect(pills(page).first()).toContainText('Record & Replay');

  // Some text, then `@` → agent menu → select "Code Reviewer"
  await page.keyboard.type(' review this ');
  await page.keyboard.type('@');
  await expect(page.getByRole('option', { name: 'Code Reviewer' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(2);

  await page.locator('kai-prompt-input').screenshot({ path: 'tests/e2e/__screenshots__/promptinput/after/with-entity-pills.png' });

  // Submit (menu closed) → kai-submit carries doc + entities.
  await page.keyboard.press('Enter');
  const detail = await page.evaluate(() => (window as unknown as {
    __submit: { value: string; entities: { kind: string; id: string }[]; doc: { type: string }[] } | null;
  }).__submit);

  expect(detail).not.toBeNull();
  expect(detail!.entities.map((e) => `${e.kind}:${e.id}`)).toEqual(['skill:record-replay', 'agent:code-reviewer']);
  // Flattened value uses each entity's promptText.
  expect(detail!.value).toContain('Use the Record & Replay skill.');
  expect(detail!.value).toContain('Hand this to the Code Reviewer agent.');
  expect(detail!.value).toContain('review this');
  // Structured doc preserves both entities as distinct nodes.
  expect(detail!.doc.filter((s) => s.type === 'entity')).toHaveLength(2);
});

test('Backspace deletes a whole pill inside the prompt input', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();
  await editable(page).click();
  await page.keyboard.type('/');
  await expect(options(page).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect(pills(page)).toHaveCount(0);
});
