// THE BLOCKS COMPILE CELLS: every authored block x every FRAMEWORK delivery
// form (spec 2026-09-02 section 5.1).
//
// A NOTE ON THE WORD "BLOCK", because this file is imported by a script whose
// vocabulary already spends it. In verify-scaffold-compiles.mjs, "block (1)"
// and "block (2)" are the two halves of the SCAFFOLDER'S emitted output, the
// front end and the backend route. Blocks-the-product -- the authored pages
// under packages/blocks/blocks/ -- are a different thing wearing the same
// word, so these cells are a fourth PHASE of that script's main(), beside
// routeCheck, and never "block (4)".
//
// WHY THEY RUN INSIDE THAT SCRIPT rather than as their own gate: they share
// its harness. `createConsumerTsc` stands up a node_modules tree with the REAL
// packages symlinked and one tsc project per consumer shape, and
// `sandbox(project, name)` compiles a DIRECTORY under that project's own
// options with a recursive include. Standing that up a second time would
// double the cost of the slowest gate in the repo and buy nothing.
//
// WHAT THEY READ: dist/blocks/f/<id>.<form>.json, the per-form trees
// gen-blocks.mjs emits. The blocks site reads the same files, so the code a
// reader copies off the page is the code these cells compile, byte for byte.
// The axis is derived twice over -- the block ids and the form ids both come
// out of the emitted file names, which gen-blocks derives from the registry
// scan and from FRAMEWORK_BLOCK_FORMS. Neither list is written here.
//
// THE DATA MODE IS A THIRD AXIS, same derivation: gen-blocks writes
// `<id>.<form>.<mode>.json` for every mode a block declares a seam source for
// beyond the default, and the DEFAULT (mock) tree is the unsuffixed file. So a
// block that declares `wiring.modeFiles` gets its mock-free trees COMPILED,
// which is the whole point: `--no-mock` and `--gateway` refused for every block
// while the trees that would have made them work were never rendered, never
// mind compiled. A block with no seam has one cell per form, because the CLI
// refuses the other modes for it by name rather than writing a tree.

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ANTI_THEATRE_PROBES, BASE_OPTIONS, pkgDir } from './consumer-tsc-projects.mjs';
import { maskedCode } from './mask-code.mjs';

/**
 * TypeScript that survived the strip.
 *
 * The html form ships `.js` beside every `.ts` source, stripped once by
 * esbuild at generation time. A twin that still carries types is a file that
 * throws in the browser on the first line the engine cannot parse, and every
 * check upstream of the strip stays green when it happens.
 *
 * IT RUNS OVER `maskedCode(content)`, NEVER THE RAW TEXT, and that is not a
tidiness: this is a LINE PATTERN over a whole file, so it has no idea whether
it is looking at code. The mocked assistant's guide prose carries a TypeScript
snippet INSIDE A QUOTED STRING -- `toolOutput(toolType: string): …` -- and the
raw text matched the `: string)` half of this pattern, reding the html cell
while esbuild parsed the very same file as a legal ES module. A detector that
scans a string body is reporting on prose; masking (scripts/lib/mask-code.mjs)
leaves every code character in place, so a genuine `const x: string;` at file
scope still fires and `: string)` inside a quote cannot.
 */
const TS_LEFTOVER = /^\s*(?:export\s+)?(?:interface|type)\s|:\s*(?:string|number|boolean)\s*[;,)]/m;

/** The mode an emitted tree that says nothing is: gen-blocks writes the default
 *  (mock) tree under the unsuffixed name the blocks site fetches. */
export const DEFAULT_MODE = 'mock';

/**
 * Load the emitted per-form trees, grouped by block.
 *
 * Returns the cell axis: `blocks` (each with `forms[form][mode]`, the tree per
 * data mode), `forms` (the form ids seen, sorted), `modes` (every mode seen,
 * sorted) and `noForms` (blocks in the registry index that emitted none).
 * `noForms` is a FAILURE list rather than a skip list at the call site: every
 * block is on the authored contract and renders every framework form.
 */
