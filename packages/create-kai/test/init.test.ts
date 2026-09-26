import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInit, parseInitArgs } from '../src/init';

/**
 * `init` makes an EXISTING project kai-aware. The cases below are the ones that decide whether it
 * is trustworthy in somebody else's repository: it must not invent a `kai.json`, must not disturb
 * dependencies that are already declared, must not guess when the framework is ambiguous, and must
 * name the file the wiring goes in from the FRAMEWORK's own `paths.entry` rather than from a table
 * typed here.
 */

/** A throwaway project, with a package.json the caller supplies. */
function project(pkg: Record<string, unknown> | null): string {
  const cwd = mkdtempSync(path.join(tmpdir(), 'init-'));
  if (pkg !== null) writeFileSync(path.join(cwd, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  return cwd;
}

function env(cwd: string, interactive = false) {
  const out: string[] = [];
  const errors: string[] = [];
  return {
    out,
    errors,
    env: {
      cwd,
      kitRange: '^0.34.0',
      interactive,
      io: { ask: async () => 'react' } as never,
      out: (line: string) => out.push(line),
      error: (line: string) => errors.push(line),
    },
    text: () => out.join('\n'),
    errText: () => errors.join('\n'),
  };
}

const pkg = (deps: Record<string, string>) => ({ name: 'app', version: '1.0.0', dependencies: deps });

describe('parseInitArgs', () => {
  it('reads --form, -y/--yes, and reports anything else', () => {
    expect(parseInitArgs(['--form', 'react']).form).toBe('react');
    expect(parseInitArgs(['-y']).yes).toBe(true);
    expect(parseInitArgs(['--yes']).yes).toBe(true);
    expect(parseInitArgs(['--form']).errors).toHaveLength(1);
    expect(parseInitArgs(['--nope']).errors[0]).toContain('unknown argument');
  });
});

describe('runInit', () => {
  it('detects the framework, adds the kit at the pin, and names the entry file from the framework defs', async () => {
    const cwd = project(pkg({ react: '^19.0.0' }));
    const harness = env(cwd);
    expect(await runInit([], harness.env)).toBe(0);

    const after = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    expect(after.dependencies['@kitn.ai/ui']).toBe('^0.34.0');
    expect(after.dependencies.react, 'the existing dependency must survive untouched').toBe('^19.0.0');

    // The entry path comes from FrameworkDef.paths.entry, so it moves with the defs.
    expect(harness.text()).toContain('Add to src/main.tsx');
    expect(harness.text()).toContain("import '@kitn.ai/ui/web-components'");
    expect(harness.text()).toContain("import '@kitn.ai/ui/theme.tokens.css'");
    expect(harness.text(), 'init must not claim to have written a kai.json').toContain('no kai.json');
  });

  it('leaves an existing kit dependency exactly as it is', async () => {
    const cwd = project(pkg({ '@kitn.ai/ui': '^0.30.0', react: '^19.0.0' }));
    const harness = env(cwd);
    expect(await runInit([], harness.env)).toBe(0);
    const after = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    expect(after.dependencies['@kitn.ai/ui']).toBe('^0.30.0');
    expect(harness.text()).toContain('already declared');
  });

  it('does NOT write a kai.json, and says why', async () => {
    const cwd = project(pkg({ react: '^19.0.0' }));
    const harness = env(cwd);
    await runInit([], harness.env);
    expect(() => readFileSync(path.join(cwd, 'kai.json'), 'utf8')).toThrow();
    // The reason is in the output, because a file somebody expected and did not get is worse than
    // a file they were told about.
    expect(harness.text()).toContain('records what the scaffolder emitted');
  });

  it('refuses a project with no package.json, and points at the from-scratch door', async () => {
    const cwd = project(null);
    const harness = env(cwd);
    expect(await runInit([], harness.env)).toBe(1);
    expect(harness.errText()).toContain('no readable package.json');
    expect(harness.errText()).toContain('npm create kai');
  });

  it('REFUSES an ambiguous detection non-interactively, naming the flags to pass', async () => {
    const cwd = project(pkg({ react: '^19.0.0', svelte: '^5.0.0' }));
    const harness = env(cwd, false);
    expect(await runInit([], harness.env)).toBe(1);
    expect(harness.errText()).toContain('react AND svelte');
    expect(harness.errText()).toContain('real question');
    // The message names the FRAMEWORKS in contention, not block forms: init wires for a framework,
    // and it emits no block, so the tree a block would land in is not its question.
    expect(harness.errText()).toContain('--form react');
    expect(harness.errText()).toContain('--form svelte');
  });

  it('takes --form over the detection, and rejects a form nobody has a tree for', async () => {
    const cwd = project(pkg({ react: '^19.0.0' }));
    const ok = env(cwd);
    expect(await runInit(['--form', 'html'], ok.env)).toBe(0);
    expect(ok.text()).toContain('Add to');

    const bad = env(cwd);
    expect(await runInit(['--form', 'nope'], bad.env)).toBe(1);
    expect(bad.errText()).toContain('is not one of');
  });

  it("prints the Solid wiring for the Solid form, from the starter's own shape", async () => {
    // examples/starters/solid imports the components from `@kitn.ai/ui/solid` and imports the kit's
    // sheet from its own CSS entry, so the guidance is a CSS import plus a component import rather
    // than the two side-effect lines every web-components starter carries.
    const cwd = project(pkg({ 'solid-js': '^1.9.0' }));
    const harness = env(cwd);
    expect(await runInit([], harness.env)).toBe(0);
    expect(harness.text()).toContain("@import \"@kitn.ai/ui/solid.css\";");
    expect(harness.text()).toContain("from '@kitn.ai/ui/solid'");
  });

  it('lands a project with no framework signal at all on the framework-neutral wiring', async () => {
    const cwd = project(pkg({}));
    const harness = env(cwd);
    expect(await runInit([], harness.env)).toBe(0);
    expect(harness.text()).toContain("import '@kitn.ai/ui/web-components'");
  });
});
