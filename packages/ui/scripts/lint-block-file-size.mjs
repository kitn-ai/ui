// Size budget for the AUTHORED block sources under packages/blocks/blocks/*/.
//
// WHY A CEILING AT ALL
// A block is a starting point a consumer extends, and the first thing their
// agent does to a 2400-line controller is break it up. Splitting paid twice
// (assistant.rail.ts, assistant.composer.ts) and then stopped, for a reason
// recorded in docs/superpowers/specs/2026-09-27-block-source-structure-design.md:
// a block module may import nothing from another block module at RUNTIME, so
// every further split of the entry would have to take its dependencies as
// parameters, and that is moving coupling into an API rather than modularising.
// The entry's size is a consequence of that platform constraint, not a defect
// in it. What is left worth guarding is the MODULES: nobody else prices a block
// file's growth, so the next round that appends 400 lines to a module does it
// without a gate seeing it.
//
// THE CEILINGS, AND HOW THEY WERE DERIVED
// Derived from the modules that exist, not from taste and not from the entry.
// `node packages/ui/scripts/lint-block-file-size.mjs` prints every count it
// measures, which is the command that produces both numbers below; re-run it
// after any block edit before doubting either.
//   2026-09-27, modules (`*.ts`/`*.js`/`*.mjs`): the largest is
//   assistant/assistant.transport.mock.ts at 557 lines; the largest extracted
//   module is assistant/assistant.rail.ts at 469, the composer's chrome at 209,
//   and the other two blocks' controllers are 318 and 335. The ceiling is the
//   largest module that EXISTS, 557: a ratchet, not a target -- no module may
//   grow past the largest one already in the tree, so the next line added to a
//   module is a decision somebody makes here instead.
//   2026-09-27, markup/style (`*.html`/`*.css`): the largest is
//   assistant/assistant.html at 893 lines, and the assistant's sheet is 494.
//   Same rule: the ceiling is the largest file of the kind that exists.
// Both are RATCHETS with zero headroom on purpose. Raising one is allowed and
// costs a dated note here saying what grew, by how much, and why trimming the
// module was not the better fix -- the lint-llms-size.mjs convention. A ceiling
// with hand-added headroom is a round number pretending to be a measurement,
// which is the exact defect lint-threshold-derivation.mjs exists to stop.
//
// THE EXCEPTIONS, STATED IN THE RULE RATHER THAN WAIVED AT THE FILE
//   1. `*.controller.ts` is NOT budgeted. It is the block's ENTRY: it assembles
//      the state, and it cannot be shared across files because a block module
//      may import nothing from another at runtime (the design doc above, and
//      src/registry.ts's inlineRelativeModule refusing the paste form by name).
//      Its size is a consequence of that constraint. This budget protects
//      module READABILITY, and the entry is not a module -- so exempting it
//      here is the rule saying what it is for, not the budget failing.
//      Measured today: assistant 2391, support-widget 335, in-app-assistant 318.
//   2. `states.mjs` is NOT budgeted. It is the block's dev-only driver state
//      script (verify-blocks requires one per block, V-1), it is not a file the
//      block ships, and its length is the enumeration of the states the driver
//      must walk -- a driver script accepted as one, which is the explicit
//      choice the design doc asked for rather than a neglect. Measured today:
//      assistant 5024, support-widget 303, in-app-assistant 187.
//   Every other authored file in a block directory IS measured (the walk below
//   derives the set from the filesystem, so a new block or a new file needs no
//   edit here) and a file of no recognised kind is a HARD FAILURE naming it:
//   a silent skip is this repo's most expensive recurring defect.
//
// A ZERO-MATCH RUN IS A HARD FAILURE, like lint:cdn-pins. A size check that
// measures no file has not passed, it has failed to look.
//
// RUNNING IT, no build -- it reads block sources and line counts only, ~1s:
//   node packages/ui/scripts/lint-block-file-size.mjs
//   node packages/ui/scripts/lint-block-file-size.mjs --list
//   node packages/ui/scripts/lint-block-file-size.mjs --self-test
import { readdirSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanBlocks } from './lib/scan-blocks.mjs';

// Anchored to THIS FILE, not the cwd: CLAUDE.md tells everyone to run from the
// repo root while `pnpm --filter` sets the cwd to the package.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const SELF_TEST = argv.includes('--self-test');
const LIST = argv.includes('--list');

