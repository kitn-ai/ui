/**
 * Probe: the menu SURFACE is as wide as the row it opened from, and the trailing
 * check keeps its reserved separation whatever the surface's width is.
 *
 * WHY A BROWSER: jsdom lays nothing out, so `getBoundingClientRect()` is all zeros
 * there and every width this probe reports is unmeasurable in the unit suite. The unit
 * tests pin the mechanism (`tests/components/dropdown.test.tsx`,
 * `tests/web-components/menu.test.tsx`, `tests/web-components/dropdown.test.tsx`); this
 * file reports the actual pixels.
 *
 * TWO CASES, ONE ROOT CAUSE (a menu is content-sized, so nothing guarantees slack):
 *
 *   A. The assistant block's rail footer — `kai-menu full` (a slotted avatar + name
 *      trigger) beside the settings gear, with the block's own `.rail-footer` /
 *      `.profile` rules. Measured at a 240px, 280px (default) and 380px (widened)
 *      rail, and again after a rail drag WHILE the menu is open. A `full` surface must
 *      be as wide as the trigger it came from, and never narrower than the 15rem
 *      floor. The non-full control (the Labs menu story's shape) must be unchanged:
 *      the floor, no tracked width.
 *
 *   B. The model switcher — the live consumer that was broken. It renders
 *      `<DropdownContent>` with NO class and `<DropdownRadioItem>` rows, so its surface
 *      was content-sized and the checkmark landed flush on the label. Measured as a
 *      gap from the label's right edge to the check's box (the reserved separation)
 *      and to the check icon itself, in the floor case AND in the case where the
 *      widest row is the CHECKED one (where the gap used to be 0 with nothing to
 *      absorb it).
 *
 *   node scripts/probe-menu-surface-width.mjs [--headed] [--label <name>]
 *
 * Baseline (watch it fail): run it, then temporarily set `matchTriggerWidth={false}`
 * in src/web-components/menu/menu.tsx, restore `min-w-[8rem]` + the old
 * `ml-auto flex size-4 ...` check span in src/components/dropdown/dropdown.tsx, and run
 * it again. The A-rows collapse to the floor and the B-gap goes to ~0px.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// The two sheets a real consumer has: `compiled.css` is the sheet every shadow root
// adopts (and the utility classes the Solid path needs), `theme.tokens.css` carries
// the design tokens those utilities resolve against. Both at document level is what
// Storybook and the docs site do.
const COMPILED_CSS = readFileSync(path.join(root, 'src/web-components/compiled.css'), 'utf-8');
const TOKENS_CSS = readFileSync(path.join(root, 'dist/theme.tokens.css'), 'utf-8');

// The footer rules are the ASSISTANT BLOCK'S OWN, copied from
// packages/blocks/blocks/assistant/assistant.css (`.rail-footer`, `.profile`,
// `.profile-trigger`, `.profile-name`, `.profile-caret`) so this measures the shape the
// report was filed against rather than an approximation of it. `.rail` is this probe's
// own: a rail's width is what the workspace shell computes from a drag, and setting it
// directly is the cheapest honest way to be at 240 / 280 / 380.
const FOOTER_CSS = `
  .rail { background: #fff; }
  .rail-footer { display: flex; align-items: center; gap: 0.25rem; padding: 0.5rem; }
  .rail-footer .profile { flex: 1 1 auto; min-width: 0; }
  .rail-footer .settings { flex: 0 0 auto; }
  .profile-trigger { display: flex; align-items: center; gap: 0.5rem; width: 100%; min-width: 0; }
  .profile-name { font-size: 0.8125rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-caret { margin-left: auto; opacity: 0.6; }
  #rail-control .rail-footer { padding: 0.5rem; }
`;

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>menu surface width</title>
<style>${COMPILED_CSS}</style>
<style>${TOKENS_CSS}</style>
<style>${FOOTER_CSS}</style>
</head>
<body>
  <div class="rail" id="rail" style="width:280px">
    <div class="rail-footer">
      <kai-menu id="account" class="profile" full label="Account menu, Demo User">
        <span slot="trigger" class="profile-trigger">
          <kai-avatar fallback="DU" size="sm" alt="Demo User"></kai-avatar>
          <span class="profile-name">Demo User</span>
          <kai-icon name="chevron-up" class="profile-caret"></kai-icon>
        </span>
      </kai-menu>
      <kai-menu id="gear" class="settings" trigger-icon="settings" label="Settings"></kai-menu>
    </div>
  </div>

  <div class="rail" id="rail-control" style="width:380px">
    <div class="rail-footer">
      <kai-menu id="account-nonfull" class="profile" label="Account menu, Demo User">
        <span slot="trigger" class="profile-trigger">
          <kai-avatar fallback="DU" size="sm" alt="Demo User"></kai-avatar>
          <span class="profile-name">Demo User</span>
        </span>
      </kai-menu>
      <kai-menu id="gear-control" class="settings" trigger-icon="settings" label="Settings"></kai-menu>
    </div>
  </div>

  <div id="solid-short"></div>
  <div id="solid-long"></div>

  <script type="module">
    let error = null;
    try {
      await import('/src/web-components/menu/menu.tsx');
      await import('/src/web-components/avatar/avatar.tsx');
      await import('/src/web-components/icon/icon.tsx');

      const ACCOUNT = [
        { heading: true, label: 'Account' },
        { id: 'settings', label: 'Account settings' },
        { id: 'upgrade', label: 'Upgrade plan' },
        { id: 'sign-out', label: 'Sign out' },
      ];
      const account = document.getElementById('account');
      account.items = ACCOUNT.slice();
      const nonfull = document.getElementById('account-nonfull');
      nonfull.items = ACCOUNT.slice();
      const gear = document.getElementById('gear');
      gear.items = [{ id: 'theme-light', label: 'Light', radioGroup: 'theme', checked: true }, { id: 'theme-dark', label: 'Dark', radioGroup: 'theme' }];
      const gearControl = document.getElementById('gear-control');
      gearControl.items = gear.items;

      // The Solid path: the same ModelSwitcher a light-DOM SolidJS consumer renders.
      const [{ render }, { createComponent }, { ModelSwitcher }] = await Promise.all([
        import('solid-js/web'),
        import('solid-js'),
        import('/src/components/model/model-switcher.tsx'),
      ]);
      const mountModels = (hostId, models, currentModelId, cls) => {
        const host = document.getElementById(hostId);
        render(() => createComponent(ModelSwitcher, {
          models, currentModelId, class: cls, defaultOpen: true, onModelChange: () => {},
        }), host);
      };
      mountModels('solid-short', [
        { id: 'mock-standard', name: 'Mock Standard', description: 'Fast default' },
        { id: 'mock-max', name: 'Mock Max', description: 'Bigger context' },
      ], 'mock-standard', 'probe-short');
      // The CHECKED row is the widest one, which is the case where nothing but the
      // reserved separation can keep the check off its label.
      mountModels('solid-long', [
        { id: 'mock-standard', name: 'Mock Standard', description: 'A description long enough to push this row past the menu width floor' },
        { id: 'mock-max', name: 'Mock Max', description: 'Bigger context' },
      ], 'mock-standard', 'probe-long');

      window.__setRail = (width) => { document.getElementById('rail').style.width = width + 'px'; };
      window.__openAccount = () => { document.getElementById('account').show(); document.getElementById('account-nonfull').show(); };
      window.__probeReady = true;
    } catch (e) { error = String((e && e.stack) || e); }

    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: Number(r.x.toFixed(2)), width: Number(r.width.toFixed(2)), right: Number(r.right.toFixed(2)) };
    };
    const shadow = (id) => document.getElementById(id).shadowRoot;
    const surface = (id) => shadow(id).querySelector('[role="menu"]');
    const trigger = (id) => shadow(id).querySelector('[aria-haspopup="menu"]');

    /** One rail footer, at whatever width the rail currently has. */
    window.__rail = (id, railId) => {
      const menu = surface(id);
      const rail = document.getElementById(railId);
      return {
        railWidth: rect(rail).width,
        host: rect(document.getElementById(id)),
        trigger: rect(trigger(id)),
        surface: menu ? rect(menu) : null,
        surfaceInlineWidth: menu ? (menu.style.width || null) : null,
        surfaceComputedMinWidth: menu ? getComputedStyle(menu).minWidth : null,
        surfaceOverflowsRail: menu ? Number((rect(menu).right - rect(rail).right).toFixed(2)) : null,
      };
    };

    /** The model switcher's menu, matched to its trigger by the ARIA wiring. */
    window.__switcher = (triggerSelector) => {
      const trg = document.querySelector(triggerSelector);
      const menu = document.querySelector('[role="menu"][aria-labelledby="' + trg.id + '"]');
      const rows = menu.querySelectorAll('[role="menuitemradio"]');
      const rowOf = (i) => {
        const row = rows[i];
        const label = row.firstElementChild;
        const box = row.lastElementChild;
        const icon = row.querySelector('svg');
        return {
          label: label.textContent,
          checked: row.getAttribute('aria-checked'),
          labelRight: rect(label).right,
          columnClasses: box.className,
          /** The reserved separation: the label's right edge to the check box. */
          boxGap: Number((rect(box).x - rect(label).right).toFixed(2)),
          /** And to the icon itself, which is what the eye reads. */
          iconGap: icon ? Number((rect(icon).x - rect(label).right).toFixed(2)) : null,
        };
      };
      return {
        surfaceWidth: rect(menu).width,
        surfaceComputedMinWidth: getComputedStyle(menu).minWidth,
        checked: rowOf(0),
        unchecked: rowOf(1),
      };
    };
  </script>
