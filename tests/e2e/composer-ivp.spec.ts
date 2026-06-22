import { test, expect, type Page } from '@playwright/test';

/**
 * IVP (Independent Visual Proof) for <kai-composer>.
 *
 * Drives the real web component rendered by Storybook with NATIVE keyboard
 * events — the full `/`-menu → select → pill → submit and atomic-Backspace
 * flows that the jsdom unit tests and synthetic-userEvent story tests cannot
 * reliably prove. Also screenshots the result for visual comparison against the
 * design reference (icon + label pill rendered inline with typed text).
 *
 * Run: `npx playwright test --config playwright.composer.config.ts`
 * (Storybook must be serving on :6006.)
 */

const SKILLS_STORY = '/iframe.html?id=elements-composer--skills&viewMode=story';
const PREFILLED_STORY = '/iframe.html?id=elements-composer--prefilled&viewMode=story';
const DEFAULT_STORY = '/iframe.html?id=elements-composer--default&viewMode=story';

/** Locator for the editable surface inside the element's (open) shadow root.
 *  Playwright pierces open shadow roots automatically. */
function editable(page: Page) {
  return page.locator('[data-kai-composer-editable]');
}
function pills(page: Page) {
  return page.locator('[data-kai-entity]');
}
function menuOptions(page: Page) {
  return page.locator('[role="option"]');
}

/** Install a capture for kai-submit on the host element. */
async function captureSubmit(page: Page) {
  await page.evaluate(() => {
    const host = document.querySelector('kai-composer');
    (window as unknown as { __submits: unknown[] }).__submits = [];
    host?.addEventListener('kai-submit', (e) => {
      (window as unknown as { __submits: unknown[] }).__submits.push(
        (e as CustomEvent).detail,
      );
    });
  });
}

async function readSubmits(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __submits: unknown[] }).__submits,
  );
}

