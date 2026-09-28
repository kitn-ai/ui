/**
 * The dialog's focus fallback has ONE branch that jsdom can never reach: a candidate
 * that matches the focusable selector and looks focusable, but whose `focus()` the
 * browser SILENTLY refuses (no throw, no focus move). The walk is supposed to keep
 * walking; asking `deepActiveElement()` afterwards is what tells it the call was a
 * no-op. Commit 69d3e5af wrote that branch from reasoning and its author left the note
 * "wants a real Chromium pass". This is that pass.
 *
 *   node scripts/probe-dialog-focus-refusal.mjs                  # the shipped walk
 *   node scripts/probe-dialog-focus-refusal.mjs --variant=assume-took
 *   node scripts/probe-dialog-focus-refusal.mjs --variant=drop-check
 *   node scripts/probe-dialog-focus-refusal.mjs --shape=details|hidden|inert
 *
 * WHAT IS MEASURED, and how the page is built:
 *
 * The page drives the REAL component — `src/web-components/dialog/dialog.tsx`, the
 * consumer-facing facade over `src/components/dialog/dialog.tsx`, imported from source
 * through Vite (its `show()` / `hide()` are the public methods). Nothing here is a
 * reimplementation: the walk being measured is the shipped one.
 *
 *   #host                        <- the nearest surviving context: the opener's parent
 *     [shape] > #decoy           <- matches the selector, looks focusable, REFUSES focus
 *     #shutter                   <- the remembered opener; removed while the modal is open
 *     #near                      <- the nearest context's one real destination
 *   #next                        <- a focusable further out, in a later context
 *
 * `#shutter` is focused, the dialog opens (so it is remembered as the opener), the
 * shutter is then removed behind the modal, and the dialog closes. The fallback walk
 * has to find a home for focus among the surviving contexts.
 *
 * THREE ASSERTIONS, and what each variant breaks:
 *
 *   C1  focus is not BODY/HTML after the walk          <- `--variant=assume-took` fails
 *   C2  focus is on a node the trail recorded TAKING focus (not the refusing decoy)
 *   C3  focus is the NEAREST context's destination (#near), not #next
 *                                                      <- `--variant=drop-check` fails
 *
 * `--variant=assume-took` is the pre-69d3e5af semantics carried into the new walk: an
 * attempted `focus()` is treated as success, so the walk ends on the first candidate.
 * `--variant=drop-check` deletes only the `deepActiveElement()` line while letting the
 * loop run on — the naive "take the check out" edit, and the reason a silent no-op
 * cannot be measured by outcome alone: without the check the loop brute-forces EVERY
 * candidate in a context and lets the last successful one win, so focus still leaves
 * BODY and only the nearest-first policy is lost. A variant that changes nothing would
 * be the finding; C3 is what tells those two edits apart.
 *
 * The variants are a Vite source transform held in this file. Nothing on disk under
 * `src/` is touched, and the transform throws if it does not find exactly one
 * verification line — so a later edit to the dialog makes this probe say so instead of
 * measuring something else.
 *
 * COST: a Vite dev server over `src/` plus one Chromium launch, seconds per variant. It
 * needs NO kit build (`dist/` is never read); it does need `build:css`, because the
 * facade's define chain imports the generated `src/web-components/compiled.css`.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const variant = arg('variant', 'real');
const shape = arg('shape', 'inert');
if (!['real', 'assume-took', 'drop-check'].includes(variant)) throw new Error(`unknown --variant=${variant}`);
if (!['inert', 'details', 'hidden'].includes(shape)) throw new Error(`unknown --shape=${shape}`);

/** The verification line, spelled exactly as it is in src. */
const VERIFY_LINE = 'if (deepActiveElement() === el) return true;';

/** The three shapes under test, wrapped around the decoy. `inert` and a closed
 *  `<details>` both REFUSE focus while still painting a normal-size box; `hidden` is
 *  the plain `display:none` control, measured for contrast. */
