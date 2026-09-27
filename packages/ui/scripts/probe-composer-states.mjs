/**
 * Composer geometry probe: the layout facts jsdom cannot see.
 *
 * WHY THIS FILE EXISTS. The composer's whole design is geometry — one row when the
 * content fits a line, two when it does not, on a padding and a radius derived from
 * the row's own height. jsdom lays nothing out, so every unit assertion about it is a
 * class name, and four defects reached the owner's eyes with every gate green:
 *
 *   1. the text sat 2-3px above the row's centre (a 24px content box holding a 20px
 *      line box, so the line sat at the TOP of the box);
 *   2. the leading control's inset disagreed with the trailing one, because a bare
 *      glyph's INK sits inside its box while a filled control's edge IS its box — so
 *      two symmetric box insets looked asymmetric;
 *   3. a hidden band in the composer's `input-top` slot still occupied a flex item and
 *      ate the row's gap, pushing everything after it 8px right;
 *   4. the empty composer's editable measured 0px wide, which CLIPPED its
 *      absolutely-positioned placeholder — type a character and it appeared, which is
 *      why the text looked fine and only the placeholder was missing.
 *
 * Every one of those is a measurement, and every one of them is checked below. The
 * numbers are the kit's own derived geometry — a 48px collapsed row (10px + a 28px
 * control + 10px), controls centred on the pill's arc, a paragraph inset one step
 * further in than the controls — so a failure reports pixels against real targets
 * rather than a boolean.
 *
 *   node scripts/probe-composer-states.mjs [--headed]
 *
 * KNOWN GAP, printed but not asserted: a long unbreakable token can widen the editable
 * past its frame, because a flex item's automatic minimum size is its min-content and
 * nothing on that wrapper lets it shrink below. The outcome races run to run, so it is
 * reported by name with its fix (`min-w-0` on the Composer's inner wrapper) instead of
 * being turned into a flaky check. See the last block.
 *
 * Watch it fail: drop the `w-full` from the Composer's inner wrapper
 * (`src/components/composer/composer.tsx`) and the empty-width check reports a 0px
 * editable with the placeholder box outside it.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * One page hosting two composers: the real `<kai-prompt-input>` every kit consumer
 * gets, and a HAND-COMPOSED tree for the trailing-edge check, because that composition
 * is what the kit's own stories use and it has no `ml-auto` to fall back on.
 *
 * The hand-composed side is built with `solid-js/h` rather than JSX so the whole probe
 * stays one file.
 */
