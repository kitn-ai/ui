import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { compareVersions, diagnose, exitCodeFor, render } from './doctor';

/**
 * `kai doctor` decides, so these tests assert the DECISIONS (severities and the exit code) rather
 * than the sentences. Three of them exist for a specific failure this repo has paid for:
 *   - the kit declared but not installed must be an error, not a warning: it is the one state in
 *     which every component import the user writes will fail;
 *   - a kit OLDER than the kit the CLI was built against is a warning, and a newer one is only
 *     info (a newer kit is not a problem, it is a CLI that lags);
 *   - "no kai.json" is INFO: a hand-built project is not broken, and a doctor that cried wolf on
 *     every non-scaffolded app is one nobody runs twice.
 */

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'kai-doctor-'));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, contents);
  }
  return root;
}

const CWD = '/tmp/does-not-exist';
const INPUT = { cwd: CWD, cliVersion: '0.1.0', builtAgainstKit: '0.33.0' };

const findings = (files: Record<string, string>, overrides: Partial<typeof INPUT> = {}) =>
  diagnose({ ...INPUT, cwd: project(files), ...overrides });

const titles = (list: ReturnType<typeof diagnose>) => list.map((f) => f.title).join('\n');

describe('compareVersions', () => {
  it('orders numerically, not as strings', () => {
    expect(compareVersions('0.9.0', '0.10.0')).toBe(-1);
    expect(compareVersions('0.33.0', '0.33.0')).toBe(0);
    expect(compareVersions('1.0.0', '0.99.9')).toBe(1);
  });

  it('sorts a prerelease below the release it precedes', () => {
    expect(compareVersions('0.33.0-rc.1', '0.33.0')).toBe(-1);
  });
});

