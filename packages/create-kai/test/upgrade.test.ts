import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generate } from '../src/generate';
import { planUpgrade, renderReport, runUpgrade, writableFiles } from '../src/upgrade';
import type { ProjectPlan } from '../src/types';

/**
 * `upgrade` re-diffs what the SCAFFOLDER wrote. The case that decides whether it is trustworthy is
 * the one where the user has edited a file: it must be reported and NOT replaced, while a file the
 * user never touched gets the template's new version. Both are exercised on REAL scaffolds, produced
 * by the same `generate()` the wizard calls.
 *
 * The fixtures use a COPY of the bundled templates, so a test can change the template under the
 * project's feet -- which is exactly what a release does to a scaffolded project.
 */

const TEMPLATE_ROOT = path.resolve(__dirname, '../dist/templates');
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

function templateCopy(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'upgrade-templates-'));
  cpSync(TEMPLATE_ROOT, root, { recursive: true });
  return root;
}

const plan = (dir: string): ProjectPlan => ({
  dir,
  name: 'my-app',
  frameworkId: 'react',
  layout: 'full-screen',
  widgetStyle: null,
  featureIds: ['conversations'],
  gatewayId: 'mock',
  kit: '^0.34.0',
  kitBuiltAgainst: '0.34.0',
});

/** A real scaffold in a temp dir, plus the template root it came from. */
async function scaffold(): Promise<{ cwd: string; templates: string; files: string[] }> {
  if (!existsSync(TEMPLATE_ROOT)) {
    throw new Error(`no templates at ${TEMPLATE_ROOT} — run \`pnpm --filter create-kai run build\` first`);
  }
  const templates = templateCopy();
  const cwd = mkdtempSync(path.join(tmpdir(), 'upgrade-project-'));
  const result = await generate(plan(cwd), { templateRoot: templates });
  return { cwd, templates, files: result.files };
}

const envFor = (cwd: string, templates: string) => {
  const out: string[] = [];
  const errors: string[] = [];
  return {
    out,
    errors,
    env: { cwd, kitRange: '^0.34.0', templateRoot: templates, out: (l: string) => out.push(l), error: (l: string) => errors.push(l) },
    text: () => out.join('\n'),
    errText: () => errors.join('\n'),
  };
};

describe('the baseline in kai.json', () => {
  it('records a hash for every emitted file except kai.json itself', async () => {
    const { cwd, files } = await scaffold();
    const kai = JSON.parse(readFileSync(path.join(cwd, 'kai.json'), 'utf8')) as {
      files?: Record<string, string>;
    };
    expect(kai.files, 'kai.json carries no baseline, which is what upgrade depends on').toBeTruthy();
    const recorded = Object.keys(kai.files ?? {}).sort();
    expect(recorded).toEqual(files.filter((f) => f !== 'kai.json').sort());
    expect(recorded, 'a file cannot hash its own content').not.toContain('kai.json');
  });

  it('hashes the bytes that are actually on disk', async () => {
    const { cwd, files } = await scaffold();
    const kai = JSON.parse(readFileSync(path.join(cwd, 'kai.json'), 'utf8')) as { files: Record<string, string> };
    for (const file of files.filter((f) => f !== 'kai.json')) {
      expect(kai.files[file], `${file} is not in the baseline`).toBe(sha256(readFileSync(path.join(cwd, file), 'utf8')));
    }
  });

  it('stops matching for a file the user edits afterwards', async () => {
    const { cwd } = await scaffold();
    const kai = JSON.parse(readFileSync(path.join(cwd, 'kai.json'), 'utf8')) as { files: Record<string, string> };
    const target = path.join(cwd, 'src/App.tsx');
    writeFileSync(target, `${readFileSync(target, 'utf8')}\n// mine\n`);
    expect(kai.files['src/App.tsx'], 'the baseline must not follow the edit').not.toBe(sha256(readFileSync(target, 'utf8')));
  });
});

