/**
 * B4 probe: dragging the shell's resize handle actually moves GEOMETRY, and the
 * main region goes back to FULL WIDTH once the dragged aside is collapsed.
 *
 * Drag half: asserts the slotted start aside's `getBoundingClientRect().width`
 * grew by the drag delta and the main region's rect shrank by the same amount —
 * never a state string or an attribute read. Also captures `kai-aside-resize` and
 * checks its reported width matches the measured one.
 *
 * Collapse half (the regression): the drag leaves an inline `flex-basis` on the
 * panel divs (the handle writes it; drag-end converts it to a percentage). When
 * the start aside is then collapsed — `collapseAside('start')`, exactly what the
 * assistant block's collapse button calls — the aside panel and its handle leave
 * the tree, so nothing re-derives the MAIN panel and it keeps the resized basis
 * instead of filling the shell. Asserts the main region's width equals the shell's
 * own width within 2px after the collapse, and prints the inline styles at all
 * three moments so a stale basis is visible by name.
 *
 * CONTROL: the same collapse with NO drag first, which is the sequence that always
 * worked — it must keep passing, so the fix cannot be "widen until green".
 *
 *   node scripts/probe-workspace-shell-resize.mjs [--headed]
 *
 * Watch it fail: no-op the panel's re-derivation on a panel-set change.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>workspace shell resize</title>
<style>html,body{margin:0;height:100%}</style></head>
<body>
  <kai-workspace id="ws" style="display:block;height:100vh">
    <div slot="start" id="rail" style="height:100%">rail</div>
    <div id="main" style="height:100%">main</div>
  </kai-workspace>
  <script type="module">
    let error = null;
    try { await import('/src/web-components/workspace/chat-workspace.tsx'); } catch (e) { error = String((e && e.stack) || e); }
    const ws = document.getElementById('ws');
    window.__resizes = [];
    window.__toggles = [];
    ws.addEventListener('kai-aside-resize', (e) => window.__resizes.push(e.detail));
    ws.addEventListener('kai-aside-toggle', (e) => window.__toggles.push(e.detail));
    await new Promise((r) => setTimeout(r, 500));
    window.__probe = { error };
  </script>
</body></html>`;

/** Same shell with BOTH asides, for the pair-scoping case. */
const PAGE_BOTH = PAGE.replace(
  '    <div id="main"',
  '    <div slot="end" id="notes" style="height:100%">notes</div>\n    <div id="main"',
);

function servePage() {
  return {
    name: 'probe-page',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) {
          const html = req.url.includes('both=1') ? PAGE_BOTH : PAGE;
          server.transformIndexHtml(req.url, html).then((h) => {
            res.setHeader('Content-Type', 'text/html');
            res.end(h);
          }, next);
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

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });

