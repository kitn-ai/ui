/**
 * The scroll-button overlay must be a HOLE for the pointer, not a surface.
 *
 * WHY A BROWSER. jsdom has no layout, no hit testing and no wheel, so the defect this
 * pins was invisible to the whole unit suite: the thread's scroll button sits in an
 * `absolute w-full max-w-3xl` wrapper across the bottom band of the message list, and
 * with no `pointer-events-none` that wrapper is the element under the cursor for every
 * pixel of a 768px-wide strip — over the messages it exists to float above. The wheel
 * lands on the wrapper and the thread does not move, text under it cannot be selected by
 * a drag that starts there, and a click on the strip is delivered to a positioning box.
 * None of those three is expressible without a real engine.
 *
 * TWO SUBJECTS, because the kit ships the same wrapper twice and the consumer path goes
 * through a shadow root:
 *   - `solid`  the Solid `Thread` component rendered in the LIGHT DOM;
 *   - `wc`     the same component behind `<kai-thread>`, i.e. what a consumer mounts,
 *              measured through `ShadowRoot.elementFromPoint` so the retargeting that
 *              would hide the wrapper behind its host does not hide the defect too.
 *
 * THE CHECKS, and which of them discriminate (all four the fix must satisfy are here):
 *
 *  1. BAND CHECK — the owner's report. `elementFromPoint` at a point inside the wrapper's
 *     band, off the button, must NOT return the wrapper. FAILS before the fix, on BOTH
 *     subjects (the wrapper is the topmost element there).
 *  2. CARET CHECK — `caretPositionFromPoint` at the same point must land in a TEXT node
 *     inside the thread. FAILS before the fix (it lands on the wrapper element). This is
 *     the mechanically checkable half of "a drag selects text through the strip".
 *  3. DRAG CHECK — mouse down inside the band, drag across the messages, mouse up; the
 *     selection is non-empty. FAILS before the fix.
 *  4. WHEEL CHECK — the pointer parked in the band, a wheel dispatch, and the thread's
 *     `scrollTop` must move. This is the owner's own report and it is the check that
 *     FAILS before the fix, on both subjects (`0 -> 0` of a 300px wheel).
 *  5. CLICK CHECK (two halves) — the button still scrolls the thread to the bottom from
 *     a scrolled-up position, and once there it is not the element at its own point any
 *     more (pointer-inert at the bottom, as it always was). The first half PASSES before
 *     the fix too: it is the requirement that must survive the change, and it is what
 *     fails if the wrapper is "fixed" by leaving the button unable to take the pointer
 *     back.
 *
 * CHECKS 2 AND 3 RUN ON THE LIGHT-DOM SUBJECT ONLY, stated rather than faked: in a shadow
 * tree Chrome starts a text selection from a drag that BEGAN on the overlay (measured: a
 * drag whose `mousedown` lands on the wrapper still selected 5599 characters), and
 * `caretPositionFromPoint` has no shadow-root form that reports an inner node — the
 * document's own retargets to the host, so "is it text in the thread" cannot be asked
 * there. Check 3 prints the flat-tree target of its `mousedown` for exactly that reason.
 *
 * WATCH IT FAIL, both ways, before trusting it:
 *   - delete `pointer-events-none` from the wrapper in `components/thread/thread.tsx`
 *     (and its twin in `components/chat/chat-app.tsx`) and checks 1, 2, 3 and 4 report
 *     the wrapper at the band's point, a caret on the wrapper, no selection, and a frozen
 *     `scrollTop`;
 *   - delete `pointer-events-auto` from the button in `components/scroll/scroll-button.tsx`
 *     and check 5's first half fails: the click never reaches the button and the thread
 *     stays where it was scrolled.
 *
 *   node scripts/probe-scroll-overlay.mjs [--headed]
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>scroll overlay</title>
<style>html,body{margin:0;background:#181818;color:#eee;font-family:system-ui,sans-serif}
.host{width:900px;height:420px;margin:16px 0 0 16px;border:1px solid #333;position:relative}
#wc-host kai-thread{display:block;height:100%}</style>
<!-- The kit's own sheet, for the case that renders in the LIGHT DOM: the element path
     gets it injected into each shadow root, but a component rendered straight into the
     page has no styles at all without this — and an unstyled overlay has no band to
     measure. -->
<link rel="stylesheet" href="/src/web-components/compiled.css"></head>
<body>
  <div class="host" id="solid-host"></div>
  <div class="host" id="wc-host"><kai-thread></kai-thread></div>
  <script type="module">
    // Long enough that every wrapped line fills the column: the drag in check 3 has to
    // start on a glyph, and a short line would leave the band's left edge blank for
    // reasons that have nothing to do with the overlay.
    const LINE = 'The quick brown fox jumps over the lazy dog while the thread scrolls under it. ';
    const messages = Array.from({ length: 40 }, (_, i) => ({
      id: 'm' + i,
      role: 'assistant',
      parts: [{ type: 'text', text: 'Message ' + (i + 1) + '. ' + LINE.repeat(2) }],
    }));
    let error = null;
    try {
      const h = (await import('solid-js/h')).default;
      const { render } = await import('solid-js/web');
      const { Thread } = await import('/src/components/thread/thread.tsx');
      render(() => h(Thread, { messages }), document.getElementById('solid-host'));

      await import('/src/web-components/thread/thread.tsx');
      // messages is a JS property (an array), never an attribute.
      document.querySelector('#wc-host kai-thread').messages = messages;

      await new Promise((r) => setTimeout(r, 300));
    } catch (e) { error = String((e && e.stack) || e); }

    /** The shadow root of the facade, or the document for the light-DOM subject. */
    const scope = (s) => s === 'solid'
      ? document
      : document.querySelector('#wc-host kai-thread').shadowRoot;

    const scroller = (s) => scope(s).querySelector('[role="log"]');
    const button = (s) => scope(s).querySelector('button[aria-label="Scroll to bottom"]');
    const wrapper = (s) => button(s).parentElement;

    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const describe = (el) => (el && el.nodeType === 1)
      ? { tag: el.tagName.toLowerCase(), cls: String(el.getAttribute('class') || '').slice(0, 60), isWrapper: el === wrapper(cur), isButton: el === button(cur) }
      : { tag: el ? 'text#' + el.nodeType : 'null', cls: '', isWrapper: false, isButton: false };
    let cur = 'solid';

    window.__overlayProbe = {
      setScrollTop(s, v) {
        const el = scroller(s);
        el.scrollTop = v;
        // The stick-to-bottom primitive reads position from a passive scroll listener;
        // jsdom-free or not, the assignment alone does not guarantee a synchronous event.
        el.dispatchEvent(new Event('scroll'));
        return el.scrollTop;
      },
      scroller(s) {
        const el = scroller(s);
        return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      },
      geometry(s) {
        const w = rect(wrapper(s));
        const b = rect(button(s));
        return {
          wrapper: w, button: b,
          // Inside the band, clear of the button's centred box: the point the owner's
          // cursor would have been at.
          point: { x: w.left + 40, y: w.top + w.height / 2 },
          buttonCentre: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        };
      },
      wrapperClass(s) { return String(wrapper(s).getAttribute('class') || ''); },
      buttonState(s) {
        const el = button(s);
        const cs = getComputedStyle(el);
        return {
          pointerEvents: cs.pointerEvents, opacity: cs.opacity,
          tabindex: el.getAttribute('tabindex'), ariaHidden: el.getAttribute('aria-hidden'),
        };
      },
      hit(s, x, y) {
        cur = s;
        // Through the shadow root, so the wrapper stays visible to the probe instead of
        // being retargeted to the host — the host would pass the check vacuously.
        const el = scope(s).elementFromPoint(x, y);
        const d = describe(el);
        // caretPositionFromPoint runs the same hit test selection uses and reports the
        // TEXT the point resolves into, which is the difference between "an element is
        // there" and "a drag from here selects something". ShadowRoot does not carry the
        // method in every engine, so the document's own is the fallback — it runs the
        // same hit test and reports the flat-tree node.
        const caretScope = scope(s).caretPositionFromPoint ? scope(s) : document;
        const caret = caretScope.caretPositionFromPoint(x, y);
        const node = caret && caret.offsetNode ? caret.offsetNode : null;
        return {
          ...d,
          inScroller: !!(el && scroller(s).contains(el)),
          caret: node ? { type: node.nodeType, inScroller: scroller(s).contains(node) } : null,
        };
      },
      selection() { return String(window.getSelection().toString()).trim(); },
      clearSelection() { window.getSelection().removeAllRanges(); },
      /** Records the flat-tree target of the NEXT mousedown, so a drag that selected
       *  nothing can say what it grabbed instead of only that it got zero characters. */
      watchPointer() {
        window.__overlayProbe.__down = null;
        document.addEventListener('mousedown', (e) => {
          const t = e.composedPath()[0];
          window.__overlayProbe.__down = t && t.tagName
            ? t.tagName.toLowerCase() + '.' + String(t.getAttribute('class') || '').slice(0, 45)
            : String(t);
        }, { capture: true, once: true });
      },
      lastPointerDown() { return window.__overlayProbe.__down; },
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
/** Every check prints its measured numbers, so a failure reports the band, not a boolean. */
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} (${detail})`);
  if (!ok) failed = true;
};
const n1 = (v) => Number(v.toFixed(1));

const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
page.on('pageerror', (e) => console.error('pageerror:', String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
const boot = await page.evaluate(() => window.__probe);
if (boot.error) {
  console.error('the probe page threw:', boot.error);
  await browser.close(); await server.close(); process.exit(2);
}

const probe = (fn, ...args) => page.evaluate(({ fn, args }) => window.__overlayProbe[fn](...args), { fn, args });
/** The button's resting position at the bottom is a transform; wait for it to stop. */
const settleScroll = async (subject) => {
  let last = null;
  for (let i = 0; i < 30; i++) {
    const now = await probe('scroller', subject);
    if (last && now.scrollTop === last.scrollTop) return now;
    last = now;
    await page.waitForTimeout(100);
  }
  return last;
};

for (const subject of ['solid', 'wc']) {
  const label = subject === 'solid' ? 'Thread (light DOM)' : '<kai-thread> (shadow DOM)';
  // See the header: a shadow tree cannot answer these two, so they are asked where they
  // can be answered rather than weakened into a check that passes either way.
  const lightDom = subject === 'solid';
  console.log(`\n--- ${label}`);

  // Scrolled up, so the button is in its visible state (check 5's first half needs it).
  await probe('setScrollTop', subject, 0);
  await page.waitForTimeout(200);
  const geo = await probe('geometry', subject);
  await page.mouse.move(geo.point.x, geo.point.y);

  // 1. the band does not own the point
  const bandPoint = await probe('hit', subject, geo.point.x, geo.point.y);
  check(
    `${label}: the band off the button is not the overlay`,
    !bandPoint.isWrapper && !bandPoint.isButton,
    `point (${n1(geo.point.x)}, ${n1(geo.point.y)}) in a ${n1(geo.wrapper.width)}x${n1(geo.wrapper.height)} band -> <${bandPoint.tag}> .${bandPoint.cls || '(no class)'}${bandPoint.isWrapper ? ' [THE OVERLAY WRAPPER]' : ''}${bandPoint.isButton ? ' [THE BUTTON]' : ''}`,
  );
  // 2. a drag from that point would select text. Light DOM only — see the header.
  if (lightDom) {
    check(
      `${label}: the point resolves into message text`,
      !!bandPoint.caret && bandPoint.caret.type === 3 && bandPoint.caret.inScroller,
      `caret node ${bandPoint.caret ? `${bandPoint.caret.type === 3 ? 'Text' : 'Element'} (in thread: ${bandPoint.caret.inScroller})` : 'none'}`,
    );
  } else {
    console.log('SKIP: the point resolves into message text (no shadow-root caret position in this engine)');
  }
  // 3. a real drag selects text through the strip. The whole path stays inside the host
  // and inside the band's own box, so the claim is exactly "a drag over the strip reaches
  // the text under it" rather than "a drag somewhere near the strip selects something".
  if (lightDom) {
    await probe('clearSelection', subject);
    await probe('watchPointer');
    await page.mouse.move(geo.point.x, geo.point.y);
    await page.mouse.down();
    await page.mouse.move(geo.point.x + 240, geo.point.y + 30, { steps: 12 });
    await page.mouse.up();
    const selected = await probe('selection', subject);
    check(
      `${label}: a drag through the band selects text`,
      selected.length > 0,
      `${selected.length} character(s) selected: ${JSON.stringify(selected.slice(0, 40))} (mousedown hit <${await probe('lastPointerDown', subject)}>)`,
    );
    await probe('clearSelection', subject);
  } else {
    console.log('SKIP: a drag through the band selects text (a shadow tree starts the selection from the text even when the drag began on the overlay)');
  }

  // 4. the wheel scrolls the thread with the pointer parked in the band
  await probe('setScrollTop', subject, 0);
  await page.waitForTimeout(100);
  const beforeWheel = (await probe('scroller', subject)).scrollTop;
  await page.mouse.move(geo.point.x, geo.point.y);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
  const afterWheel = (await probe('scroller', subject)).scrollTop;
  check(
    `${label}: the wheel scrolls with the pointer in the band`,
    afterWheel - beforeWheel >= 100,
    `scrollTop ${beforeWheel} -> ${afterWheel} (delta ${n1(afterWheel - beforeWheel)}px of a 300px wheel)`,
  );

  // 5a. the button still clicks, and still reaches the bottom
  const visible = await probe('buttonState', subject);
  await page.mouse.click(geo.buttonCentre.x, geo.buttonCentre.y);
  const settled = await settleScroll(subject);
  const reach = settled ? settled.scrollHeight - settled.clientHeight : -1;
  check(
    `${label}: the button still scrolls to the bottom`,
    settled && Math.abs(settled.scrollTop - reach) <= 2,
    `click at the button centre -> scrollTop ${settled ? settled.scrollTop : '?'} of ${reach}, from ${visible.pointerEvents} / opacity ${visible.opacity} (tabindex ${visible.tabindex})`,
  );

  // 5b. at the bottom the button is pointer-inert, and so is the wrapper around it
  const atBottom = await probe('geometry', subject);
  const bottomHit = await probe('hit', subject, atBottom.buttonCentre.x, atBottom.buttonCentre.y);
  const bottomState = await probe('buttonState', subject);
  check(
    `${label}: at the bottom the button takes no pointer, and neither does the band`,
    !bottomHit.isWrapper && !bottomHit.isButton && bottomState.pointerEvents === 'none' && bottomState.tabindex === '-1' && bottomState.ariaHidden === 'true',
    `button centre -> <${bottomHit.tag}> .${bottomHit.cls || '(no class)'}${bottomHit.isWrapper ? ' [THE OVERLAY WRAPPER]' : ''}; button pointer-events ${bottomState.pointerEvents}, tabindex ${bottomState.tabindex}, aria-hidden ${bottomState.ariaHidden}`,
  );

  console.log(`   wrapper class: ${await probe('wrapperClass', subject)}`);
}

await browser.close();
await server.close();
console.log(failed ? '\nFAILED' : '\nOK');
process.exit(failed ? 1 : 0);
