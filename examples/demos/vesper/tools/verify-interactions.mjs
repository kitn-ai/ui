// Drive the real page in a real browser and assert what a reader would notice.
//
//   node tools/verify-interactions.mjs [origin]
//
// Unit tests cover the cart's arithmetic; they cannot catch a scroll lock that
// is taken and never released, because that lives in an effect's teardown. In
// Solid 2 an effect's cleanup is the function it RETURNS -- onCleanup() inside
// binds to the component owner instead, and a component that never unmounts
// never runs it. That is exactly the shape of bug this file exists to catch.
import { chromium } from 'playwright';

const origin = process.argv[2] ?? 'http://localhost:4330';
const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass, detail });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' || /Hydration key miss|REACTIVITY_HALTED/.test(m.text()))
    errors.push(m.text().slice(0, 200));
});

await page.goto(`${origin}/`, { waitUntil: 'networkidle' });

// --- hydration actually happened ---
await page.locator('.swatch').nth(1).click();
check(
  'swatch swaps the photograph (page is hydrated)',
  (await page.locator('.config-photo img').getAttribute('src'))?.includes('camel') ?? false,
);

// --- add to bag opens the drawer ---
await page.locator('.config-add').click();
await page.waitForSelector('.cart-drawer', { timeout: 4000 });
check('add to bag opens the drawer', true);

const lockedWhileOpen = await page.evaluate(() => getComputedStyle(document.body).overflow);
check('body scroll is locked while the drawer is open', lockedWhileOpen === 'hidden', lockedWhileOpen);

// --- THE REGRESSION: closing must give scrolling back ---
await page.keyboard.press('Escape');
await page.waitForSelector('.cart-drawer', { state: 'detached', timeout: 4000 });

const overflowAfter = await page.evaluate(() => getComputedStyle(document.body).overflow);
check('body overflow is restored after closing', overflowAfter !== 'hidden', overflowAfter);

// A real WHEEL, not window.scrollTo: scrollTo is not blocked by
// `body { overflow: hidden }`, so a scrollTo-based assertion passes whether
// or not the lock is stuck. It proves nothing. Wheel input is what a reader
// uses and what the lock actually stops.
const wheelScroll = async () => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(400);
  return page.evaluate(() => window.scrollY);
};

const scrolled = await wheelScroll();
check('the page actually scrolls after closing the drawer', scrolled > 100, `scrollY ${scrolled}`);

// --- and again via the scrim, not just Escape ---
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('.bag').click();
await page.waitForSelector('.cart-drawer');
await page.locator('.cart-scrim').click({ position: { x: 10, y: 10 } });
await page.waitForSelector('.cart-drawer', { state: 'detached' });
const scrolledAgain = await wheelScroll();
check('the page scrolls after closing via the scrim', scrolledAgain > 100, `scrollY ${scrolledAgain}`);

// --- the size guide takes no lock it fails to release ---
await page.goto(`${origin}/shop/wool-coat`, { waitUntil: 'networkidle' });
await page.locator('.piece-guide-link').click();
await page.waitForSelector('.guide');
await page.keyboard.press('Escape');
await page.waitForSelector('.guide', { state: 'detached' });
const afterGuide = await wheelScroll();
check('the page scrolls after closing the size guide', afterGuide > 100, `scrollY ${afterGuide}`);

check('no page errors or hydration misses', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

for (const c of checks)
  console.log(`${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ` -- ${c.detail}` : ''}`);
const failed = checks.filter((c) => !c.pass).length;
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${checks.length} interaction checks passed`);
process.exit(failed ? 1 : 0);
