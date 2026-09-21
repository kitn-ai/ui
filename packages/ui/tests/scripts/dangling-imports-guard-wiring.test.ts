/**
 * GUARD: `lint:dangling-imports` still DETECTS, and CI still runs it.
 *
 * The guard itself fails on any STATEMENT-POSITION relative specifier that resolves to no file.
 * It exists because this config's tsc does not report an unresolved SIDE-EFFECT import and the
 * `unit` project excludes `*.stories.*`, so a story that shipped `import
 * '../web-components/register'` (a path that lost a `..` and its last segment in the
 * family-folder reorg) collected 0 tests where it should have collected 9, and only the
 * storybook browser job could have seen it. The same class bit the same branch twice.
 *
 * This file exists because of HOW that guard would be lost, and none of the ways involve someone
 * deleting it:
 *   - the `--self-test` half dropping off the npm script, so a scan that resolves nothing exits
 *     0 and reads exactly like a clean tree (the analytic half of the guard becomes decoration);
 *   - the CI step dropping out of the required `test` graph, so the guard runs nowhere;
 *   - the masker over-reaching: the tree is FULL of `import './x'` inside template literals
 *     (emitted code for generated projects, assertions' expected text). With no masker this
 *     guard reports 157 findings on a healthy tree, which is how a guard gets switched off
 *     rather than fixed.
 *
 * So the exit codes here are not the script's self-report. Each one RUNS the guard against a
 * synthesized tree through `--repo-root`, and the two directions are asserted against each
 * other: a planted dangling import must fail naming its file and line, and the same text inside
 * a template literal must pass.
 *
 * Watched failing, per assertion: dropping `--self-test` from the npm script turns the second
 * test red naming the script, deleting the CI step turns the third red naming the job, and
 * removing the template-literal masking from `specifiersIn` turns the sixth red while every
 * other test in this file stays green.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredGateBlock } from './lib/required-gate-block';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(pkgRoot, '../..');
const WORKFLOW = resolve(repoRoot, '.github/workflows/test.yml');
const SCRIPT = 'scripts/lint-dangling-imports.mjs';
const NPM_SCRIPT = 'lint:dangling-imports';

const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf-8')) as {
  scripts: Record<string, string>;
};

/**
 * A throwaway repo root the guard can be pointed at with `--repo-root`, padded past BOTH vacuity
 * floors so the fixture exercises the real scan. Each pad file carries two relative specifiers:
 * one import and one re-export, both resolvable, so the specifier floor is cleared by files that
 * can never be the finding under test.
 */
