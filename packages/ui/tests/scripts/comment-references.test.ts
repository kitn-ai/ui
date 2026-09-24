/**
 * GUARD — a comment may not cite a plan, a task/round ID, a dated ruling or a
 * section ref, and a single comment block stays under 20 lines unless it says why.
 *
 * This file exists because of HOW such a guard is lost: not by someone deleting it,
 * but by the walk stopping earlier (`src/` renamed), by the scanner degrading into a
 * regex that reads the `//` of an `https://` string as a comment, or by the floor
 * being lowered until a run that read nothing reads as a clean tree. So the last
 * assertions RUN the script against fixtures that must go red, and against the real
 * tree, which must not.
 *
 * The rules, the waiver grammar and the reasons live in
 * `scripts/lint-comment-references.mjs`; the criteria are rules 5 and 6 of
 * `docs/verbosity-sweep.md`.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = 'scripts/lint-comment-references.mjs';

/** Pinned HERE as well as in the linter: a guard test that reads the rule out of
 *  the thing it guards cannot notice the rule being relaxed, and `--min-comments 0`
 *  would leave every assertion below green while the walk read nothing. */
const MAX_BLOCK_LINES = 20;
const FLOOR = 3000;

interface Report {
  files: number;
  commentsRead: number;
  references: number;
  longBlocks: number;
  maxBlockLines: number;
  floor: number;
  referenceFindings: { file: string; line: number; preview: string }[];
  longBlockFindings: { file: string; line: number; lines: number }[];
}

function runLinter(args: string[] = []): { code: number; output: string } {
  try {
    const stdout = execFileSync('node', [resolve(pkgRoot, SCRIPT), ...args], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function reportOf(args: string[] = []): Report {
  const { output } = runLinter([...args, '--json']);
  const line = output.trim().split('\n').find((l) => l.trimStart().startsWith('{'));
  expect(line, `the linter printed no JSON report:\n${output}`).toBeTruthy();
  const report = JSON.parse(line as string) as Report;
  expect(report.maxBlockLines, 'the linter relaxed its own block cap').toBe(MAX_BLOCK_LINES);
  return report;
}

/** A throwaway package root holding one source file, the shape the walk expects. */
function fixtureRoot(source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'comment-refs-'));
  mkdirSync(join(root, 'src/fixture'), { recursive: true });
  writeFileSync(join(root, 'src/fixture/fixture.ts'), source);
  return root;
}

const LONG_BLOCK = Array.from({ length: MAX_BLOCK_LINES + 1 }, (_, i) => `// line ${i}`).join('\n');

describe('the comment-reference guard holds the real tree', () => {
  it('has no comment citing a plan, an ID, a dated ruling or a section', () => {
    const report = reportOf();
    const list = report.referenceFindings.map((f) => `    ${f.file}:${f.line} ${f.preview}`).join('\n');
    expect(
      report.references,
      `${report.references} comment(s) cite a plan/ID/date/section (${report.commentsRead} comments read):\n${list}\n` +
        `  Say the fact the citation stood for, or drop the citation. Navigation to code and to living docs stays.`,
    ).toBe(0);
  });

  it('has no comment block over the cap', () => {
    const report = reportOf();
    const list = report.longBlockFindings.map((f) => `    ${f.file}:${f.line} (${f.lines} lines)`).join('\n');
    expect(
      report.longBlocks,
      `${report.longBlocks} comment block(s) over ${MAX_BLOCK_LINES} lines:\n${list}\n` +
        `  Shorten it to the trap, the invariant and the reason, or waive it with the reason it must stay whole.`,
    ).toBe(0);
  });

  it('reads the whole tree rather than almost none of it', () => {
    // The anti-vacuity half. Both rules are satisfied trivially by a walk that stops
    // finding comments, so the floor is asserted here as well as enforced in the
    // script.
    const report = reportOf();
    expect(
      report.commentsRead,
      `only ${report.commentsRead} comment(s) across ${report.files} file(s): the walk or the scanner is blind`,
    ).toBeGreaterThanOrEqual(FLOOR);
    expect(report.floor, 'the script floor and this file have drifted apart').toBe(FLOOR);
  });

  it('goes RED on a fixture tree that cites a task ID', () => {
    const root = fixtureRoot('// split out during the T-1 build-out\nconst a = 1;\n');
    const { code, output } = runLinter(['--package-root', root, '--min-comments', '1']);
    expect(code, `a task ID must fail the run:\n${output}`).toBe(1);
    expect(output).toContain('T-1');
  });

  it('goes RED on a fixture tree with a block over the cap, and honours a waiver', () => {
    const over = fixtureRoot(`${LONG_BLOCK}\nconst a = 1;\n`);
    expect(runLinter(['--package-root', over, '--min-comments', '1']).code, 'a 21-line block must fail').toBe(1);

    const waived = fixtureRoot(
      `// lint-comment-references: long-block -- the shader walkthrough must stay in one piece\n${LONG_BLOCK}\nconst a = 1;\n`,
    );
    expect(runLinter(['--package-root', waived, '--min-comments', '1']).code, 'a waiver with a reason must pass').toBe(0);

    const noReason = fixtureRoot(
      `// lint-comment-references: long-block\n${LONG_BLOCK}\nconst a = 1;\n`,
    );
    expect(runLinter(['--package-root', noReason, '--min-comments', '1']).code, 'a reason-less waiver must not pass').toBe(1);
  });

  it('a machine-generated source is stepped over, banner and all', () => {
    // A waiver written into a generated file is erased by the next regeneration, so
    // the guard must not ask for one. The marker is read from the head, so a new
    // generator is covered without a hand-kept path list.
    const root = mkdtempSync(join(tmpdir(), 'comment-refs-gen-'));
    mkdirSync(join(root, 'src/primitives'), { recursive: true });
    writeFileSync(
      join(root, 'src/primitives/generated.ts'),
      `/**\n * GENERATED by scripts/gen-thing.mjs. Do not edit by hand. Run \`node scripts/gen-thing.mjs\`.\n *\n${Array.from({ length: 30 }, (_, i) => ` * line ${i}`).join('\n')}\n */\nexport const a = 1;\n`,
    );
    // A second, hand-written file, so the walk is not empty: an empty walk is a HARD
    // FAILURE in the script (a broken walk must not read as a clean tree), and this
    // case is about what the walk steps over, not about the floor.
    writeFileSync(join(root, 'src/primitives/hand.ts'), '// A plain comment.\nexport const b = 2;\n');
    const report = reportOf(['--package-root', root, '--min-comments', '1']);
    expect(report.files, 'only the hand-written file should be walked').toBe(1);
    expect(report.commentsRead, 'the generated banner must not be read as a comment').toBe(1);
    expect(report.longBlocks, 'a generated banner is not a maintainer comment').toBe(0);
  });

  it('a URL in a string is not a comment, and a LIVING doc path is not a citation', () => {
    const url = fixtureRoot("const u = 'https://example.com/x // not a comment';\n");
    const urlReport = reportOf(['--package-root', url, '--min-comments', '0']);
    expect(urlReport.commentsRead, 'the scanner read `//` inside a string as a comment').toBe(0);

    const living = fixtureRoot('// See docs/coupling-map.md for the pair.\nconst a = 1;\n');
    expect(runLinter(['--package-root', living, '--min-comments', '1']).code, 'a living doc path must pass').toBe(0);
  });
});
