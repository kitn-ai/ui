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
 *   node scripts/probe-dialog-focus-refusal.mjs --shape=details|hidden|inert|modal|modal-outside
 *   node scripts/probe-dialog-focus-refusal.mjs --shape=modal-outside --variant=no-notice
 *
 * `--shape=modal` is the one refusal nothing on the page authors: the walk's candidates
 * sit outside a native `<dialog>` the page opened with `showModal()`, and the browser
 * makes everything outside it inert. Nothing in the kit does this - `src/components/
 * dialog/dialog.tsx` is a Portal'd `role="dialog" aria-modal="true"` div and there is no
 * `showModal()` under `src/` - so the shape is the consumer's own native modal with a
 * kai-dialog nested inside it, which is the arrangement where the kit's panel can still
 * take focus at all. `--shape=modal-outside` is the same page with the panel beside the
 * modal instead of inside it; there the browser refuses the PANEL's own `focus()` on
 * open, so the walk is never reached and that run measures the kit's notification
 * instead (`N1`/`N2` below).
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
 * WHAT `--shape=modal-outside` IS FOR: the notification. A dialog the browser refuses to
 * focus must not open silently, so the component warns on the console when its own
 * `focus()` on open did not move focus (see `warnOpenedWithoutFocus`). This shape is the
 * one arrangement that reaches it, and the run asserts three things about it:
 *
 *   N1  the panel's own `focus()` on open was REFUSED - so the notification is not
 *       vacuous, the refusal is measured and not assumed
 *   N2  the kit SAID SO: exactly one notification in the console, typed `warning`
 *       <- `--variant=no-notice` fails this, and is its negative control
 *   N1  (every OTHER shape) the whole run stayed QUIET: no notification at all
 *
 * The quiet check is the other half of the pair, and it is the one that matters most: a
 * notification that also fires on the ordinary open is noise, and noise is what a
 * consumer learns to filter. Both halves are measured here, in the browser.
 *
 * C1-C3 do not apply to `--shape=modal-outside` and are not run there: the panel never
 * took focus, so the close fallback's walk is never reached and there is no focus
 * position to assert. The probe says so on the line where the checks would be instead of
 * passing them vacuously.
 *
 * The variants are a Vite source transform held in this file. Nothing on disk under
 * `src/` is touched, and a transform throws if it does not find exactly one of its
 * target lines — so a later edit to the dialog makes this probe say so instead of
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
if (!['real', 'assume-took', 'drop-check', 'no-notice'].includes(variant)) throw new Error(`unknown --variant=${variant}`);
if (!['inert', 'details', 'hidden', 'modal', 'modal-outside'].includes(shape)) throw new Error(`unknown --shape=${shape}`);
/** Both modal shapes put the page's own `showModal()` on the page and differ only in
 *  where the panel sits relative to it. */
const modalShape = shape === 'modal' || shape === 'modal-outside';
/** The shape where the browser refuses the panel's OWN `focus()` on open, so the walk is
 *  never reached and the thing under test is the notification rather than the walk. */
const refusingOpen = shape === 'modal-outside';

/** Both halves of the pair have to be run where they mean something. An unrun axis is a
 *  green that proves nothing, so the combination says so instead of passing. */
if (refusingOpen && variant !== 'real' && variant !== 'no-notice') {
  throw new Error(`--shape=${shape} never reaches the walk, so --variant=${variant} would measure nothing; its control is --variant=no-notice`);
}
if (!refusingOpen && variant === 'no-notice') {
  throw new Error(`--variant=no-notice only means something with --shape=modal-outside, where the open is what gets refused; use --variant=assume-took or --variant=drop-check here`);
}

/** The verification line, spelled exactly as it is in src. */
const VERIFY_LINE = 'if (deepActiveElement() === el) return true;';

/** The notification's call site, spelled exactly as it is in src. Removing it is the
 *  negative control for the notification checks, and the exact-match rule means a
 *  reworded dialog makes this probe fail rather than pass without measuring. */
const NOTICE_CALL = 'if (panel?.isConnected && !insidePanel(deepActiveElement())) warnOpenedWithoutFocus();';
/** What a consumer sees in the console when the open was refused, matched on the phrase
 *  the source states. */
const NOTICE_FRAGMENT = '[kai-dialog] opened without taking focus';

/** The shapes under test, wrapped around the decoy. `inert` and a closed `<details>`
 *  both REFUSE focus while still painting a normal-size box; `hidden` is the plain
 *  `display:none` control, measured for contrast. `modal` is the same refusal with no
 *  page author at all: the decoy is inert because the browser made it so. */
const SHAPES = {
  inert: '<div inert><button id="decoy" type="button">Delete photo</button></div>',
  details: '<details style="display:block"><summary>Filters</summary><button id="decoy" type="button">Apply filters</button></details>',
  hidden: '<div style="display:none"><button id="decoy" type="button">Apply filters</button></div>',
  modal: '<div id="void"><button id="decoy" type="button">Delete photo</button></div>',
};