/** Ceiling for a MODULE, in lines. See the header: 557 = the largest module
 *  that exists today (assistant/assistant.transport.mock.ts). */
export const MODULE_MAX_LINES = Number(argOf('--module-max') ?? 557);
/** Ceiling for MARKUP/STYLE, in lines. 893 = the largest file of the kind that
 *  exists today (assistant/assistant.html). */
export const MARKUP_MAX_LINES = Number(argOf('--markup-max') ?? 893);

/** The dev-only driver script every block owns, and the only file a block
 *  directory carries that its registry item does not ship (exception 2). */
const DRIVER_STATES = 'states.mjs';
const MANIFEST = 'registry-item.json';

/** Which budget a file falls under, from its NAME alone -- nothing here is a
 *  hand-typed file list, and a name of no recognised kind is reported rather
 *  than skipped. */
export function classify(name) {
  if (name === DRIVER_STATES) return { kind: 'driver', ceiling: null };
  if (name.endsWith('.controller.ts')) return { kind: 'entry', ceiling: null };
  if (/\.(?:ts|js|mjs)$/.test(name)) return { kind: 'module', ceiling: 'module' };
  if (/\.(?:html|css)$/.test(name)) return { kind: 'markup', ceiling: 'markup' };
  return { kind: 'unknown', ceiling: null };
}

/** `wc -l` semantics: the trailing newline does not start a line. */
export function countLines(content) {
  let newlines = 0;
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') newlines++;
  return content.length > 0 && !content.endsWith('\n') ? newlines + 1 : newlines;
}

/**
 * The one verdict, pure so the self-test drives the real logic: every authored
 * file in every block, its size, its budget, and every reason it fails.
 */
export function audit(sources, { moduleMax, markupMax }) {
  const rows = [];
  const findings = [];
  const ceilings = { module: moduleMax, markup: markupMax };

  for (const block of sources) {
    const declared = new Set(
      (JSON.parse(block.manifestJson).files ?? []).map((f) => f.path),
    );
    for (const { name, content } of block.files) {
      const { kind, ceiling } = classify(name);
      const lines = countLines(content);
      const where = `${block.dirName}/${name}`;
      rows.push({ where, lines, kind, ceiling: ceiling === null ? null : ceilings[ceiling] });

      if (kind === 'unknown') {
        findings.push(
          `${where}: ${lines} lines, and no budget knows this kind of file. An authored block file the walk measures but the rule does not classify is a hole in a derived list: budget it (classify() in scripts/lint-block-file-size.mjs), or say here why it is exempt.`,
        );
        continue;
      }
      if (!declared.has(name) && kind !== 'driver') {
        findings.push(
          `${where}: not declared in blocks/${block.dirName}/${MANIFEST}'s files[]. The walk measures what the directory holds, so a file the block does not ship is either a stray or an undeclared source -- and only the declared set reaches a consumer.`,
        );
      }
      if (ceiling === null) continue;
      if (lines > ceilings[ceiling]) {
        findings.push(
          `${where}: ${lines} lines, over the ${ceilings[ceiling]}-line ${ceiling} ceiling by ${lines - ceilings[ceiling]}.`,
        );
      }
    }
    for (const path of declared) {
      if (!block.files.some((f) => f.name === path)) {
        findings.push(
          `blocks/${block.dirName}/${MANIFEST}: declares ${path}, which is not in the directory -- a declared file this cannot measure is a hole in the scan.`,
        );
      }
    }
  }
  return { rows, findings, files: rows.length, blocks: sources.length };
}

const print = ({ rows, blocks, files }, { moduleMax, markupMax }) => {
  console.log(
    `  · ${blocks} block(s), ${files} authored file(s) measured ` +
      `(module ceiling ${moduleMax}, markup/style ceiling ${markupMax}; entry and dev-only driver unbudgeted)`,
  );
  let block = null;
  for (const row of [...rows].sort((a, b) => a.where.localeCompare(b.where))) {
    const dir = row.where.slice(0, row.where.indexOf('/'));
    if (dir !== block) {
      block = dir;
      console.log(`  ${dir}`);
    }
    const note =
      row.ceiling === null
        ? row.kind === 'entry'
          ? '  (entry -- exempt: it assembles state no other file may import)'
          : row.kind === 'driver'
            ? '  (dev-only driver states -- exempt: not shipped)'
            : ''
        : `  <= ${row.ceiling}`;
    console.log(`    ${row.where.slice(dir.length + 1).padEnd(42)} ${String(row.lines).padStart(5)}  ${row.kind}${note}`);
  }
};