test.describe('kai-composer IVP', () => {
  test('type / → select skill → pill inserted → submit emits structured doc', async ({ page }) => {
    await page.goto(SKILLS_STORY);
    await expect(editable(page)).toBeVisible();
    await captureSubmit(page);

    // Focus the editable and open the skill menu with a real "/" keystroke.
    await editable(page).click();
    await page.keyboard.type('/');

    // The caret-anchored menu appears with the configured skills.
    await expect(menuOptions(page).first()).toBeVisible();
    await expect(page.getByText('Record & Replay')).toBeVisible();

    // Select the first item (Record & Replay) with Enter — must NOT submit.
    await page.keyboard.press('Enter');

    // An atomic entity pill is now present, with the icon + label inline.
    await expect(pills(page)).toHaveCount(1);
    await expect(pills(page).first()).toContainText('Record & Replay');
    await expect(pills(page).first().locator('img')).toBeVisible();
    expect(await readSubmits(page)).toHaveLength(0); // Enter selected, didn't submit

    // Continue typing — reproduces the reference image exactly.
    await page.keyboard.type(" I'm going to show y");

    // Screenshot the reproduced reference (pill + trailing text).
    await page
      .locator('kai-composer')
      .screenshot({ path: 'tests/e2e/__screenshots__/composer-skill-inline.png' });

    // Submit with Enter (menu closed now) → kai-submit fires.
    await page.keyboard.press('Enter');

    const submits = (await readSubmits(page)) as Array<{
      text: string;
      doc: Array<{ type: string; text?: string; entity?: { id: string; kind: string } }>;
      entities: Array<{ id: string }>;
    }>;
    expect(submits).toHaveLength(1);
    const detail = submits[0];
    // Default flatten uses promptText for the skill, then the trailing text.
    expect(detail.text).toBe("Use the Record & Replay skill. I'm going to show y");
    // Structured doc carries the entity reference for downstream expansion.
    expect(detail.doc[0]).toMatchObject({ type: 'entity', entity: { id: 'record-replay', kind: 'skill' } });
    expect(detail.doc[1]).toMatchObject({ type: 'text', text: " I'm going to show y" });
    expect(detail.entities).toHaveLength(1);
    expect(detail.entities[0].id).toBe('record-replay');
  });

  test('a trigger typed immediately after a pill opens the menu (no space needed)', async ({ page }) => {
    await page.goto(SKILLS_STORY);
    await expect(editable(page)).toBeVisible();
    await editable(page).click();
    await page.keyboard.type('/');
    await expect(menuOptions(page).first()).toBeVisible();
    await page.keyboard.press('Enter');             // insert a pill
    await expect(pills(page)).toHaveCount(1);
    // Immediately type '/' again — no leading space — the menu must reopen.
    await page.keyboard.type('/');
    await expect(menuOptions(page).first()).toBeVisible();
  });

  test('the menu excludes skills already added to the field', async ({ page }) => {
    await page.goto(SKILLS_STORY);
    await expect(editable(page)).toBeVisible();
    await editable(page).click();
    await page.keyboard.type('/');
    await expect(page.getByRole('option', { name: 'Record & Replay' })).toBeVisible();
    await page.keyboard.press('Enter');             // add Record & Replay
    await expect(pills(page)).toHaveCount(1);
    // Reopen the menu — Record & Replay must no longer be offered; Summarize still is.
    await page.keyboard.type('/');
    await expect(page.getByRole('option', { name: 'Summarize' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Record & Replay' })).toHaveCount(0);
  });

  test('Backspace removes the whole pill atomically', async ({ page }) => {
    await page.goto(SKILLS_STORY);
    await expect(editable(page)).toBeVisible();

    await editable(page).click();
    await page.keyboard.type('/');
    await expect(menuOptions(page).first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(pills(page)).toHaveCount(1);

    // Caret sits right after the pill (+ its ZWSP). One Backspace deletes it whole.
    await page.keyboard.press('Backspace');
    await expect(pills(page)).toHaveCount(0);
    // The editable is empty text-wise (no stray label characters left behind).
    await expect(editable(page)).toHaveText(/^[​]*$/);
  });

  test('Prefilled doc renders a pill inline with text (reference shape)', async ({ page }) => {
    await page.goto(PREFILLED_STORY);
    await expect(editable(page)).toBeVisible();
    await expect(pills(page)).toHaveCount(1);
    await expect(pills(page).first()).toContainText('Record & Replay');
    await expect(editable(page)).toContainText("I'm going to show y");
    await page
      .locator('kai-composer')
      .screenshot({ path: 'tests/e2e/__screenshots__/composer-prefilled.png' });
  });

  test('placeholder reappears after the field is cleared (bogus <br> handled)', async ({ page }) => {
    await page.goto(DEFAULT_STORY);
    const ed = editable(page);
    await expect(ed).toBeVisible();
    const placeholder = page.getByText('Ask anything…', { exact: true });
    await expect(placeholder).toBeVisible();        // shown while empty
    await ed.click();
    await page.keyboard.type('hello');
    await expect(placeholder).toHaveCount(0);        // hidden while typing
    for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
    await expect(placeholder).toBeVisible();         // reappears once cleared (lone <br> ⇒ empty)
  });

  test('undo/redo steps through pills correctly (custom doc-snapshot history)', async ({ page }) => {
    await page.goto(SKILLS_STORY);
    const ed = editable(page);
    await expect(ed).toBeVisible();
    await ed.click();
    await page.keyboard.type('hello ');
    await page.keyboard.type('/');
    await expect(menuOptions(page).first()).toBeVisible();
    await page.keyboard.press('Enter');            // insert pill
    await expect(pills(page)).toHaveCount(1);
    await page.keyboard.type(' world');
    await expect(ed).toContainText('world');
    await expect(pills(page)).toHaveCount(1);

    // Undo #1: removes " world", pill stays.
    await page.keyboard.press('Meta+z');
    await expect(ed).not.toContainText('world');
    await expect(pills(page)).toHaveCount(1);
    // Undo #2: removes the PILL (native undo left it stuck — this is the core fix).
    await page.keyboard.press('Meta+z');
    await expect(pills(page)).toHaveCount(0);

    // Redo: the pill comes back intact (native redo corrupted ordering).
    await page.keyboard.press('Meta+Shift+z'); // re-add pill step
    await expect(pills(page)).toHaveCount(1);
    await expect(pills(page).first()).toContainText('Record & Replay');
    await page.keyboard.press('Meta+Shift+z'); // re-add " world"
    await expect(ed).toContainText('world');
    await expect(pills(page)).toHaveCount(1);
  });

  test('emits kai-focus/kai-blur on the host; native keydown reaches the host too', async ({ page }) => {
    await page.goto(SKILLS_STORY);
    await expect(editable(page)).toBeVisible();
    await page.evaluate(() => {
      const host = document.querySelector('kai-composer')!;
      const w = window as unknown as { __ev: { focus: number; blur: number; nativeKeydown: number } };
      w.__ev = { focus: 0, blur: 0, nativeKeydown: 0 };
      host.addEventListener('kai-focus', () => { w.__ev.focus++; });
      host.addEventListener('kai-blur', () => { w.__ev.blur++; });
      // keydown is composed → it crosses the shadow boundary to the host natively,
      // so consumers don't need a kai-keydown wrapper.
      host.addEventListener('keydown', () => { w.__ev.nativeKeydown++; });
    });

    await editable(page).click();        // focus
    await page.keyboard.type('x');       // native keydown reaches the host
    await page.mouse.click(2, 2);        // click outside → blur

    const ev = await page.evaluate(() => (window as unknown as {
      __ev: { focus: number; blur: number; nativeKeydown: number };
    }).__ev);

    expect(ev.focus).toBeGreaterThanOrEqual(1);
    expect(ev.blur).toBeGreaterThanOrEqual(1);
    expect(ev.nativeKeydown).toBeGreaterThanOrEqual(1); // composed native keydown reaches the host
  });
});
