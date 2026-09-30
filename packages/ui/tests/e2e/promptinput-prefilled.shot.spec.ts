import { test, type Page } from '@playwright/test';
import {
  BASELINE_PLATFORM,
  BASELINE_SKIP_REASON,
  captureBaseline,
  reportBaselineCaptures,
} from './screenshot-baselines';

/** Screenshot artifact: a <kai-prompt-input> pre-populated via `value` as a
 *  ComposerDoc — seeded skill/agent/plugin pills inside the real input chrome.
 *  Run: `npm run test:shot`
 *
 *  Capture-only, so it skips visibly off darwin and a plain run compares instead
 *  of overwriting the committed PNGs: `KAI_SCREENSHOT_UPDATE=1` re-records them.
 *  See `screenshot-baselines.ts`. */
const STORY = '/iframe.html?id=test-fixtures-prompt-input--prefilled&viewMode=story';
const REL = 'tests/e2e/__screenshots__/pill-skins';

test.beforeEach(() => {
  test.skip(process.platform !== BASELINE_PLATFORM, BASELINE_SKIP_REASON);
});

test.afterAll(() => reportBaselineCaptures('promptinput-prefilled'));

async function shoot(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(STORY);
  await page.locator('[data-kai-entity]').first().waitFor({ state: 'visible' });
  await page.evaluate((s) => {
    document.querySelector('kai-prompt-input')?.setAttribute('theme', s);
    document.body.style.background = s === 'dark' ? '#1a1a1a' : '#ffffff';
    document.body.style.padding = '8px';
  }, scheme);
  await captureBaseline(page.locator('kai-prompt-input'), `${REL}/prefilled-${scheme}.png`);
}

test('prefilled prompt-input — light', async ({ page }) => { await shoot(page, 'light'); });
test('prefilled prompt-input — dark', async ({ page }) => { await shoot(page, 'dark'); });