// ---------------------------------------------------------------------------
// self-test: proves the check still DETECTS, against a real temp tree driven
// through the real walk. Without this, "within budget" is unfalsifiable -- a
// broken line count reads as a small file and a broken comparison passes any
// size forever.
// ---------------------------------------------------------------------------
if (SELF_TEST) {
  const root = mkdtempSync(join(tmpdir(), 'block-file-size-'));
  const mk = (name, manifestFiles, files) => {
    const dir = join(root, 'blocks', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, MANIFEST),
      JSON.stringify({ name, files: manifestFiles.map((path) => ({ path, type: 'registry:file' })) }),
    );
    for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);
  };
  // A module at the ceiling, a module over it, an entry far over it, the driver
  // far over it, a stray `.md`, and markup over its ceiling.
  mk('fits', ['fits.controller.ts', 'fits.rail.ts'], {
    'fits.controller.ts': Array.from({ length: 40 }, () => 'x').join('\n'),
    'fits.rail.ts': `${Array.from({ length: 100 }, () => 'x').join('\n')}\n`,
  });
  mk('over', ['over.controller.ts', 'over.rail.ts'], {
    'over.controller.ts': 'x\n',
    'over.rail.ts': Array.from({ length: 101 }, () => 'x').join('\n'),
  });
  mk('entry', ['entry.controller.ts'], {
    'entry.controller.ts': Array.from({ length: 5000 }, () => 'x').join('\n'),
  });
  mk('driver', ['driver.controller.ts'], {
    'driver.controller.ts': 'x\n',
    [DRIVER_STATES]: Array.from({ length: 5000 }, () => 'x').join('\n'),
  });
  mk('undeclared', ['undeclared.controller.ts'], {
    'undeclared.controller.ts': 'x\n',
    'undeclared.extra.ts': 'x\n',
  });
  mk('stray', ['stray.controller.ts'], {
    'stray.controller.ts': 'x\n',
    'notes.md': 'x\n',
  });
  mk('markup', ['markup.html', 'markup.css'], {
    'markup.html': Array.from({ length: 101 }, () => 'x').join('\n'),
    'markup.css': Array.from({ length: 100 }, () => 'x').join('\n'),
  });
  mkdirSync(join(root, 'blocks', 'not-a-block'), { recursive: true });
  writeFileSync(join(root, 'blocks', 'not-a-block', 'readme.txt'), 'no registry-item.json here\n');

  const walk = (dir) => {
    const sources = scanBlocks(dir);
    const a = audit(sources, { moduleMax: 100, markupMax: 100 });
    return { sources, a };
  };
  const find = (a, needle) => a.findings.filter((f) => f.includes(needle));

  const CASES = [
    {
      name: 'a module at the ceiling passes (the ceiling is inclusive)',
      ok: () => find(walk(join(root, 'blocks')).a, 'fits/fits.rail.ts').length === 0,
    },
    {
      name: 'a PLANTED module over the ceiling goes red, naming the file and its size',
      ok: () => find(walk(join(root, 'blocks')).a, 'over/over.rail.ts')[0]?.includes('101 lines, over the 100-line module ceiling by 1'),
    },
    {
      name: 'the entry is exempt BY THE RULE, however large it is',
      ok: () => find(walk(join(root, 'blocks')).a, 'entry/entry.controller.ts').length === 0,
    },
    {
      name: 'the dev-only driver states are exempt, and are not misread as undeclared',
      ok: () => find(walk(join(root, 'blocks')).a, 'driver/').length === 0,
    },
    {
      name: 'an UNDECLARED authored file is reported, never silently measured',
      ok: () => find(walk(join(root, 'blocks')).a, 'undeclared/undeclared.extra.ts').length === 1,
    },
    {
      name: 'a file of no recognised kind is reported rather than skipped',
      ok: () => find(walk(join(root, 'blocks')).a, 'stray/notes.md').length === 1,
    },
    {
      name: 'markup is budgeted too (the page and the sheet)',
      ok: () => find(walk(join(root, 'blocks')).a, 'markup/markup.html')[0]?.includes('101 lines, over the 100-line markup ceiling by 1'),
    },
    {
      name: 'a directory without a registry-item.json is not a block, so the walk skips it',
      ok: () => walk(join(root, 'blocks')).sources.every((s) => s.dirName !== 'not-a-block'),
    },
    {
      name: 'a MISSING blocks directory is a failure, not an empty pass',
      ok: () => {
        try {
          scanBlocks(join(root, 'nope'));
          return false;
        } catch {
          return true;
        }
      },
    },
    {
      name: 'an exempt file is still MEASURED (the 5000-line entry appears with its real count)',
      ok: () => {
        const { a } = walk(join(root, 'blocks'));
        return a.rows.some((r) => r.where === 'entry/entry.controller.ts' && r.lines === 5000);
      },
    },
  ];

  let failed = 0;
  try {
    for (const c of CASES) {
      const ok = c.ok();
      if (!ok) failed += 1;
      console.log(`${ok ? '✓' : '✗'} ${c.name}`);
    }
    const { a } = walk(join(root, 'blocks'));
    if (a.files < 10 || a.blocks < 6) {
      failed += 1;
      console.log(`✗ the self-test tree is measured at all (${a.blocks} blocks, ${a.files} files)`);
    }
    if (failed > 0) {
      console.error(`\n✗ lint-block-file-size self-test: ${failed} case(s) failed -- the check cannot be trusted to detect.`);
      process.exit(1);
    }
    console.log(`\n✓ lint-block-file-size self-test: ${CASES.length + 1} cases behave as specified.`);
    process.exit(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// the real run
// ---------------------------------------------------------------------------
const blocksDir = argOf('--blocks-dir') ?? join(dirname(createRequire(import.meta.url).resolve('@kitn.ai/blocks/package.json')), 'blocks');

if (!Number.isFinite(MODULE_MAX_LINES) || !Number.isFinite(MARKUP_MAX_LINES) || MODULE_MAX_LINES <= 0 || MARKUP_MAX_LINES <= 0) {
  console.error(`✗ lint-block-file-size: nonsense ceilings (module ${MODULE_MAX_LINES}, markup ${MARKUP_MAX_LINES}).`);
  process.exit(1);
}

let sources;
try {
  sources = scanBlocks(blocksDir);
} catch (err) {
  console.error(
    `✗ lint-block-file-size: cannot walk ${blocksDir} (${err.message}).\n` +
      `  The authored blocks live in @kitn.ai/blocks, so a missing directory means the blocks moved\n` +
      `  and this guard would measure nothing at all.`,
  );
  process.exit(1);
}

const result = audit(sources, { moduleMax: MODULE_MAX_LINES, markupMax: MARKUP_MAX_LINES });

if (result.files === 0) {
  console.error(
    `✗ lint-block-file-size: ${blocksDir} yielded ${result.blocks} block(s) and NO authored file.\n` +
      `  A size check that measures nothing has not passed, it has failed to look.\n` +
      `  A block IS a directory holding a registry-item.json (see scripts/lib/scan-blocks.mjs).`,
  );
  process.exit(1);
}

if (LIST) print(result, { moduleMax: MODULE_MAX_LINES, markupMax: MARKUP_MAX_LINES });

if (result.findings.length === 0) {
  console.log(
    `✓ lint-block-file-size: every one of ${result.files} authored block file(s) across ` +
      `${result.blocks} block(s) is within budget (module ceiling ${MODULE_MAX_LINES}, markup/style ${MARKUP_MAX_LINES}).`,
  );
  process.exit(0);
}

console.error(`\n✗ lint-block-file-size: ${result.findings.length} finding(s).\n`);
for (const f of result.findings) console.error(`  - ${f}`);
console.error(
  `\n  The ceilings are the largest file of each kind that EXISTS (see the header of\n` +
    `  scripts/lint-block-file-size.mjs) -- a ratchet, not a target. Your options, in order:\n\n` +
    `    1. EXTRACT -- a self-contained concern can leave as its own declared module, but only if\n` +
    `       it imports nothing from another block module at runtime (the paste form refuses it by\n` +
    `       name; docs/superpowers/specs/2026-09-27-block-source-structure-design.md).\n` +
    `    2. TRIM -- if what grew is prose or a fixture, a tighter version is usually the better fix.\n` +
    `    3. RAISE THE CEILING -- only if the growth is genuinely needed: bump MODULE_MAX_LINES or\n` +
    `       MARKUP_MAX_LINES WITH A DATED NOTE saying what grew, by how much, and why trimming lost,\n` +
    `       in the style of scripts/lint-llms-size.mjs.\n\n` +
    `  ` + (LIST ? '' : 'Run with --list to print every measured count.'),
);
process.exit(1);