/** `#host`'s children. The page-authored shapes keep the layout the probe was written
 *  against: the decoy, the remembered opener, then the nearest real destination.
 *
 *  The two modal shapes split that layout across the browser's own boundary.
 *  `<dialog id="shell">` is opened with `showModal()`, so everything outside it - the
 *  decoy, `#outside` - is inert by the browser's doing, with no `[inert]` attribute
 *  anywhere on the page. `#next` sits inside the modal in both, or the browser would
 *  refuse the drop-check variant's brute-forced destination too and control B could not
 *  fire. The opener `#shutter` is focused before the modal opens (nothing outside it
 *  can be focused once it is) and removed while the dialog is open.
 *
 *  `modal` nests the panel INSIDE the modal, which is the only arrangement the walk can
 *  run in: `modal-outside` puts it beside the modal instead, where the browser refuses the
 *  panel's own `focus()` on open, the walk is never reached, and the run measures the
 *  KIT'S NOTIFICATION there instead of an outcome of the walk. */
const HOST_INNER = (s) => {
  if (s === 'modal') {
    return `${SHAPES.modal}
    <button id="shutter" type="button">Zoom the photo</button>
    <dialog id="shell">
      <kai-dialog id="dlg" label="Photo preview"></kai-dialog>
      <button id="near" type="button">Shutter speed</button>
      <button id="next" type="button">Back to the gallery</button>
    </dialog>`;
  }
  if (s === 'modal-outside') {
    return `${SHAPES.modal}
    <button id="shutter" type="button">Zoom the photo</button>
    <dialog id="shell">
      <button id="near" type="button">Shutter speed</button>
      <button id="next" type="button">Back to the gallery</button>
    </dialog>
    <kai-dialog id="dlg" label="Photo preview"></kai-dialog>`;
  }
  return `${SHAPES[s]}
    <button id="shutter" type="button">Zoom the photo</button>
    <button id="near" type="button">Shutter speed</button>`;
};

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>dialog focus refusal</title></head>
<body>
  <button id="outside" type="button">Skip to content</button>
  <div id="host">
    ${HOST_INNER(shape)}
  </div>
  ${modalShape ? '' : `<button id="next" type="button">Back to the gallery</button>
  <kai-dialog id="dlg" label="Photo preview"></kai-dialog>`}
  <script type="module">
    const SHAPE = ${JSON.stringify(shape)};
    const MODAL = SHAPE.startsWith('modal');
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
      // Opened AFTER dlg.show() on purpose: showModal() takes focus into the modal
      // itself, and the panel's own focus() runs in a microtask, so the panel lands
      // focused on a page that is already inert. Opened before, the opener could not
      // have been focused at all and the walk would never be reached.
      if (MODAL) {
        const shell = document.getElementById('shell');
        if (!shell.open) shell.showModal();
      }
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
    const tryFocus = (el, from) => {
      from.focus();
      const before = deep();
      let threw = null;
      try { el.focus(); } catch (e) { threw = String(e); }
      return { before, took: deep() === el, activeAfter: deep()?.id ?? null, threw };
    };
    window.__shapeEvidence = () => {
      const SEL = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
        'textarea:not([disabled])', 'audio[controls]', 'video[controls]',
        '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])'].join(',');
      const decoy = document.getElementById('decoy');
      const shell = document.getElementById('shell');
      // The modal shape measures the SAME node twice: with the browser's modal closed
      // (it takes focus, so the markup is not what refuses it) and with it open (it does
      // not). The pair is what makes "the browser refused this, page wrote nothing" a
      // measurement rather than a claim.
      const closedRun = tryFocus(decoy, document.getElementById('outside'));
      let openRun = null;
      if (MODAL) {
        if (!shell.open) shell.showModal();
        // From a real destination INSIDE the modal, so a refusal cannot be read as
        // "focus was nowhere to begin with".
        openRun = tryFocus(decoy, document.getElementById('near'));
        shell.close();
      }
      const run = openRun ?? closedRun;
      const r = decoy.getBoundingClientRect();
      const style = getComputedStyle(decoy);
      return {
        matchesSelector: decoy.matches(SEL),
        rect: { w: r.width, h: r.height },
        offsetWidth: decoy.offsetWidth,
        visibility: style.visibility,
        display: style.display,
        inertAttributeAncestor: decoy.closest('[inert]') !== null,
        focusedWithoutNativeModal: closedRun.took,
        showedAsActiveBefore: run.before?.id ?? null,
        tookFocus: run.took,
        activeAfter: run.activeAfter,
        threw: run.threw,
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
      const [line, replacement] = variant === 'no-notice'
        ? [NOTICE_CALL, '/* probe: no-notice */']
        : [VERIFY_LINE, variant === 'assume-took' ? 'return true;' : ''];
      const hits = code.split(line).length - 1;
      if (hits !== 1) {
        throw new Error(`probe: expected exactly one "${line}" in ${id}, found ${hits} - the dialog moved, re-read it before trusting this probe`);
      }
      return code.replace(line, replacement);
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
// What a CONSUMER sees: the console, as the browser hands it over. Captured for the
// whole run, so "the ordinary path stays quiet" is a measurement over both the open and
// the close rather than over the one call the probe happened to look at.
const consoleMessages = [];
page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));
const notices = () => consoleMessages.filter((m) => m.text.includes(NOTICE_FRAGMENT));
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
check('focus before the attempt was somewhere real (not vacuous)', ev.showedAsActiveBefore === (modalShape ? 'near' : 'outside'), `was ${ev.showedAsActiveBefore}`);
if (modalShape) {
  // The distinguishing evidence for this shape: no `[inert]` anywhere (so no page author
  // made the decoy unfocusable) and the identical node takes focus with the browser's
  // modal closed. Both together are the browser refusing it, and only those.
  check('the refusal is the BROWSER\'s, not the page\'s (no [inert] ancestor, and the same node focuses with the modal closed)', !ev.inertAttributeAncestor && ev.focusedWithoutNativeModal, JSON.stringify({ inertAttributeAncestor: ev.inertAttributeAncestor, focusedWithoutNativeModal: ev.focusedWithoutNativeModal }));
}