const SHAPES = {
  inert: '<div inert><button id="decoy" type="button">Delete photo</button></div>',
  details: '<details style="display:block"><summary>Filters</summary><button id="decoy" type="button">Apply filters</button></details>',
  hidden: '<div style="display:none"><button id="decoy" type="button">Apply filters</button></div>',
};

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>dialog focus refusal</title></head>
<body>
  <button id="outside" type="button">Skip to content</button>
  <div id="host">
    ${SHAPES[shape]}
    <button id="shutter" type="button">Zoom the photo</button>
    <button id="near" type="button">Shutter speed</button>
  </div>
  <button id="next" type="button">Back to the gallery</button>
  <kai-dialog id="dlg" label="Photo preview"></kai-dialog>
  <script type="module">
    const deep = () => { let el = document.activeElement; while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement; return el; };
    window.__trail = [];
    // Record every focus() the page makes and whether it MOVED focus. This is what
    // turns "the call was made" into "the call was refused", and it is independent of
    // the walk: the decoy's refusal is measured in the page, not inferred.
    const orig = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (...args) {
      let threw = null;
      try { orig.apply(this, args); } catch (e) { threw = String(e); }
      window.__trail.push({
        node: this.id || this.getAttribute?.('part') || this.localName,
        took: deep() === this,
        threw,
      });
    };

    let error = null;
    try {
      await import('/src/web-components/dialog/dialog.tsx');
    } catch (e) { error = String((e && e.stack) || e); }

    const dlg = document.getElementById('dlg');
    // The panel lives wherever the facade's Portal mounted it - through the host's
    // shadow root when the WebComponent sets a portalMount, and in body when it does
    // not - so the unmount assertion has to look in both places or it passes vacuously.
    const findPanel = () => document.querySelector('[part="panel"]') ?? dlg.shadowRoot?.querySelector('[part="panel"]') ?? null;
    const frames = (n) => new Promise((r) => { const tick = () => (--n > 0 ? requestAnimationFrame(tick) : r()); requestAnimationFrame(tick); });
    window.__snap = () => {
      const el = deep();
      return {
        id: el?.id || el?.getAttribute?.('part') || null,
        tag: el?.tagName ?? null,
        isBody: el === document.body,
        isHtml: el === document.documentElement,
        panelGone: findPanel() === null,
        openerGone: !document.getElementById('shutter'),
        trail: window.__trail.slice(),
      };
    };
    // The exit runs through createPresence, which keeps the panel mounted through a
    // real CSS exit animation when one resolves (the facade injects compiled.css), so
    // "closed" is polled rather than slept at: the unmount is a precondition here, and
    // a fixed frame count would read the animation, not the component.
    const untilPanelGone = async (ms) => {
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        if (!findPanel()) return performance.now() - t0;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return null;
    };
    window.__open = async () => {
      window.__trail.length = 0;
      document.getElementById('shutter').focus();
      dlg.show();
      await frames(3);
      return window.__snap();
    };
    window.__close = async () => {
      document.getElementById('shutter').remove();
      dlg.hide();
      const ms = await untilPanelGone(2000);
      await frames(2);
      return { ...window.__snap(), panelGoneAfterMs: ms, panelPresent: !!findPanel() };
    };

    // Independent shape evidence: does #decoy really match the kit's focusable
    // selector, look focusable, and still refuse focus? Measured from a known
    // position, with the dialog closed, without the walk involved at all.
    window.__shapeEvidence = () => {
      const SEL = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
        'textarea:not([disabled])', 'audio[controls]', 'video[controls]',
        '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])'].join(',');
      const decoy = document.getElementById('decoy');
      document.getElementById('outside').focus();
      const before = deep();
      let threw = null;
      try { decoy.focus(); } catch (e) { threw = String(e); }
      const r = decoy.getBoundingClientRect();
      const style = getComputedStyle(decoy);
      return {
        matchesSelector: decoy.matches(SEL),
        rect: { w: r.width, h: r.height },
        offsetWidth: decoy.offsetWidth,
        visibility: style.visibility,
        display: style.display,
        inertSelf: decoy.closest('[inert]') !== null,
        showedAsActiveBefore: before?.id,
        tookFocus: deep() === decoy,
        activeAfter: deep()?.id ?? null,
        threw,
      };
    };
    window.__probe = { error };
  </script>
