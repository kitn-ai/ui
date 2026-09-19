/**
 * Measure `RowGroup`'s geometry in a REAL browser, on BOTH style paths, plus the
 * `[hidden]` fix that travels with it.
 *
 * WHY THIS EXISTS. The dividers and the per-position corner radii are decided by
 * CSS in `kit-base.css` (`.kai-row-group > *` for the Solid path, `::slotted(
 * kai-row)` for the element path) and drawn on the row's surface. jsdom applies NO
 * shadow-root rules and implements no `::slotted()` matching, so
 * `src/components/row/row-group.test.tsx` can only pin the CONTRACT (class name, the frames's
 * children, the var names). It cannot see whether a single row ends up rounded on
 * all four corners, whether a middle row loses its radius, whether the divider
 * paints at all, or whether the two paths agree. Nothing else in the tree renders
 * a shadow root and reads computed styles either, so those facts would otherwise
 * ship unverified.
 *
 * IT EARNS ITS KEEP TWICE OVER, and both were real defects found by running it:
 *
 *  1. The divider was first written as a DIRECT declaration,
 *     `::slotted(kai-row:not(:first-child)) { border-top: 1px solid … }`. Corners
 *     passed, dividers failed on the element path only. The reason was the
 *     document-level copy of the kit's own sheet that this probe injects below:
 *     Tailwind's preflight (`@layer base { * { border: 0 solid } }`) in the
 *     LIGHT-DOM sheet won over the shadow sheet's `::slotted` declaration. That
 *     combination is not hypothetical — it is exactly what Storybook and the docs
 *     site have — and the geometry now travels as custom properties, which are
 *     immune, for this reason. See the row-list block in `kit-base.css`.
 *  2. `Row`'s radius is a Tailwind arbitrary value with a nested `var()` fallback.
 *     A scanner that fails to compile that class emits the class name in no
 *     stylesheet and the row has no radius at all, with no error anywhere.
 *     Reading the computed radius is the only cheap way to know it survived.
 *
 * AND IT IS THE ONLY PLACE `[hidden]` ON A CUSTOM ELEMENT IS CHECKED. The base
 * sheet's `:host{display:block}` is an author rule and outranks the UA's
 * `[hidden]{display:none}`, so a "hidden" `kai-row` still laid out (live in
 * `support-widget.html`, which drives its recent-conversation row that way). Both
 * facades now carry `:host([hidden]){display:none}`, verified here as a zero
 * height. jsdom cannot see it: it never applies shadow-root CSS.
 *
 *   node packages/ui/scripts/probe-row-group.mjs [--headed]
 *
 * Exits 1 on any mismatch. Delete the custom properties from `kit-base.css`'s
 * row-list block to watch the dividers and the corners go red on both paths, or
 * drop `:host([hidden])` from `elements/row.tsx` to watch the hidden row grow a
 * box back.
 */
import { createServer } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// The kit's real tokens + utilities, injected as document-level CSS. This is the
// WORST CASE for the geometry, not a convenience: `compiled.css` is the same sheet
// every shadow root adopts, and putting it at document level is what Storybook and
// docs do, which is how the `::slotted` divider defect above was found. It also
// carries the utility classes the Solid path needs. `theme.tokens.css` carries
// `--radius-lg`, which the row's radius fallback resolves through; without the
// tokens that fallback is invalid at computed-value time and every radius reads
// 0, which would make the corner checks pass for the wrong reason.
const COMPILED_CSS = readFileSync(path.join(root, 'src/web-components/compiled.css'), 'utf-8');
const TOKENS_CSS = readFileSync(path.join(root, 'dist/theme.tokens.css'), 'utf-8');

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>row group geometry</title></head>
<body>
  <main>
    <div id="element-path">
      <kai-row-group id="e1"><kai-row>One</kai-row></kai-row-group>
      <kai-row-group id="e2"><kai-row>First</kai-row><kai-row>Last</kai-row></kai-row-group>
      <kai-row-group id="e3"><kai-row>First</kai-row><kai-row>Middle</kai-row><kai-row>Last</kai-row></kai-row-group>
      <kai-row-group id="e4" style="--kai-row-radius:0"><kai-row>First</kai-row><kai-row>Last</kai-row></kai-row-group>
      <kai-row id="e-hidden" hidden>Hidden row</kai-row>
      <kai-row-group id="e-group-hidden" hidden><kai-row>In a hidden group</kai-row></kai-row-group>
      <kai-settings-group id="s1" heading="Appearance">
        <kai-setting-item label="One"></kai-setting-item>
        <kai-setting-item label="Two"></kai-setting-item>
        <kai-setting-item label="Three"></kai-setting-item>
      </kai-settings-group>
    </div>
    <div id="solid-path"></div>
  </main>

  <script type="module">
    let error = null;
    try {
      await import('/src/web-components/row.tsx');
      await import('/src/web-components/row-group.tsx');
      await import('/src/web-components/settings-group.tsx');
      await import('/src/web-components/setting-item.tsx');
      // The Solid path: the same components a light-DOM SolidJS consumer writes,
      // mounted with the real renderer. Its rows are DOM children of the frame,
      // which is the half of the geometry ::slotted() cannot reach.
      const [{ render }, { RowGroup }, { Row }, { createComponent }] = await Promise.all([
        import('solid-js/web'),
        import('/src/components/row/row-group.tsx'),
        import('/src/components/row/row.tsx'),
        import('solid-js'),
      ]);
      const mount = (rows) => {
        const host = document.createElement('div');
        document.getElementById('solid-path').append(host);
        render(
          () => createComponent(RowGroup, {
            get children() {
              return rows.map((label) => createComponent(Row, { get children() { return label; } }));
            },
          }),
          host,
        );
        return host;
      };
      mount(['One']);
      mount(['First', 'Last']);
      mount(['First', 'Middle', 'Last']);
    } catch (e) { error = String((e && e.stack) || e); }
    window.__probe = { error, ready: true };
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
await page.addStyleTag({ content: TOKENS_CSS });
await page.addStyleTag({ content: COMPILED_CSS });
await page.waitForFunction(() => !!window.__probe, null, { timeout: 60_000 });
const probe = await page.evaluate(() => window.__probe);

