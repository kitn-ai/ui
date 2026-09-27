/**
 * The empty state: centred while there is room, top-aligned and scrollable when there is
 * not, and never clipped.
 *
 * WHY A SIBLING PROBE RATHER THAN A CASE IN `probe-composer-states.mjs`. That file's
 * subject is the composer's geometry — its own header says so — and this is the thread's
 * empty region: different element, different failure, different page. Adding it there
 * would double the file's subject and make a failure harder to read, which is the reason
 * that probe documents for keeping its own subject narrow.
 *
 * THREE CASES, and only two of them discriminate:
 *
 *  1. TALL host, short content  -> the empty surface is CENTRED in the region.
 *     Fails on the code this replaced: the content column was content-height, so the
 *     empty surface resolved to its own 180px and sat at the top (measured 218.5px above
 *     the region's centre).
 *  2. SHORT host, tall content  -> nothing is clipped above the viewport and the region
 *     scrolls. This is the owner's own requirement. It PASSES before the fix too, because
 *     a box that grows with its content never had overflow to clip — kept as a
 *     requirement check, and labelled as one rather than dressed up as regression cover.
 *  3. `Empty` in a FIXED-height box, taller content -> the first child is not above the
 *     box. This is the one that discriminates the centring MECHANISM: `justify-center`
 *     splits the overflow both ways and puts the first child at a negative offset, and no
 *     scroll reaches it. `min-h-full` alone does not fix this case; the auto margin does.
 *     The box is a flex column and the surface carries `min-height: 0`, because a flex
 *     item's automatic minimum size is its min-content — WITHOUT that the surface simply
 *     grows past the box, nothing overflows, and the check passes on both implementations.
 *     That is not a detail: it is the difference between a discriminating case and a
 *     vacuous one, and the first version of this case was vacuous for exactly that reason.
 *
 * WATCH IT FAIL, both ways, before trusting it:
 *   - restore `justify-center` on the Empty and case 3 reports a NEGATIVE offset;
 *   - remove `min-h-full` from the content column and case 1 reports an off-centre delta.
 *
 *   node scripts/probe-empty-state.mjs [--headed]
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>empty state geometry</title>
<style>html,body{margin:0;background:#181818;color:#eee;font-family:system-ui,sans-serif}
.host{width:720px;margin:16px;border:1px solid #333} #tall-host{height:600px}
#short-host,#fixed-host{height:200px;overflow:hidden}
#fixed-host{display:flex;flex-direction:column}</style>
<!-- The kit's own sheet, for the case that renders in the LIGHT DOM: the element path
     gets it injected into each shadow root, but a component rendered straight into the
     page has no styles at all without this — and an unstyled element cannot show whether
     a centring mechanism works. -->
<link rel="stylesheet" href="/src/web-components/compiled.css"></head>
<body>
  <div class="host" id="tall-host">
    <kai-thread id="tall"><kai-empty slot="empty" empty-title="What can I help with?"
      description="Ask anything, or start from a suggestion below."></kai-empty></kai-thread>
  </div>
  <div class="host" id="short-host">
    <kai-thread id="short"><kai-empty slot="empty" empty-title="What can I help with?"
      description="Ask anything, or start from a suggestion below."
      ><div style="height:520px"></div></kai-empty></kai-thread>
  </div>
  <div class="host" id="fixed-host"></div>
  <script type="module">
    let error = null;
    try {
      await import('/src/web-components/thread/thread.tsx');
      await import('/src/web-components/empty/empty.tsx');
      // messages is a JS property (an array), never an attribute.
      for (const id of ['tall', 'short']) document.getElementById(id).messages = [];

      // The Solid path, for the case 'min-h-full' cannot reach: a fixed-height box.
      const h = (await import('solid-js/h')).default;
      const { render } = await import('solid-js/web');
      const { Empty, EmptyTitle, EmptyDescription } =
        await import('/src/components/empty/empty.tsx');
      render(
        () => h(Empty, { style: 'min-height:0' }, [
          h(EmptyTitle, {}, 'What can I help with?'),
          h(EmptyDescription, {}, 'Ask anything, or start from a suggestion below.'),
          // flex-shrink: 0 is what makes this case mean anything: flex items shrink by
          // default, so a 520px child inside a 200px box simply COMPRESSES, the content
          // fits, and justify-center has no overflow to split — which is why the first
          // version of this case passed on both implementations. A child that cannot
          // shrink is also the realistic one: a card, an image, a list.
          h('div', { style: 'height:520px;flex-shrink:0' }),
        ]),
        document.getElementById('fixed-host'),
      );
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) { error = String((e && e.stack) || e); }
    window.__probe = { error };
  </script>
</body></html>`;

function servePage() {
  return {
    name: 'probe-page',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) {
          server.transformIndexHtml(req.url, PAGE).then((h) => {
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
/** Every check prints its measured numbers, so a failure reports pixels, not a boolean. */
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} (${detail})`);
  if (!ok) failed = true;
};
const n1 = (v) => Number(v.toFixed(1));

const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
page.on('pageerror', (e) => console.error('pageerror:', String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
const boot = await page.evaluate(() => window.__probe);
if (boot.error) {
  console.error('the probe page threw:', boot.error);
  await browser.close(); await server.close(); process.exit(2);
}

/**
 * Bounded, and it THROWS by name: a layout that never stops moving is a defect to report,
 * not a number to race.
 */
const READ_MAX = 12;
async function settle(read) {
  let last = null;
  for (let i = 0; i < READ_MAX; i++) {
    const now = await read();
    const same = last && JSON.stringify(now) === JSON.stringify(last);
    if (same) return now;
    last = now;
    await page.waitForTimeout(50);
  }
  throw new Error(
    `probe: the empty state's geometry never settled after ${READ_MAX} reads. Last ${JSON.stringify(last)}`,
  );
}

