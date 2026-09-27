/**
 * The html form: the authored page with the bindings taken OFF the markup and
 * a generated binder that puts them back at runtime. What is pinned here is
 * the shape of that binder, because it is the file with no typecheck behind
 * it anywhere.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { transformSync } from 'esbuild';
import { renderHtmlForm, withStrippedTwins } from '../src/forms';
import type { Block } from '../src/registry';

const FIXTURES = resolve(__dirname, 'fixtures');

// THE SHARED FIXTURE. Both renderer suites read the same page and the same
// controller from `packages/blocks/tests/fixtures/`, because two renderers
// disagreeing about one source is the defect class this whole round exists to
// remove, and two hand-written fixtures could disagree quietly.
//
//   packages/blocks/tests/fixtures/fixture.html
//   packages/blocks/tests/fixtures/fixture.controller.ts
//   packages/blocks/tests/fixtures/fixture.css
//
// The controller is a REAL multi-line TypeScript file, not a one-liner: the
// "no TypeScript survived into the shipped .js" assertion below is only worth
// anything if the strip has something to remove that a naive helper would
// leave behind.
const CONTROLLER = readFileSync(join(FIXTURES, 'fixture.controller.ts'), 'utf8');

const PAGE = readFileSync(join(FIXTURES, 'fixture.html'), 'utf8');

const block = (): Block => ({
  name: 'fixture',
  manifest: {
    name: 'fixture', title: 'F', description: 'f', type: 'registry:block',
    files: [
      { path: 'fixture.html', type: 'registry:page' },
      { path: 'fixture.controller.ts', type: 'registry:file' },
      { path: 'fixture.css', type: 'registry:file' },
    ],
  },
  files: new Map([
    ['fixture.html', PAGE],
    ['fixture.controller.ts', CONTROLLER],
    ['fixture.css', readFileSync(join(FIXTURES, 'fixture.css'), 'utf8')],
  ]),
});

// The strip is esbuild's, the same transform gen-blocks runs. A hand-rolled
// regex here is how the "no TypeScript in the shipped .js" case below passes
// VACUOUSLY: the obvious `/export interface[\s\S]*?\n\}\n/g` never matches a
// single-line interface, so it removes nothing, and the assertion then holds
// because the fixture had no multi-line types rather than because anything
// was stripped. `esbuild` is a DEVDEPENDENCY of packages/blocks (added in this
// task), never a dependency: it is used by this suite only, so it never
// reaches the CLI bundle that `bundleGraphProblem` grades.
const stripped = () => withStrippedTwins(block(), stripTwins);
const byPath = (files: { path: string; content: string }[]) => new Map(files.map((f) => [f.path, f.content]));

// The strip is esbuild's, the same transform gen-blocks runs, so the binder
// under test in the block-wide case is the one a consumer is handed rather than
// a fixture shaped like it.
const stripTwins = (source: string, fileName: string): string =>
  transformSync(source, { loader: 'ts', format: 'esm', target: 'es2022', sourcefile: fileName }).code;

const BLOCKS_DIR = resolve(__dirname, '..', 'blocks');

/** Every authored block, loaded off its directory the way the registry's own
 *  walk loads it, with its emitted binder. Derived from the directories: a new
 *  block is covered the moment it exists, and a block this walk fails to read is
 *  a RED here rather than a quiet narrowing of what this test covers. */
function emittedBlockBinders(): { block: string; binder: string }[] {
  const dirs = readdirSync(BLOCKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(BLOCKS_DIR, entry.name, 'registry-item.json')))
    .map((entry) => entry.name);
  const out: { block: string; binder: string }[] = [];
  for (const dirName of dirs) {
    const dir = join(BLOCKS_DIR, dirName);
    const files = new Map(
      readdirSync(dir, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name !== 'registry-item.json')
        .map((f) => [f.name, readFileSync(join(dir, f.name), 'utf8')]),
    );
    const manifest = JSON.parse(readFileSync(join(dir, 'registry-item.json'), 'utf8')) as Block['manifest'];
    const binder = byPath(renderHtmlForm(withStrippedTwins({ name: dirName, manifest, files }, stripTwins))).get(
      `${dirName}.js`,
    );
    expect(binder, `${dirName}: the walk found no emitted binder to check`).toBeTruthy();
    out.push({ block: dirName, binder: binder! });
  }
  expect(out.length, 'a directory with a manifest that yields no binder is a block this test stops covering').toBe(dirs.length);
  return out;
}