if (probe?.error) {
  console.error('module import failed:\n' + probe.error);
  await browser.close();
  await server.close();
  process.exit(2);
}

/**
 * Read each row's geometry THROUGH its own shadow root. The corners and the
 * divider both land on the row's surface, which is the same element on both paths,
 * so one reader covers them; `display` and `height` come off the host, which is
 * where the `[hidden]` rule lands.
 */
const measured = await page.evaluate(() => {
  const rowsOf = (container) => [...container.children].filter((el) => el.tagName === 'KAI-ROW');
  const read = (el) => {
    const cs = getComputedStyle(el.shadowRoot.querySelector('[part="row"]'));
    return {
      top: cs.borderTopLeftRadius,
      bottom: cs.borderBottomLeftRadius,
      divider: cs.borderTopWidth,
      display: getComputedStyle(el).display,
      height: Math.round(el.getBoundingClientRect().height),
    };
  };
  const group = (id) => rowsOf(document.getElementById(id)).map(read);
  const solidRows = (n) =>
    [...[...document.querySelectorAll('#solid-path > div')][n].querySelectorAll('[part="group"] > [part="row"]')]
      .map((surface) => {
        const cs = getComputedStyle(surface);
        return { top: cs.borderTopLeftRadius, bottom: cs.borderBottomLeftRadius, divider: cs.borderTopWidth };
      });
  // `SettingItem` is the other row-shaped child a `RowGroup` frames (inside
  // `SettingsGroup`), and it draws its own hairline the same way `Row` does. Only
  // the row-shaped child knows where its surface is, so this reads each child's
  // own shadow content rather than assuming a shape.
  const settingsRows = () =>
    [...document.querySelectorAll('#s1 > kai-setting-item')]
      .map((el) => {
        // The facade wraps its content in a `display:contents` div (the dark-mode
        // scope), so the row surface is a DESCENDANT, not the first child. Find it
        // by the divider class itself: reading some other div would report a
        // confident 0px for a correct list.
        const surface = el.shadowRoot.querySelector('[class*="border-t-"]');
        return {
          tag: el.tagName.toLowerCase(),
          marked: el.hasAttribute('data-kai-row'),
          width: getComputedStyle(el).getPropertyValue('--kai-row-divide-width'),
          divider: surface ? getComputedStyle(surface).borderTopWidth : 'NO SURFACE',
        };
      });

  return {
    element: {
      one: group('e1'), two: group('e2'), three: group('e3'), flush: group('e4'),
      hiddenRow: read(document.getElementById('e-hidden')),
      hiddenGroup: {
        display: getComputedStyle(document.getElementById('e-group-hidden')).display,
        height: Math.round(document.getElementById('e-group-hidden').getBoundingClientRect().height),
      },
    },
    solid: { one: solidRows(0), two: solidRows(1), three: solidRows(2) },
    settings: settingsRows(),
  };
});

await browser.close();
await server.close();

// --- assertions ------------------------------------------------------------
let failed = 0;
const px = (v) => Math.round(parseFloat(v) * 100) / 100;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (wanted ${JSON.stringify(expected)})`}`);
  if (!ok) failed++;
};

/** Round where the row's position has a corner, square where it does not. */
const shape = (rows) => rows.map((r) => ({ top: px(r.top) > 0, bottom: px(r.bottom) > 0 }));
const dividers = (rows) => rows.map((r) => px(r.divider));

for (const [pathName, groups] of Object.entries({ 'element path': measured.element, 'solid path': measured.solid })) {
  console.log(`\n${pathName}`);
  const { one, two, three } = groups;
  check('1 row: rounded top and bottom', shape(one), [{ top: true, bottom: true }]);
  check('1 row: no divider of its own', dividers(one), [0]);
  check('2 rows: first top only, last bottom only', shape(two), [{ top: true, bottom: false }, { top: false, bottom: true }]);
  check('2 rows: the divider sits on the second row only', dividers(two), [0, 1]);
  check('3 rows: first top, middle square, last bottom', shape(three), [
    { top: true, bottom: false }, { top: false, bottom: false }, { top: false, bottom: true },
  ]);
  check('3 rows: one hairline per gap', dividers(three), [0, 1, 1]);
  if (pathName === 'element path') {
    check('--kai-row-radius:0 flattens the whole list', shape(groups.flush), [
      { top: false, bottom: false }, { top: false, bottom: false },
    ]);
  }
}

console.log('\nSettingsGroup (SettingItem draws the same hairline)');
check(
  '3 items, each marked as a row: one hairline per gap',
  measured.settings.map((r) => (r.tag === 'kai-setting-item' && r.marked ? px(r.divider) : `bad ${r.tag}/${r.marked}`)),
  [0, 1, 1],
);

console.log('\nhidden (the [hidden] fix, shadow-DOM only)');
check('a hidden <kai-row> is not laid out', { display: measured.element.hiddenRow.display, height: measured.element.hiddenRow.height }, { display: 'none', height: 0 });
check('a hidden <kai-row-group> is not laid out', measured.element.hiddenGroup, { display: 'none', height: 0 });

if (pageErrors.length) {
  failed++;
  console.log('\npage errors:');
  for (const e of pageErrors) console.log('  ' + e);
}

console.log(failed === 0 ? '\nprobe-row-group: all checks passed' : `\nprobe-row-group: ${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