export function loadBlockForms(distBlocksDir) {
  const formsDir = join(distBlocksDir, 'f');
  const indexPath = join(distBlocksDir, 'registry.json');
  if (!existsSync(indexPath) || !existsSync(formsDir)) {
    return { blocks: [], forms: [], modes: [], noForms: [], missing: `${formsDir} (or the registry index beside it) does not exist -- build first: the form trees are written by gen-blocks.mjs in postbuild` };
  }
  const byBlock = new Map();
  const formIds = new Set();
  const modes = new Set();
  for (const file of readdirSync(formsDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const parsed = JSON.parse(readFileSync(join(formsDir, file), 'utf8'));
    const mode = parsed.mode ?? DEFAULT_MODE;
    formIds.add(parsed.form);
    modes.add(mode);
    if (!byBlock.has(parsed.block)) byBlock.set(parsed.block, { name: parsed.block, forms: {} });
    const forms = byBlock.get(parsed.block).forms;
    forms[parsed.form] = { ...(forms[parsed.form] ?? {}), [mode]: parsed.files };
  }
  const indexed = JSON.parse(readFileSync(indexPath, 'utf8')).items.map((i) => i.name);
  return {
    blocks: [...byBlock.values()],
    forms: [...formIds].sort(),
    modes: [...modes].sort(),
    noForms: indexed.filter((name) => !byBlock.has(name)),
    missing: null,
  };
}

/**
 * The react form is a tree of typed wrappers, so it goes through tsc under the
 * `default` project -- the same one the scaffolder's react front end compiles
 * in, which is what makes "it compiles for a consumer" mean the same thing in
 * both places.
 */
async function reactCell({ tsc, name, files }) {
  const box = tsc.sandbox('default', `block-${name}-react`);
  // The anti-theatre controls, IN THIS DIRECTORY, before anything is trusted.
  // A sandbox whose @kitn.ai/ui resolved to `any`, or whose strict flags never
  // took, would pass every cell below while checking nothing.
  const { missed, out } = box.selfTest();
  if (missed.length) {
    return [
      `${name} [react]: the sandbox self-test did NOT fire (${missed.map((p) => p.file).join(', ')}).\n` +
        `    ${missed.map((p) => p.why).join('\n    ')}\n` +
        `    Every cell under it would pass vacuously. tsc said:\n${out || '    (nothing)'}`,
    ];
  }
  box.clear();
  for (const file of files) {
    const dest = join(box.dir, file.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file.content);
  }
  const diagnostics = box.run();
  box.clear();
  if (!diagnostics.trim()) return [];
  return [`${name} [react]: does not compile under a stock consumer tsconfig:\n${diagnostics.trimEnd()}`];
}

/**
 * The html form emits `.js`, which tsc cannot check, so this cell is a SYNTAX
 * check plus the strip assertion: esbuild parses every emitted module, and the
 * source is scanned for TypeScript that survived.
 *
 * THE KNOWN GAP, stated rather than implied: this proves the file parses as an
 * ES module and carries no type syntax. It proves nothing about semantics -- a
 * binder that reads the wrong field or wires the wrong action parses fine.
 * That half is the block driver's, which runs the page in a real browser
 * against a committed baseline.
 */
function htmlCell({ esbuild, name, files }) {
  const errors = [];
  let parsed = 0;
  for (const file of files) {
    if (!file.path.endsWith('.js')) continue;
    parsed += 1;
    try {
      esbuild.transformSync(file.content, { loader: 'js', format: 'esm', sourcefile: `${name}/${file.path}` });
    } catch (err) {
      errors.push(`${name} [html]: ${file.path} is not a parseable ES module:\n    ${err instanceof Error ? err.message : String(err)}`);
    }
    if (TS_LEFTOVER.test(maskedCode(file.content))) {
      errors.push(
        `${name} [html]: ${file.path} still carries TypeScript syntax. The .js twin is stripped once by esbuild in gen-blocks.mjs; a twin with types in it throws in the browser at parse time.`,
      );
    }
  }
  if (parsed === 0) {
    errors.push(`${name} [html]: the form emitted no .js file at all, so this cell checked nothing.`);
  }
  return errors;
}

/**
 * The vue form is a `.vue` SFC, and NO tsconfig can read one: `tsc` reports
 * TS1136 on the first tag in the template. `vue-tsc` is the only compiler that
 * checks the script AND the template, so the cell runs it instead of lifting
 * the script out of the SFC -- `liftScript` (which the scaffolder's own vue
 * cells use, because a scaffolder front end is a code block rather than a
 * file a consumer ships) would check the script and leave the template
 * unread, which is where this form's real defects live: an authored literal
 * is typechecked against the element's declared prop union here and nowhere
 * else.
 *
 * THE HARNESS ITSELF NEEDED NOTHING: `vue` is already symlinked by
 * `createConsumerTsc`, and `vue-tsc` is a real devDependency of
 * examples/starters/vue, so this cell links that one package into the temp
 * tree and runs it. The compilerOptions are `BASE_OPTIONS` plus the two lines
 * `npm create vue` writes (`jsx: preserve` + `jsxImportSource: vue`), never a
 * retyped tsconfig.
 *
 * A `.vue`-aware compiler also needs vue's own SFC types: the kit declares
 * `GlobalComponents` (web-component-types.d.ts), and without that
 * augmentation vue-tsc treats every `kai-*` tag as an unknown element and
 * checks nothing about it.
 */
export async function vueCell({ tsc, name, files }) {
  const vueDir = pkgDir('vue-tsc');
  const nm = join(tsc.tmp, 'node_modules');
  if (!vueDir) {
    return [
      `${name} [vue]: vue-tsc is not installed, so the emitted .vue cannot be compiled. It is a ` +
        'devDependency of examples/starters/vue; `pnpm install` at the repo root is what puts it here.',
    ];
  }
  const linked = join(nm, 'vue-tsc');
  if (!existsSync(linked)) symlinkSync(vueDir, linked, 'dir');

  const dir = join(tsc.tmp, 'vue', name);
  mkdirSync(dir, { recursive: true });
  const clear = () => {
    for (const f of readdirSync(dir)) {
      // The tsconfig is this cell's own harness and outlives every file it
      // writes; deleting it made the second vue-tsc run exit on TS5058, which
      // reads as a compiler failure rather than a missing file.
      if (f === 'tsconfig.json') continue;
      rmSync(join(dir, f), { recursive: true, force: true });
    }
  };
  const tsconfig = join(dir, 'tsconfig.json');
  writeFileSync(
    tsconfig,
    JSON.stringify(
      {
        compilerOptions: { ...BASE_OPTIONS, jsx: 'preserve', jsxImportSource: 'vue' },
        include: ['**/*.ts', '**/*.vue'],
      },
      null,
      2,
    ),
  );
  // The anti-theatre controls FIRST, in this directory: a `.vue` that resolved
  // `@knit.ai/ui` to `any` (or a project whose strict flags never took) would
  // pass every assertion below while checking nothing.
  for (const probe of ANTI_THEATRE_PROBES) writeFileSync(join(dir, probe.file), probe.code);
  const controls = vueTsc(dir);
  const missed = ANTI_THEATRE_PROBES.filter(
    (probe) => !new RegExp(`${probe.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*${probe.expect.source}`, 's').test(controls),
  );
  clear();
  if (missed.length) {
    return [
      `${name} [vue]: the sandbox self-test did NOT fire (${missed.map((p) => p.file).join(', ')}).\n` +
        `    ${missed.map((p) => p.why).join('\n    ')}\n` +
        `    Every cell under it would pass vacuously. vue-tsc said:\n${controls || '    (nothing)'}`,
    ];
  }

  for (const file of files) {
    const dest = join(dir, file.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file.content);
  }
  // ANTI-VACUITY, and it is not hypothetical: this cell's include matches
  // `**/*.vue`, so a tree that emitted none (a renderer that stopped, a tree
  // read from the wrong form's file) leaves vue-tsc with nothing to read and
  // exits clean. That is exactly how the first version of this cell passed.
  const sfcs = files.filter((file) => file.path.endsWith('.vue'));
  if (sfcs.length === 0) {
    clear();
    return [
      `${name} [vue]: the form emitted no .vue file at all, so this cell checked nothing. ` +
        'Every vue tree is one SFC plus the composable it imports.',
    ];
  }
  const diagnostics = vueTsc(dir);
  clear();
  if (!diagnostics.trim()) return [];
  return [`${name} [vue]: does not compile under a stock vue-ts consumer project:\n${diagnostics.trimEnd()}`];

  /** `vue-tsc` over one directory holding a tsconfig.json; raw diagnostics ('' when clean). */
  function vueTsc(runDir) {
    try {
      execFileSync(process.execPath, [join(vueDir, 'bin/vue-tsc.js'), '--noEmit', '-p', join(runDir, 'tsconfig.json')], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return '';
    } catch (e) {
      return `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
  }
}

/**
 * One strategy per form id. A form with no strategy is a HARD failure rather
 * than a skip: a cell that quietly stops running is the exact shape of check
 * this repo keeps paying for.
 */
const STRATEGIES = { react: reactCell, html: htmlCell, vue: vueCell };

/**
 * Run every block x form cell. Prints the axis and the cell count it actually
 * ran; nothing about the size of the matrix is written down anywhere.
 */
export async function runBlockCompileCells({ tsc, blocks, forms, esbuild, log }) {
  const failures = [];
  const unknown = forms.filter((form) => !STRATEGIES[form]);
  if (unknown.length) {
    return {
      cells: 0,
      failures: [
        `form(s) ${unknown.join(', ')} have no compile cell in scripts/lib/block-compile-cells.mjs. ` +
          'Add one, or the form ships with nothing compiling it.',
      ],
    };
  }

  let cells = 0;
  let mockFree = 0;
  const axis = [];
  for (const block of blocks) {
    const modesSeen = [];
    for (const form of forms) {
      const byMode = block.forms[form];
      if (!byMode || !byMode[DEFAULT_MODE]) {
        failures.push(`${block.name} [${form}]: the block emitted other forms but not this one, so its tree is unchecked.`);
        continue;
      }
      for (const mode of Object.keys(byMode)) {
        if (!modesSeen.includes(mode)) modesSeen.push(mode);
        cells += 1;
        if (mode !== DEFAULT_MODE) mockFree += 1;
        failures.push(
          ...(await STRATEGIES[form]({
            tsc,
            esbuild,
            // The sandbox is a DIRECTORY named after this, so the mode rides
            // as a segment rather than as punctuation.
            name: mode === DEFAULT_MODE ? block.name : `${block.name}.${mode}`,
            files: byMode[mode],
          })),
        );
      }
    }
    axis.push(`${block.name} (${modesSeen.join(', ')})`);
  }

  // Anti-vacuity. Zero cells is what a broken walk, an unbuilt tree or a
  // renderer that silently stopped emitting all look like, and every one of
  // them reads as a pass.
  if (cells === 0) {
    failures.push(
      'zero block form cells ran. That is a broken walk over dist/blocks/f/, not an empty registry: ' +
        'at least one block is on the authored contract and renders both framework forms.',
    );
  }
  // AND ZERO MOCK-FREE CELLS IS THE SAME HOLE ONE LEVEL DOWN. The data axis
  // exists because `--no-mock` and `--gateway` refused for every block while
  // nobody compiled the trees that would satisfy them; a run where every
  // emitted tree is the default mode has gone back to exactly that, and the
  // count alone would not say so.
  if (mockFree === 0) {
    failures.push(
      'every emitted block tree is the default (mock) mode, so no mock-free tree was compiled. ' +
        'That is the hole the data axis exists to close: a block that declares a wiring.modeFiles seam must ' +
        'emit one tree per mode (gen-blocks.mjs) and have it compiled here.',
    );
  }

  log(
    `  · block forms: ${cells} cell(s) over ${blocks.length} block(s) x ${forms.length} form(s) (${forms.join(', ')})` +
      ` x the data modes each block declares (${axis.join('; ')}) -- ${mockFree} mock-free`,
  );
  log(
    '    html is a syntax + strip check only (esbuild parses the emitted .js, and it must carry no TypeScript);\n' +
      '    what the binder MEANS is the block driver\'s half, in a real browser against a committed baseline.',
  );
  return { cells, failures };
}