const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>composer geometry</title>
<style>html,body{margin:0;background:#181818;color:#eee;font-family:system-ui,sans-serif}
#stage{width:760px;padding:24px}#hand-host{width:760px;padding:24px}</style></head>
<body>
  <div id="stage"><kai-prompt-input id="c" placeholder="Ask anything"></kai-prompt-input></div>
  <div id="hand-host"></div>
  <script type="module">
    let error = null;
    try {
      await import('/src/web-components/prompt/prompt-input.tsx');
      const h = (await import('solid-js/h')).default;
      const { render } = await import('solid-js/web');
      const { PromptInput, PromptInputTextarea, PromptInputActions } =
        await import('/src/components/prompt/prompt-input.tsx');
      // justify-end and nothing else, exactly like the kit's own hand-composed
      // stories: worked while the frame was block-level, and is inert now that it is a
      // flex container — the frame's own distribution is what has to place it.
      // Mounted with wrapping text so the layout is EXPANDED, which is where a child
      // that only said justify-end has to be placed by the frame.
      render(() => h(PromptInput, {
        maxHeight: 240,
        value: 'a line long enough that it cannot possibly fit on one line inside this composer, because it keeps going and going and going and then keeps going some more',
      }, [
        h(PromptInputTextarea, { placeholder: 'hand composed' }),
        h(PromptInputActions, {
          class: 'justify-end',
          'data-probe-actions': 'true',
          children: h('button', { type: 'button' }, 'Send'),
        }),
      ]), document.getElementById('hand-host'));
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

const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
page.on('pageerror', (e) => console.error('pageerror:', String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
const boot = await page.evaluate(() => window.__probe);
if (boot.error) {
  console.error('module import failed:\n' + boot.error);
  await browser.close(); await server.close(); process.exit(2);
}

// --- element control ---------------------------------------------------------

/** Set JS properties on the element. Arrays are properties, never attributes. */
const set = (props) => page.evaluate((p) => {
  const el = document.getElementById('c');
  for (const [k, v] of Object.entries(p)) el[k] = v;
  return true;
}, props);
const settle = () => page.waitForTimeout(120);

/**
 * Set the value and WAIT until the editable shows it. A fixed delay is not enough:
 * the property change, the render and the ResizeObserver all have to land, and when
 * they had not, a check measured the PREVIOUS state — which is how a long-token check
 * passed once with the token absent, a vacuous pass rather than a slow one.
 */
const setValue = async (text) => {
  await set({ value: text });
  await page.waitForFunction(
    (want) => {
      const ed = document.querySelector('#c').shadowRoot.querySelector('[data-kai-composer-editable]');
      return (ed?.textContent ?? '') === want;
    },
    text,
    { timeout: 5000 },
  );
  await settle();
};

const box = async (sel) => page.locator(sel).first().boundingBox();
const frameBox = () => box('#c [data-prompt-input]');
const editableBox = () => box('#c [data-kai-composer-editable]');

/** The frame's own padding, read rather than assumed. */
const framePad = () => page.evaluate(() => {
  const el = document.querySelector('#c').shadowRoot.querySelector('[data-prompt-input]');
  const cs = getComputedStyle(el);
  return { top: parseFloat(cs.paddingTop), bottom: parseFloat(cs.paddingBottom), left: parseFloat(cs.paddingLeft), right: parseFloat(cs.paddingRight) };
});

/** Everything the row checks need, from ONE moment. */
const rowMetrics = async () => {
  const [frame, editable, plus, send, mic] = await Promise.all([
    frameBox(), editableBox(), box('#c [aria-label="More tools"]'),
    box('#c [data-testid="send"]'), box('#c [aria-label="Voice input"]'),
  ]);
  return {
    frame, editable, plus, send, mic,
    height: frame.height,
    plusInset: plus.x - frame.x,
    sendInset: (frame.x + frame.width) - (send.x + send.width),
    editableCentre: editable.y + editable.height / 2,
    frameCentre: frame.y + frame.height / 2,
  };
};

const clear = () => set({ value: '', attachments: [], tools: [], expanded: undefined });

/** Long enough to wrap at the probe's ~710px width, with spaces so it can. */
const LONG =
  'a line long enough that it cannot possibly fit on one line inside this composer, because it keeps going and going and going '
  + 'and then keeps going some more, which is the only way to make the layout wrap without pressing Enter';

await set({ voice: true, value: '', attachments: [], tools: [], expanded: undefined });
await settle();

/**
 * The layout, not the height: which of the two states is on screen. Height is
 * content-driven (a larger font legitimately makes the row taller), so every state
 * claim is made from where the controls ARE relative to the text.
 */
const oneRow = async () => {
  const m = await rowMetrics();
  return {
    ...m,
    sharesRow: Math.abs(m.editableCentre - m.send.y - m.send.height / 2) < 4,
    controlsBelow: m.send.y >= m.editable.y + m.editable.height - 4,
  };
};

// --- 1. collapsed: one row, controls on the frame's edges, text on its centre -----
console.log('\n== collapsed (one row) ==');
{
  const m = await rowMetrics();
  check('collapsed row is one control tall', Math.abs(m.height - 48) <= 3,
    `frame ${n1(m.height)}px against 10 + 28 + 10 = 48`);
  check('the editable and Send share the row', (await oneRow()).sharesRow,
    `editable centre ${n1(m.editableCentre)}, Send centre ${n1(m.send.y + m.send.height / 2)}`);
  // (2) both ends the same distance in. The leading control is a BARE glyph and Send is
  // FILLED, so this compares BOX edges — which is what a symmetric padding produces, and
  // an asymmetric pair is the ink-vs-box defect the owner saw as an indent.
  check('leading and trailing insets are equal', Math.abs(m.plusInset - m.sendInset) <= 1,
    `+ ${n1(m.plusInset)}px from the left edge, Send ${n1(m.sendInset)}px from the right`);
}

// --- 2. the placeholder: an empty composer must have width, and it must fit -------
console.log('\n== empty state (the clipped placeholder) ==');
{
  const ph = await page.evaluate(() => {
    const ed = document.querySelector('#c').shadowRoot.querySelector('[data-kai-composer-editable]');
    const r = ed.getBoundingClientRect();
    const bf = getComputedStyle(ed, '::before');
    return { editableW: r.width, content: bf.content, beforeW: parseFloat(bf.width) || 0 };
  });
  // (4) the width alone does not catch the clipping, and containment alone can pass at
  // width 0 — so both halves are asserted.
  check('an EMPTY composer still gives the editable width', ph.editableW > 0,
    `editable ${n1(ph.editableW)}px wide (0px means the ::before is clipped by overflow)`);
  check('the placeholder box fits inside the editable', ph.beforeW > 0 && ph.beforeW <= ph.editableW + 0.5,
    `content ${ph.content}, box ${n1(ph.beforeW)}px inside ${n1(ph.editableW)}px`);
}

// --- 13. the text sits on the row's centreline, empty and typed -------------------
console.log('\n== vertical centring ==');
{
  const empty = await rowMetrics();
  check('EMPTY: the editable is one line tall, not zero', empty.editable.height > 0,
    `editable ${n1(empty.editable.height)}px tall`);
  check('EMPTY: the editable is centred on the row', Math.abs(empty.editableCentre - empty.frameCentre) <= 1,
    `editable centre ${n1(empty.editableCentre)} vs row centre ${n1(empty.frameCentre)}`);
  await setValue('one line');
  const typed = await rowMetrics();
  check('TYPED: still one row, still centred', Math.abs(typed.editableCentre - typed.frameCentre) <= 1,
    `centre delta ${n1(typed.editableCentre - typed.frameCentre)}px, frame ${n1(typed.height)}px`);
}

// --- 1-4. one line stays collapsed; wrapping expands; clearing collapses ----------
console.log('\n== the two states ==');
{
  await setValue('one line');
  const one = await oneRow();
  check('ONE line is one row', one.sharesRow && Math.abs(one.height - 48) <= 3, `frame ${n1(one.height)}px`);

  await setValue(LONG);
  const m = await rowMetrics();
  // THE PRECONDITION, asserted rather than assumed: a check about wrapping text that
  // never wrapped passes on the wrong state. An earlier version of this probe did
  // exactly that with a string too short for a 760px composer.
  check('PRECONDITION: the long value really is more than one line', m.editable.height > 20 * 1.5,
    `editable ${n1(m.editable.height)}px (one line is about 20px)`);
  check('wrapping expands it', m.height > 48 + 8, `frame ${n1(m.height)}px against a 48px row`);
  check('the controls move BELOW the text', m.send.y >= m.editable.y + m.editable.height - 4,
    `Send top ${n1(m.send.y)}, text bottom ${n1(m.editable.y + m.editable.height)}`);
  // The frame's height IS its parts. This is the check that catches a stray row gap: it
  // is how the band's 8px was found.
  const pad = await framePad();
  const parts = pad.top + m.editable.height + (m.send.y - (m.editable.y + m.editable.height)) + m.send.height + pad.bottom;
  check('the frame is exactly its parts, with no hidden gap', Math.abs(parts - m.height) <= 2,
    `padding + text + gap + controls + padding = ${n1(parts)}px vs frame ${n1(m.height)}px`);

  await clear();
  await settle();
  const cleared = await oneRow();
  check('clearing collapses it again', cleared.sharesRow && Math.abs(cleared.height - 48) <= 3, `frame ${n1(cleared.height)}px`);
}

// --- 5. an attachment alone expands it, with no text at all ----------------------
console.log('\n== attachment alone ==');
{
  await set({ attachments: [{ id: 'a', type: 'file', filename: 'q3-metrics.pdf' }] });
  await settle();
  const f = await frameBox();
  check('an attachment expands an empty composer', f.height > 48 + 8, `frame ${n1(f.height)}px`);
  await clear();
  await settle();
}

// --- 6/7. the dev's pinned layouts ----------------------------------------------
console.log('\n== pinned layouts ==');
{
  await set({ value: LONG, expanded: false });
  await settle();
  const pinnedClosed = await oneRow();
  // The pin decides the LAYOUT, which is what it is for: the controls stay on the text's
  // row however much the text wraps. The row can still be TALLER than 48px while it does,
  // because its height is content-driven and the editable's own `maxHeight` (240) is what
  // caps it — past that the text scrolls inside rather than growing the box further. A
  // pinned composer showing three lines and standing 80px tall is therefore the pin
  // working, not failing; the measurement is printed so the two readings of that can be
  // told apart.
  check('expanded=false keeps ONE row through wrapping text', pinnedClosed.sharesRow,
    `controls on the text's row: ${pinnedClosed.sharesRow}, frame ${n1(pinnedClosed.height)}px with a ${n1(pinnedClosed.editable.height)}px editable (content-driven, capped by maxHeight)`);
  check('PRECONDITION: the pinned-closed value really is wrapping', pinnedClosed.editable.height > 20 * 1.5,
    `editable ${n1(pinnedClosed.editable.height)}px`);
  await set({ expanded: true });
  await setValue('');
  const pinnedOpen = await rowMetrics();
  check('expanded=true pins TWO rows when empty', pinnedOpen.height > 48 + 8
    && Math.abs(pinnedOpen.editableCentre - (pinnedOpen.send.y + pinnedOpen.send.height / 2)) > 4,
    `frame ${n1(pinnedOpen.height)}px, controls below the text: ${pinnedOpen.send.y >= pinnedOpen.editable.y + pinnedOpen.editable.height - 4}`);
  await clear();
  await settle();
}

// --- 8/9. the menu row is ONE checkbox, and the switch fits its column -----------
console.log('\n== the switch row: one control, and it fits ==');
{
  await set({ tools: [{ id: 'drive', label: 'Google Drive', checked: true, control: 'switch' }] });
  await settle();
  await page.locator('#c [aria-label="More tools"]').click();
  await page.waitForTimeout(200);

  const geometry = await page.evaluate(() => {
    const sr = document.querySelector('#c').shadowRoot;
    const row = sr.querySelector('[role="menuitemcheckbox"]');
    if (!row) return null;
    const sw = row.querySelector('[role="switch"]');
    const col = sw?.parentElement;
    const r = row.getBoundingClientRect(), s = sw?.getBoundingClientRect(), c = col?.getBoundingClientRect();
    return {
      rowRole: row.getAttribute('role'), rowChecked: row.getAttribute('aria-checked'), rowH: r.height,
      swRight: s?.right ?? null, swW: s?.width ?? null, swH: s?.height ?? null,
      colW: c?.width ?? null, colRight: c?.right ?? null,
    };
  });
  check('the row is a checkbox for a togglable item', geometry?.rowRole === 'menuitemcheckbox' && geometry?.rowChecked === 'true',
    `role=${geometry?.rowRole} aria-checked=${geometry?.rowChecked}`);
  check('the switch does not overflow its column', geometry?.swRight != null && geometry.swRight <= geometry.colRight + 1,
    `switch right ${n1(geometry?.swRight ?? NaN)} vs column right ${n1(geometry?.colRight ?? NaN)}`);
  check('the column is at least as wide as the switch', geometry?.colW != null && geometry.colW >= geometry.swW,
    `column ${n1(geometry?.colW ?? NaN)}px, switch ${n1(geometry?.swW ?? NaN)}px`);
  check('the switch is not taller than the row', geometry?.swH != null && geometry.swH <= geometry.rowH,
    `switch ${n1(geometry?.swH ?? NaN)}px in a ${n1(geometry?.rowH ?? NaN)}px row`);

  // The switch is DECORATION: the row carries the role and the state, and a second
  // focusable control inside a menu item is nested interactive content. Only the
  // composed AX tree can answer this, which is why it is not a unit test.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('Accessibility.enable');
  const { root: domRoot } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const byBackend = new Map();
  (function walk(node) {
    const attrs = {};
    for (let i = 0; i < (node.attributes?.length ?? 0); i += 2) attrs[node.attributes[i]] = node.attributes[i + 1];
    byBackend.set(node.backendNodeId, { name: node.nodeName, attrs });
    for (const c of node.children ?? []) walk(c);
    for (const sr of node.shadowRoots ?? []) walk(sr);
  })(domRoot);
  const { nodes: axNodes } = await cdp.send('Accessibility.getFullAXTree');
  const axById = new Map(axNodes.map((n) => [n.nodeId, n]));
  const axByBackend = new Map();
  for (const n of axNodes) if (n.backendDOMNodeId != null) axByBackend.set(n.backendDOMNodeId, n);
  const rowEntry = [...byBackend.entries()].find(([, v]) => v.attrs?.role === 'menuitemcheckbox');
  const axRow = rowEntry ? axByBackend.get(rowEntry[0]) : undefined;
  const rolesIn = (node, out = []) => {
    for (const id of node?.childIds ?? []) {
      const child = axById.get(id);
      if (!child) continue;
      if (child.role?.value) out.push(child.role.value);
      rolesIn(child, out);
    }
    return out;
  };
  const nested = axRow ? rolesIn(axRow) : [];
  check('the composed AX tree exposes the row as a checkbox',
    axRow?.role?.value === 'menuitemcheckbox' || axRow?.role?.value === 'checkbox',
    `AX role ${JSON.stringify(axRow?.role?.value ?? '(absent from the AX tree)')}, checked ${JSON.stringify(axRow?.properties?.find((p) => p.name === 'checked')?.value?.value ?? null)}`);
  check('and exposes NO second control inside that row', !nested.some((r) => r === 'switch' || r === 'button'),
    `roles inside the row: ${JSON.stringify(nested)}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await clear();
  await settle();
}

// --- 15. a chip is no taller than the row's controls -----------------------------
console.log('\n== the chip ==');
{
  await set({ tools: [{ id: 'web', label: 'Web search', checked: true, chip: true }] });
  await settle();
  const chip = await box('#c [aria-label="Web search, turn off"]');
  const plus = await box('#c [aria-label="More tools"]');
  check('the chip is no taller than the trigger', !!chip && !!plus && chip.height <= plus.height + 0.5,
    `chip ${n1(chip?.height ?? NaN)}px, trigger ${n1(plus?.height ?? NaN)}px`);
  const chipRow = await oneRow();
  check('and the chip keeps the composer one row', chipRow.sharesRow,
    `frame ${n1(chipRow.height)}px, controls below the text: ${chipRow.controlsBelow}`);
  await clear();
  await settle();
}

// --- 16. a projected band takes its own line and adds only its own height --------
console.log('\n== the projected input-top band ==');
{
  const before = await rowMetrics();
  await page.evaluate(() => {
    const el = document.querySelector('#c');
    const s = document.createElement('span');
    s.setAttribute('slot', 'input-top');
    s.textContent = 'listening';
    s.style.cssText = 'display:block;height:16px;line-height:16px';
    el.appendChild(s);
  });
  await settle();
  const after = await rowMetrics();
  const bandH = await page.evaluate(() => document.querySelector('#c').querySelector('[slot="input-top"]').getBoundingClientRect().height);
  check('the band does NOT move the leading control', Math.abs(after.plusInset - before.plusInset) <= 1,
    `+ inset ${n1(before.plusInset)}px without the band, ${n1(after.plusInset)}px with it`);
  check('the frame grows by the band height and nothing else', Math.abs((after.height - before.height) - bandH) <= 1,
    `frame ${n1(before.height)} -> ${n1(after.height)}px for a ${n1(bandH)}px band`);
  await page.evaluate(() => document.querySelector('#c').querySelector('[slot="input-top"]').remove());
  await settle();
}

// --- 10. the threshold follows a live font-size change ---------------------------
console.log('\n== a live prose-size change ==');
{
  // The row's height is content-driven, so this asserts the STATE (one row vs two), not
  // a pixel height: a stale threshold would call 40px of content "wrapped" and render
  // ONE line as TWO rows.
  const grow = () => page.evaluate(() => {
    const ed = document.querySelector('#c').shadowRoot.querySelector('[data-kai-composer-editable]');
    ed.style.fontSize = '32px';
    ed.style.lineHeight = '40px';
  });
  await setValue('one line');
  await grow();
  await settle();
  const one = await oneRow();
  check('ONE line stays ONE row after the font grows', one.sharesRow,
    `editable ${n1(one.editable.height)}px tall in a ${n1(one.height)}px frame, controls below: ${one.controlsBelow}`);
  await setValue(LONG);
  await grow();
  await settle();
  const two = await oneRow();
  check('wrapping still expands after the font grows', two.controlsBelow,
    `editable ${n1(two.editable.height)}px, Send top ${n1(two.send.y)} vs text bottom ${n1(two.editable.y + two.editable.height)}`);
  await page.evaluate(() => {
    const ed = document.querySelector('#c').shadowRoot.querySelector('[data-kai-composer-editable]');
    ed.style.fontSize = ''; ed.style.lineHeight = '';
  });
  await clear();
  await settle();
}

// --- 11. the radius stays half the row at any density ---------------------------
console.log('\n== density ==');
{
  const radiusOf = () => page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('#c').shadowRoot.querySelector('[data-prompt-input]')).borderTopLeftRadius));
  const base = await frameBox();
  const baseRadius = await radiusOf();
  await page.evaluate(() => document.querySelector('#c').style.setProperty('--kai-density', '0.5rem'));
  await settle();
  const doubled = await frameBox();
  const doubledRadius = await radiusOf();
  check('a doubled density doubles the collapsed row', Math.abs(doubled.height - base.height * 2) <= 3,
    `${n1(base.height)}px -> ${n1(doubled.height)}px`);
  check('and the radius stays half the row', Math.abs(doubledRadius - doubled.height / 2) <= 1,
    `radius ${n1(doubledRadius)}px against half of ${n1(doubled.height)}px (was ${n1(baseRadius)}px at the default density)`);
  await page.evaluate(() => document.querySelector('#c').style.removeProperty('--kai-density'));
  await settle();
}

// --- 14. the shape token is a real switch ---------------------------------------
console.log('\n== the shape token ==');
{
  await page.evaluate(() => document.querySelector('#c').style.setProperty('--kai-radius-composer', '4px'));
  await settle();
  const f = await frameBox();
  const radius = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('#c').shadowRoot.querySelector('[data-prompt-input]')).borderTopLeftRadius));
  check('a squared override REPLACES the derived radius', Math.abs(radius - 4) <= 1 && radius < f.height / 2 - 1,
    `radius ${n1(radius)}px against half of ${n1(f.height)}px`);
  await page.evaluate(() => document.querySelector('#c').style.removeProperty('--kai-radius-composer'));
  await settle();
}

// --- 12. a hand-composed tree keeps its controls at the trailing edge -----------
console.log('\n== hand-composed PromptInput ==');
{
  const frame = await box('#hand-host [data-prompt-input]');
  const editable = await box('#hand-host [data-kai-composer-editable]');
  const actions = await box('#hand-host [data-probe-actions]');
  // The precondition again: this composition only has something to distribute once it is
  // expanded, and a collapsed frame would make the trailing-edge check pass for free.
  await page.evaluate(() => {
    const ed = document.querySelector('#hand-host [data-kai-composer-editable]');
    void ed;
  });
  check('PRECONDITION: the hand-composed frame is expanded', frame.height > 48,
    `frame ${n1(frame.height)}px, editable ${n1(editable.height)}px`);
  check('the hand-composed controls reach the trailing edge',
    Math.abs((actions.x + actions.width) - (frame.x + frame.width)) < 3,
    `actions right ${n1(actions.x + actions.width)} vs frame right ${n1(frame.x + frame.width)}`);
}

// --- 17. one long unbreakable token does not overflow the row -------------------
console.log('\n== a long unbreakable token ==');
{
  await setValue('x'.repeat(300));
  const over = await page.evaluate(() => {
    const sr = document.querySelector('#c').shadowRoot;
    const ed = sr.querySelector('[data-kai-composer-editable]');
    const f = sr.querySelector('[data-prompt-input]');
    const body = sr.querySelector('[data-composer-body]');
    return {
      editableW: ed.getBoundingClientRect().width, scrollW: ed.scrollWidth, clientW: ed.clientWidth,
      frameW: f.getBoundingClientRect().width, bodyW: body.getBoundingClientRect().width,
      stageW: document.getElementById('stage').clientWidth,
    };
  });
  // The frame must not be widened by its content. This half is deterministic.
  check('a long unbreakable token does not widen the frame', over.frameW <= over.stageW + 1,
    `frame ${n1(over.frameW)}px in a ${over.stageW}px stage`);
  // KNOWN GAP, reported rather than asserted. The editable itself CAN be widened past
  // its frame by a token with no break opportunities: measured on four identical fresh
  // pages, the same 300-character value gave a 668px editable three times and a 2157px
  // one once, because a flex item's automatic minimum size is its min-content and
  // nothing on the editable's wrapper lets it shrink below that. The cause is
  // `min-w-0` missing from the Composer's inner wrapper; the outcome RACES today, so
  // asserting it here would make this probe flaky — which is worse than a failing
  // check, because a flaky one teaches you to ignore it. Add the assertion with the
  // fix; the numbers are printed meanwhile.
  const widened = over.editableW > over.frameW + 1;
  console.log(`${widened ? 'KNOWN-GAP' : 'ok'}: the editable fits its frame (${n1(over.editableW)}px inside ${n1(over.frameW)}px${widened ? ' — min-w-0 missing from the Composer wrapper' : ''})`);
  await clear();
  await settle();
}

await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
