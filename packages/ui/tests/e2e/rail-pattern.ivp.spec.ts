import { test, expect, type Page } from '@playwright/test';

/**
 * IVP for the `conversation-rail` and `command-trigger` patterns.
 *
 * Drives the REAL pattern stories (each renders the installed .html and .js
 * verbatim) with native keyboard and pointer events, which jsdom cannot do
 * across shadow roots: the roving tab stop over nested folder rows, the
 * search palette opening from the header button and Mod+K, focus returning to
 * the trigger on Esc, and the rail not overflowing at 280px.
 *
 * Run: `npm run test:rail-pattern-ivp`
 */

const RAIL = '/iframe.html?id=patterns-conversation-rail--default&viewMode=story';
const TRIGGER = '/iframe.html?id=patterns-command-trigger--default&viewMode=story';

/** The id of the row holding focus, or the tag name when focus is elsewhere. */
async function focusedRow(page: Page): Promise<string> {
  return page.evaluate(() => {
    const a = document.activeElement;
    return a?.tagName === 'KAI-CONVERSATION-ITEM' ? (a.getAttribute('conversation-id') ?? '?') : (a?.tagName ?? 'none');
  });
}

/** Tab from the search button until a row holds focus; returns how many presses it took. */
async function tabIntoRows(page: Page): Promise<number> {
  await page.locator('#search').focus();
  for (let i = 1; i <= 20; i++) {
    await page.keyboard.press('Tab');
    if ((await focusedRow(page)).match(/^[a-z]\d$/)) return i;
  }
  throw new Error('Tab never reached a conversation row');
}

async function open(page: Page, url: string) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.locator('kai-conversations, kai-dialog').first().waitFor({ state: 'attached' });
  return errors;
}

test.describe('conversation-rail pattern', () => {
  test('one tab stop, arrows walk open folders and skip a closed one', async ({ page }) => {
    const errors = await open(page, RAIL);
    await expect(page.locator('kai-conversation-item')).toHaveCount(5);

    await tabIntoRows(page);
    // The tab stop is ONE row: pressing Tab again leaves the rows entirely.
    await page.keyboard.press('Tab');
    expect(await focusedRow(page)).not.toMatch(/^[a-z]\d$/);
    await page.keyboard.press('Shift+Tab');
    expect(await focusedRow(page)).toMatch(/^[a-z]\d$/);

    await page.keyboard.press('Home');
    expect(await focusedRow(page)).toBe('a1');
    const walked: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown');
      walked.push(await focusedRow(page));
    }
    // a1 -> a2 -> k1 crosses from one folder into the next; then the recents.
    expect(walked).toEqual(['a2', 'k1', 'r1', 'r2']);

    // Close the first folder: its rows leave the walk.
    await page.locator('details', { hasText: 'Assistant UI' }).locator('summary').click();
    await tabIntoRows(page);
    await page.keyboard.press('Home');
    expect(await focusedRow(page)).toBe('k1');
    await page.keyboard.press('ArrowUp');
    expect(await focusedRow(page)).toBe('k1');

    expect(errors).toEqual([]);
  });

  test('Enter on a row fires kai-conversation-select', async ({ page }) => {
    await open(page, RAIL);
    await page.evaluate(() => {
      const w = window as unknown as { __sel: string[] };
      w.__sel = [];
      document.querySelector('kai-conversations')!.addEventListener('kai-conversation-select', (e) => w.__sel.push((e as CustomEvent).detail.id));
    });
    await tabIntoRows(page);
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { __sel: string[] }).__sel)).toEqual(['k1']);
  });

  test('search opens the palette, typing filters with a new array, Esc returns focus', async ({ page }) => {
    await open(page, RAIL);
    const dialog = page.locator('kai-dialog');
    const cmd = page.locator('kai-command');
    await page.locator('#search').click();
    await expect(dialog).toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('KAI-COMMAND');

    const all = await cmd.getByRole('option').count();
    expect(all).toBeGreaterThan(2);
    const before = await page.evaluate(() => ((window as unknown as { __items?: unknown }).__items = (document.querySelector('kai-command') as unknown as { items: unknown }).items));
    await page.keyboard.type('kanban');
    await expect(cmd.getByRole('option')).toHaveCount(1);
    await expect(cmd.getByRole('option')).toContainText('Broke the board');
    const swapped = await page.evaluate(() => (document.querySelector('kai-command') as unknown as { items: unknown }).items !== (window as unknown as { __items?: unknown }).__items);
    expect(swapped, 'typing assigned a fresh items array').toBe(true);
    void before;

    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('search');
  });

  test('Mod+K opens the palette and selecting a result activates that row', async ({ page }) => {
    await open(page, RAIL);
    await page.locator('body').click({ position: { x: 600, y: 300 } });
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('kai-dialog')).toHaveAttribute('open', '');
    await page.keyboard.type('recent one');
    await page.keyboard.press('Enter');
    await expect(page.locator('kai-dialog')).not.toHaveAttribute('open', '');
    // The app sets the property in response to the event; no attribute is reflected.
    expect(await page.evaluate(() => (document.querySelector('kai-conversations') as unknown as { activeId: string }).activeId)).toBe('r1');
  });

  test('the collapse button collapses the start aside', async ({ page }) => {
    await open(page, RAIL);
    await page.evaluate(() => {
      const w = window as unknown as { __tog: unknown[] };
      w.__tog = [];
      document.querySelector('kai-workspace')!.addEventListener('kai-aside-toggle', (e) => w.__tog.push((e as CustomEvent).detail));
    });
    await page.locator('#collapse').click();
    expect(await page.evaluate(() => (window as unknown as { __tog: unknown[] }).__tog)).toEqual([{ side: 'start', collapsed: true }]);
  });

  test('280px rail does not scroll horizontally, even with a very long title', async ({ page }) => {
    await open(page, RAIL);
    const m = await page.evaluate(() => {
      const rail = document.querySelector('kai-conversations') as HTMLElement;
      const de = document.scrollingElement!;
      return { doc: de.scrollWidth - de.clientWidth, rail: rail.scrollWidth - rail.clientWidth, width: Math.round(rail.getBoundingClientRect().width) };
    });
    expect(m.doc).toBeLessThanOrEqual(0);
    expect(m.rail).toBeLessThanOrEqual(0);
    expect(m.width).toBeLessThanOrEqual(320);
  });
});

test.describe('command-trigger pattern', () => {
  test('button and Mod+K open it, Esc returns focus to the button', async ({ page }) => {
    const errors = await open(page, TRIGGER);
    await page.locator('#open-search').click();
    await expect(page.locator('kai-dialog')).toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('KAI-COMMAND');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('open-search');

    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('kai-dialog')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('kai-dialog')).not.toHaveAttribute('open', '');
    expect(errors).toEqual([]);
  });
});
