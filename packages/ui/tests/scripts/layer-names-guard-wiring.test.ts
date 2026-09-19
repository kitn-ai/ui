/**
 * GUARD — `lint:layer-names` still DETECTS, and CI still runs it.
 *
 * The guard itself fails when a retired name of the kai-* layer reappears: the
 * `@kitn.ai/ui/elements` subpath (in both spellings — a plain string, and the
 * `/`-escaped form a consumer's regex needs), `src/elements/`, `dist/elements/`,
 * `tests/elements/`, the four retired artifact file names, and three retired
 * public symbols. It exists because NOTHING ELSE catches a straggler:
 * `lint:cdn-pins` guards versions, not paths, so a doc writer copy-pasting last
 * month's snippet reintroduces a specifier that does not resolve and no build
 * step complains.
 *
 * This file exists because of HOW that guard would be lost. Not by someone
 * deleting it: by the `--self-test` half dropping off the npm script, by CI
 * dropping the step, or by the exemption for the dated archive outliving its
 * own explanation. All three make CI faster and greener while covering less.
 *
 * So the last assertions do not trust the script's own self-report. They RUN it
 * against synthesized trees and require the exit codes: non-zero for a tree
 * with a straggler, non-zero for a tree whose archive note is gone, zero for a
 * clean one.
 *
 * Watched failing, per assertion: deleting `--self-test` from the npm script
 * turns the second red; deleting the CI step turns the third red naming the job;
 * and making the analyzer skip `subpath specifier` turns the fourth red while
 * every other test in this suite stays green.
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
const SCRIPT = 'scripts/lint-layer-names.mjs';
const NPM_SCRIPT = 'lint:layer-names';

const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf-8')) as {
  scripts: Record<string, string>;
};

const NOTE = `# Docs\n\nThe kai-* layer is called web components.\n\nlint-layer-names: archive-note\n`;

/** A throwaway repo root the linter can be pointed at with `--repo-root`. */
function fixtureRoot(extra: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'layer-names-guard-'));
  const files: Record<string, string> = {
    'docs/README.md': NOTE,
    'packages/ui/src/web-components/chat/chat.tsx': `export const ready = webComponentsReady;\n`,
    ...extra,
  };
  // The vacuity floor is 100 files; pad so a fixture exercises the REAL scan
  // rather than tripping the "stopped scanning" fatal.
  for (let i = 0; i < 120; i++) files[`packages/ui/src/web-components/f${i}.ts`] = `export const n${i} = 1;\n`;
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

describe('the layer-name guard detects, and CI runs it', () => {
  it('ships the linter', () => {
    expect(existsSync(resolve(pkgRoot, SCRIPT)), `${SCRIPT} is missing`).toBe(true);
  });

  it('`lint:layer-names` runs the self-test half as well as the scan', () => {
    const script = pkg.scripts[NPM_SCRIPT];
    expect(script, `no \`${NPM_SCRIPT}\` script in packages/ui/package.json`).toBeTruthy();
    expect(
      script,
      `\`${NPM_SCRIPT}\` no longer runs \`--self-test\`. That half is what proves the ` +
        `analyzer still DETECTS; without it a scan that silently matches nothing exits 0 ` +
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
      `the \`test\` job does not run \`${NPM_SCRIPT}\`, the only check that the retired ` +
        `spelling of the kai-* layer cannot come back in a doc, a scaffold or a comment.`,
    ).toContain(NPM_SCRIPT);
  });

  it('actually fires on a retired specifier, in both spellings', () => {
    // The literal that shipped in config/vite/react.ts before the rename: the
    // `/`-escaped form inside a regex, which a plain-string sweep cannot see.
    for (const line of [
      `import { toast } from '@kitn.ai/ui/elements';\n`,
      `      aliasesExclude: [/^@kitn\\.ai\\/ui\\/elements$/],\n`,
    ]) {
      const { code, output } = runLinter(['--repo-root', fixtureRoot({ 'packages/ui/src/planted.ts': line })]);
      expect(code, `the linter exited 0 on ${line.trim()}`).not.toBe(0);
      expect(output).toContain('subpath specifier');
      expect(output).toContain('packages/ui/src/planted.ts:1');
    }
  });

  it('fires on a retired directory and a retired symbol', () => {
    const dir = runLinter(['--repo-root', fixtureRoot({ 'apps/docs/x.mdx': `see src/elements/chat.tsx\n` })]);
    expect(dir.code, 'src/elements/ did not fire').not.toBe(0);
    expect(dir.output).toContain('source directory');

    const sym = runLinter(['--repo-root', fixtureRoot({ 'packages/ui/src/await.ts': `await elementsReady;\n` })]);
    expect(sym.code, 'elementsReady did not fire').not.toBe(0);
    expect(sym.output).toContain('retired public symbol');
  });

  it('passes a clean tree, and exempts the dated archive', () => {
    const { code, output } = runLinter([
      '--repo-root',
      fixtureRoot({
        'apps/docs/clean.mdx': `import '@kitn.ai/ui/web-components';\n`,
        'docs/superpowers/plans/2026-01-01-old.md': `we shipped @kitn.ai/ui/elements and src/elements/chat.tsx\n`,
      }),
    ]);
    expect(code, `a clean tree exited ${code}: ${output}`).toBe(0);
  });

  it('fails when the archive exemption loses its explanation', () => {
    // The exemption is conditional. Without docs/README.md saying what happened
    // to the old name, a reader meeting `@kitn.ai/ui/elements` in a dated plan
    // concludes it is current -- so the guard refuses to let the note go.
    const root = fixtureRoot();
    writeFileSync(join(root, 'docs/README.md'), `# Docs\n\nlint-layer-names: archive-note\n`);
    const { code, output } = runLinter(['--repo-root', root]);
    expect(code, 'an emasculated archive note exited 0').not.toBe(0);
    expect(output).toContain('no longer contains');
  });
});