function fixtureRoot(extra: Record<string, string> = {}, padCount = 520): string {
  const root = mkdtempSync(join(tmpdir(), 'dangling-imports-guard-'));
  const files: Record<string, string> = {
    'packages/ui/src/pad/pad-base.ts': 'export const base = 1;\n',
    ...extra,
  };
  for (let i = 0; i < padCount; i += 1) {
    files[`packages/ui/src/pad/pad-${i}.ts`] =
      `import { base } from './pad-base';\nexport { base as pad${i} } from './pad-base';\n`;
  }
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

function runLinter(args: string[]): { code: number; output: string } {
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

describe('the dangling-import guard detects, and CI runs it', () => {
  it('ships the linter', () => {
    expect(existsSync(resolve(pkgRoot, SCRIPT)), `${SCRIPT} is missing`).toBe(true);
  });

  it('`lint:dangling-imports` runs the self-test half as well as the scan', () => {
    const script = pkg.scripts[NPM_SCRIPT];
    expect(script, `no \`${NPM_SCRIPT}\` script in packages/ui/package.json`).toBeTruthy();
    expect(
      script,
      `\`${NPM_SCRIPT}\` no longer runs \`--self-test\`. That half is what proves the masker, the ` +
        `extractor and the resolver still DETECT; without it a scan that silently resolves nothing ` +
        `exits 0 and reads as a clean tree.`,
    ).toContain('--self-test');
    expect(script, `\`${NPM_SCRIPT}\` no longer runs the scan itself`).toContain(SCRIPT);
  });

  it('is invoked by the REQUIRED `test` job in CI', () => {
    const block = requiredGateBlock(readFileSync(WORKFLOW, 'utf-8'));
    expect(block, `no \`test:\` job found in ${WORKFLOW}`).not.toBe('');
    expect(
      block,
      `the \`test\` job does not run \`${NPM_SCRIPT}\`, the only check that a relative import ` +
        `pointing at nothing -- the SIDE-EFFECT form above all, which tsc never reports -- is ` +
        `caught before a browser job would have to be the one to notice.`,
    ).toContain(NPM_SCRIPT);
  });

  it('its own self-test still passes', () => {
    const { code, output } = runLinter(['--self-test']);
    expect(code, `--self-test exited ${code}: ${output}`).toBe(0);
    expect(output).toContain('cases behave as specified');
  });

  it('fires on a dangling SIDE-EFFECT import, naming the file and line (the class tsc is blind to)', () => {
    const root = fixtureRoot({ 'packages/ui/src/stories/broken.stories.tsx': "import '../web-components/register';\n" });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'a side-effect import pointing at nothing exited 0').not.toBe(0);
    expect(output).toContain('packages/ui/src/stories/broken.stories.tsx:1');
    expect(output).toContain("'../web-components/register'");
  });

  it('fires on a dangling `from` and `export ... from` too', () => {
    const root = fixtureRoot({
      'packages/ui/src/planted.ts': "import { x } from './nope';\nexport { y } from './also-nope';\n",
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'dangling `from` forms exited 0').not.toBe(0);
    expect(output).toContain('packages/ui/src/planted.ts:1');
    expect(output).toContain('packages/ui/src/planted.ts:2');
  });

  it('does NOT fire on the same text inside a template literal or a comment', () => {
    // The false-positive class that decides whether this guard is usable at all: the tree holds
    // ~150 of these, all emitted code for a generated project or an assertion's expected text.
    const root = fixtureRoot({
      'packages/ui/mcp/construct/codegen.ts':
        "export const emit = `import { App } from './App';\\nimport './global.css';`;\n" +
        "// import './commented-out'\nconst s = \"import './in-a-string'\";\n",
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, `emitted code and prose were reported as imports: ${output}`).toBe(0);
  });

  it('honours a line waiver with a reason, and its neighbour still fires', () => {
    const root = fixtureRoot({
      'packages/ui/scripts/block-driver/react-host/src/main.tsx':
        `import { Block } from './block'; // lint:dangling-imports: allowed -- generated into the host copy\n` +
        `import { Other } from './other';\n`,
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'a waived line did not stop the neighbour from firing').not.toBe(0);
    expect(output).toContain('react-host/src/main.tsx:2');
    expect(output).not.toContain('react-host/src/main.tsx:1');
  });

  it('does not accept a bare marker as a waiver', () => {
    const root = fixtureRoot({
      'packages/ui/src/no-reason.ts': "import './nope'; // lint:dangling-imports: allowed\n",
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'a marker with no reason waived the line').not.toBe(0);
    expect(output).toContain("'./nope'");
  });

  it('fails a waiver that suppresses nothing, because the next finding would be covered by it', () => {
    const root = fixtureRoot({
      'packages/ui/src/waived.ts':
        "// lint:dangling-imports: file-waived -- the target is generated\nimport { pad } from './pad/pad-base';\n",
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'a stale waiver exited 0').not.toBe(0);
    expect(output).toContain('stale file-waived waiver');
  });

  it('treats a walk that resolves nothing as a failure, not a pass', () => {
    // Both vacuity floors, because a scan that resolves nothing prints exactly the clean line a
    // tree with no violations prints.
    const small = runLinter(['--repo-root', fixtureRoot({}, 2)]);
    expect(small.code, 'a two-file walk exited 0').not.toBe(0);
    expect(small.output).toContain('has stopped scanning');

    // A tree big enough to walk whose pad files carry no relative specifier at all.
    const root = mkdtempSync(join(tmpdir(), 'dangling-imports-nospec-'));
    for (let i = 0; i < 520; i += 1) {
      const abs = join(root, 'packages/ui/src/plain', `plain-${i}.ts`);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, `export const plain${i} = ${i};\n`);
    }
    const bare = runLinter(['--repo-root', root]);
    rmSync(root, { recursive: true, force: true });
    expect(bare.code, 'a tree that found no relative specifier exited 0').not.toBe(0);
    expect(bare.output).toContain('statement-position relative specifier(s)');
  });
});
