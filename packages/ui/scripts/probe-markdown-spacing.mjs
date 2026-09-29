/**
 * Markdown block spacing, measured in a real browser.
 *
 * WHY THIS EXISTS: the space between blocks in a message is a NUMBER, and jsdom
 * computes none of them — the unit suite can only ever assert the class string or
 * the stylesheet text that carries it. This boots vite, launches chromium, populates
 * a real <kai-chat> and reads box edges. The composed element, not `<Markdown>` on
 * its own: the message body is a flex column, so the bubble is a flex item and
 * establishes its own formatting context, while a hand-mounted tree in a plain
 * block container would report different numbers for the same markup.
 *
 *   node scripts/probe-markdown-spacing.mjs [--headed]
 *
 * THE MODEL THIS MEASURES, and the surface has exactly one: the element that
 * CONTAINS blocks owns the gap between them, and no block carries a vertical margin
 * of its own (see `.chat-markdown` in theme.css, where the gaps live). Both halves are
 * asserted, because either alone can be satisfied while the spacing is still wrong:
 *
 *   - the gap a reader sees between two blocks EQUALS the margin the container puts
 *     on the later one, so nothing else is contributing space (the value itself is
 *     deliberately not typed here — read it off the live box);
 *   - every block's own bottom margin is ZERO, so no block can leave residue behind
 *     whatever it is, including the last one in the message.
 *
 * WHAT THE FOUR HARD CASES ARE, all of them configurations the model must not break:
 *   1. two paragraphs in one message are separated (they rendered FLUSH when each
 *      block was its own wrapper and `p:last-child` matched inside every wrapper);
 *   2. a message ending in a fenced code block gets the action bar's own placement
 *      and nothing more — 16px at the default density, the number the end-of-message
 *      reset shipped, which must not regress;
 *   3. a message ending in a list or a trailing blank line does not keep an oversized
 *      gap (a list used to add its last <li>'s 0.2em; a trailing blank line used to
 *      render an empty wrapper as the container's last child, hiding the block in
 *      front of it);
 *   4. a code block FOLLOWED by a paragraph keeps its own wider space, which a naive
 *      fix (deleting the fence's margin rather than moving the gap to the container)
 *      would collapse.
 *
 * WHAT IS PRINTED FOR EVERY BLOCK, not asserted: the table below is the record — each
 * block's tag, its own bottom margin, the gap in front of it and the gap after it.
 * A change anywhere in the surface shows up there first, including in the block types
 * no check names (a heading, a quote, a table, an image, a nested list).
 *
 * The bar's placement is DERIVED, never typed: its own computed `margin-top` plus the
 * flex row's computed `gap`, both read live, so the numbers move with `--kai-density`.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// One message per shape. `mixed` is the one the intra-block gaps are asserted on: it
// carries every block-level element the surface renders, in one turn, in this order.
const MIXED = [
  'First paragraph.',
  '',
  'Second paragraph.',
  '',
  'Here is the fix:',
  '',
  '```ts',
  'const x = 1;',
  '```',
  '',
  'Then run it.',
  '',
  '- one',
  '- two',
  '',
  '> quoted',
  '',
  '---',
  '',
  '## Section',
  '',
  'Last word.',
].join('\n');

// Each message ends in a different block-level element, so the run says which of them
// end cleanly and which leave their own margin behind. `code-last` is the reported
// case and `code-then-text` is the one that must NOT change.
const MESSAGES = [
  { id: 'mixed', text: MIXED },
  { id: 'two-paragraphs', text: 'First paragraph.\n\nSecond paragraph.' },
  // A nested list is the case a gap rule written only for the container's own
  // children misses entirely.
  { id: 'nested-list-last', text: 'Steps:\n\n- one\n  - nested one\n  - nested two\n- two' },
  { id: 'code-last', text: 'Here is the fix:\n\n```ts\nconst x = 1;\n```' },
  { id: 'code-then-text', text: 'Set it up:\n\n```ts\nconst x = 1;\n```\n\nThen run it.' },
  { id: 'list-last', text: 'Steps:\n\n- one\n- two' },
  { id: 'table-last', text: 'Values:\n\n| a | b |\n| - | - |\n| 1 | 2 |' },
  { id: 'quote-last', text: 'Note this:\n\n> quoted' },
  { id: 'heading-last', text: 'Intro:\n\n## Section' },
  { id: 'hr-last', text: 'Before the rule:\n\n---' },
  // The src resolves to nothing on purpose (no network in the probe); what is measured
  // is the `p` the renderer wraps it in, which is what borders the action bar.
  { id: 'image-last', text: 'Shot:\n\n![tile](/missing-tile.png)' },
  // Reported as a hole by the end-of-message round: a trailing blank line.
  { id: 'code-last-blankline', text: 'Here is the fix:\n\n```ts\nconst x = 1;\n```\n\n' },
].map((m) => ({ id: m.id, role: 'assistant', parts: [{ type: 'text', text: m.text }] }));

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>markdown block spacing</title>
<style>html,body{margin:0}#host{width:760px;height:2400px}</style></head>
<body>
  <div id="host"><kai-chat id="ch"></kai-chat></div>

  <script type="module">
    let error = null;
    try {
      await import('/src/web-components/chat/chat.tsx');
      const ch = document.getElementById('ch');
      // Actions FIRST: the bar is what every end-of-message gap is measured against,
      // and a render that never had one would measure nothing rather than a defect.
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
  const label = (el) => {
    const tag = el.tagName.toLowerCase();
    return el.classList.contains('not-prose') ? `${tag}(fence)` : tag;
  };
  // The two lengths the sheet is allowed to use, read off the live page rather than
  // typed here: the prose gap is em-relative, the fence's gap rides the spacing scale.
  const spacing = getComputedStyle(host).getPropertyValue('--spacing').trim();
  const probeEl = document.createElement('div');
  probeEl.style.cssText = `position:absolute;width:calc(${spacing} * 4)`;
  document.body.appendChild(probeEl);
  const fenceGapPx = probeEl.getBoundingClientRect().width;
  probeEl.remove();
  return {
    bubbles: bubbles.length,
    bars: bars.length,
    isMarkdownContainer: bubbles.every((b) => b.classList.contains('chat-markdown')),
    fenceGapPx,
    rows: bubbles.map((bubble, i) => {
      const bar = bars[i];
      const children = [...bubble.children];
      const boxes = children.map((c) => {
        const style = getComputedStyle(c);
        return {
          tag: label(c),
          text: (c.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24),
          mt: parseFloat(style.marginTop),
          mb: parseFloat(style.marginBottom),
          fontSize: parseFloat(style.fontSize),
          top: top(c),
          bottom: bottom(c),
          height: +c.getBoundingClientRect().height.toFixed(2),
        };
      });
      // A whitespace token renders nothing at all now, so any child with no height is
      // a defect rather than a wrapper the reset cannot see past — say so loudly.
      const empty = boxes.filter((b) => b.height === 0).map((b) => b.tag);
      // Gaps are measured between consecutive VISIBLE blocks, not consecutive
      // children: a zero-height child contributes no space a reader can see, so
      // skipping it is what makes the number here the gap in the message as drawn —
      // and it is the only form in which a run with an empty wrapper left in the
      // markup is comparable with one without. (An empty child is a defect in its own
      // right; the check for it is below, not folded into this number.)
      const visible = boxes.filter((b) => b.height > 0);
      const gaps = visible.slice(1).map((b, n) => ({
        from: visible[n].tag,
        to: b.tag,
        gap: +(b.top - visible[n].bottom).toFixed(2),
        expectedFromLaterMargin: b.mt,
      }));
      const barStyle = getComputedStyle(bar);
      const rowStyle = getComputedStyle(bubble.parentElement);
      // The space the action bar is PLACED with: the flex row's gap plus its own
      // margin. One derived number, so a density change moves the target with it.
      const placedWith = +(parseFloat(rowStyle.rowGap) + parseFloat(barStyle.marginTop)).toFixed(2);
      // The message's last VISIBLE content edge.
      const contentBottom = visible.length ? Math.max(...visible.map((b) => b.bottom)) : bottom(bubble);
      const list = bubble.querySelector('ul, ol');
      const items = list ? [...list.children] : [];
      return {
        id: ids[i] ?? `#${i}`,
        boxes,
        empty,
        gaps,
        placedWith,
        gapToBar: bar ? +(top(bar) - contentBottom).toFixed(2) : null,
        lastTag: children.length ? label(children[children.length - 1]) : null,
        lastMarginBottom: boxes.length ? boxes[boxes.length - 1].mb : null,
        listItemGaps: items.slice(1).map((li, n) => ({
          gap: +(top(li) - bottom(items[n])).toFixed(2),
          expectedFromLaterMargin: parseFloat(getComputedStyle(li).marginTop),
        })),
        lastItemMarginBottom: items.length ? parseFloat(getComputedStyle(items[items.length - 1]).marginBottom) : null,
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
if (!measured.isMarkdownContainer) {
  console.error('[part="bubble content"] is not the .chat-markdown container — the gap numbers below would be read off the wrong element');
  process.exit(2);
}

const byId = new Map(measured.rows.map((r) => [r.id, r]));
const placement = measured.rows[0].placedWith;
console.log(
  `\n${measured.rows.length} message(s), one action bar each.`
  + ` The bar is placed with ${placement}px (row gap + its own margin-top).`
  + ` The fence's gap reads ${measured.fenceGapPx}px off the live spacing scale.`,
);

for (const r of measured.rows) {
  console.log(`  [${r.id}] bubble ${r.bubbleH}px, gap to bar ${r.gapToBar}px (bar placed with ${r.placedWith}px)`);
  for (const b of r.boxes) {
    console.log(`      <${b.tag}> mt=${b.mt} mb=${b.mb} font=${b.fontSize} h=${b.height}  "${b.text}"`);
  }
  for (const g of r.gaps) {
    console.log(`      gap ${g.from} -> ${g.to}: ${g.gap}px (later block's own margin-top ${g.expectedFromLaterMargin}px)`);
  }
  for (const g of r.listItemGaps) {
    console.log(`      li gap: ${g.gap}px (later li's own margin-top ${g.expectedFromLaterMargin}px)`);
  }
  if (r.empty.length) console.log(`      EMPTY WRAPPERS: ${r.empty.join(', ')}`);
}

console.log("\n1. the model: the gap a reader sees IS the container's own margin on the later block");
for (const id of ['mixed', 'two-paragraphs', 'nested-list-last']) {
  const r = byId.get(id);
  const off = r.gaps.filter((g) => Math.abs(g.gap - g.expectedFromLaterMargin) > 0.6);
  check(
    `[${id}] every block gap equals the later block's own margin-top, so nothing else contributes space`,
    off.length === 0,
    off.length
      ? off.map((g) => `${g.from} -> ${g.to} measured ${g.gap}px against ${g.expectedFromLaterMargin}px`).join('; ')
      : `${r.gaps.length} gap(s) checked, all equal`,
  );
}

console.log('\n2. the model: no block carries a bottom margin of its own, in any message');
for (const r of measured.rows) {
  const withMargin = r.boxes.filter((b) => b.mb !== 0).map((b) => `${b.tag} ${b.mb}px`);
  check(
    `[${r.id}] every block in the message has margin-bottom 0`,
    withMargin.length === 0,
    withMargin.length ? withMargin.join('; ') : `${r.boxes.length} block(s) at 0`,
  );
  check(
    `[${r.id}] no empty wrapper is rendered as a block`,
    r.empty.length === 0,
    r.empty.length ? `empty children: ${r.empty.join(', ')}` : 'no child with zero height',
  );
}

console.log('\n3. the four hard cases');
const two = byId.get('two-paragraphs');
const twoGap = two?.gaps[0];
// 0.75em is theme.css's prose block gap; it is em-relative, so the expectation is
// derived from the later block's own font-size rather than typed in pixels.
const expectedProse = +((two?.boxes[1]?.fontSize ?? 0) * 0.75).toFixed(2);
check(
  '[two-paragraphs] two paragraphs in one message are separated, not flush',
  twoGap !== undefined && Math.abs(twoGap.gap - expectedProse) <= 0.6,
  twoGap ? `measured ${twoGap.gap}px against the prose gap ${expectedProse}px (0.75em of ${two?.boxes[1]?.fontSize}px)` : 'no adjacent block pair measured',
);

const mixed = byId.get('mixed');
const fence = measured.fenceGapPx;
const fenceGaps = mixed.gaps.filter((g) => g.from.includes('fence') || g.to.includes('fence'));
check(
  '[mixed] a paragraph before a fence and a fence before a paragraph both keep the fence\'s wider gap',
  fenceGaps.length === 2 && fenceGaps.every((g) => Math.abs(g.gap - fence) <= 0.6),
  `${fenceGaps.map((g) => `${g.from} -> ${g.to} ${g.gap}px`).join(', ')} against ${fence}px (4 x --spacing = 16px at the default density)`,
);

const codeLast = byId.get('code-last');
check(
  '[code-last] a message ending in a code block gets the bar\'s placement and nothing more',
  codeLast !== undefined && Math.abs(codeLast.gapToBar - codeLast.placedWith) <= 0.6,
  `gap below the code block ${codeLast?.gapToBar}px against ${codeLast?.placedWith}px placed-with (UNCHANGED: 16px at the default density)`,
);

const midMessage = byId.get('code-then-text');
const midCode = midMessage.gaps.find((g) => g.from.includes('fence'));
check(
  '[code-then-text] a code block followed by a paragraph KEEPS its own wider space',
  midCode !== undefined && Math.abs(midCode.gap - fence) <= 0.6,
  midCode ? `gap below the code block ${midCode.gap}px against ${fence}px (UNCHANGED: 16px at the default density)` : 'no fence followed by a block',
);

console.log('\n4. the end of the message: the bar\'s placement and nothing more, for every shape');
for (const r of measured.rows) {
  check(
    `[${r.id}] ends on the bar's placement alone (last block <${r.lastTag}>, bottom margin ${r.lastMarginBottom}px)`,
    r.gapToBar !== null && Math.abs(r.gapToBar - r.placedWith) <= 0.6,
    `gap to bar ${r.gapToBar}px against ${r.placedWith}px placed-with`,
  );
}

console.log('\n5. a list owns its own gaps, items included');
for (const id of ['list-last', 'nested-list-last']) {
  const r = byId.get(id);
  const off = r.listItemGaps.filter((g) => Math.abs(g.gap - g.expectedFromLaterMargin) > 0.6);
  check(
    `[${id}] every list-item gap equals the later item's own margin-top`,
    r.listItemGaps.length > 0 && off.length === 0,
    r.listItemGaps.length === 0
      ? 'no list items found'
      : off.length
        ? off.map((g) => `measured ${g.gap}px against ${g.expectedFromLaterMargin}px`).join('; ')
        : `${r.listItemGaps.length} li gap(s) checked, all equal`,
  );
  check(
    `[${id}] the last <li> leaves no margin behind`,
    r.lastItemMarginBottom === 0,
    `last <li> margin-bottom ${r.lastItemMarginBottom}px`,
  );
}

if (pageErrors.length) console.log('\npage errors:\n  ' + pageErrors.join('\n  '));
console.log(failed ? `\nFAILED (${failed} check(s))` : '\nOK');
process.exit(failed ? 1 : 0);
