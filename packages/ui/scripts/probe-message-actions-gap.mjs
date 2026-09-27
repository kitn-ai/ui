/**
 * The space between a message's LAST block and its action bar, measured in a real
 * browser.
 *
 * WHY THIS EXISTS: at the end of a message there are TWO facts in play — the block's
 * own bottom margin, and the space the ACTION BAR is placed with — and only one of
 * them may be there. The reported defect was a message ending in a fenced code block:
 * the Markdown renderer gives a fence `my-4` (16px above AND below, which is what
 * separates it from the paragraph before it), and `.chat-markdown`'s last-child margin
 * reset was written as `> div:last-child > :last-child` — it reaches a block whose
 * content sits a level deeper, and a fence IS the container's own child, so the reset
 * never reached it. Every other way a message can end (paragraph, list, table, quote,
 * heading, image) gets the reset; the fence did not.
 *
 * jsdom measures nothing, so the unit suite can only ever assert the class string that
 * carries the margin; the defect IS the number of pixels. Hence: boot vite, launch
 * chromium, populate a real `<kai-chat>` and read box edges. The composed element, not
 * `MessageBody` on its own: the message body is a flex column, so the bubble is a flex
 * item and therefore establishes its own formatting context — the fence's margin never
 * collapses out of it, and a hand-mounted tree in a plain block container would report
 * a different number for the same markup.
 *
 *   node scripts/probe-message-actions-gap.mjs [--headed]
 *
 * THE TARGET IS DERIVED, never typed: the space the bar is placed with is its own
 * computed `margin-top` PLUS the flex row's own computed `gap`, both read live, so the
 * numbers move with `--kai-density` instead of pinning today's pixels.
 *
 * WHAT IS ASSERTED:
 *   1. the reported case — a message ending in a code block: the gap below the block
 *      equals that derived space, i.e. the block contributes NOTHING of its own;
 *   2. the reset reached the last child, for EVERY row, which is the class-level
 *      statement covering the siblings below rather than just the reported instance;
 *   3. the regression a naive fix (`my-4` -> `mt-4`) would cause — a code block
 *      FOLLOWED by a paragraph keeps its own bottom space, unchanged.
 *
 * WHAT IS PRINTED AND NOT ASSERTED, deliberately: a message whose text ends in a BLANK
 * line (two newlines) renders a whitespace token as an empty wrapper div, and that
 * empty div — not the code block — is then the container's last child, so the reset
 * misses the block in front of it. That is a hole in the reset's REACH, it hits every
 * block type rather than fences, and closing it is a change at the block-splitting
 * level (`parseMarkdownIntoBlocks` renders one wrapper per lexer token, `space`
 * included) rather than in this file. It is reported, not fixed, so it is printed with
 * a KNOWN label and cannot be read as a pass. The same label marks the sub-3px residue
 * a list ending adds from the last `li`'s own margin, which the reset also cannot
 * reach.
 *
 * Watch the first check go red with the reset removed: the code block reports its own
 * 16px stacked on the derived space. Watch the third go red with the margin deleted
 * from the fence instead of reset at the end of the message.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Each message ends in a different block-level element, so the run says which of them
// already behaved and which the reset had to reach. `code-last` is the report, and
// `code-then-text` is the case that must NOT change.
const MESSAGES = [
  { id: 'code-last', text: 'Here is the fix:\n\n```ts\nconst x = 1;\n```' },
  { id: 'code-then-text', text: 'Set it up:\n\n```ts\nconst x = 1;\n```\n\nThen run it.' },
  { id: 'list-last', text: 'Steps:\n\n- one\n- two' },
  { id: 'table-last', text: 'Values:\n\n| a | b |\n| - | - |\n| 1 | 2 |' },
  { id: 'quote-last', text: 'Note this:\n\n> quoted' },
  { id: 'heading-last', text: 'Intro:\n\n## Section' },
  // The src resolves to nothing on purpose (no network in the probe); what is measured
  // is the `p` the renderer wraps it in, which is what borders the action bar.
  { id: 'image-last', text: 'Shot:\n\n![tile](/missing-tile.png)' },
  // KNOWN hole, printed not asserted — the trailing blank line's empty wrapper div.
  { id: 'code-last-blankline', text: 'Here is the fix:\n\n```ts\nconst x = 1;\n```\n\n' },
].map((m) => ({ id: m.id, role: 'assistant', parts: [{ type: 'text', text: m.text }] }));

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>message action gap</title>
<style>html,body{margin:0}#host{width:760px;height:1600px}</style></head>
<body>
  <div id="host"><kai-chat id="ch"></kai-chat></div>

  <script type="module">
    let error = null;
    try {
      await import('/src/web-components/chat/chat.tsx');
      const ch = document.getElementById('ch');
      // Actions FIRST: the bar is what every gap is measured against, and a render
      // that never had one would measure nothing rather than measure a defect.
      ch.assistantActions = ['copy', 'like', 'dislike'];
      ch.messages = ${JSON.stringify(MESSAGES)};
      await new Promise((r) => setTimeout(r, 1200));
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

const server = await createServer({
  root,
  configFile: false,
  plugins: [servePage(), solidPlugin()],
  server: { port: 0, strictPort: false },
  logLevel: 'warn',
});
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
const probe = await page.evaluate(() => window.__probe);

if (probe.error) {
  console.error('module import failed:\n' + probe.error);
  await browser.close();
  await server.close();
  process.exit(2);
}

// Every quantity below is read off the live boxes. The element path lives inside the
// `kai-chat` shadow root, where a page-level `querySelector` does not reach, so the
// read walks the shadow root by hand (as `probe-thread-row-semantics.mjs` does).
const measured = await page.evaluate((ids) => {
  const host = document.getElementById('ch');
  const sr = host.shadowRoot;
  const bubbles = [...sr.querySelectorAll('[part="bubble content"]')];
  const bars = [...sr.querySelectorAll('[part="actions"]')];
  const top = (el) => el.getBoundingClientRect().top;
  const bottom = (el) => el.getBoundingClientRect().bottom;
  return {
    bubbles: bubbles.length,
    bars: bars.length,
    rows: bubbles.map((bubble, i) => {
      const bar = bars[i];
      const last = bubble.lastElementChild;
      // `not-prose` is the class the fence's CodeBlock root carries into the markdown
      // surface, and it is the one child that is not a MarkdownBlock wrapper.
      const code = [...bubble.children].find((c) => c.classList.contains('not-prose'));
      const next = code ? code.nextElementSibling : null;
      // A `<li>`'s own margin is not reachable by a reset aimed at its ancestors; read
      // it so the residue below can be named rather than absorbed by a tolerance.
      const lastItem = bubble.querySelector('li:last-child');
      const barStyle = getComputedStyle(bar);
      const rowStyle = getComputedStyle(bubble.parentElement);
      const fenceStyle = code ? getComputedStyle(code) : null;
      // The message's last VISIBLE content edge. A wrapper div rendered for a
      // whitespace token has no height and no border, so it is not the edge a reader
      // sees — and a `my-4` fence followed by one of those still ends the content 16px
      // above it, which is exactly the shape a raw `lastElementChild` read hides.
      const content = [...bubble.children].filter((c) => c.getBoundingClientRect().height > 0);
      const contentBottom = content.length
        ? Math.max(...content.map((c) => bottom(c)))
        : bottom(last);
      return {
        id: ids[i] ?? `#${i}`,
        lastTag: last.tagName.toLowerCase(),
        lastMarginBottom: parseFloat(getComputedStyle(last).marginBottom),
        gapToBar: bar ? +(top(bar) - contentBottom).toFixed(2) : null,
        // The space the action bar is PLACED with: the flex row's gap plus its own
        // margin. One derived number, so a density change moves the target with it.
        placedWith: +(parseFloat(rowStyle.rowGap) + parseFloat(barStyle.marginTop)).toFixed(2),
        rowGap: parseFloat(rowStyle.rowGap),
        barMarginTop: parseFloat(barStyle.marginTop),
        lastItemMarginBottom: lastItem ? parseFloat(getComputedStyle(lastItem).marginBottom) : null,
        codeMarginBottom: fenceStyle ? parseFloat(fenceStyle.marginBottom) : null,
        codeToNext: code && next ? +(top(next) - bottom(code)).toFixed(2) : null,
        bubbleH: +bubble.getBoundingClientRect().height.toFixed(2),
      };
    }),
  };
}, MESSAGES.map((m) => m.id));

await browser.close();
await server.close();

let failed = 0;
const check = (label, ok, detail) => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}\n        ${detail}`);
};

if (measured.bubbles !== MESSAGES.length || measured.bars !== MESSAGES.length) {
  console.error(
    `probe read ${measured.bubbles} bubble(s) and ${measured.bars} action bar(s) for ${MESSAGES.length} message(s)\n`
    + '— it is not measuring what it thinks it is; fix the probe before trusting a number.',
  );
  process.exit(2);
}

const byId = new Map(measured.rows.map((r) => [r.id, r]));
const placement = measured.rows[0];
console.log(
  `\n${measured.rows.length} message(s), one action bar each.`
  + ` The bar is placed with ${placement.placedWith}px (row gap ${placement.rowGap} + margin-top ${placement.barMarginTop}).`,
);

for (const r of measured.rows) {
  const residual = +(r.gapToBar - r.placedWith).toFixed(2);
  let verdict = 'ok';
  if (residual !== 0) {
    if (r.id === 'code-last-blankline') {
      verdict = 'KNOWN: a trailing blank line renders an empty wrapper div as the last child, which the reset cannot see past — measured at the content edge above it, not asserted';
    } else if (r.lastItemMarginBottom !== null && Math.abs(residual - r.lastItemMarginBottom) <= 0.6) {
      verdict = `KNOWN: the last <li>'s own ${r.lastItemMarginBottom}px margin escapes the reset (the ul it lives in is reset, the li is not) — printed, not asserted`;
    } else {
      verdict = 'UNEXPLAINED — this is the defect this probe exists for';
    }
  }
  console.log(
    `  [${r.id}] gap to bar ${r.gapToBar}px against ${r.placedWith}px placed-with`
    + ` (last <${r.lastTag}> mb=${r.lastMarginBottom}px, bubble ${r.bubbleH}px)`
    + `\n      ${verdict}`,
  );
}

console.log('');
// 1. The reported case, measured at the edge a reader sees.
const codeLast = byId.get('code-last');
check(
  "[code-last] a message ending in a code block gets the bar's placement and nothing more",
  codeLast !== undefined
    && codeLast.gapToBar !== null
    && Math.abs(codeLast.gapToBar - codeLast.placedWith) <= 0.6,
  `gap below the code block ${codeLast?.gapToBar}px against ${codeLast?.placedWith}px placed-with`,
);

// 2. The same statement one level out, and for EVERY row: the reset reaches whatever
//    the container ends with, so no block can leave a margin of its own behind.
for (const r of measured.rows) {
  if (r.id === 'code-last-blankline') continue; // the known hole, printed above
  check(
    `[${r.id}] the message's last child carries no margin of its own`,
    r.lastMarginBottom === 0,
    `last <${r.lastTag}> reads margin-bottom ${r.lastMarginBottom}px`,
  );
}

// 3. The regression: a code block with a paragraph after it keeps its own space.
const midMessage = byId.get('code-then-text');
check(
  '[code-then-text] a code block followed by a paragraph KEEPS its own bottom space',
  midMessage !== undefined
    && midMessage.codeToNext !== null
    && midMessage.codeToNext > 0
    && Math.abs(midMessage.codeToNext - midMessage.codeMarginBottom) <= 0.6,
  `gap below the code block ${midMessage?.codeToNext}px against its margin-bottom ${midMessage?.codeMarginBottom}px`,
);

if (pageErrors.length) console.log('\npage errors:\n  ' + pageErrors.join('\n  '));
console.log(failed ? '\nFAILED' : '\nOK');
process.exit(failed ? 1 : 0);