describe('planUpgrade', () => {
  it('finds nothing to do in a freshly scaffolded project', async () => {
    const { cwd, templates } = await scaffold();
    const planned = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in planned) throw new Error(planned.error);
    expect(planned.report.baseline).toBe(true);
    expect(writableFiles(planned.report)).toEqual([]);
    expect(planned.report.files.every((f) => f.verdict === 'same')).toBe(true);
  });

  it('classifies an UNTOUCHED file as outdated when the template moves, and writes it', async () => {
    // The whole point: a release changes the template, and a file the user never touched should get
    // the new version. The project file still hashes to its baseline, which is what says so.
    const { cwd, templates } = await scaffold();
    const templateFile = path.join(templates, 'react/src/App.tsx');
    writeFileSync(templateFile, `${readFileSync(templateFile, 'utf8')}\n// a newer template\n`);

    const planned = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in planned) throw new Error(planned.error);
    const verdict = planned.report.files.find((f) => f.file === 'src/App.tsx');
    expect(verdict?.verdict, 'an untouched file must be safe to replace').toBe('outdated');
    expect(writableFiles(planned.report)).toContain('src/App.tsx');
  });

  it('classifies an EDITED file as edited, and never as writable', async () => {
    const { cwd, templates } = await scaffold();
    const projectFile = path.join(cwd, 'src/App.tsx');
    writeFileSync(projectFile, `${readFileSync(projectFile, 'utf8')}\n// my change\n`);
    const templateFile = path.join(templates, 'react/src/App.tsx');
    writeFileSync(templateFile, `${readFileSync(templateFile, 'utf8')}\n// a newer template\n`);

    const planned = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in planned) throw new Error(planned.error);
    const verdict = planned.report.files.find((f) => f.file === 'src/App.tsx');
    expect(verdict?.verdict).toBe('edited');
    expect(writableFiles(planned.report), 'an edited file must never be writable').not.toContain('src/App.tsx');
  });

  it('reports a deleted file as missing, and a file only the baseline knows as dropped', async () => {
    const { cwd, templates } = await scaffold();
    rmSync(path.join(cwd, 'src/index.css'));
    const planned = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in planned) throw new Error(planned.error);
    expect(planned.report.files.find((f) => f.file === 'src/index.css')?.verdict).toBe('missing');

    // A file the baseline recorded that today's template does not emit. Simulated by adding the
    // entry to the baseline rather than by deleting it from the template: the emitter PATCHES
    // template files, so a missing one makes it fail with ENOENT long before the comparison, which
    // would be testing the renderer rather than this classification.
    const kaiPath = path.join(cwd, 'kai.json');
    const kai = JSON.parse(readFileSync(kaiPath, 'utf8')) as { files: Record<string, string> };
    kai.files['src/legacy-view.ts'] = sha256('// a file the old template wrote\n');
    writeFileSync(kaiPath, `${JSON.stringify(kai, null, 2)}\n`);
    const second = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in second) throw new Error(second.error);
    expect(second.report.dropped).toContain('src/legacy-view.ts');
    // Nothing is DELETED for a dropped file: it is reported, and the project keeps it.
    writeFileSync(path.join(cwd, 'src/legacy-view.ts'), '// a file the old template wrote\n');
    const third = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in third) throw new Error(third.error);
    expect(existsSync(path.join(cwd, 'src/legacy-view.ts'))).toBe(true);
  });

  it('refuses --write for a project with no baseline, and says why', async () => {
    const { cwd, templates } = await scaffold();
    const kaiPath = path.join(cwd, 'kai.json');
    const kai = JSON.parse(readFileSync(kaiPath, 'utf8')) as Record<string, unknown>;
    delete kai.files;
    writeFileSync(kaiPath, `${JSON.stringify(kai, null, 2)}\n`);
    const projectFile = path.join(cwd, 'src/App.tsx');
    writeFileSync(projectFile, `${readFileSync(projectFile, 'utf8')}\n// my change\n`);

    const harness = envFor(cwd, templates);
    expect(await runUpgrade(['--write'], harness.env)).toBe(0);
    expect(harness.text()).toContain('no baseline');
    expect(readFileSync(projectFile, 'utf8'), 'nothing may be written without a baseline').toContain('// my change');
  });

  it('errors without a kai.json, naming the verbs that DO apply', async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'upgrade-none-'));
    writeFileSync(path.join(cwd, 'package.json'), '{ "name": "x" }\n');
    const harness = envFor(cwd, TEMPLATE_ROOT);
    expect(await runUpgrade([], harness.env)).toBe(1);
    expect(harness.errText()).toContain('no kai.json');
    expect(harness.errText()).toContain('kai init');
  });
});

describe('runUpgrade', () => {
  it('writes the outdated files, leaves the edited one, and reports both', async () => {
    const { cwd, templates } = await scaffold();
    const edited = path.join(cwd, 'src/App.tsx');
    writeFileSync(edited, `${readFileSync(edited, 'utf8')}\n// my change\n`);
    const untouched = path.join(cwd, 'src/main.tsx');
    for (const file of ['react/src/App.tsx', 'react/src/main.tsx']) {
      const p = path.join(templates, file);
      writeFileSync(p, `${readFileSync(p, 'utf8')}\n// a newer template\n`);
    }

    const harness = envFor(cwd, templates);
    expect(await runUpgrade(['--write'], harness.env)).toBe(0);
    expect(readFileSync(untouched, 'utf8'), 'the untouched file should have been updated').toContain('// a newer template');
    expect(readFileSync(edited, 'utf8'), 'the edited file must be exactly as the user left it').toContain('// my change');
    expect(readFileSync(edited, 'utf8')).not.toContain('// a newer template');
    expect(harness.text()).toContain('wrote src/main.tsx');
    expect(harness.text()).toContain('YOU edited this');
  });

  it('--strict exits non-zero on drift, so a CI job can gate on it', async () => {
    const { cwd, templates } = await scaffold();
    const templateFile = path.join(templates, 'react/src/App.tsx');
    writeFileSync(templateFile, `${readFileSync(templateFile, 'utf8')}\n// a newer template\n`);
    const harness = envFor(cwd, templates);
    expect(await runUpgrade(['--strict'], harness.env)).toBe(1);
    expect(await runUpgrade([], harness.env)).toBe(0);
  });

  it('--json carries the report and what was written', async () => {
    const { cwd, templates } = await scaffold();
    const harness = envFor(cwd, templates);
    expect(await runUpgrade(['--json', '--write'], harness.env)).toBe(0);
    const parsed = JSON.parse(harness.text()) as { files: unknown[]; wrote: string[]; baseline: boolean };
    expect(parsed.baseline).toBe(true);
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(parsed.wrote).toEqual([]);
  });

  it('renderReport names the verdicts in one line each, and only the interesting ones', async () => {
    const { cwd, templates } = await scaffold();
    const templateFile = path.join(templates, 'react/src/App.tsx');
    writeFileSync(templateFile, `${readFileSync(templateFile, 'utf8')}\n// newer\n`);
    const planned = await planUpgrade(envFor(cwd, templates).env);
    if ('error' in planned) throw new Error(planned.error);
    const lines: string[] = [];
    renderReport(planned.report, (l) => lines.push(l));
    const text = lines.join('\n');
    expect(text).toContain('^ src/App.tsx');
    expect(text).toContain('--write replaces 1 file(s)');
    expect(text, 'an already-current file is not worth a line').not.toContain('= src/');
  });
});