/** The body of every emitted `applyRows<N>`, brace-matched. */
function rowFunctions(binder: string): string[] {
  const out: string[] = [];
  for (const match of binder.matchAll(/function applyRows\d+\(rows, state\) \{/g)) {
    const start = match.index! + match[0].length - 1;
    let depth = 0;
    let i = start;
    for (; i < binder.length; i++) {
      if (binder[i] === '{') depth++;
      else if (binder[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(binder.slice(start, i + 1));
  }
  return out;
}

describe('withStrippedTwins', () => {
  it('lists the twin in the MANIFEST even when the file is already on disk', () => {
    // The shape `create-kai`'s dist has: its build writes the twins beside the
    // copied sources, so `files` already carries them while `manifest.files`
    // still lists only the authored four. An early return on "the file is
    // there" left the manifest entry off, and `buildRegistryItem` serializes
    // the MANIFEST -- so a fetched item JSON silently omitted a file the html
    // form then refused to render without.
    const base = block();
    const withTwinOnDisk: Block = {
      ...base,
      files: new Map([...base.files, ['fixture.controller.js', 'export function createController() {}\n']]),
    };
    const out = withStrippedTwins(withTwinOnDisk, () => 'SHOULD NOT BE CALLED');
    expect(out.manifest.files.map((f) => f.path)).toContain('fixture.controller.js');
    // The file on disk WINS: it is the one the build already wrote, and
    // re-stripping it here would be the second stripper this whole design
    // exists to avoid.
    expect(out.files.get('fixture.controller.js')).toBe('export function createController() {}\n');
  });

  it('is idempotent: running it twice adds the twin once', () => {
    const once = withStrippedTwins(block(), (source) => source);
    const twice = withStrippedTwins(once, (source) => source);
    expect(twice.manifest.files).toEqual(once.manifest.files);
  });
});

describe('the html form', () => {
  it('refuses to render without the stripped twin, and names the generator', () => {
    expect(() => renderHtmlForm(block())).toThrow(/fixture\.controller\.js/);
    expect(() => renderHtmlForm(block())).toThrow(/gen-blocks/);
  });

  it('emits the page, the binder, the stripped controller, the css and the README', () => {
    const files = byPath(renderHtmlForm(stripped()));
    expect([...files.keys()].sort()).toEqual([
      'README.md', 'fixture.controller.js', 'fixture.css', 'fixture.html', 'fixture.js',
    ]);
  });

  it('targets every file at blocks/<id>/', () => {
    for (const file of renderHtmlForm(stripped())) {
      expect(file.target).toBe(`blocks/fixture/${file.path}`);
    }
  });

  it('takes every binding OFF the markup and leaves the literals', () => {
    const page = byPath(renderHtmlForm(stripped())).get('fixture.html')!;
    expect(page).not.toMatch(/\.unread=|@kai-click=|#ref=|\*for=|:key=|seed:/);
    expect(page).toContain('data-kai-b="0"');
    expect(page).toContain('<link rel="stylesheet" href="./fixture.css" />');
    expect(page).toContain('<script type="module" src="./fixture.js"></script>');
  });

  it('turns the repeated element into a template the binder clones', () => {
    const page = byPath(renderHtmlForm(stripped())).get('fixture.html')!;
    expect(page).toMatch(/<template data-kai-for="\d+">\s*<kai-conversation-item/);
  });

  it('binds registration and the whenDefined await, and adapts the import for a bundler', () => {
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    expect(binder).toContain("import '@kitn.ai/ui/web-components';");
    expect(binder).not.toContain('@kitn.ai/ui/autoloader');
    expect(binder).toContain('customElements.whenDefined');
    expect(binder).toContain("'kai-conversation-item'");
  });

  it('keeps the autoloader when the caller asks for it (the cdn form s native pattern)', () => {
    const binder = byPath(renderHtmlForm(stripped(), { registration: 'autoloader' })).get('fixture.js')!;
    expect(binder).toContain("import '@kitn.ai/ui/autoloader';");
    expect(binder).not.toContain("import '@kitn.ai/ui/web-components';");
  });

  it('writes the seed once, before the first apply, and never inside apply()', () => {
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    const seedAt = binder.indexOf("'position'");
    const applyAt = binder.indexOf('function apply(');
    expect(seedAt).toBeGreaterThan(-1);
    expect(seedAt).toBeLessThan(applyAt);
  });

  it('signals the driver readiness convention as its last statement', () => {
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    expect(binder.trimEnd().endsWith('window.__blockReady = true;')).toBe(true);
    expect(binder.indexOf('actions.boot()')).toBeLessThan(binder.indexOf('__blockReady'));
  });

  it('wires a row descendant INSIDE the row and NOT at document scope', () => {
    // The defect this asserts: walkElements is flat, so a document-scope loop
    // that skips only the repeated element still emits `at(N).textContent =`
    // for a <span> that exists only inside the <template>. at(N) is null
    // there and the first apply() throws. Both halves are asserted, because
    // asserting only the row half passes with the duplicate still present.
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    const applyBody = binder.slice(binder.indexOf('function apply('), binder.indexOf('controller.subscribe'));
    const rowBody = binder.slice(binder.indexOf('function applyRows'), binder.indexOf('function apply('));
    expect(applyBody).not.toContain('row.title');
    expect(applyBody).toContain('applyRows');
    expect(rowBody).toContain('row.title');
    expect(rowBody).toContain('inRow(node,');
  });

  it('upgrades a cloned row BEFORE its bindings, so a row a LATER patch creates keeps them', () => {
    // THE DEFECT THIS ASSERTS, and it is the same one the binder's own header
    // names for the FIRST apply: an element that has not upgraded takes a
    // property assignment as a plain own property, and the facade installs its
    // own props on upgrade, so the assigned value is gone. The header guards the
    // first apply with `whenDefined`; applyRows is the OTHER path, and it sets a
    // row's bindings BEFORE `prev.after(node)` connects it. A clone of a
    // template's content is never upgraded until it is connected, so every
    // property binding a row carries was lost on the render that CREATED it -
    // harmless for a row the next patch re-applies, and visible for the one
    // nothing patches again. Measured on the assistant block: a menu inside the
    // row repeat came up with an empty items array right after the single-patch
    // transition that creates a row, which a reader reaches. The browser fact
    // behind the whole fix -- a clone of a template's CONTENT lives in the
    // template's own owner document, where `upgrade()` finds no definition and
    // is therefore a no-op -- was measured in jsdom, which reproduces it: with
    // the upgrade line alone a row's `kai-*` element stays unupgraded through
    // its own bindings and the component's install on upgrade loses them.
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    const rowBody = binder.slice(binder.indexOf('function applyRows'), binder.indexOf('function apply('));
    // BOTH lines, in this order, and the ADOPT is not boilerplate: `upgrade()`
    // alone is a no-op on the clone of a template's content, so the element
    // stays unupgraded until it is connected, i.e. after the bindings. Dropping
    // the adopt is therefore a silent revert of this fix, which is what this
    // half of the assertion is for.
    const adoptAt = rowBody.indexOf('document.adoptNode(node)');
    const upgradeAt = rowBody.indexOf('customElements.upgrade(node)');
    // The FIRST binding applied to the row, whichever kind it is: both helpers
    // write properties, and both are emitted at one indent level inside the loop.
    const firstSetter = rowBody.search(/^ {4}(setAttr|inRow)\(/m);
    expect(adoptAt).toBeGreaterThan(-1);
    expect(upgradeAt).toBeGreaterThan(-1);
    expect(firstSetter).toBeGreaterThan(-1);
    expect(adoptAt).toBeLessThan(upgradeAt);
    expect(upgradeAt).toBeLessThan(firstSetter);
  });

  it('puts the upgrade before EVERY row binding of EVERY block, property writes included', () => {
    // THE CLASS, not the fixture's own symptom. A `.prop` binding on a row and
    // on anything inside one is the same victim: `kai-editable-label`'s `.value`
    // and `.editing` sit on this block's rows and survive today only because a
    // second patch happens to follow every patch that creates a row. So the
    // subject here is DERIVED from the authored block directories rather than
    // restated, because the rows a reader can reach are the ones the blocks
    // ship, and a fixture shaped like them would go on passing after the blocks
    // moved. THE FIXTURE above only exercises the first kind of binding; the
    // anti-vacuity assertions below therefore count the property writes too,
    // which is the half of the class the fixture cannot reach.
    const binders = emittedBlockBinders();
    expect(binders.length).toBeGreaterThan(0);
    let repeats = 0;
    let propWrites = 0;
    for (const { block, binder } of binders) {
      const bodies = rowFunctions(binder);
      expect(bodies.length, `${block} emits no applyRows function: a zero-repeat binder is a broken walk, not a block without rows`).toBeGreaterThan(0);
      for (const body of bodies) {
        repeats++;
        const adoptAt = body.indexOf('document.adoptNode(node)');
        const upgradeAt = body.indexOf('customElements.upgrade(node)');
        expect(adoptAt, `${block}: no adopt before the row bindings`).toBeGreaterThan(-1);
        expect(upgradeAt, `${block}: no upgrade before the row bindings`).toBeGreaterThan(-1);
        expect(adoptAt, `${block}: the upgrade runs before the element is adopted, so it is a no-op`).toBeLessThan(upgradeAt);
        // Every write the row loop makes to a row or to anything inside it, of
        // BOTH kinds: property assignments (`inRow(node, N).prop = ...`) and
        // attribute writes (`setAttr(inRow(node, N), ...)`). Both are emitted at
        // one indent level inside the loop.
        const writes = [...body.matchAll(/^ {4}(?:inRow\(node, \d+\)\.|setAttr\(inRow\(node, \d+\))/gm)];
        expect(writes.length, `${block}: a row repeat with no bindings proves nothing about the order`).toBeGreaterThan(0);
        for (const write of writes) {
          expect(write.index!, `${block}: a binding is applied to a row created in this patch before that row is upgraded`).toBeGreaterThan(upgradeAt);
        }
        propWrites += [...body.matchAll(/^ {4}inRow\(node, \d+\)\.\w/gm)].length;
      }
    }
    expect(repeats, 'the walk must find more than the one repeat a fixture has').toBeGreaterThan(1);
    expect(propWrites, 'no property write was seen: the half of the class the fixture cannot reach is untested').toBeGreaterThan(0);
  });

  it('hands the row function the document state a plain-identifier binding needs', () => {
    // The defect: a plain identifier inside a `*for` is legal (it reads a
    // State field, not a row field), and `applyRowsN` is a MODULE-LEVEL
    // function. Emitting `state.title` in there is a ReferenceError on the
    // first apply, because `state` is a local of `apply()`.
    const b = block();
    (b.files as Map<string, string>).set(
      'fixture.html',
      PAGE.replace(
        '<span .textContent="row.title"></span>',
        '<span .textContent="row.title"></span>\n          <span .textContent="title"></span>',
      ),
    );
    const binder = byPath(renderHtmlForm(withStrippedTwins(b, (s) => s))).get('fixture.js')!;
    expect(binder).toMatch(/function applyRows\d+\(rows, state\)/);
    expect(binder).toMatch(/applyRows\d+\(state\.rows, state\)/);
  });

  it('emits a binder that PARSES', () => {
    // The binder has no typecheck behind it anywhere, so the cheapest real
    // check is that a JavaScript parser accepts it. esbuild is already a
    // devDependency for the strip; this reuses it as a syntax gate over the
    // one file nothing else compiles.
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    expect(() => transformSync(binder, { loader: 'js', format: 'esm' })).not.toThrow();
  });

  it('keeps a comment verbatim instead of escaping what parse5 never decoded', () => {
    // parse5 does NOT decode entities inside a comment, so escaping again
    // turns `<!-- a & b -->` into `<!-- a &amp; b -->` and an authored
    // `&amp;` into `&amp;amp;`. Corruption, one round per render.
    const b = block();
    (b.files as Map<string, string>).set(
      'fixture.html',
      PAGE.replace('<p class="host-stand-in">stand-in</p>', '<!-- a & b, and &amp; too -->'),
    );
    const page = byPath(renderHtmlForm(withStrippedTwins(b, (s) => s))).get('fixture.html')!;
    expect(page).toContain('<!-- a & b, and &amp; too -->');
  });

  it('removes an attribute on false/null/undefined and NOT on 0 or the empty string', () => {
    const binder = byPath(renderHtmlForm(stripped())).get('fixture.js')!;
    const setAttr = binder.slice(binder.indexOf('const setAttr'), binder.indexOf('const controller'));
    expect(setAttr).toContain("value === false || value === null || value === undefined");
    expect(setAttr).not.toContain("value === ''");
  });

  it('carries no TypeScript into the shipped .js files', () => {
    const files = byPath(renderHtmlForm(stripped()));
    for (const name of ['fixture.js', 'fixture.controller.js']) {
      expect(files.get(name)).not.toMatch(/^\s*(?:export\s+)?(?:interface|type)\s/m);
      expect(files.get(name)).not.toMatch(/:\s*(?:string|boolean|number)\s*[;,)]/);
    }
    // Anti-vacuity: the SOURCE has to contain what the strip removes, or this
    // case holds for the wrong reason.
    expect(CONTROLLER).toMatch(/^export interface /m);
  });

  it('re-encodes non-ASCII rather than emitting a literal astral character', () => {
    const b = block();
    // `Block.files` is a ReadonlyMap, which is right for every consumer and
    // wrong for a fixture that varies one file. The cast is the whole
    // deviation: the map handed in on the line above is a real Map.
    (b.files as Map<string, string>).set(
      'fixture.html',
      PAGE.replace('<span .textContent="title"></span>', '<span>Hi &#x1F44B;</span>'),
    );
    const page = byPath(renderHtmlForm(withStrippedTwins(b, (s) => s))).get('fixture.html')!;
    expect(page).toContain('&#x1f44b;');
    expect(/[\u{10000}-\u{10FFFF}]/u.test(page)).toBe(false);
  });

  it('emits a README that says what the block needs and where it runs', () => {
    const files = renderHtmlForm(stripped());
    const readme = files.find((f) => f.path === 'README.md');
    expect(readme, 'the html form emitted no README').toBeDefined();
    expect(readme!.target).toBe('blocks/fixture/README.md');
    // Two or three lines saying what the block needs (spec 3.5), which for
    // this form is the one config fact a consumer cannot guess: the scripts
    // import a bare specifier, so the folder goes through a bundler.
    expect(readme!.content).toContain('fixture.html');
    expect(readme!.content).toContain('@kitn.ai/ui/web-components');
  });

  it('the README carries none of the tokens the stream-reader scan bans', () => {
    // `verify:blocks [html-binder]` scans EVERY file of the form for a
    // hand-rolled SSE reader. A README that quoted one would red the block on
    // its own documentation, which is a red nobody would read correctly.
    const readme = renderHtmlForm(stripped()).find((f) => f.path === 'README.md')!;
    expect(readme.content).not.toMatch(/new\s+EventSource\(|text\/event-stream|\.getReader\(/);
  });
});
