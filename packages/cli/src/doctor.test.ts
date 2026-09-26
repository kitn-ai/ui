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

/**
 * THE PER-TAG DEFAULT'S ONE SILENT FAILURE. A scaffold now imports one entry per tag it places, so
 * a `<kai-*>` a consumer adds by hand with nothing registering it is an inert unknown element: no
 * error, no console line, no failed import, just empty chrome. These fixtures pin both directions
 * -- it fires on a placed tag nothing registers, and it stays quiet for the barrel, for the tag's
 * own entry, and for a tag merely NAMED (in a comment, in a mock message body) rather than placed.
 */
describe('diagnose: a placed <kai-*> tag nothing registers', () => {
  const app = (files: Record<string, string>) =>
    findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.35.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.35.0' }),
      ...files,
    });

  const unregistered = (list: ReturnType<typeof diagnose>) =>
    list.find((f) => f.title.includes('nothing registering'));

  it('warns with the tag, where it is placed, and the exact import line to add', () => {
    // kai-sources -> 'source' is the case that makes the manifest load-bearing: stripping
    // `kai-` would name an entry the kit does not build, which is the broken import this exists
    // to catch.
    const list = app({ 'src/widget.html': '<kai-sources id="sources"></kai-sources>\n' });
    const finding = unregistered(list);
    expect(finding?.severity, 'warn, not error: the app runs, it renders empty chrome').toBe('warn');
    expect(finding?.title).toContain('1 placed');
    expect(finding?.detail, 'the tag').toContain('<kai-sources>');
    expect(finding?.detail, 'the file that places it').toContain('src/widget.html');
    expect(finding?.detail, 'the line to add, naming the entry the app imports').toContain(
      "import '@kitn.ai/ui/web-components/source'",
    );
    expect(finding?.detail, 'and the barrel as the alternative').toContain(
      "register-all barrel '@kitn.ai/ui/web-components'",
    );
    expect(exitCodeFor(list), 'a warning does not fail the default run').toBe(0);
  });

  it('stays quiet for the barrel in every value-import form', () => {
    const registrations = [
      "import '@kitn.ai/ui/web-components';",
      'import "@kitn.ai/ui/web-components";',
      "import('@kitn.ai/ui/web-components');",
      'void import(\n  "@kitn.ai/ui/web-components",\n);',
      "import { toast } from '@kitn.ai/ui/web-components';",
    ];
    for (const registration of registrations) {
      const list = app({ 'src/widget.html': '<kai-sources></kai-sources>\n', 'src/main.ts': `${registration}\n` });
      expect(unregistered(list), `${registration} registers every tag`).toBeUndefined();
    }
  });

  it("stays quiet for the tag's own entry, in every entry form", () => {
    const registrations = [
      "import '@kitn.ai/ui/web-components/source';",
      'import "@kitn.ai/ui/web-components/source";',
      "void import('@kitn.ai/ui/web-components/source');",
    ];
    for (const registration of registrations) {
      const list = app({ 'src/widget.html': '<kai-sources></kai-sources>\n', 'src/main.ts': `${registration}\n` });
      expect(unregistered(list), `${registration} registers <kai-sources>`).toBeUndefined();
    }
  });

  it('does not read an `import type` of the barrel as a registration', () => {
    // Every emitted front end types a `ref` off the barrel and registers nothing with it
    // (mcp/mcp/tools/scaffold.ts:2489), so this is the shape the check must NOT go quiet on.
    const list = app({
      'src/widget.html': '<kai-sources id="sources"></kai-sources>\n',
      'src/refs.ts': "import type { KaiSourcesElement } from '@kitn.ai/ui/web-components';\n",
    });
    expect(unregistered(list), 'a type-only import defines no custom element').toBeTruthy();
  });

  it('reads el() and createElement() placements, not only markup', () => {
    const list = app({
      'src/view.ts': [
        "const sources = el('kai-sources');",
        "const picker = document.createElement('kai-scope-picker');",
      ].join('\n'),
    });
    const finding = unregistered(list);
    expect(finding?.title, 'two tags placed, one in the call form each').toContain('2 placed');
    expect(finding?.detail).toContain("import '@kitn.ai/ui/web-components/source'");
    expect(finding?.detail, 'never the tag minus its prefix').toContain(
      "import '@kitn.ai/ui/web-components/chat-scope-picker'",
    );
  });

  it('ignores a tag named in a comment, in every comment spelling', () => {
    const list = app({
      'src/main.ts': [
        '// <kai-sources> goes here when you wire sources',
        '/* <kai-voice-input> is the other one */',
        'const x = 1; // <kai-tool> once the model emits tool calls',
      ].join('\n'),
      'src/view.tsx': 'export const View = () => <div>{/* <kai-scope-picker /> */}</div>;\n',
      'src/notes.html': '<!-- <kai-artifact> is rendered inside a message -->\n',
    });
    expect(unregistered(list), 'a tag nothing places is not a finding').toBeUndefined();
  });

  it('reads a tag inside a string as data, not as a placement', () => {
    // The starters' mock conversation copy does exactly this
    // (examples/starters/vanilla/src/chat-data.ts:36), and a finding there would fire on every
    // starter this repo ships.
    const list = app({
      'src/chat-data.ts': "export const reply = { parts: [{ type: 'text', text: 'drop in `<kai-chat>` instead' }] };\n",
      'src/notes.ts': 'export const hint = "place <kai-sources> where the list renders";\n',
    });
    expect(unregistered(list)).toBeUndefined();
  });

  it('says nothing at all when the project places no kai-* tag', () => {
    const list = app({ 'src/main.ts': "import { Button } from '@kitn.ai/ui';\n" });
    expect(unregistered(list), 'anti-vacuity: no placements, no finding').toBeUndefined();
  });

  it('says nothing about a tag the kit has no per-tag entry for', () => {
    // No entry to name, so there is no line to add, and the map is generated from the same import
    // list the register-all barrel carries. A CLI older than the project's kit is the case where
    // that would be wrong, and doctor reports the skew as its own finding.
    expect(unregistered(app({ 'src/widget.html': '<kai-typo></kai-typo>\n' }))).toBeUndefined();
  });

  it('treats a tag the project defines itself as registered', () => {
    const list = app({
      'src/widget.html': '<kai-sources></kai-sources>\n',
      'src/own.ts': "customElements.define('kai-sources', class extends HTMLElement {});\n",
    });
    expect(unregistered(list)).toBeUndefined();
  });
});

