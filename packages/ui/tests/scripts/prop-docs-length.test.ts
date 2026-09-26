/**
 * GUARD — prop doc comments in the web-component facades stay ONE short sentence.
 *
 * The guard itself keeps each `Props`/`Events` member's JSDoc at or under
 * `MAX_PROP_DOC_CHARS` (160), whitespace-collapsed, with the reasoning moved to a
 * plain `//` comment above the prop instead of deleted. It exists because one prop
 * doc comment is generated into FIVE artifacts — the element meta, `llms-full.txt`
 * (what an agent reads), the MCP catalog, the docs site prop table, and Storybook —
 * so a rambling comment is not paid for once, it is paid for five times, and the
 * tree measured 94 KB of it, mean 139 chars, before this landed.
 *
 * This file exists because of HOW that guard would be lost. Not by someone
 * deleting it: by the scope shrinking (the walk stops finding type-alias props,
 * which is how `chat.tsx` declares `Props`), by the floor being lowered until
 * "nothing was read" passes, or by the analyzer degrading into a scan that matches
 * nothing and exits 0. All three make the suite faster and greener while covering
 * less, and a linter that matches nothing looks identical to a clean tree from
 * outside. So the last three assertions do not trust the script's own self-report:
 * they RUN it against fixtures that must go red, and against a real tree that must
 * not.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = 'scripts/lint-prop-docs.mjs';

/**
 * The cap and the floor, PINNED here on purpose even though the linter also reports
 * them in its `--json` report. A guard test that reads the rule out of the thing it
 * guards cannot notice the rule being relaxed -- setting the cap to 10_000 or the
 * floor to 0 would leave this file green and the suite looking covered, which is the
 * exact shape of failure it exists for. So the numbers are asserted against the
 * linter's own reported ones, and the fixture sizes are built from them.
 */
const CAP = 160;
const FLOOR = 500;

interface PropDocFinding {
  file: string;
  line: number;
  prop: string;
  chars: number;
  firstClause: string;
}
interface PropDocReport {
  files: number;
  propsRead: number;
  overCap: number;
  waived: number;
  maxChars: number;
  cap: number;
  floor: number;
  findings: PropDocFinding[];
  waivedProps: { file: string; line: number; prop: string; chars: number; reason: string }[];
}

/** Runs the linter and returns its exit code plus combined output. */
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

/** The linter's `--json` report for a tree. Fails loudly rather than parsing '' if
 *  the run never got as far as reporting (a zero-match walk exits first). */
function reportOf(args: string[] = []): PropDocReport {
  const { output } = runLinter([...args, '--json']);
  const line = output.trim().split('\n').find((l) => l.trimStart().startsWith('{'));
  expect(line, `the linter printed no JSON report:\n${output}`).toBeTruthy();
  const report = JSON.parse(line as string) as PropDocReport;
  expect(report.cap, 'the linter relaxed its own cap').toBe(CAP);
  return report;
}

/** A throwaway package root holding one facade, the shape the walk expects. */
function fixtureRoot(facade: string): string {
  const root = mkdtempSync(join(tmpdir(), 'prop-docs-'));
  mkdirSync(join(root, 'src/web-components/fixture'), { recursive: true });
  writeFileSync(join(root, 'src/web-components/fixture/fixture.tsx'), facade);
  return root;
}

const LONG = 'x'.repeat(CAP + 1);
const AT_CAP = 'y'.repeat(CAP);

