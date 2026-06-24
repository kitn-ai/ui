import { test, expect, type Page } from '@playwright/test';

/**
 * IVP (Independent Visual Proof) for the cascading-menu primitives —
 * Dropdown + DropdownSub/SubTrigger/SubContent, DropdownSeparator,
 * DropdownLabel, DropdownCheckboxItem.
 *
 * Drives the REAL CascadingMenu story rendered by Storybook with native pointer
 * and keyboard events: portal positioning, submenu open-on-hover, ArrowRight to
 * enter the sub, and the in-place checkbox toggle — none of which jsdom can do.
 *
 * The Solid story renders into the light DOM (no shadow root), so locators query
 * the document directly; portaled menus mount under the Storybook root.
 *
 * Run: `npx playwright test --config playwright.menu.config.ts`
 */

const STORY = '/iframe.html?id=solid-advanced-primitives-dropdown--cascading-menu&viewMode=story';

function trigger(page: Page) {
  return page.getByRole('button', { name: 'Add' });
}
function menus(page: Page) {
  return page.locator('[role="menu"]');
}

test.describe('cascading-menu IVP', () => {
  test('open → sub opens on hover with 3 items → Web search toggles in place', async ({ page }) => {
    await page.goto(STORY);
    await expect(trigger(page)).toBeVisible();

    // 1) Open the root menu — the labelled section + top-level items appear.
    await trigger(page).click();
    await expect(menus(page).first()).toBeVisible();
    await expect(page.getByText('Actions', { exact: true })).toBeVisible(); // DropdownLabel
    await expect(page.getByRole('menuitem', { name: 'Add files or photos' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Add from GitHub' })).toBeVisible();
    await expect(page.getByText('⌘U')).toBeVisible(); // trailing shortcut span

    // The checkbox item starts checked (story seeds Web search = on).
    const webSearch = page.getByRole('menuitemcheckbox', { name: 'Web search' });
    await expect(webSearch).toBeVisible();
    await expect(webSearch).toHaveAttribute('aria-checked', 'true');

    // 2) Hover the "Skills" subtrigger → its submenu (a 2nd role=menu) appears
    //    with exactly the 3 nested items. `exact` so it doesn't also match
    //    "Manage skills".
    const skills = page.getByRole('menuitem', { name: 'Skills', exact: true });
    await expect(skills).toHaveAttribute('aria-haspopup', 'menu');
    await skills.hover();
    await expect(skills).toHaveAttribute('aria-expanded', 'true');
    await expect(menus(page)).toHaveCount(2); // root + sub
    await expect(page.getByRole('menuitem', { name: 'skill-creator' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Manage skills' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Add skill' })).toBeVisible();

    // Move the pointer back onto a root item — the sub closes (deferred, tolerant
    // of crossing the gap), leaving a single open menu.
    await page.getByRole('menuitem', { name: 'Add from GitHub' }).hover();
    await expect(menus(page)).toHaveCount(1);

    // 3) Click "Web search" → aria-checked flips to false, and the MENU STAYS OPEN.
    await webSearch.click();
    await expect(webSearch).toHaveAttribute('aria-checked', 'false');
    await expect(menus(page).first()).toBeVisible(); // still open after a checkbox toggle

    // Reopen the submenu so the screenshot captures the cascading shape.
    await skills.hover();
    await expect(menus(page)).toHaveCount(2);
    await expect(page.getByRole('menuitem', { name: 'skill-creator' })).toBeVisible();

    await page.screenshot({ path: 'spike-screens/menu-cascading.png' });
  });

  test('keyboard: ArrowRight opens the sub and focuses its first item; ArrowLeft returns', async ({ page }) => {
    await page.goto(STORY);
    await expect(trigger(page)).toBeVisible();

    // Open with the keyboard (focus the trigger, press Enter) — focus lands on
    // the first item.
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(menus(page).first()).toBeVisible();

    // Walk down to the Skills subtrigger, open it with ArrowRight.
    const skills = page.getByRole('menuitem', { name: 'Skills', exact: true });
    await skills.focus();
    await page.keyboard.press('ArrowRight');
    await expect(skills).toHaveAttribute('aria-expanded', 'true');
    await expect(menus(page)).toHaveCount(2);
    // Focus moved INTO the sub's first item.
    await expect(page.getByRole('menuitem', { name: 'skill-creator' })).toBeFocused();

    // ArrowLeft closes the sub and returns focus to the subtrigger.
    await page.keyboard.press('ArrowLeft');
    await expect(skills).toHaveAttribute('aria-expanded', 'false');
    await expect(menus(page)).toHaveCount(1);
    await expect(skills).toBeFocused();

    // Escape closes the whole menu.
    await page.keyboard.press('Escape');
    await expect(menus(page)).toHaveCount(0);
  });
});

// ── kai-menu web component IVP ───────────────────────────────────────────────

const KAI_MENU_STORY = '/iframe.html?id=spikes-kai-menu--plus-menu&viewMode=story';

/** Install a capture for kai-select events on the <kai-menu> host element.
 *  Mirrors the captureSubmit helper in composer-ivp.spec.ts. */
async function captureSelect(page: Page) {
  await page.evaluate(() => {
    const host = document.querySelector('kai-menu');
    (window as unknown as { __selects: unknown[] }).__selects = [];
    host?.addEventListener('kai-select', (e) => {
      (window as unknown as { __selects: unknown[] }).__selects.push(
        (e as CustomEvent).detail,
      );
    });
  });
}

async function readSelects(page: Page) {
  return page.evaluate(() => (window as unknown as { __selects: unknown[] }).__selects);
}

test.describe('kai-menu web component IVP', () => {
  test('open → menu items render correctly', async ({ page }) => {
    await page.goto(KAI_MENU_STORY);

    // The trigger button should be visible (shadow DOM is pierced by Playwright).
    const triggerBtn = page.locator('kai-menu').getByRole('button');
    await expect(triggerBtn).toBeVisible();

    // Click the trigger to open the menu.
    await triggerBtn.click();

    // Root menu appears with the expected items.
    const menu = page.locator('[role="menu"]').first();
    await expect(menu).toBeVisible();
    await expect(page.getByText('Actions', { exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Add files or photos/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Add from GitHub/ })).toBeVisible();
    await expect(page.getByText('⌘U')).toBeVisible();

    // Checkbox item starts checked.
    const webSearch = page.getByRole('menuitemcheckbox', { name: /Web search/ });
    await expect(webSearch).toBeVisible();
    await expect(webSearch).toHaveAttribute('aria-checked', 'true');
  });

  test('click "Add from GitHub" emits kai-select with correct id', async ({ page }) => {
    await page.goto(KAI_MENU_STORY);

    const triggerBtn = page.locator('kai-menu').getByRole('button');
    await expect(triggerBtn).toBeVisible();
    await captureSelect(page);

    await triggerBtn.click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();

    // Click the "Add from GitHub" item.
    await page.getByRole('menuitem', { name: /Add from GitHub/ }).click();

    // Menu closes after selection.
    await expect(page.locator('[role="menu"]')).toHaveCount(0);

    // kai-select was fired with the correct id.
    const selects = await readSelects(page);
    expect(selects).toHaveLength(1);
    expect((selects[0] as { id: string }).id).toBe('add-github');
  });

  test('Skills submenu opens and shows nested items', async ({ page }) => {
    await page.goto(KAI_MENU_STORY);

    const triggerBtn = page.locator('kai-menu').getByRole('button');
    await expect(triggerBtn).toBeVisible();

    await triggerBtn.click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();

    // Hover the Skills subtrigger to open the submenu.
    const skills = page.getByRole('menuitem', { name: /Skills/, exact: false }).filter({ hasNotText: 'skill-creator' }).first();
    await skills.hover();
    await expect(skills).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[role="menu"]')).toHaveCount(2);

    await expect(page.getByRole('menuitem', { name: 'skill-creator' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Manage skills' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Add skill' })).toBeVisible();
  });

  test('clicking "Web search" checkbox emits kai-select with checked: false', async ({ page }) => {
    await page.goto(KAI_MENU_STORY);

    const triggerBtn = page.locator('kai-menu').getByRole('button');
    await expect(triggerBtn).toBeVisible();
    await captureSelect(page);

    await triggerBtn.click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();

    const webSearch = page.getByRole('menuitemcheckbox', { name: /Web search/ });
    await expect(webSearch).toHaveAttribute('aria-checked', 'true');

    // Click the checkbox — it should NOT close the menu, and the state flips.
    await webSearch.click();
    await expect(webSearch).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('[role="menu"]').first()).toBeVisible(); // menu stays open

    // kai-select fired with id and checked: false (the new state).
    const selects = await readSelects(page);
    expect(selects).toHaveLength(1);
    const detail = selects[0] as { id: string; checked: boolean };
    expect(detail.id).toBe('web-search');
    expect(detail.checked).toBe(false);

    await page.screenshot({ path: 'spike-screens/kai-menu.png' });
  });
});