</body></html>`;

function servePage() {
  return {
    name: 'probe-page',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) {
          try {
            const html = await server.transformIndexHtml(req.url, PAGE);
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
          } catch (e) { next(e); }
          return;
        }
        next();
      });
    },
  };
}

const server = await createServer({
  root, configFile: false, plugins: [servePage(), solidPlugin()],
  server: { port: 0, strictPort: false }, logLevel: 'warn',
});
await server.listen();
const url = server.resolvedUrls.local[0];

const labelArg = process.argv.indexOf('--label');
const LABEL = labelArg === -1 ? 'run' : process.argv[labelArg + 1];

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
let failed = false;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} (${detail})`);
  if (!ok) failed = true;
};
const near = (a, b, tol = 0.75) => Math.abs(a - b) <= tol;

const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
page.on('pageerror', (e) => console.error('pageerror:', String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__probeReady || window.__probeError, null, { timeout: 60_000 });
await page.evaluate(() => window.__openAccount());
await page.waitForTimeout(250);

console.log(`\n===== ${LABEL} =====`);
console.log('\n== A. the assistant block rail footer (kai-menu full), 240 / 280 / 380 =====');
const byRail = {};
for (const width of [240, 280, 380]) {
  await page.evaluate((w) => window.__setRail(w), width);
  await page.waitForTimeout(250);
  const snap = await page.evaluate(() => window.__rail('account', 'rail'));
  byRail[width] = snap;
  const used = snap.surface.width;
  console.log(`rail ${width}: ${JSON.stringify(snap)}`);
  check(`rail ${width}: the surface is never narrower than the 15rem floor`,
    snap.surface.width >= 239.5, `surface ${snap.surface.width}px`);
  check(`rail ${width}: the surface takes its width from the trigger (tracked) or the floor, never from its content`,
    used === Math.max(snap.trigger.width, 240) && snap.surfaceInlineWidth === `${snap.trigger.width}` + 'px',
    `inline ${snap.surfaceInlineWidth}, used ${snap.surface.width}px = max(trigger ${snap.trigger.width}px, floor 240px)`);
}
check('widened rail (380): the surface is the SAME WIDTH as the trigger it came from',
  near(byRail[380].surface.width, byRail[380].trigger.width),
  `surface ${byRail[380].surface.width}px vs trigger ${byRail[380].trigger.width}px`);
check('the floor still governs where the row is narrower than 15rem (240 and 280 rails)',
  byRail[240].surface.width === 240 && byRail[280].surface.width === 240,
  `240 rail -> ${byRail[240].surface.width}px, 280 rail -> ${byRail[280].surface.width}px (row ${byRail[280].trigger.width}px)`);
check('240px rail (MUST NOT BREAK): the floor holds the surface at 240px',
  byRail[240].surfaceComputedMinWidth === '240px',
  `computed min-width ${byRail[240].surfaceComputedMinWidth}, used ${byRail[240].surface.width}px`);

console.log('\n== A2. the rail is dragged wider WHILE the menu is open =====');
await page.evaluate((w) => window.__setRail(w), 280);
await page.waitForTimeout(150);
const openBefore = await page.evaluate(() => window.__rail('account', 'rail'));
await page.evaluate((w) => window.__setRail(w), 380);
await page.waitForTimeout(400);
const openAfter = await page.evaluate(() => window.__rail('account', 'rail'));
console.log(`open at 280: ${JSON.stringify(openBefore)}`);
console.log(`same open menu at 380: ${JSON.stringify(openAfter)}`);
check('an OPEN surface follows the trigger as the rail widens',
  near(openAfter.surface.width, openAfter.trigger.width) && openAfter.surface.width > openBefore.surface.width,
  `${openBefore.surface.width}px -> ${openAfter.surface.width}px (trigger ${openAfter.trigger.width}px)`);

console.log('\n== A3. non-full control (the Labs menu story shape) in a 380px rail =====');
const control = await page.evaluate(() => window.__rail('account-nonfull', 'rail-control'));
console.log(JSON.stringify(control));
check('a NON-full trigger writes no width and keeps the floor',
  control.surface !== null && control.surfaceInlineWidth === null && control.surfaceComputedMinWidth === '240px',
  `inline ${control.surfaceInlineWidth}, computed min-width ${control.surfaceComputedMinWidth}, used ${control.surface && control.surface.width}px in a ${control.railWidth}px rail`);

console.log('\n== B. the model switcher (DropdownContent with NO class) =====');
const shortRows = await page.evaluate(() => window.__switcher('.probe-short'));
console.log(`short rows: ${JSON.stringify(shortRows)}`);
const longRows = await page.evaluate(() => window.__switcher('.probe-long'));
console.log(`CHECKED ROW IS THE WIDEST: ${JSON.stringify(longRows)}`);
check('short rows (inside the floor): the check keeps its reserved separation',
  shortRows.checked.iconGap >= 15.5,
  `icon gap ${shortRows.checked.iconGap}px (box gap ${shortRows.checked.boxGap}px of slack at the floor)`);
// THE MEASUREMENT THE WHOLE COLUMN EXISTS FOR: the widest row has no slack, so the
// separation can only come from the column's own reserve. `boxGap` is 0 there by
// construction (the box starts where the label ends and carries the 16px inside it),
// which is why the number to read is the ICON's distance from the label.
check('CHECKED WIDEST ROW (the case that used to be flush): the check still clears its label',
  longRows.checked.iconGap >= 15.5,
  `icon gap ${longRows.checked.iconGap}px (box gap ${longRows.checked.boxGap}px; surface ${longRows.surfaceWidth}px is content-sized, floor ${longRows.surfaceComputedMinWidth})`);
check('the checked and unchecked columns are the same width, so rows do not shift',
  longRows.checked.columnClasses === longRows.unchecked.columnClasses,
  `${longRows.checked.columnClasses} === ${longRows.unchecked.columnClasses}`);

await browser.close();
await server.close();
console.log(`\n${failed ? 'FAILED' : 'ALL CHECKS PASSED'}`);
process.exit(failed ? 1 : 0);