describe('the prop-doc length guard holds the real tree', () => {
  it('has no prop description over the cap', () => {
    // Not a self-report: the count comes from the same walk CI runs, and the
    // waived count is in the message because a tree kept green by waivers is a
    // different (and worse) state than a tree kept short.
    const report = reportOf();
    const list = report.findings
      .map((f) => `    ${f.file}:${f.line} ${f.prop} (${f.chars} chars) -- ${f.firstClause}`)
      .join('\n');
    expect(
      report.overCap,
      `${report.overCap} prop description(s) over ${CAP} chars ` +
        `(${report.propsRead} read, ${report.waived} waived):\n${list}\n` +
        `  Move the reasoning to a plain \`//\` comment above the prop; no generator reads it.`,
    ).toBe(0);
  });

  it('reads the whole slice rather than almost none of it', () => {
    // The anti-vacuity half. The cap is satisfied trivially by a walk that stops
    // finding members, so the floor is asserted here as well as enforced in the
    // script: a walk that reads a couple of hundred props across the tree has
    // gone blind, and the caps it then "passes" say nothing.
    const report = reportOf();
    expect(report.floor, 'the linter relaxed its own floor').toBe(FLOOR);
    expect(
      report.propsRead,
      `only ${report.propsRead} documented prop(s) read across ${report.files} facade(s), ` +
        `below the floor of ${FLOOR}. The walk stopped finding members ` +
        `(a type-alias \`Props\`, the \`chat.tsx\` shape, is the easy one to lose).`,
    ).toBeGreaterThanOrEqual(FLOOR);
  });
});

describe('the prop-doc length guard detects', () => {
  it('fires on a description over the cap, naming the file, prop and length', () => {
    const root = fixtureRoot(`interface Props {\n  /** ${LONG} */\n  a?: string;\n}\n`);
    const { code, output } = runLinter(['--package-root', root, '--min-props', '1']);
    expect(code, `an over-cap description exited ${code}`).not.toBe(0);
    expect(output).toContain('fixture.tsx:3 a');
    expect(output).toContain(`${CAP + 1} chars`);
  });

  it('passes on a description exactly at the cap, and on a waived one', () => {
    const atCap = fixtureRoot(`interface Props {\n  /** ${AT_CAP} */\n  a?: string;\n}\n`);
    expect(
      runLinter(['--package-root', atCap, '--min-props', '1']).code,
      'a description at exactly the cap was rejected',
    ).toBe(0);

    const waived = fixtureRoot(
      `interface Props {\n` +
        `  // lint-prop-docs: long -- the accepted spellings ARE the contract here\n` +
        `  /** ${LONG} */\n  a?: string;\n}\n`,
    );
    const { code, output } = runLinter(['--package-root', waived, '--min-props', '1', '--json']);
    expect(code, `a waived description exited ${code}:\n${output}`).toBe(0);
    const report = JSON.parse(output) as PropDocReport;
    expect(report.waived, 'a waived prop was not counted as waived').toBe(1);
    expect(report.waivedProps[0].reason, 'the waiver reason was not reported').toContain('contract');
  });

  it('does not accept a waiver with no reason, or one written inside the doc comment', () => {
    // Parsed, not substring-matched. A directive nobody had to justify is not a
    // suppression a reviewer can weigh, and a directive inside the description is
    // the description itself -- letting it waive would ship the bytes anyway.
    const noReason = fixtureRoot(
      `interface Props {\n  // lint-prop-docs: long\n  /** ${LONG} */\n  a?: string;\n}\n`,
    );
    expect(
      runLinter(['--package-root', noReason, '--min-props', '1']).code,
      'a waiver with no reason silenced the cap',
    ).not.toBe(0);

    const insideDoc = fixtureRoot(
      `interface Props {\n  /** ${LONG}\n   *  // lint-prop-docs: long -- a reason nobody wrote next to the prop */\n  a?: string;\n}\n`,
    );
    expect(
      runLinter(['--package-root', insideDoc, '--min-props', '1']).code,
      'a directive inside the doc comment silenced the cap',
    ).not.toBe(0);
  });

  it('treats a tree that reads no props as a failure, not a pass', () => {
    // A tree the walk reads nothing in means the walk is broken or the scope
    // moved, NOT that every description is short. Exiting 0 here is this repo's
    // most expensive recurring defect.
    const root = fixtureRoot(`export const notAFacade = 1;\n`);
    const { code, output } = runLinter(['--package-root', root, '--min-props', '1']);
    expect(code, 'a zero-prop run exited 0, which reads as "nothing was wrong"').not.toBe(0);
    expect(output).toContain('below the floor');
  });
}, 60_000);