/** The thread path: the region (scroller), the empty surface, and its first child. */
const readThread = (host) => async () => {
  // Two locators rather than one walk: the empty surface lives inside the `kai-empty`
  // element's OWN shadow root, two boundaries down from the scroller, and Playwright's
  // CSS engine is what pierces those. A manual `querySelector` chain does not, which is
  // how this read was written the first time and found nothing.
  const scroller = page.locator(`${host} [role="log"]`).first();
  const empty = page.locator(`${host} [data-slot="empty"]`).first();
  const s = await scroller.evaluate((log) => {
    const r = log.getBoundingClientRect();
    const cs = getComputedStyle(log);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    // The content column: the scroller's child, in the same shadow root, so a direct
    // child selector reaches it where a deeper one would not.
    const c = log.firstElementChild;
    const cr = c ? c.getBoundingClientRect() : null;
    return {
      top: r.top, h: r.height, clientH: log.clientHeight, scrollH: log.scrollHeight, scrollTop: log.scrollTop,
      // `min-height: 100%` resolves against the CONTENT box, so this is the height the
      // column is entitled to be — comparing it to the border box measures the padding.
      innerH: log.clientHeight - padY,
      contentH: cr ? cr.height : null, contentMinH: c ? getComputedStyle(c).minHeight : null,
    };
  });
  const e = await empty.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const f = el.firstElementChild?.getBoundingClientRect();
    return { top: r.top, h: r.height, firstTop: f ? f.top : null };
  });
  return {
    scrollerTop: +s.top.toFixed(1), scrollerH: +s.h.toFixed(1),
    clientH: s.clientH, scrollH: s.scrollH, scrollTop: s.scrollTop, innerH: s.innerH,
    contentH: s.contentH === null ? null : +s.contentH.toFixed(1), contentMinH: s.contentMinH,
    emptyTop: +e.top.toFixed(1), emptyH: +e.h.toFixed(1),
    firstTop: e.firstTop === null ? null : +e.firstTop.toFixed(1),
  };
};

// ---------------------------------------------------------------- case 1: centred
const tall = await settle(readThread('#tall-host'));
{
  const regionCentre = tall.scrollerTop + tall.scrollerH / 2;
  const emptyCentre = tall.emptyTop + tall.emptyH / 2;
  check(
    'short content is CENTRED in the region',
    Math.abs(emptyCentre - regionCentre) <= 2,
    `empty ${n1(tall.emptyH)}px centred at ${n1(emptyCentre)} against the region's ${n1(regionCentre)} (delta ${n1(emptyCentre - regionCentre)})`,
  );
  check(
    'and the surface is taller than its content, which is what lets it centre',
    tall.emptyH > 200,
    `surface ${n1(tall.emptyH)}px inside a ${n1(tall.scrollerH)}px region`,
  );
  // The other half of the fix, stated as its own check so a failure says WHICH half is
  // missing: without this the surface has no room to grow into. Measured against the
  // region's CONTENT box — what a percentage min-height resolves to — because the border
  // box also counts the region's own padding, and the difference is 24px of band.
  check(
    'the content column is at least as tall as the region inside its padding',
    tall.contentH !== null && tall.contentH >= tall.innerH - 1,
    `content ${n1(tall.contentH)}px (min-height ${tall.contentMinH}) against an inner height of ${n1(tall.innerH)}px`,
  );
}

// ------------------------------------------------- case 2: tall content, short host
await page.locator('#short-host [role="log"]').first().evaluate((el) => { el.scrollTop = 0; });
const short = await settle(readThread('#short-host'));
check(
  'tall content is not clipped above the viewport',
  short.firstTop !== null && short.firstTop >= short.scrollerTop - 0.5,
  `first child at ${n1(short.firstTop)} against a viewport top of ${n1(short.scrollerTop)}`,
);
check(
  'and the region scrolls it',
  short.scrollH > short.clientH,
  `scrollHeight ${short.scrollH} against clientHeight ${short.clientH}`,
);

// ------------------------------------------- case 3: a fixed box the surface cannot grow past
const fixed = await settle(async () => {
  return await page.locator('#fixed-host [data-slot="empty"]').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const f = el.firstElementChild?.getBoundingClientRect();
    const host = el.getRootNode()?.host ?? el.parentElement;
    const hr = host?.getBoundingClientRect?.();
    return {
      top: +r.top.toFixed(1), h: +r.height.toFixed(1),
      minH: getComputedStyle(el).minHeight, flex: getComputedStyle(el).flex,
      justify: getComputedStyle(el).justifyContent,
      hostH: hr ? +hr.height.toFixed(1) : null,
      firstTop: f ? +f.top.toFixed(1) : null,
    };
  });
});
check(
  'a fixed-height box does not clip the first child',
  fixed.firstTop !== null && fixed.firstTop >= fixed.top - 0.5,
  `first child ${n1(fixed.firstTop - fixed.top)}px below the box top, box ${n1(fixed.h)}px tall (min-height ${fixed.minH}, flex ${fixed.flex}, justify ${fixed.justify})`,
);

await browser.close();
await server.close();
console.log(failed ? '\nFAILED' : '\nOK');
process.exit(failed ? 1 : 0);