describe('diagnose: rules read code, not the prose that describes the symptom', () => {
  const app = (files: Record<string, string>) =>
    findings({
      'package.json': JSON.stringify({ name: 'app', dependencies: { '@kitn.ai/ui': '^0.35.0' } }),
      'node_modules/@kitn.ai/ui/package.json': JSON.stringify({ name: '@kitn.ai/ui', version: '0.35.0' }),
      ...files,
    });

  // THE MEASURED REGRESSION. `kai doctor` on a freshly scaffolded vue app reported "Web components
  // not registered" at src/main.ts, about an app that registers every tag it places. Two signals
  // matched a rule written for a PASTED symptom report: the identifier `unregistered` and the call
  // `customElements.get(tag)` in the app's own upgrade gate, and the comment above that gate, which
  // explains what happens without an import ("renders a blank page").
  it('does not warn about a correct app whose own gate and comment describe the symptom', () => {
    const list = app({
      'src/main.ts': [
        "import '@kitn.ai/ui/web-components/chat';",
        '// Without the import above the tag never defines, the wait below never settles, and the',
        '// app renders a blank page with no error to show for it.',
        "const unregistered = ['kai-chat'].filter((tag) => !customElements.get(tag));",
        'if (unregistered.length > 0) throw new Error(`no entry import above registers: ${unregistered.join(", ")}`);',
      ].join('\n'),
    });
    expect(titles(list), 'a registered app reports no registration warning').not.toMatch(
      /Web components not registered/,
    );
  });

  it('still reads the code the rules exist for, and ignores the same pattern inside a comment', () => {
    const misuse = '<kai-chat messages="[...]"></kai-chat>\n';
    expect(titles(app({ 'src/widget.html': misuse })), 'real markup still fires').toMatch(/HTML attribute/);
    expect(
      titles(app({ 'src/widget.html': `<!-- example: ${misuse} -->\n` })),
      'the same markup inside a comment is an example, not usage',
    ).not.toMatch(/HTML attribute/);
  });
});