let failed = false;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} (${detail})`);
  if (!ok) failed = true;
};

/** A freshly loaded shell; nothing dragged, nothing collapsed. */
async function openShell(query = '') {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  page.on('pageerror', (e) => console.error('pageerror:', String(e)));
  await page.goto(url + query, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
  const probe = await page.evaluate(() => window.__probe);
  if (probe.error) {
    console.error('module import failed:\n' + probe.error);
    await browser.close(); await server.close(); process.exit(2);
  }
  return page;
}

/**
 * Everything the panel geometry lives in, for ONE moment: the shell's and main
 * region's rects, the end aside and handle metrics, and each panel div's rect plus
 * its inline `flex-basis`/`flex-grow`/`flex-shrink`. The stale value after a collapse
 * is a PANEL INLINE STYLE, so the probe prints it by name rather than inferring it.
 */
const snapshot = (page, label) => page.evaluate((l) => {
  const ws = document.getElementById('ws');
  const shadow = ws.shadowRoot;
  const panel = (name) => {
    const el = shadow.querySelector(`[part~="${name}"]`);
    if (!el) return { present: false };
    const r = el.getBoundingClientRect();
    return {
      present: true,
      rectWidth: Number(r.width.toFixed(2)),
      flexBasis: el.style.flexBasis,
      flexGrow: el.style.flexGrow,
      flexShrink: el.style.flexShrink,
    };
  };
  const rail = document.getElementById('rail');
  const notes = document.getElementById('notes');
  const wsRect = ws.getBoundingClientRect();
  const mainRect = document.getElementById('main').getBoundingClientRect();
  const notesRect = notes ? notes.getBoundingClientRect() : null;
  const separators = shadow.querySelectorAll('[role="separator"]');
  const lastSep = separators[separators.length - 1];
  return {
    moment: l,
    shellWidth: Number(wsRect.width.toFixed(2)),
    shellRight: Number(wsRect.right.toFixed(2)),
    mainLightDom: Number(mainRect.width.toFixed(2)),
    mainRight: Number(mainRect.right.toFixed(2)),
    railLightDom: rail ? Number(rail.getBoundingClientRect().width.toFixed(2)) : 0,
    endAsideWidth: notesRect ? Number(notesRect.width.toFixed(2)) : null,
    endAsideLeft: notesRect ? Number(notesRect.left.toFixed(2)) : null,
    endAsideRight: notesRect ? Number(notesRect.right.toFixed(2)) : null,
    handleWidth: lastSep ? Number(lastSep.getBoundingClientRect().width.toFixed(2)) : null,
    mainPanel: panel('main'),
    startPanel: panel('start'),
    endPanel: panel('end'),
  };
}, label);

/** Drag a shadow handle (index 0 = the start pair, 1 = the end pair) by DELTA px. */
async function dragHandle(page, DELTA, index = 0) {
  const handle = await page.evaluate((i) => {
    const seps = document.getElementById('ws').shadowRoot.querySelectorAll('[role="separator"]');
    const sep = seps[i];
    if (!sep) return null;
    const r = sep.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, index);
  if (!handle) return null;
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(handle.x + (DELTA / 10) * i, handle.y);
  await page.mouse.up();
  await page.waitForTimeout(200);
  return handle;
}

// --- Part 1: drag, then collapse (the reported sequence) ---
console.log('\n== drag, then collapse ==');
const page = await openShell();

const DELTA = 100;
const before = await snapshot(page, 'before drag');
console.log(JSON.stringify(before, null, 2));
if (!(await dragHandle(page, DELTA))) {
  console.error('FAIL: no [role="separator"] handle in the shadow root');
  await browser.close(); await server.close(); process.exit(1);
}
const afterDrag = await snapshot(page, 'after drag');
console.log(JSON.stringify(afterDrag, null, 2));

const railGrew = afterDrag.startPanel.rectWidth - before.startPanel.rectWidth;
const mainShrank = before.mainLightDom - afterDrag.mainLightDom;

check('rail width grew by the drag delta', Math.abs(railGrew - DELTA) <= 3,
  `before ${before.startPanel.rectWidth}px, after ${afterDrag.startPanel.rectWidth}px, delta ${railGrew.toFixed(1)}px vs drag ${DELTA}px`);
check('main region reflowed by the same amount', Math.abs(mainShrank - DELTA) <= 3,
  `before ${before.mainLightDom}px, after ${afterDrag.mainLightDom}px, shrank ${mainShrank.toFixed(1)}px`);

const resizes = await page.evaluate(() => window.__resizes);
check('kai-aside-resize fired for the start aside', resizes.length > 0 && resizes.every((r) => r.side === 'start'),
  `${resizes.length} event(s), last ${JSON.stringify(resizes.at(-1) ?? null)}`);
check('reported width matches the measured rect', resizes.length > 0 && Math.abs(resizes.at(-1).width - afterDrag.startPanel.rectWidth) <= 3,
  `event ${resizes.at(-1)?.width?.toFixed?.(1)}px vs rect ${afterDrag.startPanel.rectWidth}px`);

// The collapse the block's button performs.
await page.evaluate(() => document.getElementById('ws').collapseAside('start'));
await page.waitForTimeout(200);
const afterCollapse = await snapshot(page, 'after collapse (post-drag)');
console.log(JSON.stringify(afterCollapse, null, 2));

check('the aside is gone after the collapse', !afterCollapse.startPanel.present && afterCollapse.railLightDom === 0,
  `start panel ${afterCollapse.startPanel.present ? 'still in the tree' : 'absent'}, rail ${afterCollapse.railLightDom}px`);
check('main region fills the shell width after the collapse',
  Math.abs(afterCollapse.mainLightDom - afterCollapse.shellWidth) <= 2,
  `main ${afterCollapse.mainLightDom}px vs shell ${afterCollapse.shellWidth}px (inline basis on the main panel: "${afterCollapse.mainPanel.flexBasis}")`);
const toggles = await page.evaluate(() => window.__toggles);
check('kai-aside-toggle reported the collapse',
  toggles.some((t) => t.side === 'start' && t.collapsed === true), JSON.stringify(toggles));
await page.close();

// --- Part 2: CONTROL — collapse with no drag first (must keep passing) ---
console.log('\n== control: collapse, no drag ==');
const controlPage = await openShell();
const controlBefore = await snapshot(controlPage, 'control before collapse');
console.log(JSON.stringify(controlBefore, null, 2));
await controlPage.evaluate(() => document.getElementById('ws').collapseAside('start'));
await controlPage.waitForTimeout(200);
const controlAfter = await snapshot(controlPage, 'control after collapse');
console.log(JSON.stringify(controlAfter, null, 2));
check('CONTROL: main region already filled the shell width after a drag-free collapse',
  Math.abs(controlAfter.mainLightDom - controlAfter.shellWidth) <= 2,
  `main ${controlAfter.mainLightDom}px vs shell ${controlAfter.shellWidth}px`);
await controlPage.close();

// --- Part 3: drag the END pair, then collapse the START aside ---
// The re-derivation is scoped to the panel whose NEIGHBOUR changed, so the end
// aside — whose own pair (main ↔ end) is untouched — must keep the width the user
// dragged it to, while main still reaches the shell's end edge.
console.log('\n== drag the end pair, then collapse the start aside ==');
const bothPage = await openShell('?both=1');
const bothBefore = await snapshot(bothPage, 'both-asides before any drag');
console.log(JSON.stringify(bothBefore, null, 2));
if (!(await dragHandle(bothPage, -60, 1))) {
  console.error('FAIL: no second [role="separator"] handle in the shadow root');
  await browser.close(); await server.close(); process.exit(1);
}
const bothAfterDrag = await snapshot(bothPage, 'after dragging the end pair');
console.log(JSON.stringify(bothAfterDrag, null, 2));
await bothPage.evaluate(() => document.getElementById('ws').collapseAside('start'));
await bothPage.waitForTimeout(200);
const bothAfterCollapse = await snapshot(bothPage, 'after collapsing the start aside');
console.log(JSON.stringify(bothAfterCollapse, null, 2));
check('END PAIR: the end aside kept the width it was dragged to',
  Math.abs(bothAfterCollapse.endAsideWidth - bothAfterDrag.endAsideWidth) <= 2,
  `dragged to ${bothAfterDrag.endAsideWidth}px, ${bothAfterCollapse.endAsideWidth}px after the collapse`);
check('END PAIR: no dead space — the end column still reaches the shell edge and main butts up to it',
  bothAfterCollapse.shellRight - bothAfterCollapse.endAsideRight <= 1
  && bothAfterCollapse.endAsideLeft - bothAfterCollapse.mainRight <= bothAfterCollapse.handleWidth + 1,
  `end aside right ${bothAfterCollapse.endAsideRight}px vs shell right ${bothAfterCollapse.shellRight}px; gap between main (${bothAfterCollapse.mainRight}px) and the end aside (${bothAfterCollapse.endAsideLeft}px) is ${(bothAfterCollapse.endAsideLeft - bothAfterCollapse.mainRight).toFixed(1)}px vs the ${bothAfterCollapse.handleWidth}px handle`);
await bothPage.close();

await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
