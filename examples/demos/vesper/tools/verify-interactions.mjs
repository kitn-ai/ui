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
// Read the expectation off the page rather than naming a colorway here:
// colorway names are written to match their photographs and change with them.
// The swatch's own aria-label says which colour it is, and the photograph it
// selects must be the file named after that colour -- which is also the
// mismatch ("Camel" over a black coat) this collection was rewritten to fix.
const swatchName = (await page.locator('.swatch').nth(1).getAttribute('aria-label')) ?? '';
const swatchSlug = swatchName.toLowerCase().split(' ')[0];
const shownPhoto = (await page.locator('.config-photo img').getAttribute('src')) ?? '';
check(
  'swatch swaps to the photograph named after that colour',
  shownPhoto.includes(swatchSlug) && swatchSlug.length > 0,
  `swatch "${swatchName}" showed ${shownPhoto}`,
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
await page.goto(`${origin}/shop/the-coat`, { waitUntil: 'networkidle' });
await page.locator('.piece-guide-link').click();
await page.waitForSelector('.guide');
await page.keyboard.press('Escape');
await page.waitForSelector('.guide', { state: 'detached' });
const afterGuide = await wheelScroll();
check('the page scrolls after closing the size guide', afterGuide > 100, `scrollY ${afterGuide}`);

// --- every card leads to what it advertised ---
// A product card promises a garment with a photograph. Landing on a different
// photograph reads as a broken link even though the href was right. This broke
// once because the configurator kept the previous piece's colorway across a
// param change, and both pieces happened to have a "Black".
await page.goto(`${origin}/shop`, { waitUntil: 'networkidle' });
const shopCards = await page.locator('.shop-card').evaluateAll((as) =>
  as.map((a) => ({ href: a.getAttribute('href'), img: a.querySelector('img')?.getAttribute('src') })),
);
check('the shop lists every piece with a photograph', shopCards.every((c) => c.href && c.img), '');

let inconsistent = [];
for (const card of shopCards) {
  await page.goto(origin + card.href, { waitUntil: 'networkidle' });
  const landed = await page.locator('.config-photo img').getAttribute('src');
  if (landed !== card.img) inconsistent.push(`${card.href}: card ${card.img} -> page ${landed}`);

  // and every "also in this family" card, followed for real
  const family = await page.locator('.piece-strip-card[href^="/shop/"]').evaluateAll((as) =>
    as.map((a) => ({ href: a.getAttribute('href'), img: a.querySelector('img')?.getAttribute('src') })),
  );
  for (const f of family) {
    await page.locator(`.piece-strip-card[href="${f.href}"]`).first().scrollIntoViewIfNeeded();
    await page.locator(`.piece-strip-card[href="${f.href}"]`).first().click();
    // Poll the path, not waitForURL: client-side routing fires no load event,
    // so waitForURL's default 'load' wait never resolves.
    await page.waitForFunction((p) => location.pathname === p, f.href, { timeout: 5000 });
    await page.waitForTimeout(300);
    const shown = await page.locator('.config-photo img').getAttribute('src');
    if (shown !== f.img) inconsistent.push(`${card.href} -> ${f.href}: card ${f.img} -> page ${shown}`);
    await page.goBack({ waitUntil: 'networkidle' });
  }
}
check(
  'every product card leads to the photograph it showed',
  inconsistent.length === 0,
  inconsistent.slice(0, 3).join(' | '),
);

// --- lookbook cards lead to the look they showed ---
await page.goto(`${origin}/lookbook`, { waitUntil: 'networkidle' });
const lookCards = await page.locator('.look-card').evaluateAll((as) =>
  as.map((a) => ({ href: a.getAttribute('href'), img: a.querySelector('img')?.getAttribute('src') })),
);
let lookMismatch = [];
for (const l of lookCards) {
  await page.goto(origin + l.href, { waitUntil: 'networkidle' });
  const shown = await page.locator('.look-figure img').getAttribute('src');
  if (shown !== l.img) lookMismatch.push(`${l.href}: card ${l.img} -> page ${shown}`);
}
check(
  'every lookbook card leads to the photograph it showed',
  lookMismatch.length === 0,
  lookMismatch.slice(0, 3).join(' | '),
);

// --- the header must actually gain its scrolled state ---
// This failed silently three ways: a `let` ref made the observer's effect
// never run, an unflushed signal write left the DOM unchanged, and the
// ClassValue object form never applied the conditional class. Each left the
// nav as bare text lying on top of photographs.
await page.goto(`${origin}/shop`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const headerAtRest = await page.locator('.site-header').getAttribute('class');
check('the header is bare at the top of the page', !headerAtRest.includes('scrolled'), headerAtRest);

await page.mouse.move(640, 450);
await page.mouse.wheel(0, 800);
await page.waitForTimeout(900);

const headerScrolled = await page.locator('.site-header').getAttribute('class');
check('the header gains its scrolled state', headerScrolled.includes('scrolled'), headerScrolled);

const backdrop = await page.locator('.site-header').evaluate((e) => getComputedStyle(e).backdropFilter);
check('the scrolled header is glass, so the nav is readable over photographs',
  backdrop !== 'none' && backdrop !== '', backdrop);

const capsule = await page.locator('.site-links').evaluate((e) => {
  const cs = getComputedStyle(e);
  return { bg: cs.backgroundColor, alpha: Number((cs.backgroundColor.match(/[\d.]+\)$/) || ['1)'])[0].slice(0, -1)) };
});
check('the nav links gather into a capsule', capsule.alpha > 0.1, JSON.stringify(capsule));

const lozenge = await page.locator('.site-links-pill').evaluate((e) => ({
  opacity: Number(getComputedStyle(e).opacity),
  width: parseFloat(getComputedStyle(e).width),
}));
check('a lozenge marks the current route', lozenge.opacity > 0.5 && lozenge.width > 20, JSON.stringify(lozenge));

check('no page errors or hydration misses', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

for (const c of checks)
  console.log(`${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ` -- ${c.detail}` : ''}`);
const failed = checks.filter((c) => !c.pass).length;
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${checks.length} interaction checks passed`);
process.exit(failed ? 1 : 0);