// 2. Open with the shutter focused: focus goes into the panel, the shutter is
//    remembered as the opener (the precondition pair jsdom needs stubbed visibility
//    for; here it is real).
const opened = await page.evaluate(() => window.__open());
const panelAttempt = opened.trail.find((t) => t.node === 'panel');
if (refusingOpen) {
  // This shape measures the notification, not the walk: the browser refused the panel's
  // own focus() on open, so nothing about the close fallback is reached here.
  check('precondition: focus did NOT go into the panel on open (the walk is never reached)', opened.id !== 'panel' && !opened.panelGone, `active=${opened.id} panelGone=${opened.panelGone} trail=${JSON.stringify(opened.trail)}`);
  check('N1  the panel\'s own focus() on open was REFUSED by the browser', panelAttempt?.took === false && panelAttempt.threw === null, `panelAttempt=${JSON.stringify(panelAttempt)}`);
  check('N2  the kit SAID SO: exactly one notification, and it is a warning', notices().length === 1 && notices()[0].type === 'warning', `notices=${JSON.stringify(notices())}`);
} else {
  check('precondition: focus went INTO the panel on open', opened.id === 'panel' && !opened.panelGone, `active=${opened.id} panelGone=${opened.panelGone} trail=${JSON.stringify(opened.trail)}`);
}

// 3. Remove the opener behind the modal and close: the fallback walk runs.
const closed = await page.evaluate(() => window.__close());
const trail = closed.trail;
const decoyAttempt = trail.find((t) => t.node === 'decoy');
const nearAttempt = trail.find((t) => t.node === 'near');

check('precondition: the opener is gone and the panel unmounted', closed.openerGone && closed.panelGone, JSON.stringify({ openerGone: closed.openerGone, panelGone: closed.panelGone, unmountedAfterMs: closed.panelGoneAfterMs }));
if (refusingOpen) {
  console.log('  --    C1-C3 skipped: this shape never reaches the walk (the panel never took focus), so there is no position to assert');
} else {
  check('C1  focus is not BODY/HTML after the walk', !closed.isBody && !closed.isHtml, `active=${closed.id} <${closed.tag}>`);
  check('C2  focus is on a node the trail recorded TAKING focus (not the refusing decoy)', decoyAttempt?.took === false && trail.some((t) => t.took && t.node === closed.id), `active=${closed.id} decoyAttempt=${JSON.stringify(decoyAttempt)}`);
  check('C3  focus is the NEAREST context\'s destination (#near), not one further out', closed.id === 'near', `active=${closed.id} nearAttempt=${JSON.stringify(nearAttempt)}`);
  check('N1  the ordinary path stayed QUIET: no notification over the whole run', notices().length === 0, `notices=${JSON.stringify(notices())}`);
}

console.log(`\n  focus trail: ${trail.map((t) => `${t.node}${t.took ? '(took)' : '(refused)'}`).join(' -> ')}`);
if (notices().length) console.log(`  notification: ${notices().map((m) => `${m.type}: ${m.text}`).join(' | ')}`);
if (pageErrors.length) { console.log('\npage errors:\n  ' + pageErrors.join('\n  ')); failed++; }
await browser.close();
await server.close();
console.log(failed ? `\n${failed} check(s) FAILED\n` : '\nall checks passed\n');
process.exit(failed ? 1 : 0);
