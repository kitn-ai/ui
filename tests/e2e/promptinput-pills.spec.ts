import { test, expect, type Page } from '@playwright/test';

/**
 * IVP: rich entity pills inside the REAL <kai-prompt-input>, Codex-style.
 * `@` opens a SECTIONED menu (Plugins / Agents) with per-item descriptions;
 * filtering keeps sections; selecting inserts an atomic pill; kai-submit carries
 * the structured doc + entities (each with its kind + id). `/` inserts skills.
 */
const STORY = '/iframe.html?id=components-promptinput--with-entity-pills&viewMode=story';
const SHOTS = 'tests/e2e/__screenshots__/promptinput/after';

const editable = (p: Page) => p.locator('[data-kai-composer-editable]').first();
const pills = (p: Page) => p.locator('[data-kai-entity]');
const options = (p: Page) => p.locator('[role="option"]');

async function captureSubmit(page: Page) {
  await page.evaluate(() => {
    const host = document.querySelector('kai-prompt-input')!;
    (window as unknown as { __submit: unknown }).__submit = null;
    host.addEventListener('kai-submit', (e) => {
      (window as unknown as { __submit: unknown }).__submit = (e as CustomEvent).detail;
    });
  });
}

test('@ opens a sectioned menu (Plugins/Agents) with descriptions; select inserts a pill; submit carries kinds', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();
  await captureSubmit(page);
  await editable(page).click();

  // `@` opens the grouped menu — section headers + a per-item description.
  await page.keyboard.type('@');
  await expect(options(page).first()).toBeVisible();
  await expect(page.getByText('Plugins', { exact: true })).toBeVisible();
  await expect(page.getByText('Agents', { exact: true })).toBeVisible();
  await expect(page.getByText("Record what I'm doing on my Mac and turn it into a Skill")).toBeVisible();

  // Screenshot the open, sectioned menu (the Codex-style flow).
  await page.screenshot({ path: `${SHOTS}/promptinput-menu-open.png` });

  // Filter to "Record & Replay" (a plugin) and select it.
  await page.keyboard.type('rec');
  await expect(page.getByRole('option', { name: /Record & Replay/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(1);
  await expect(pills(page).first()).toContainText('Record & Replay');

  // Some text, then `@` again → pick an agent.
  await page.keyboard.type(' review this ');
  await page.keyboard.type('@code');
  await expect(page.getByRole('option', { name: /Code Reviewer/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(2);

  await page.locator('kai-prompt-input').screenshot({ path: `${SHOTS}/with-entity-pills.png` });

  // Submit → kai-submit carries doc + entities with their distinct kinds.
  await page.keyboard.press('Enter');
  const detail = await page.evaluate(() => (window as unknown as {
    __submit: { value: string; entities: { kind: string; id: string }[]; doc: { type: string }[] } | null;
  }).__submit);

  expect(detail).not.toBeNull();
  expect(detail!.entities.map((e) => `${e.kind}:${e.id}`)).toEqual(['plugin:record-replay', 'agent:code-reviewer']);
  expect(detail!.value).toContain('Use the Record & Replay tool.');
  expect(detail!.value).toContain('review this');
  expect(detail!.doc.filter((s) => s.type === 'entity')).toHaveLength(2);
});

test('the menu excludes an already-inserted entity', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();
  await editable(page).click();
  await page.keyboard.type('@rec');
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(1);
  // Reopen — Record & Replay is gone; other items remain.
  await page.keyboard.type('@');
  await expect(page.getByRole('option', { name: /Documents/ })).toBeVisible();
  await expect(page.getByRole('option', { name: /Record & Replay/ })).toHaveCount(0);
});

test('adjacent pills (a / skill + an @ plugin) are the same height, vertically aligned, with a gap', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();
  await editable(page).click();
  await page.keyboard.type('/sum');
  await expect(page.getByRole('option', { name: /Summarize/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(1);
  await page.keyboard.type('@rec');
  await expect(page.getByRole('option', { name: /Record & Replay/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(2);

  await page.locator('kai-prompt-input').screenshot({ path: `${SHOTS}/adjacent-pills.png` });

  const boxes = await pills(page).evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { left: r.left, right: r.right, height: Math.round(r.height), centerY: Math.round(r.top + r.height / 2) };
    }),
  );
  expect(boxes).toHaveLength(2);
  expect(boxes[0].height).toBe(boxes[1].height);                       // identical height
  expect(Math.abs(boxes[0].centerY - boxes[1].centerY)).toBeLessThanOrEqual(1); // aligned centers
  expect(boxes[1].left - boxes[0].right).toBeGreaterThan(2);           // a real gap between them
});

test('can add many pills — a 3rd/4th does NOT replace an earlier one (the cap bug)', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();
  await editable(page).click();
  for (const [q, ] of [['sum'], ['brain'], ['trans']] as const) {
    await page.keyboard.type(`/${q}`);
    await expect(options(page).first()).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(pills(page)).toHaveCount(3);
  // A 4th (an agent via @) too.
  await page.keyboard.type('@code');
  await expect(page.getByRole('option', { name: /Code Reviewer/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(4);
  // None were replaced — all labels survive.
  for (const label of ['Summarize', 'Brainstorm', 'Translate', 'Code Reviewer']) {
    await expect(editable(page)).toContainText(label);
  }
  await page.locator('kai-prompt-input').screenshot({ path: `${SHOTS}/many-pills.png` });
});

test('Backspace deletes a whole pill inside the prompt input', async ({ page }) => {
  await page.goto(STORY);
  await expect(editable(page)).toBeVisible();
  await editable(page).click();
  await page.keyboard.type('@rec');
  await page.keyboard.press('Enter');
  await expect(pills(page)).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect(pills(page)).toHaveCount(0);
});