describe('diagnose', () => {
  it('errors when there is no package.json at all, and says where to run it', () => {
    const list = diagnose(INPUT);
    expect(list).toHaveLength(1);
    expect(list[0]!.severity).toBe('error');
    expect(list[0]!.title).toContain('no package.json');
  });

  it('warns (does not error) when the project does not depend on the kit', () => {
    const list = findings({ 'package.json': JSON.stringify({ name: 'app', dependencies: { react: '19.0.0' } }) });
    expect(titles(list)).toContain('does not depend on @kitn.ai/ui');
    expect(exitCodeFor(list)).toBe(0);
  });

  it('errors when the kit is declared but not installed, because every import would fail', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.33.0' } }),
    });
    expect(titles(list)).toContain('declared but not installed');
    expect(exitCodeFor(list)).toBe(1);
  });

  it('warns when the installed kit is OLDER than the kit this CLI was built against', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.29.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.29.0' }),
      'src/main.ts': "import { Button } from '@kitn.ai/ui';",
    });
    expect(titles(list)).toContain('is older than the kit this CLI was built against');
    expect(exitCodeFor(list)).toBe(0);
  });

  it('only informs when the installed kit is NEWER than the CLI was built against', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.40.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.40.0' }),
      'src/main.ts': "import { Button } from '@kitn.ai/ui';",
    });
    expect(titles(list)).toContain('is newer than the one this CLI was built against');
    expect(list.find((f) => f.title.includes('newer'))?.severity).toBe('info');
  });

  it('warns when the dependency is declared but nothing under src/ references it', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.33.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.33.0' }),
      'src/main.ts': 'export const nothing = 1;',
    });
    expect(titles(list)).toContain('nothing under src/ references @kitn.ai/ui');
  });

  it('treats a missing kai.json as info, not a problem', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.33.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.33.0' }),
      'src/main.ts': "import { Button } from '@kitn.ai/ui';",
    });
    expect(list.find((f) => f.title.includes('kai.json'))?.severity).toBe('info');
    expect(exitCodeFor(list)).toBe(0);
  });

  it('reads kai.json when it is there, and reports the same version as built, not as a problem', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.33.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.33.0' }),
      'src/main.ts': "import { Button } from '@kitn.ai/ui';\nimport '@kitn.ai/ui/theme.tokens.css';",
      'kai.json': JSON.stringify({ framework: 'react', features: ['chat'], kitBuiltAgainst: '0.33.0' }),
    });
    expect(titles(list)).toContain('framework react');
    expect(exitCodeFor(list)).toBe(0);
  });

  it("runs the MCP debug tool's rules over the project's sources, naming the file", () => {
    // The rule set is the asset the agent-facing `debug` tool was built around. Before this, ONLY
    // an agent behind an MCP harness could reach it; the rule below is the classic one (array data
    // set as an HTML attribute), and the point of the case is that it is reported by a CLI verb now.
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.34.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.34.0' }),
      'src/widget.html': '<kai-chat messages="[]"></kai-chat>\n',
    });
    const rule = list.find((f) => f.title.includes('Array/object prop set as an HTML attribute'));
    expect(rule, 'the rule did not fire on a project whose source carries the mistake').toBeTruthy();
    expect(rule?.severity).toBe('warn');
    expect(rule?.detail, 'the finding must name the file to open').toContain('src/widget.html');
    expect(rule?.detail, 'and carry the fix the rule already knew').toContain('Set the property in JavaScript');
  });

  it('does not fire a rule on a project that does not carry it', () => {
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.34.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.34.0' }),
      'src/main.ts': "import { Button } from '@kitn.ai/ui';\nimport '@kitn.ai/ui/theme.tokens.css';\n",
    });
    expect(list.some((f) => f.title.includes('Array/object prop set as an HTML attribute'))).toBe(false);
  });

  it('--strict turns a warning into a failure, and the default does not', () => {
    const warnings = [{ severity: 'warn' as const, title: 'careful' }];
    expect(exitCodeFor(warnings)).toBe(0);
    expect(exitCodeFor(warnings, { strict: true })).toBe(1);
    expect(exitCodeFor([{ severity: 'error' as const, title: 'broken' }])).toBe(1);
    const lines: string[] = [];
    expect(render(warnings, (line) => lines.push(line), { strict: true })).toBe(1);
    expect(lines.join('\n')).toContain('fail this run');
  });

  it("reads kai.json's baseline and reports drift without rendering anything", () => {
    // The SAME recorded hashes `kai upgrade` uses, compared straight against the files on disk: no
    // template needed, which is why a doctor run stays instant. Drift is INFORMATION, not a
    // warning: editing your own app is the normal case, and `upgrade --strict` is where somebody
    // decides it should fail a build.
    const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
    const untouched = 'export const a = 1;\n';
    const mine = 'export const b = 2;\n// mine\n';
    const list = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.34.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.34.0' }),
      'src/main.ts': "import '@kitn.ai/ui/web-components';\n",
      'src/a.ts': untouched,
      'src/b.ts': mine,
      'kai.json': JSON.stringify({
        framework: 'react',
        features: [],
        kitBuiltAgainst: '0.34.0',
        files: {
          'src/a.ts': hash(untouched),
          'src/b.ts': hash('export const b = 2;\n'), // as scaffolded, before the user's line
          'src/gone.ts': hash('export const c = 3;\n'),
        },
      }),
    });
    const drift = list.find((f) => f.title.includes("baseline:"));
    expect(drift, 'doctor said nothing about the baseline').toBeTruthy();
    expect(drift?.severity, 'drift is information, not a problem').toBe('info');
    expect(drift?.title).toContain('1 of 3');
    expect(drift?.title).toContain('1 changed, 1 gone');
    expect(drift?.detail, 'the changed file must be named').toContain('src/b.ts');
    expect(drift?.detail, 'so must the one that is gone').toContain('src/gone.ts');
    expect(drift?.detail, 'and it must point at the verb that can act on it').toContain('kai upgrade');
  });

  it('says so when every scaffolded file still matches, and when there is no baseline at all', () => {
    const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
    const body = 'export const a = 1;\n';
    const clean = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.34.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.34.0' }),
      'src/main.ts': "import '@kitn.ai/ui/web-components';\n",
      'src/a.ts': body,
      'kai.json': JSON.stringify({ framework: 'react', features: [], kitBuiltAgainst: '0.34.0', files: { 'src/a.ts': hash(body) } }),
    });
    expect(clean.find((f) => f.title.includes('exactly as written'))?.severity).toBe('ok');

    const old = findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.34.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.34.0' }),
      'src/main.ts': "import '@kitn.ai/ui/web-components';\n",
      'kai.json': JSON.stringify({ framework: 'react', features: [], kitBuiltAgainst: '0.34.0' }),
    });
    const noBaseline = old.find((f) => f.title.includes('no baseline'));
    expect(noBaseline?.severity).toBe('info');
    expect(noBaseline?.detail).toContain('kai upgrade');
  });

  it('renders every finding with a severity mark and a one-line verdict', () => {
    const lines: string[] = [];
    const code = render(
      [
        { severity: 'ok', title: 'fine' },
        { severity: 'warn', title: 'careful', detail: 'why' },
        { severity: 'error', title: 'broken' },
      ],
      (line) => lines.push(line),
    );
    expect(code).toBe(1);
    expect(lines.join('\n')).toContain('✓ fine');
    expect(lines.join('\n')).toContain('! careful');
    expect(lines.join('\n')).toContain('✗ broken');
    expect(lines.join('\n')).toContain('1 problem(s), 1 warning(s)');
  });
});