</body></html>`;

function servePage() {
  return {
    name: 'probe-page',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) {
          server.transformIndexHtml(req.url, PAGE).then((html) => {
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
          }, next);
          return;
        }
        next();
      });
    },
  };
}

/** The negative controls. `pre` so the replacement happens on the TS source, before
 *  Solid's JSX transform and esbuild's strip. */
function variantPlugin() {
  if (variant === 'real') return null;
  return {
    name: 'probe-focus-refusal-variant',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('src/components/dialog/dialog.tsx')) return null;
      const hits = code.split(VERIFY_LINE).length - 1;
      if (hits !== 1) {
        throw new Error(`probe: expected exactly one "${VERIFY_LINE}" in ${id}, found ${hits} - the dialog moved, re-read it before trusting this probe`);
      }
      return code.replace(VERIFY_LINE, variant === 'assume-took' ? 'return true;' : '');
    },
  };
}

const plugins = [servePage(), solidPlugin()];
const vp = variantPlugin();
if (vp) plugins.unshift(vp);

const server = await createServer({
  root,
  configFile: false,
  plugins,
  server: { port: 0, strictPort: false },
  logLevel: 'warn',
});
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
const boot = await page.evaluate(() => window.__probe);
if (boot.error) {
  console.error('module import failed:\n' + boot.error);
  await browser.close();
  await server.close();
  process.exit(2);
}

let failed = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
};

console.log(`\ndialog close fallback — focus refusal — chromium ${browser.version()}`);
console.log(`variant=${variant}  shape=${shape}\n`);

// 1. The shape itself: the decoy is a focusable-SELECTOR match that looks focusable
//    and refuses focus, silently.
const ev = await page.evaluate(() => window.__shapeEvidence());
check('the decoy matches the kit\'s focusable selector', ev.matchesSelector, JSON.stringify(ev));
check('the decoy paints (it does not look any different from a live control)', ev.offsetWidth > 0 && ev.rect.h > 0, `offsetWidth=${ev.offsetWidth} rect=${JSON.stringify(ev.rect)} visibility=${ev.visibility}`);
check('the decoy REFUSES focus, silently', !ev.tookFocus && ev.threw === null, `focus() moved focus to ${ev.activeAfter}, threw ${ev.threw}`);
check('focus before the attempt was somewhere real (not vacuous)', ev.showedAsActiveBefore === 'outside', `was ${ev.showedAsActiveBefore}`);

// 2. Open with the shutter focused: focus goes into the panel, the shutter is
//    remembered as the opener (the precondition pair jsdom needs stubbed visibility
//    for; here it is real).
const opened = await page.evaluate(() => window.__open());
check('precondition: focus went INTO the panel on open', opened.id === 'panel' && !opened.panelGone, `active=${opened.id} panelGone=${opened.panelGone} trail=${JSON.stringify(opened.trail)}`);

// 3. Remove the opener behind the modal and close: the fallback walk runs.
const closed = await page.evaluate(() => window.__close());
const trail = closed.trail;
const decoyAttempt = trail.find((t) => t.node === 'decoy');
const nearAttempt = trail.find((t) => t.node === 'near');

check('precondition: the opener is gone and the panel unmounted', closed.openerGone && closed.panelGone, JSON.stringify({ openerGone: closed.openerGone, panelGone: closed.panelGone, unmountedAfterMs: closed.panelGoneAfterMs }));
check('C1  focus is not BODY/HTML after the walk', !closed.isBody && !closed.isHtml, `active=${closed.id} <${closed.tag}>`);
check('C2  focus is on a node the trail recorded TAKING focus (not the refusing decoy)', decoyAttempt?.took === false && trail.some((t) => t.took && t.node === closed.id), `active=${closed.id} decoyAttempt=${JSON.stringify(decoyAttempt)}`);
check('C3  focus is the NEAREST context\'s destination (#near), not one further out', closed.id === 'near', `active=${closed.id} nearAttempt=${JSON.stringify(nearAttempt)}`);

console.log(`\n  focus trail: ${trail.map((t) => `${t.node}${t.took ? '(took)' : '(refused)'}`).join(' -> ')}`);
if (pageErrors.length) { console.log('\npage errors:\n  ' + pageErrors.join('\n  ')); failed++; }
await browser.close();
await server.close();
console.log(failed ? `\n${failed} check(s) FAILED\n` : '\nall checks passed\n');
process.exit(failed ? 1 : 0);
