/**
 * GUARD: `lint:layer-direction` still DETECTS, and CI still runs it.
 *
 * The guard itself forbids an UPWARD VALUE import between the package's source
 * layers: a layer may import from below itself or from its own rank, never from
 * above. It exists because `src/web-components/` is a facade over the Solid
 * components in `src/components/`, so a component importing the facade back is a
 * real cycle rather than a style nit, and nothing in a build reports one.
 *
 * This file exists because of HOW that guard would be lost. Not by someone
 * deleting it: by the `--self-test` half dropping off the npm script, by CI
 * dropping the step, or by the walk degrading into a scan that resolves no file
 * and exits 0. All three make CI faster and greener while covering less, and a
 * linter that resolves nothing looks identical to a clean tree from outside.
 *
 * So the exit codes here are not the script's self-report. Each one RUNS the
 * linter against a synthesized tree through `--repo-root`: a planted upward value
 * import must fail, a clean tree must pass, a marker with no reason must still
 * fail, and both vacuity floors must fail.
 *
 * Watched failing, per assertion: deleting the `--self-test` half turns the
 * second red naming the script, deleting the CI step turns the third red naming
 * the job, and treating a type-only import as a value import turns the
 * type-only test red while every other test in this suite stays green.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredGateBlock } from './lib/required-gate-block';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(pkgRoot, '../..');
const WORKFLOW = resolve(repoRoot, '.github/workflows/test.yml');
const SCRIPT = 'scripts/lint-layer-direction.mjs';
const NPM_SCRIPT = 'lint:layer-direction';

const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf-8')) as {
  scripts: Record<string, string>;
};

/**
 * A throwaway repo root the linter can be pointed at with `--repo-root`.
 *
 * Padded past the linter's vacuity floor on purpose: the floor is there so an
 * empty walk cannot print the clean line, and a five-file fixture would trip it
 * instead of exercising the scan. `utils` is the bottom layer, so the padding
 * itself can never be the upward edge under test.
 */
function fixtureRoot(extra: Record<string, string> = {}, padCount = 320): string {
  const root = mkdtempSync(join(tmpdir(), 'layer-direction-guard-'));
  const files: Record<string, string> = {
    'packages/ui/src/utils/base.ts': `export const base = 1;\n`,
    'packages/ui/src/components/sibling.ts': `export const sibling = 1;\n`,
    'packages/ui/src/components/types.ts': `export interface A { a: number }\nexport type B = string;\n`,
    // One relative specifier, downward, so a clean tree still resolves something.
    'packages/ui/src/wire/reads-utils.ts': `import { base } from '../utils/base';\n`,
    ...extra,
  };
  for (let i = 0; i < padCount; i += 1) files[`packages/ui/src/utils/pad-${i}.ts`] = `export const pad${i} = ${i};\n`;
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

describe('the layer-direction guard detects, and CI runs it', () => {
  it('ships the linter', () => {
    expect(existsSync(resolve(pkgRoot, SCRIPT)), `${SCRIPT} is missing`).toBe(true);
  });

  it('`lint:layer-direction` runs the self-test half as well as the scan', () => {
    const script = pkg.scripts[NPM_SCRIPT];
    expect(script, `no \`${NPM_SCRIPT}\` script in packages/ui/package.json`).toBeTruthy();
    expect(
      script,
      `\`${NPM_SCRIPT}\` no longer runs \`--self-test\`. That half is what proves the ` +
        `analyzer still DETECTS; without it a scan that silently resolves nothing exits 0 ` +
        `and reads as a clean tree.`,
    ).toContain('--self-test');
    expect(script, `\`${NPM_SCRIPT}\` no longer runs the scan itself`).toContain(SCRIPT);
  });

  it('is invoked by the REQUIRED `test` job in CI', () => {
    const block = requiredGateBlock(readFileSync(WORKFLOW, 'utf-8'));
    expect(block, `no \`test:\` job found in ${WORKFLOW}`).not.toBe('');
    expect(
      block,
      'the required gate graph no longer runs the unit project either -- read this guard',
    ).toContain('--project=unit');
    expect(
      block,
      `the \`test\` job does not run \`${NPM_SCRIPT}\`, the only check that a Solid ` +
        `component cannot import the kai-* facade layer back and close a cycle.`,
    ).toContain(NPM_SCRIPT);
  });

  it('fires on an upward VALUE import, naming both layers and the line', () => {
    const root = fixtureRoot({
      'packages/ui/src/primitives/planted.ts': `import { sibling } from '../components/sibling';\n`,
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'an upward value import (primitives -> components) exited 0').not.toBe(0);
    expect(output).toContain('upward value import');
    expect(output).toContain('packages/ui/src/primitives/planted.ts:1');
    expect(output).toContain('primitives -> components');
  });

  it('passes a clean tree', () => {
    const { code, output } = runLinter(['--repo-root', fixtureRoot()]);
    expect(code, `a clean tree exited ${code}: ${output}`).toBe(0);
  });

  it('allows an upward TYPE-ONLY import, which is erased at build', () => {
    const root = fixtureRoot({
      'packages/ui/src/primitives/type-only.ts':
        `import type { A } from '../components/types';\n` +
        `import { type B } from '../components/types';\n`,
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, `a type-only upward import exited ${code}: ${output}`).toBe(0);
  });

  it('does not accept a bare marker as a waiver', () => {
    // The reason is mandatory. A marker-only waiver is how a guard ends up
    // exempting itself: lint-layer-names waived ITSELF once, because it matched
    // the marker string it defines.
    const root = fixtureRoot({
      'packages/ui/src/primitives/no-reason.ts':
        `import { sibling } from '../components/sibling'; // lint-layer-direction: allowed\n`,
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'a marker with no reason waived the line').not.toBe(0);
    expect(output).toContain('primitives -> components');
  });

  it('honours a LINE waiver with a reason, and its neighbour still fires', () => {
    const root = fixtureRoot({
      'packages/ui/src/primitives/waived.ts':
        `import { sibling } from '../components/sibling'; // lint-layer-direction: allowed -- the facade owns this bridge\n` +
        `import { base } from '../components/types';\n`,
    });
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'a waived line did not stop the neighbour from firing').not.toBe(0);
    expect(output).toContain('primitives/waived.ts:2');
    expect(output).not.toContain('primitives/waived.ts:1');
  });

  it('treats a walk that resolves nothing as a failure, not a pass', () => {
    // Both vacuity floors, because a scan that resolves nothing prints exactly
    // the clean line a tree with no violations prints.
    const small = runLinter(['--repo-root', fixtureRoot({}, 2)]);
    expect(small.code, 'a two-file walk exited 0').not.toBe(0);
    expect(small.output).toContain('has stopped scanning');

    // Same fixture, strong enough to walk, with its only relative import removed.
    const noImports = fixtureRoot({ 'packages/ui/src/wire/reads-utils.ts': `export const read = 1;\n` });
    const bare = runLinter(['--repo-root', noImports]);
    expect(bare.code, 'a tree that resolved no relative specifier exited 0').not.toBe(0);
    expect(bare.output).toContain('resolved NO relative specifier');
  });
});
