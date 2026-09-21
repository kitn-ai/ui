#!/usr/bin/env node
/**
 * GUARD: no workflow file may contain a YAML PLAIN SCALAR with `: ` inside it.
 *
 * WHY THIS EXISTS, and it cost two rounds of CI on the same day it was written. A step name is a
 * plain scalar until it is quoted, and libyaml refuses `: ` inside one:
 *
 *     - name: Pack-weight guard (kai's tarball: required outputs in, no node_modules, no step)
 *       mapping values are not allowed here
 *         in ".github/workflows/test.yml", line 586, column 47
 *
 * GitHub then refuses the WHOLE FILE, and every event fails at 0 s with "This run likely failed
 * because of a workflow file issue". THE TELL IS THE MISLEADING PART: `gh pr checks` prints "no
 * checks reported on the branch", which reads like checks that have not started, so the natural
 * next move is to push again. It happened twice in one session, in two different step names, and
 * the second time it was `name: Bundle-shape guard (the MCP server bundle: present, ...)`.
 *
 * WHY A GUARD AND NOT A NOTE. `lint:gate-parity` reads these files and accepted both: it parses
 * with a narrow line reader on purpose (its own header argues against a YAML parser here), so it
 * cannot see scalar syntax. Nothing else in the repo reads the workflows at all, and the check is
 * GRAMMAR-EXACT, not a heuristic: in YAML a plain scalar simply cannot contain `: `, so a line this
 * fires on is a line libyaml would reject. Two instances in one day is enough to generalise.
 *
 * WHAT IT DOES NOT DO: it is not a YAML parser. It checks the fields a human types prose into
 * (`name:`, `run:`, `uses:`, `working-directory:`) and skips `|`/`>` block scalars, inside which
 * colons are legal and common, and quoted values, which are the fix. A key with no value, or a
 * nested mapping, is not a scalar and is left alone.
 *
 *   node scripts/lint-workflow-scalars.mjs
 *   node scripts/lint-workflow-scalars.mjs --self-test   # prove it still detects
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const WORKFLOWS = join(REPO, '.github', 'workflows');

/**
 * The fields whose value is prose a human types. `if:` and `env:` are deliberately absent: their
 * values legitimately contain `${{ }}` and URLs, and a quoted/spaced colon there is rarer than the
 * false positives would be.
 */
export const PROSE_FIELDS = ['name', 'run', 'uses', 'working-directory'];

/** Lines whose plain scalar cannot legally hold `: `. */
const SCALAR_LINE = new RegExp(`^(\\s*(?:-\\s+)?(?:${PROSE_FIELDS.join('|')}):\\s+)(\\S.*)$`);

/**
 * Every offending line in one workflow's text, as `{ line, text }`. Pure, for the self-test.
 */
export function scalarProblems(text) {
  const problems = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const match = SCALAR_LINE.exec(raw);
    if (!match) continue;
    const value = match[2];
    // A block scalar's body starts on the NEXT line and may contain anything.
    if (value.startsWith('|') || value.startsWith('>')) continue;
    // A quoted value is the fix, not the fault.
    if (value.startsWith("'") || value.startsWith('"')) continue;
    // The rule: an unquoted plain scalar cannot contain `: ` (or end on a bare `:`).
    if (!value.includes(': ') && !value.endsWith(':')) continue;
    problems.push({ line: i + 1, text: raw.trim() });
  }
  return problems;
}

/** Every workflow file in the repo, and its problems. */
export function workflowProblems(dir = WORKFLOWS) {
  const problems = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.ya?ml$/.test(entry.name)) continue;
    const file = join(dir, entry.name);
    for (const p of scalarProblems(readFileSync(file, 'utf8'))) {
      problems.push({ file: `.github/workflows/${entry.name}`, ...p });
    }
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  const probes = [
    [
      'the real first instance is caught',
      scalarProblems("      - name: Pack-weight guard (kai's tarball: required outputs in, no step)\n").length === 1,
    ],
    [
      'the real second instance is caught',
      scalarProblems('      - name: Bundle-shape guard (the MCP server bundle: present, SDK external)\n').length === 1,
    ],
    ['a colon in a run line is caught', scalarProblems('        run: echo a: b\n').length === 1],
    ['a QUOTED value with a colon is clean (that is the fix)', scalarProblems('      - name: "guard: quoted"\n').length === 0],
    ['a value with no colon is clean', scalarProblems('      - name: Bundle-shape guard (both bundles present)\n').length === 0],
    [
      'a BLOCK scalar may contain colons',
      scalarProblems('        run: |\n          echo a: b\n          echo c: d\n').length === 0,
    ],
    ['a uses line is clean', scalarProblems('        uses: actions/checkout@v4\n').length === 0],
    ['an expression value is clean', scalarProblems('        if: ${{ steps.x.outputs.y }}\n').length === 0],
    ['an empty value is not a scalar and is left alone', scalarProblems('        run:\n').length === 0],
    ['a nested key is not a scalar', scalarProblems('      name:\n        child: 1\n').length === 0],
  ];
  let failed = 0;
  for (const [what, ok] of probes) {
    console.log(`${ok ? '✓' : '✗'} ${what}`);
    if (!ok) failed += 1;
  }
  if (failed) {
    console.error(`\n✗ lint-workflow-scalars self-test: ${failed}/${probes.length} probe(s) misbehaved.\n`);
    process.exit(1);
  }
  console.log(`✓ lint-workflow-scalars self-test: ${probes.length} probes behave as specified.`);
  process.exit(0);
}

const problems = workflowProblems();
if (problems.length) {
  console.error(`✗ lint-workflow-scalars: ${problems.length} unquoted scalar(s) contain ": ", which libyaml rejects.`);
  for (const p of problems) console.error(`  ${p.file}:${p.line}  ${p.text}`);
  console.error(
    `\n  GitHub refuses the WHOLE FILE over this, and every event then fails at 0 s with "workflow\n` +
      `  file issue" while \`gh pr checks\` says "no checks reported" -- which reads like checks that\n` +
      `  have not started. Quote the value, or drop the colon.\n`,
  );
  process.exit(1);
}
console.log('✓ lint-workflow-scalars: every workflow scalar is one YAML accepts.');
