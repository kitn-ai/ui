/**
 * THE ADD MENU MUST ONLY OFFER WHAT ADD CAN WRITE - `menu-honesty.test.ts`'s
 * rule applied to the block registry. The subject is the registry the CLI
 * actually ships (`dist/blocks`, the same copy `node dist/index.js add` walks),
 * and every block it lists is driven through the REAL `runAdd` path into a
 * real temp project, in every delivery form: the web-component form, the react
 * form, and the no-project CDN paste form. A block that resolves but cannot be
 * written fails here whether or not anyone remembered to add a case for it,
 * and a block directory added later is covered on arrival.
 *
 * Also here: the detection signals table row by row (spec Part 3's ruling -
 * asked loudly when ambiguous, refused with names under --yes), collision
 * refusal, per-block item JSON URL resolution through an injected fetch, and
 * the react transforms' own refusals.
 */
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildRegistryItem, unsafeFilePathReason, unsafeNameReason, validateBlockManifest } from '@kitn.ai/blocks';
import type { Axis } from '../src/axes';
import {
  FRAMEWORK_SIGNALS,
  declaredMockFiles,
  detectForm,
  loadBlocks,
  planAdd,
  resolveAdd,
} from '../src/blocks';
import type { AddMode, AddPlan, Block } from '../src/blocks';
import { WIRED_GATEWAYS, listIntegrations } from '../src/catalog';
import { componentName } from '../src/react-form';
import { BLOCK_FORMS, FRAMEWORK_BLOCK_FORMS, README_FILE, withStrippedTwins } from '@kitn.ai/blocks/forms';
import { fileTarget, installRoot, isTargetFramework } from '@kitn.ai/blocks/targets';
import { ADD_HELP, decideForm, mergeDependencies, parseAddArgs, runAdd } from '../src/add';
import type { AddEnv } from '../src/add';
import { BLOCKS_ROOT, KIT_RANGE, KIT_VERSION, authoredBlock, loadBundledBlocks } from './helpers';

let root: string;
let blocks: Block[];

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'create-kai-add-'));
  blocks = await loadBundledBlocks();
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

interface Run {
  code: number;
  out: string[];
  err: string[];
  asked: Axis[];
}

async function runInto(
  dir: string,
  argv: string[],
  over: Partial<AddEnv> & { answer?: string } = {},
): Promise<Run> {
  const out: string[] = [];
  const err: string[] = [];
  const asked: Axis[] = [];
  const code = await runAdd(argv, {
    cwd: dir,
    blocksRoot: BLOCKS_ROOT,
    kitRange: KIT_RANGE,
    kitVersion: KIT_VERSION,
    interactive: false,
    io: {
      ask: async (axis) => {
        asked.push(axis);
        return over.answer ?? axis.options[0].id;
      },
      state: () => {},
    },
    out: (line) => out.push(line),
    error: (line) => err.push(line),
    ...over,
  });
  return { code, out, err, asked };
}

/** A fresh project directory with the given package.json, or none. */
async function project(id: string, pkg: object | null): Promise<string> {
  const dir = path.join(root, id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  if (pkg !== null) await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  return dir;
}

/**
 * A block authored ON the contract that also ships a scripted mock, so the data
 * axis has something real to resolve. `importsMock` writes the controller the
 * shipped blocks write today (`from './mock'`); the default writes the
 * mock-free controller a block needs before `--no-mock` can install it.
 *
 * Synthetic on purpose, the same reason `authoredBlock` is: a case about the
 * data axis should not also be a case about whichever authored block happens to
 * declare a mock, and the bundled tree is a BUILD artifact - the authored
 * manifest edits below reach it only after a build.
 */
function mockBlock(
  name: string,
  opts: { importsMock?: boolean; manifest?: Partial<Block['manifest']> } = {},
): Block {
  // The fixture's gateway list: what the caller declared, or the `openrouter`
  // the default declaration spells. A caller whose `wiring` declares no gateway
  // (the `no-route` case) keeps that - the fixture must not invent a capability
  // the case is testing the absence of.
  const gateways = opts.manifest?.wiring ? (opts.manifest.wiring.gateways ?? []) : ['openrouter'];
  // The helpers build the seam from this gateway declaration, so
  // `modeTarget`/`real`/`none` are the one spelling they own. A caller-declared
  // `wiring` is dropped rather than merged, because a half-declared one is the
  // defect the validator now refuses; only its `gateways`/`mockFiles` survive.
  const base = authoredBlock(name, { ...callerManifest(opts.manifest), wiring: { gateways } });
  const mock = 'export const MOCK_SCRIPT = [];\n';
  const importer = opts.importsMock ? `import { MOCK_SCRIPT } from './mock';\n` : '';
  const files = new Map(base.files);
  files.set('mock.ts', mock);
  files.set('mock.js', mock);
  for (const twin of [`${name}.controller.ts`, `${name}.controller.js`]) {
    files.set(twin, importer + (files.get(twin) ?? ''));
  }
  return {
    name,
    files,
    manifest: {
      ...base.manifest,
      // `mock.ts` is a files[] entry AND declared mock-only: the first half is
      // what ships it in mock mode, the second is what a mock-free mode drops.
      files: [...base.manifest.files, { path: 'mock.ts', type: 'registry:file' }],
      // The data axis, declared rather than resolved: the file the default mode
      // ships and the one integration `--gateway` may name. This fixture's mock
      // IS the seam's `mock` source (the shape the assistant block ships), so
      // the seam names `mock.ts` for both fields and keeps the base block's
      // derived `modeTarget`/`real`/`none`. A block advertising a gateway must
      // ship the seam that makes it real; a block advertising none ships it too,
      // because it is the same one controller.
      wiring: {
        gateways,
        mockFiles: opts.manifest?.wiring?.mockFiles ?? ['mock.ts'],
        // Derived from the base block the helper built, never restated here.
        modeTarget: base.manifest.wiring?.modeTarget,
        modeFiles: { ...base.manifest.wiring?.modeFiles, mock: 'mock.ts' },
      },
    },
  };
}

/** A caller's manifest fields, minus any `wiring`: the helpers own that field. */
function callerManifest(manifest?: Partial<Block['manifest']>): Partial<Block['manifest']> {
  if (!manifest?.wiring) return manifest ?? {};
  const fields = { ...manifest };
  delete fields.wiring;
  return fields;
}

/** The resolve + plan pair `runAdd` performs, without a filesystem. */
async function planFor(
  spec: Block,
  form: 'html' | 'react' | 'cdn',
  wiring?: AddMode,
): Promise<{ plan?: AddPlan; error?: string }> {
  try {
    const resolved = await resolveAdd(
      [spec.name],
      {
        local: (name) => (name === spec.name ? spec : undefined),
        fetchItem: async () => { throw new Error('no fetch expected'); },
      },
      wiring,
    );
    return { plan: planAdd(resolved, { form, kitRange: KIT_RANGE, kitVersion: KIT_VERSION, wiring }) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** A working `blocks/<id>/` directory for one authored block, for `loadBlocks`.
 *  The `.js` twin is written beside every `.ts` the manifest lists, which is
 *  what the real build does (and what the html form reads). */
async function writeBlockTree(dir: string, specs: readonly Block[]): Promise<string> {
  for (const block of specs) {
    const blockDir = path.join(dir, block.name);
    await mkdir(blockDir, { recursive: true });
    for (const entry of block.manifest.files) {
      await writeFile(path.join(blockDir, entry.path), block.files.get(entry.path) as string, 'utf8');
      if (!entry.path.endsWith('.ts')) continue;
      const twin = entry.path.replace(/\.ts$/, '.js');
      if (block.files.has(twin)) await writeFile(path.join(blockDir, twin), block.files.get(twin) as string, 'utf8');
    }
    await writeFile(path.join(blockDir, 'registry-item.json'), JSON.stringify(block.manifest, null, 2), 'utf8');
  }
  return dir;
}

/** The basename of every planned path, so a case can ask "is a mock in here". */
const mockPathsIn = (paths: readonly string[]): string[] =>
  paths.filter((file) => /(^|\/)mock\.[jt]s$/.test(file));

describe('the registry the CLI ships is the directory scan, derived not typed', () => {
  it('lists exactly the dist/blocks directories', async () => {
    const dirs = (await readdir(BLOCKS_ROOT, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(blocks.map((b) => b.name)).toEqual(dirs);
    expect(dirs.length, 'no blocks at all - every loop below is vacuous').toBeGreaterThan(0);
  });

  it('`add --list` prints every block and a derived count', async () => {
    const run = await runInto(root, ['--list']);
    expect(run.code).toBe(0);
    for (const block of blocks) {
      expect(run.out.some((line) => line.includes(block.name)), `--list omits ${block.name}`).toBe(true);
    }
    expect(run.out.at(-1)).toContain(`${blocks.length} block`);
  });
});

describe('every listed block writes through the real add path, in every form', () => {
  it('has blocks to drive, so the loops below are not vacuous', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  for (const name of ['support-widget', 'assistant', 'in-app-assistant']) {
    // The roster is NOT the subject (the derived loops below are); it pins
    // that each named block stays enrolled. It asserted only `support-widget`
    // while the other two were unconverted, so it read as three checks and was
    // one; the contract is mandatory now and all three are real.
    it(`still ships ${name} or this file's assumptions moved`, () => {
      expect(blocks.map((b) => b.name)).toContain(name);
    });
  }
});

describe('web-component form (any non-react project)', () => {
  // EVERY bundled block, with no predicate in front of it: the contract is
  // mandatory, so a block that resolves is a block the html form renders. The
  // refusal a consumer meets with an unconverted block has its own case at the
  // end of this describe, driven by a fetched item.
  const all = () => blocks;

  it('has blocks to drive, so the loops below are not vacuous', () => {
    expect(all().length).toBeGreaterThan(0);
  });

  it('writes every manifest file and pins the kit', async () => {
    for (const block of all()) {
      const dir = await project(`wc-${block.name}`, { name: 'host', dependencies: { vue: '^3.0.0' } });
      const run = await runInto(dir, [block.name]);
      expect(run.code, run.err.join('\n')).toBe(0);
      // The html form's OWN file list, not the manifest's: the authored
      // `.ts` sources are shipped as their stripped `.js` twins and the entry
      // script is generated, so the manifest is no longer the write list.
      const planned = planAdd({ blocks: [block], routes: [] }, { form: 'html', kitRange: KIT_RANGE, kitVersion: KIT_VERSION }).files;
      expect(planned.length, `${block.name}: the html form planned nothing`).toBeGreaterThan(0);
      for (const file of planned) {
        expect(existsSync(path.join(dir, file.path)), `${block.name}: ${file.path} not written`).toBe(true);
      }
      const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
      expect(pkg.dependencies['@kitn.ai/ui']).toBe(KIT_RANGE);
      if (block.manifest.docs) {
        expect(run.out.join('\n')).toContain(block.manifest.docs);
      }
    }
  });

  it('the emitted binder signals readiness and awaits registration, at module scope', async () => {
    // This case used to assert an IIFE wrap (`(async () => {`) around the
    // AUTHORED entry script, so that nothing awaited at module scope through
    // a consumer bundler. The authored entry script is gone: the binder is
    // GENERATED, and it awaits registration and boot() at module scope
    // deliberately, ending with the driver's one readiness constant. So the
    // subject moves to what the generated file must actually contain.
    for (const block of all()) {
      const dir = await project(`binder-${block.name}`, { name: 'host' });
      expect((await runInto(dir, [block.name])).code).toBe(0);
      const binder = await readFile(path.join(dir, fileTarget('html', block.name, `${block.name}.js`)), 'utf8');
      expect(binder, `${block.name}: no whenDefined await`).toContain('customElements.whenDefined');
      expect(binder, `${block.name}: no controller call`).toContain('createController');
      expect(binder, `${block.name}: no readiness signal`).toContain('window.__blockReady = true;');
    }
  });

  it('renders registration per delivery: emitted scripts never import the CDN-only autoloader', async () => {
    // The autoloader resolves element modules relative to its own URL, so a
    // bundled project 404s every element and renders nothing - observed live
    // before this rewrite existed. The CDN paste form keeps it (its native
    // pattern); both add forms must not.
    for (const block of all()) {
      const wcDir = await project(`reg-wc-${block.name}`, { name: 'host' });
      const reactDir = await project(`reg-react-${block.name}`, { name: 'host', dependencies: { react: '19' } });
      expect((await runInto(wcDir, [block.name])).code).toBe(0);
      expect((await runInto(reactDir, [block.name])).code).toBe(0);
      for (const base of [
        path.join(wcDir, installRoot('html', block.name)),
        path.join(reactDir, installRoot('react', block.name)),
      ]) {
        for (const file of (await readdir(base)).filter((f) => f.endsWith('.js'))) {
          const js = await readFile(path.join(base, file), 'utf8');
          expect(js, `${base}/${file} still imports the autoloader`).not.toContain(`'@kitn.ai/ui/autoloader'`);
        }
      }
    }
  });

  it('refuses a second add loudly, listing the collisions, overwriting nothing', async () => {
    const block = all()[0];
    const dir = await project('collide', { name: 'host' });
    expect((await runInto(dir, [block.name])).code).toBe(0);
    const page = block.manifest.files.find((f) => f.type === 'registry:page')!;
    const pagePath = path.join(dir, fileTarget('html', block.name, page.target ?? path.basename(page.path)));
    await writeFile(pagePath, 'EDITED BY THE CONSUMER');
    const second = await runInto(dir, [block.name]);
    expect(second.code).toBe(1);
    expect(second.err.join('\n')).toContain('refusing to overwrite');
    expect(second.err.join('\n')).toContain(fileTarget('html', block.name, page.target ?? path.basename(page.path)));
    expect(await readFile(pagePath, 'utf8')).toBe('EDITED BY THE CONSUMER');
  });

  it('refuses a block that is not on the authored contract, by name', async () => {
    // NOT transitional. Every bundled block is converted now, so this drives
    // the door a consumer would actually meet an old block through: a fetched
    // item JSON whose page still carries its own entry script. The refusal has
    // to name the file the wiring belongs in, or the consumer is told only
    // that something is wrong. (`dev.test.ts` keeps a synthetic fixture for
    // the same reason.)
    const item = {
      name: 'legacy-block',
      title: 'Legacy block',
      description: 'a block authored before the contract, as a consumer might still fetch one',
      type: 'registry:block',
      files: [
        {
          path: 'legacy-block.html',
          type: 'registry:page',
          content:
            '<!doctype html>\n<html lang="en"><head></head><body><kai-thread id="t"></kai-thread>'
            + '<script type="module" src="./legacy-block.js"></scr' + 'ipt></body></html>\n',
        },
        { path: 'legacy-block.js', type: 'registry:file', content: "document.getElementById('t').messages = [];\n" },
      ],
    };
    const dir = await project('html-legacy', { name: 'host', dependencies: { vue: '^3.0.0' } });
    const run = await runInto(dir, ['https://registry.example/r/legacy-block.json', '--form', 'html'], {
      fetchJson: async () => JSON.parse(JSON.stringify(item)),
    });
    expect(run.code, 'expected a refusal').toBe(1);
    expect(run.err.join('\n')).toContain('legacy-block');
    expect(run.err.join('\n')).toContain('controller.ts');
  });

  it('prints the README it just wrote, and prints the docs sentence exactly once', async () => {
    // The README is what a consumer reads to find out what the block needs.
    // Writing it and not printing it makes the terminal end on a file list.
    for (const block of all()) {
      const dir = await project(`readme-${block.name}`, { name: 'host', dependencies: { vue: '^3.0.0' } });
      const run = await runInto(dir, [block.name]);
      expect(run.code, run.err.join('\n')).toBe(0);
      const written = await readFile(path.join(dir, fileTarget('html', block.name, README_FILE)), 'utf8');
      const printed = run.out.join('\n');
      for (const line of written.trimEnd().split('\n').filter((l) => l.trim())) {
        expect(printed, `${block.name}: the README line "${line}" was written but not printed`).toContain(line);
      }
      if (block.manifest.docs) {
        const hits = printed.split(block.manifest.docs).length - 1;
        expect(hits, `${block.name}: the docs sentence appears ${hits} times`).toBe(1);
      }
    }
  });
});

describe('react form (react in the project deps)', () => {
  const all = () => blocks;

  it('writes the component, the hook and the controller for every block; never the page html', async () => {
    expect(all().length).toBeGreaterThan(0);
    for (const block of all()) {
      const dir = await project(`react-${block.name}`, { name: 'host', dependencies: { react: '^19.0.0' } });
      const run = await runInto(dir, [block.name]);
      expect(run.code, `${block.name}: ${run.err.join('\n')}`).toBe(0);
      const base = path.join(dir, installRoot('react', block.name));
      const tsx = await readFile(path.join(base, `${componentName(block.name)}.tsx`), 'utf8');
      expect(tsx).toContain("from '@kitn.ai/ui/react'");
      expect(tsx).toContain(`export function ${componentName(block.name)}()`);
      expect(tsx).toContain(`from './use${componentName(block.name)}'`);
      expect(tsx).toContain('className=');
      expect(tsx).not.toMatch(/<script\b/);
      expect(tsx).not.toContain(' class="');
      expect(existsSync(path.join(base, 'kai-web-components.d.ts'))).toBe(false);
      expect(existsSync(path.join(base, `use${componentName(block.name)}.ts`))).toBe(true);
      expect(existsSync(path.join(base, `${block.name}.controller.ts`))).toBe(true);
      const page = block.manifest.files.find((f) => f.type === 'registry:page')!;
      expect(existsSync(path.join(base, page.target ?? path.basename(page.path)))).toBe(false);
    }
  });

  it('refuses a second add at the NEW root too, overwriting nothing', async () => {
    // The collision refusal is whole-plan and unchanged by this PR, but it had
    // no react case at all, and the root it guards just moved. A refusal that
    // silently stopped matching would look exactly like a clean first add.
    const block = all()[0];
    const dir = await project('react-collide', { name: 'host', dependencies: { react: '^19.0.0' } });
    expect((await runInto(dir, [block.name])).code).toBe(0);
    const component = fileTarget('react', block.name, `${componentName(block.name)}.tsx`);
    await writeFile(path.join(dir, component), 'EDITED BY THE CONSUMER');
    const second = await runInto(dir, [block.name]);
    expect(second.code).toBe(1);
    expect(second.err.join('\n')).toContain('refusing to overwrite');
    expect(second.err.join('\n')).toContain(component);
    expect(await readFile(path.join(dir, component), 'utf8')).toBe('EDITED BY THE CONSUMER');
  });
});

describe('no project: the CDN paste form (rule 1 of the signals table)', () => {
  it('writes a self-contained pinned html file and points at the wizard', async () => {
    const block = blocks.find((b) => (b.manifest.registryDependencies ?? []).every((d) => d.startsWith('route:')))!;
    const dir = await project('cdn-case', null);
    const run = await runInto(dir, [block.name]);
    expect(run.code, run.err.join('\n')).toBe(0);
    expect(run.out.join('\n')).toContain('No project here');
    expect(run.out.join('\n')).toContain('npm create kai@latest');
    const html = await readFile(path.join(dir, `${block.name}.html`), 'utf8');
    expect(html).toContain(`https://cdn.jsdelivr.net/npm/@kitn.ai/ui@${KIT_VERSION}/dist/`);
    expect(html).not.toMatch(/src="\.\//);
    expect(html).not.toMatch(/href="\.\//);
  });

  it('still prints docs for the paste form, which carries no README', async () => {
    const block = blocks.find((b) => (b.manifest.registryDependencies ?? []).every((d) => d.startsWith('route:')))!;
    const dir = await project('cdn-docs', null);
    const run = await runInto(dir, [block.name]);
    expect(run.code).toBe(0);
    expect(existsSync(path.join(dir, 'README.md')), 'the paste form wrote a README').toBe(false);
    if (block.manifest.docs) expect(run.out.join('\n')).toContain(block.manifest.docs);
  });
});

describe('the detection signals table, row by row', () => {
  it('no package.json is rule 1: the cdn form', async () => {
    const decided = await decideForm(undefined, null, false, false, { ask: async () => 'x', state: () => {} });
    expect(decided.form).toBe('cdn');
  });

  it('has signal rows to drive, so the loop below is not vacuous', () => {
    expect(FRAMEWORK_SIGNALS.length).toBeGreaterThan(0);
  });

  for (const signal of FRAMEWORK_SIGNALS) {
    // The EXPECTATION is derived from the same place the code derives it: a
    // framework lands in its own tree when the generator emits one, and in the
    // framework-neutral html form until then. PR B2 moves both sides at once.
    const emits = FRAMEWORK_BLOCK_FORMS.some((form) => form.id === signal.framework);
    const expected = emits ? signal.framework : 'html';

    it(`${signal.dep} alone lands on ${expected}`, () => {
      const detection = detectForm({ dependencies: { [signal.dep]: '1.0.0' } });
      expect(detection.kind).toBe('detected');
      expect(detection.kind === 'detected' && detection.form).toBe(expected);
    });

    it(`${signal.dep}: the fallback is named when this release generates no ${signal.framework ?? 'framework'} tree`, () => {
      const detection = detectForm({ dependencies: { [signal.dep]: '1.0.0' } });
      if (detection.kind !== 'detected') throw new Error('expected a detection');
      // `null` means the framework has no tree of its own and never will
      // (preact renders web components like any other host), so it is not a
      // fallback to announce.
      expect(detection.fallback).toEqual(emits || signal.framework === null ? [] : [signal.framework]);
    });
  }

  it('every framework a signal names has an install root', () => {
    for (const signal of FRAMEWORK_SIGNALS) {
      if (signal.framework === null) continue;
      expect(isTargetFramework(signal.framework), signal.framework).toBe(true);
    }
  });

  it('a project with no framework signal at all is still a project: web components', () => {
    const detection = detectForm({ dependencies: { express: '^4.0.0' } });
    expect(detection).toEqual({ kind: 'detected', form: 'html', found: [], fallback: [] });
  });

  it('devDependencies count as signals too', () => {
    expect(detectForm({ devDependencies: { react: '^19.0.0' } }).kind).toBe('detected');
  });

  it('two signals that decide DIFFERENT forms are ambiguous, with what was found named', () => {
    // react always has its own tree; svelte does not until PR B2. Whichever is
    // true, these two decide different forms, which is what makes it a
    // question worth asking.
    const detection = detectForm({ dependencies: { react: '1', svelte: '4' } });
    expect(detection.kind).toBe('ambiguous');
    expect(detection.kind === 'ambiguous' && detection.found).toEqual(['react', 'svelte']);
  });

  it('two signals that decide the SAME form are not a question at all', () => {
    // Today vue and svelte both land on html, so there is nothing to choose
    // and asking would be noise. When B2 emits both trees they start deciding
    // different forms and this case flips on its own - which is why the
    // expectation is derived rather than written.
    const forms = new Set(['vue', 'svelte'].map((dep) => {
      const d = detectForm({ dependencies: { [dep]: '1' } });
      return d.kind === 'detected' ? d.form : 'ambiguous';
    }));
    const detection = detectForm({ dependencies: { vue: '3', svelte: '4' } });
    expect(detection.kind).toBe(forms.size === 1 ? 'detected' : 'ambiguous');
  });

  it('ambiguous + interactive ASKS through the axis seam, offering only the forms in contention', async () => {
    const asked: Axis[] = [];
    const decided = await decideForm(
      undefined,
      { dependencies: { react: '1', svelte: '4' } },
      true,
      true,
      { ask: async (axis) => { asked.push(axis); return axis.options[axis.options.length - 1].id; }, state: () => {} },
    );
    expect(asked).toHaveLength(1);
    expect(asked[0].question).toContain('react AND svelte');
    expect(asked[0].options.length).toBeGreaterThan(1);
    // MENU HONESTY: every option offered is a form the generator emits.
    for (const option of asked[0].options) {
      expect(BLOCK_FORMS.map((f) => f.id), `offered '${option.id}'`).toContain(option.id);
    }
    expect(asked[0].because.length, 'an axis with an empty `because` cannot be stated').toBeGreaterThan(0);
    expect(decided.form).toBe(asked[0].options[asked[0].options.length - 1].id);
  });

  it('ambiguous + non-interactive REFUSES with the flag to pass, never guesses', async () => {
    const decided = await decideForm(
      undefined,
      { dependencies: { react: '1', svelte: '4' } },
      true,
      false,
      { ask: async () => { throw new Error('must not ask under --yes'); }, state: () => {} },
    );
    expect(decided.form).toBeUndefined();
    expect(decided.error).toContain('react AND svelte');
    expect(decided.error).toContain('--form');
  });

  it('a --form flag answers the axis without asking, like every other flag', async () => {
    const decided = await decideForm('html', { dependencies: { react: '1' } }, true, true, {
      ask: async () => { throw new Error('flag given, must not ask'); },
      state: () => {},
    });
    expect(decided.form).toBe('html');
  });

  it('a framework with no generated tree is told so, loudly, in one sentence', async () => {
    // Decided loudly: landing a vue project on the html form is a decision,
    // and making it silently is the failure mode this repo names most often.
    const decided = await decideForm(undefined, { dependencies: { vue: '3' } }, true, false, {
      ask: async () => { throw new Error('not ambiguous, must not ask'); },
      state: () => {},
    });
    // Cast to a plain string comparison: today's BlockFormId union has no
    // 'vue' member at all, so a literal comparison against it is a compile
    // error rather than a false condition. Step 6 plants a real 'vue' row and
    // this widened check is what lets the SAME line answer true on both sides
    // of that plant with nothing here to edit.
    const emitsVue = (FRAMEWORK_BLOCK_FORMS as readonly { id: string }[]).some((form) => form.id === 'vue');
    if (emitsVue) {
      expect(decided.form).toBe('vue');
      expect(decided.note).toBeUndefined();
    } else {
      expect(decided.form).toBe('html');
      expect(decided.note).toContain('vue');
      expect(decided.note).toContain('html');
    }
  });
});

describe('per-block item JSON URLs resolve through the same path (the integration surface)', () => {
  it('a fetched item writes the same files the bundled block does', async () => {
    const block = blocks[0];
    // The item as the REGISTRY publishes it: gen-blocks.mjs runs
    // withStrippedTwins before buildRegistryItem, so the twins are listed in
    // the manifest a consumer fetches. The bundled copy already has them on
    // disk, so nothing is re-stripped here.
    const item = buildRegistryItem(withStrippedTwins(block, (source) => source));
    const dir = await project('url-case', { name: 'host', dependencies: { vue: '3' } });
    let fetched: string | undefined;
    const run = await runInto(dir, [`https://registry.example/r/${block.name}.json`], {
      fetchJson: async (url) => {
        fetched = url;
        return JSON.parse(JSON.stringify(item));
      },
    });
    expect(fetched).toBe(`https://registry.example/r/${block.name}.json`);
    expect(run.code, run.err.join('\n')).toBe(0);
    // The SAME renderer, so the same files: an item JSON carries the stripped
    // twins gen-blocks wrote into it, which is why the fetched door does not
    // need a stripper of its own.
    const planned = planAdd({ blocks: [block], routes: [] }, { form: 'html', kitRange: KIT_RANGE, kitVersion: KIT_VERSION }).files;
    expect(planned.length).toBeGreaterThan(0);
    for (const file of planned) {
      expect(existsSync(path.join(dir, file.path)), `${file.path} not written through the URL door`).toBe(true);
    }
  });

  it('bare registryDependencies inside a URL item resolve as sibling URLs', async () => {
    const dep = blocks[0];
    const composed = {
      name: 'composed',
      title: 'Composed',
      description: 'composes the reference block',
      type: 'registry:block',
      registryDependencies: [dep.name],
      files: [
        {
          path: 'composed.html',
          type: 'registry:page',
          content: '<!doctype html>\n<html><body><kai-thread></kai-thread></body></html>',
        },
      ],
    };
    const fetched: string[] = [];
    const resolved = await resolveAdd(['https://registry.example/r/composed.json'], {
      local: () => undefined,
      fetchItem: async (url) => {
        fetched.push(url);
        if (url.endsWith('composed.json')) {
          const { blockFromItemJson } = await import('../src/blocks');
          return blockFromItemJson(composed, url).block!;
        }
        return dep;
      },
    });
    expect(fetched).toEqual([
      'https://registry.example/r/composed.json',
      `https://registry.example/r/${dep.name}.json`,
    ]);
    // dependency order: the dep lands before its dependent
    expect(resolved.blocks.map((b) => b.name)).toEqual([dep.name, 'composed']);
  });
});

describe('route:<integration> dependencies, resolved against the scaffolder catalog', () => {
  // A synthetic block (the shared fixture) rather than a real one, because this
  // describe's subject is route resolution: a case about routes should not also
  // be a case about whichever block happens to declare one, and the authored
  // blocks do declare routes now (`route:openrouter`, `route:anthropic` - the
  // data-axis cases below drive those).
  const routed = (): Block =>
    authoredBlock('routed-block', { wiring: { gateways: ['openrouter'] } });

  it('the react form emits the route the way the scaffolder does', async () => {
    const resolved = await resolveAdd(
      ['routed-block'],
      {
        local: (name) => (name === 'routed-block' ? { ...routed(), manifest: { ...routed().manifest } } : undefined),
        fetchItem: async () => { throw new Error('no fetch expected'); },
      },
      { mode: 'real', gateway: 'openrouter' },
    );
    expect(resolved.routes.map((r) => r.id)).toEqual(['openrouter']);
    const plan = planAdd(resolved, {
      form: 'react',
      kitRange: KIT_RANGE,
      kitVersion: KIT_VERSION,
      wiring: { mode: 'real', gateway: 'openrouter' },
    });
    const paths = plan.files.map((f) => f.path);
    expect(paths).toContain('server/chat.ts');
    expect(paths).toContain('vite-chat-api.ts');
    const route = plan.files.find((f) => f.path === 'server/chat.ts')!;
    expect(route.contents).toContain('openrouter.ai');
    expect(plan.notes.join('\n')).toContain('OPENROUTER_API_KEY');
    // The env file the route reads, at the path the framework table declares.
    expect(plan.env?.path).toBe('.env.local');
    expect(plan.env?.contents).toContain('OPENROUTER_API_KEY=replace-me');
  });

  it('the web-component form states the gap loudly instead of writing nothing silently', async () => {
    const resolved = await resolveAdd(
      ['routed-block'],
      {
        local: (name) => (name === 'routed-block' ? routed() : undefined),
        fetchItem: async () => { throw new Error('no fetch expected'); },
      },
      { mode: 'real', gateway: 'openrouter' },
    );
    const plan = planAdd(resolved, {
      form: 'html',
      kitRange: KIT_RANGE,
      kitVersion: KIT_VERSION,
      wiring: { mode: 'real', gateway: 'openrouter' },
    });
    expect(plan.files.map((f) => f.path)).not.toContain('server/chat.ts');
    // No route host for this form, so nothing to write an env file for either.
    expect(plan.env).toBeUndefined();
    const notes = plan.notes.join('\n');
    expect(notes).toContain('openrouter');
    expect(notes).toContain('OPENROUTER_API_KEY');
  });

  it('an unknown route integration is refused with the known ids named', async () => {
    await expect(
      resolveAdd(['route:not-a-gateway'], { local: () => undefined, fetchItem: async () => { throw new Error('x'); } }),
    ).rejects.toThrow(/names no scaffolder integration.*mock/s);
  });

  it('the real mode builds the route dependency itself; the other two add none', async () => {
    // The manifest CANNOT declare it: `registryDependencies` resolve on every
    // install, so a route listed there would be emitted by a plain `kai add` -
    // a backend nobody asked for. So the CLI adds the dep the mode asked for.
    const resolvers = {
      local: () => routed(),
      fetchItem: async () => { throw new Error('no fetch expected'); },
    };
    const real = await resolveAdd(['routed-block'], resolvers, { mode: 'real', gateway: 'openrouter' });
    expect(real.routes.map((route) => route.id)).toEqual(['openrouter']);
    for (const mode of [{ mode: 'mock' }, { mode: 'none' }] as AddMode[]) {
      const quiet = await resolveAdd(['routed-block'], resolvers, mode);
      expect(quiet.routes, mode.mode).toEqual([]);
      expect(quiet.blocks.map((block) => block.name)).toEqual(['routed-block']);
    }
  });
});

describe('the data axis: three modes, one spelling each (spec 4)', () => {
  // The manifest declares the axis, so a mock-free mode has something to drop
  // and `--gateway` has something to satisfy. Both forms are driven, because
  // which mock file a form ships is not the same in the two: the html form
  // writes the stripped `.js` twin and the react form the `.ts` source.
  const routed = (name = 'mock-block', importsMock = false): Block =>
    mockBlock(name, { importsMock, manifest: { registryDependencies: ['route:openrouter'] } });

  it('mock (the default) ships the scripted mock and writes no route, loudly', async () => {
    // The scripted mock SHIPS, but at the seam's target name: the fixture's
    // controller imports `./mock-block.transport`, and the mode puts the
    // scripted source there. The form's JavaScript twin is the html form's
    // spelling of that same file.
    for (const [form, mock] of [
      ['react', fileTarget('react', 'mock-block', 'mock-block.transport.ts')],
      ['html', fileTarget('html', 'mock-block', 'mock-block.transport.js')],
    ] as const) {
      const { plan, error } = await planFor(routed(), form);
      expect(error, form).toBeUndefined();
      expect(plan!.files.map((f) => f.path), form).toContain(mock);
      expect(plan!.files.map((f) => f.path), form).not.toContain('server/chat.ts');
      expect(plan!.env, form).toBeUndefined();
      // DECIDED LOUDLY: the block declares a backend route and this mode wrote
      // none, which is a decision the consumer has to be able to see.
      expect(plan!.notes.join('\n'), form).toContain('no backend route was written');
    }
  });

  it('--no-mock leaves the scripted mock out and writes no route either', async () => {
    for (const form of ['react', 'html'] as const) {
      const { plan, error } = await planFor(routed(), form, { mode: 'none' });
      expect(error, form).toBeUndefined();
      expect(mockPathsIn(plan!.files.map((f) => f.path)), form).toEqual([]);
      expect(plan!.files.map((f) => f.path), form).not.toContain('server/chat.ts');
      expect(plan!.notes.join('\n'), form).toContain('no backend route was written');
      expect(plan!.notes.join('\n'), form).toContain('leaves the transport to you');
    }
  });

  it('--gateway writes the route the scaffolder emits, its env file, and no mock', async () => {
    const { plan, error } = await planFor(routed(), 'react', { mode: 'real', gateway: 'openrouter' });
    expect(error).toBeUndefined();
    expect(mockPathsIn(plan!.files.map((f) => f.path))).toEqual([]);
    expect(plan!.files.map((f) => f.path)).toContain('server/chat.ts');
    // The env file is NOT part of the plan's files: an existing `.env.local` is
    // the consumer's own key file, so it is created-if-absent rather than a
    // collision that refuses the whole install.
    expect(plan!.env?.path).toBe('.env.local');
    expect(plan!.env?.vars).toContain('OPENROUTER_API_KEY');
    expect(plan!.env?.contents).toContain('OPENROUTER_API_KEY=replace-me');
    expect(plan!.files.map((f) => f.path)).not.toContain('.env.local');
  });

  it('--gateway for a form with no route host keeps the loud gap sentence', async () => {
    const { plan, error } = await planFor(routed(), 'html', { mode: 'real', gateway: 'openrouter' });
    expect(error).toBeUndefined();
    expect(mockPathsIn(plan!.files.map((f) => f.path))).toEqual([]);
    expect(plan!.files.map((f) => f.path)).not.toContain('server/chat.ts');
    expect(plan!.env).toBeUndefined();
    expect(plan!.notes.join('\n')).toContain('OPENROUTER_API_KEY');
  });

  it('a gateway the selection declares no route for is refused, naming the ones it does', async () => {
    const declared = await planFor(routed(), 'react', { mode: 'real', gateway: 'anthropic' });
    expect(declared.plan).toBeUndefined();
    expect(declared.error).toContain('--gateway anthropic');
    expect(declared.error).toContain('mock-block');
    expect(declared.error).toContain('openrouter');

    // A block that declares no route at all says `none` rather than showing an
    // empty list, and still points at the way out.
    const silent = await planFor(
      mockBlock('no-route', { manifest: { wiring: { mockFiles: ['mock.ts'] } } }),
      'react',
      { mode: 'real', gateway: 'openrouter' },
    );
    expect(silent.plan).toBeUndefined();
    expect(silent.error).toContain('declares none');
    expect(silent.error).toContain('--no-mock');
  });

  it('a file still importing the dropped mock is refused by name, never shipped broken', async () => {
    // The shipped blocks' controllers import `./mock` and the renderers copy
    // them verbatim, so dropping the file alone would emit a project that
    // cannot resolve the import - a failure the consumer meets at build time,
    // long after `add` said it succeeded.
    for (const wiring of [{ mode: 'none' }, { mode: 'real', gateway: 'openrouter' }] as AddMode[]) {
      const { plan, error } = await planFor(routed('imports-mock', true), 'html', wiring);
      expect(plan, JSON.stringify(wiring)).toBeUndefined();
      expect(error).toContain('cannot be installed without its scripted mock yet');
      expect(error).toContain('imports-mock.controller.js');
      expect(error).toContain('"./mock"');
      expect(error).toContain('mock.ts');
    }
  });

  it('the single-file CDN paste form cannot leave a file out, and says why', async () => {
    for (const wiring of [{ mode: 'none' }, { mode: 'real', gateway: 'openrouter' }] as AddMode[]) {
      const { plan, error } = await planFor(routed(), 'cdn', wiring);
      expect(plan, JSON.stringify(wiring)).toBeUndefined();
      expect(error).toContain('ONE self-contained file');
      // The refusal names the mode the consumer asked for, not a generic one.
      expect(error).toContain(wiring.mode === 'real' ? '--gateway openrouter' : '--no-mock');
    }
  });

  it('a block with no declared mock changes nothing, and says that out loud', async () => {
    const { plan, error } = await planFor(authoredBlock('no-mock-declared'), 'html', { mode: 'none' });
    expect(error).toBeUndefined();
    expect(plan!.notes.join('\n')).toContain('there was nothing to leave out');
  });

  it('a mockFiles entry the block does not ship is a refusal, not a silent no-op', () => {
    // The manifest validator grades the bundled registry; this is the gate the
    // FETCHED item JSON path keeps, because `blockFromItemJson` never runs the
    // validator (create-kai add <url>).
    const broken: Block = {
      ...authoredBlock('broken-mock'),
      manifest: { ...authoredBlock('broken-mock').manifest, wiring: { mockFiles: ['not-shipped.ts'] } },
    };
    expect(() => declaredMockFiles(broken)).toThrow(/not-shipped\.ts.*not a files\[\] entry/s);
  });
});

/**
 * A block with a DATA-MODE SEAM: its controller imports ONE extensionless
 * specifier (`./<name>.transport`), and the manifest declares the authored source
 * for each mode plus the name the chosen one is written at. Synthetic for the
 * same reason `mockBlock` is - a case about the seam should not also be a case
 * about whichever authored block happens to carry one.
 */
function seamBlock(
  name: string,
  opts: { modeFiles?: Record<string, string>; gateway?: string | undefined } = {},
): Block {
  const base = authoredBlock(name);
  const modeFiles = opts.modeFiles ?? {
    mock: `${name}.transport.mock.ts`,
    real: `${name}.transport.route.ts`,
    none: `${name}.transport.none.ts`,
  };
  const variant = (mode: string): string => `export const transport = { mode: '${mode}' };\n`;
  // The controller keeps the contract's declared shape and gains the ONE
  // extensionless import the seam is about.
  const withSeamImport = (source: string): string => `import { transport } from './${name}.transport';\n${source}`;
  const files = new Map(base.files);
  for (const [mode, path] of Object.entries(modeFiles)) {
    files.set(path, variant(mode));
    files.set(path.replace(/\.ts$/, '.js'), variant(mode));
  }
  files.set(`${name}.controller.ts`, withSeamImport(files.get(`${name}.controller.ts`) as string));
  files.set(`${name}.controller.js`, withSeamImport(files.get(`${name}.controller.js`) as string));
  return {
    name,
    files,
    manifest: {
      ...base.manifest,
      files: [
        { path: `${name}.html`, type: 'registry:page' },
        { path: `${name}.controller.ts`, type: 'registry:file' },
        ...Object.values(modeFiles).map((path) => ({ path, type: 'registry:file' as const })),
      ],
      wiring: {
        ...(opts.gateway === undefined ? { gateways: ['openrouter'] } : { gateways: [opts.gateway] }),
        mockFiles: [modeFiles.mock],
        modeTarget: `${name}.transport.ts`,
        modeFiles,
      },
    },
  };
}

/** The basename of every planned path, so a case can ask which seam file was
 *  written and whether the other variants leaked in. */
const basenames = (plan: AddPlan): string[] => plan.files.map((file) => path.posix.basename(file.path));
const contentOf = (plan: AddPlan, base: string): string =>
  plan.files.find((file) => path.posix.basename(file.path) === base)?.contents ?? '';

describe('the data-mode seam: one file written, chosen from the manifest', () => {
  // THE HOLE THIS CLOSES. Every shipped block's controller imported './mock' and
  // the renderers copied it verbatim, so `--no-mock` and `--gateway` refused for
  // every block in the registry. The seam makes the choice real: the controller
  // imports one name, the manifest declares which authored source a mode writes
  // there, and the other two are not written at all.
  it('writes exactly one variant, at the manifest name, for every mode and every form', async () => {
    for (const form of ['html', 'react'] as const) {
      // The html form ships the stripped `.js`; the react form the `.ts` source.
      const seam = form === 'html' ? 'seam-block.transport.js' : 'seam-block.transport.ts';
      for (const [wiring, expected] of [
        [undefined, 'mock'],
        [{ mode: 'none' } as AddMode, 'none'],
        [{ mode: 'real', gateway: 'openrouter' } as AddMode, 'real'],
      ] as const) {
        const { plan, error } = await planFor(seamBlock('seam-block'), form, wiring);
        expect(error, `${form}/${expected}`).toBeUndefined();
        const names = basenames(plan!);
        // ONE seam file, and it is the mode's own source.
        expect(names.filter((name) => name.startsWith('seam-block.transport')), `${form}/${expected}`).toEqual([seam]);
        expect(contentOf(plan!, seam), `${form}/${expected}`).toContain(`mode: '${expected}'`);
        // The authored variants are sources, never shipped under their own names.
        for (const variant of ['seam-block.transport.mock', 'seam-block.transport.route', 'seam-block.transport.none']) {
          expect(names, `${form}/${expected}`).not.toContain(form === 'html' ? `${variant}.js` : `${variant}.ts`);
        }
      }
    }
  });

  it('a mode the manifest declares no source for is refused by name', async () => {
    // The manifest validator already requires every supported mode on a BUNDLED
    // block; this is the gate the FETCHED item JSON path keeps, because
    // `blockFromItemJson` never runs the validator (`create-kai add <url>`).
    const partial = seamBlock('partial-seam', {
      modeFiles: { mock: 'partial-seam.transport.mock.ts', none: 'partial-seam.transport.none.ts' },
    });
    const { plan, error } = await planFor(partial, 'html', { mode: 'real', gateway: 'openrouter' });
    expect(plan).toBeUndefined();
    expect(error).toContain('partial-seam');
    expect(error).toContain('"real"');
  });

  it('the bundled assistant block installs mock-free: the regression this seam exists for', async () => {
    // The block's own controller, through the REAL add path, in both mock-free
    // modes. Before the seam every one of these refused (the controller imported
    // './mock'), so this is the case that keeps the refusal from coming back.
    const assistant = blocks.find((b) => b.name === 'assistant');
    expect(assistant, 'the assistant block is not in the shipped registry').toBeDefined();
    const noMockDir = await project('assistant-no-mock', { name: 'host', dependencies: { vue: '^3.0.0' } });
    const noMock = await runInto(noMockDir, ['assistant', '--no-mock']);
    expect(noMock.code, noMock.err.join('\n')).toBe(0);
    const noneWritten = await readFile(
      path.join(noMockDir, fileTarget('html', 'assistant', 'assistant.transport.js')),
      'utf8',
    );
    expect(noneWritten, 'the composition-only install shipped a transport anyway').toContain('--no-mock');
    expect(
      existsSync(path.join(noMockDir, fileTarget('html', 'assistant', 'assistant.transport.mock.js'))),
      'the mock variant was written in a mock-free mode',
    ).toBe(false);

    const realDir = await project('assistant-real', { name: 'host', dependencies: { react: '^19.0.0' } });
    const gateway = [...WIRED_GATEWAYS].find((id) => id !== 'mock') as string;
    const real = await runInto(realDir, ['assistant', '--gateway', gateway]);
    expect(real.code, real.err.join('\n')).toBe(0);
    const routeWritten = await readFile(
      path.join(realDir, fileTarget('react', 'assistant', 'assistant.transport.ts')),
      'utf8',
    );
    expect(routeWritten).toContain('/api/chat');
    expect(routeWritten).toContain('toOpenAIMessages');
    expect(
      existsSync(path.join(realDir, fileTarget('react', 'assistant', 'assistant.transport.mock.ts'))),
      'the mock variant was written for a --gateway install',
    ).toBe(false);
  });
});

/**
 * THE MANIFEST RULES THE SEAM ADDS, watched failing one at a time. They live
 * here rather than in packages/blocks' own suite because the CLI is the other
 * consumer of the same rule and this is the file this change owns; the message
 * text is the contract either way.
 */
describe('the registry grades the seam it is handed', () => {
  const errorsFor = (wiring: Record<string, unknown>): string => {
    const manifest = {
      name: 'demo',
      title: 'Demo',
      description: 'A demo block.',
      type: 'registry:block',
      files: [
        { path: 'demo.html', type: 'registry:page' },
        { path: 'demo.mock.ts', type: 'registry:file' },
        { path: 'demo.route.ts', type: 'registry:file' },
        { path: 'demo.none.ts', type: 'registry:file' },
      ],
      wiring,
    };
    const files = ['demo.html', 'demo.mock.ts', 'demo.route.ts', 'demo.none.ts'];
    return validateBlockManifest(manifest, 'demo', files, {
      blockNames: ['demo'],
      routeIntegrations: ['openrouter'],
    }).join(' | ');
  };
  const full = {
    gateways: ['openrouter'],
    mockFiles: ['demo.mock.ts'],
    modeTarget: 'demo.transport.ts',
    modeFiles: { mock: 'demo.mock.ts', real: 'demo.route.ts', none: 'demo.none.ts' },
  };

  it('accepts the seam as the assistant block declares it', () => {
    expect(errorsFor(full)).toBe('');
  });

  it('refuses a modeTarget that is a files[] entry, because it is a generated name', () => {
    // The two halves point the same way: the variants are authored, the target
    // is written by `add`. A block shipping a file at the target name has two
    // contradictory sources for one module.
    expect(errorsFor({ ...full, modeTarget: 'demo.mock.ts' })).toContain('wiring.modeTarget is "demo.mock.ts"');
  });

  it('refuses a modeFiles entry the block does not ship', () => {
    expect(errorsFor({ ...full, modeFiles: { ...full.modeFiles, none: 'not-shipped.ts' } })).toContain(
      'no files[] entry ships',
    );
  });

  it('refuses a missing mode, and says which one', () => {
    const { none, ...withoutNone } = full.modeFiles;
    expect(errorsFor({ ...full, modeFiles: withoutNone })).toContain('needs a "none" entry');
    // `real` is required only of a block that declares a gateway: a block with no
    // gateway has no route to write, and the CLI refuses `--gateway` for it.
    const { real, ...withoutReal } = full.modeFiles;
    expect(errorsFor({ ...full, modeFiles: withoutReal })).toContain('needs a "real" entry');
    expect(errorsFor({ ...full, gateways: [], modeFiles: withoutReal })).toBe('');
  });

  it('refuses an unknown mode key rather than ignoring it', () => {
    expect(errorsFor({ ...full, modeFiles: { ...full.modeFiles, prod: 'demo.mock.ts' } })).toContain(
      'unknown mode "prod"',
    );
  });

  it('refuses half a seam: a target with no sources, or sources with no target', () => {
    expect(errorsFor({ ...full, modeFiles: undefined })).toContain('wiring.modeFiles must be an object');
    expect(errorsFor({ ...full, modeTarget: undefined })).toContain('wiring.modeTarget must be a non-empty string');
  });

  it('refuses two modes pointing at one source, which is not an axis', () => {
    expect(errorsFor({ ...full, modeFiles: { ...full.modeFiles, none: 'demo.mock.ts' } })).toContain(
      'each mode is its own file',
    );
  });
});

describe('multi-select: one command, registryDependencies deduped across the selection', () => {
  // A selection composes SHARED dependencies, and the point of resolving them
  // once is that the second write would be the collision refusal a consumer
  // cannot get past. Driven through the real `runAdd` against a real tree.
  const tree = async (id: string): Promise<string> => {
    const dir = path.join(root, `tree-${id}`);
    await rm(dir, { recursive: true, force: true });
    return writeBlockTree(dir, [
      authoredBlock('shared'),
      authoredBlock('composed-a', { registryDependencies: ['shared'] }),
      authoredBlock('composed-b', { registryDependencies: ['shared'] }),
      authoredBlock('routed-a', { wiring: { gateways: ['openrouter'] } }),
      authoredBlock('routed-b', { wiring: { gateways: ['openrouter'] } }),
    ]);
  };

  it('resolution takes the list, and a dependency two items compose lands once', async () => {
    const fixtures = new Map(
      [authoredBlock('shared'), authoredBlock('composed-a', { registryDependencies: ['shared'] }), authoredBlock('composed-b', { registryDependencies: ['shared'] })].map(
        (block) => [block.name, block],
      ),
    );
    const resolved = await resolveAdd(['composed-a', 'composed-b'], {
      local: (name) => fixtures.get(name),
      fetchItem: async () => { throw new Error('no fetch expected'); },
    });
    expect(resolved.blocks.map((b) => b.name)).toEqual(['shared', 'composed-a', 'composed-b']);
  });

  it('writes every item and the shared dependency once each', async () => {
    const blocksRoot = await tree('files');
    const dir = await project('multi-files', { name: 'host' });
    const run = await runInto(dir, ['composed-a', 'composed-b'], { blocksRoot });
    expect(run.code, run.err.join('\n')).toBe(0);
    const writes = run.out.filter((line) => line.startsWith('  write ')).map((line) => line.trim().slice('write '.length));
    expect(new Set(writes).size, `a path was written twice:\n${writes.join('\n')}`).toBe(writes.length);
    for (const block of ['composed-a', 'composed-b', 'shared']) {
      const page = fileTarget('html', block, `${block}.html`);
      expect(writes.filter((path) => path === page), `${block}: ${page}`).toHaveLength(1);
      expect(existsSync(path.join(dir, page)), page).toBe(true);
    }
  });

  it('emits a route two items declare once, and one env file', async () => {
    const blocksRoot = await tree('routes');
    const dir = await project('multi-routes', { name: 'host', dependencies: { react: '^19.0.0' } });
    const run = await runInto(dir, ['routed-a', 'routed-b', '--gateway', 'openrouter'], { blocksRoot });
    expect(run.code, run.err.join('\n')).toBe(0);
    const writes = run.out.filter((line) => line.startsWith('  write '));
    expect(writes.filter((line) => line.includes('server/chat.ts'))).toHaveLength(1);
    expect(run.out.filter((line) => line.includes('env   .env.local'))).toHaveLength(1);
    expect(existsSync(path.join(dir, '.env.local'))).toBe(true);
  });

  it('an existing .env.local is the consumer\'s own file: reported, never a refusal', async () => {
    const blocksRoot = await tree('env');
    const dir = await project('multi-env', { name: 'host', dependencies: { react: '^19.0.0' } });
    await writeFile(path.join(dir, '.env.local'), 'MY_OWN_KEY=1\n', 'utf8');
    const run = await runInto(dir, ['routed-a', '--gateway', 'openrouter'], { blocksRoot });
    expect(run.code, run.err.join('\n')).toBe(0);
    expect(run.out.join('\n')).toContain('.env.local already exists; add OPENROUTER_API_KEY');
    expect(await readFile(path.join(dir, '.env.local'), 'utf8')).toBe('MY_OWN_KEY=1\n');
  });
});

describe('the add flag surface names every mode it accepts', () => {
  // Derived from `WIRED_GATEWAYS`, exactly as `add.ts` derives it: a gateways
  // flag whose accepted set is hand-typed in the test would pass while the flag
  // refused the gateway the CLI gained.
  const REAL_GATEWAY_IDS = [...WIRED_GATEWAYS].filter((id) => id !== 'mock');

  it('takes every positional item, so one command installs a selection', () => {
    expect(parseAddArgs(['assistant', 'support-widget']).items).toEqual(['assistant', 'support-widget']);
    expect(parseAddArgs(['assistant']).items).toEqual(['assistant']);
    expect(parseAddArgs(['assistant', 'support-widget']).errors).toEqual([]);
  });

  it('accepts every wired gateway, and mock (and none) as the default mode', () => {
    for (const id of REAL_GATEWAY_IDS) expect(parseAddArgs(['assistant', '--gateway', id]).errors, id).toEqual([]);
    expect(parseAddArgs(['assistant', '--gateway', 'mock']).errors).toEqual([]);
    expect(parseAddArgs(['assistant', '--gateway', 'none']).errors).toEqual([]);
  });

  it('refuses an unwired gateway by name, listing the ones it can wire', () => {
    // An id the CATALOG has but this release cannot wire end to end: the case
    // the flag has to refuse (a route the emitted front end cannot read is not
    // a mode). Derived, so catalog growth moves this case with it.
    const unwired = listIntegrations()
      .map((i) => i.id)
      .find((id) => id !== 'mock' && !REAL_GATEWAY_IDS.includes(id));
    expect(unwired, 'the catalog has no unwired integration left; pick another subject').toBeDefined();
    const refused = parseAddArgs(['assistant', '--gateway', unwired!]);
    expect(refused.errors.join(' ')).toContain('--gateway must be');
    for (const id of REAL_GATEWAY_IDS) expect(refused.errors.join(' '), id).toContain(id);
    expect(refused.errors.join(' ')).toContain(`got '${unwired}'`);
  });

  it('refuses --gateway together with --no-mock: one axis, one spelling', () => {
    const both = parseAddArgs(['assistant', '--gateway', REAL_GATEWAY_IDS[0], '--no-mock']);
    expect(both.errors.join(' ')).toContain('two data modes');
  });

  it('the help text prints every flag the parser accepts', () => {
    // Menu honesty for help text: a flag nobody can discover is a flag this
    // release does not really have.
    for (const flag of ['--form', '--gateway', '--no-mock', '--dir', '--list', '--yes']) {
      expect(ADD_HELP, flag).toContain(flag);
    }
  });

  it('a mock-free composition installs without the mock file, end to end', async () => {
    // The positive path the axis exists for: a block whose controller does not
    // import its mock installs with the composition and no scripted file.
    const blocksRoot = path.join(root, 'tree-no-mock-e2e');
    await rm(blocksRoot, { recursive: true, force: true });
    await writeBlockTree(blocksRoot, [mockBlock('demo', { manifest: { registryDependencies: ['route:openrouter'] } })]);
    const dir = await project('no-mock-e2e', { name: 'host' });
    const run = await runInto(dir, ['demo', '--no-mock'], { blocksRoot });
    expect(run.code, run.err.join('\n')).toBe(0);
    expect(existsSync(path.join(dir, fileTarget('html', 'demo', 'demo.html')))).toBe(true);
    expect(existsSync(path.join(dir, fileTarget('html', 'demo', 'mock.js')))).toBe(false);
    expect(run.out.join('\n')).toContain('no backend route was written');
  });

  it('a mode that cannot be satisfied is refused end to end, and nothing is written', async () => {
    // A block whose controller still imports its mock, which is what the
    // shipped blocks' controllers do today. What must NOT happen is a partial
    // tree on disk with a success exit code.
    const blocksRoot = path.join(root, 'tree-unsatisfiable');
    await rm(blocksRoot, { recursive: true, force: true });
    await writeBlockTree(blocksRoot, [mockBlock('demo', { importsMock: true })]);
    const dir = await project('unsatisfiable', { name: 'host' });
    const run = await runInto(dir, ['demo', '--no-mock'], { blocksRoot });
    expect(run.code).toBe(1);
    expect(run.err.join('\n')).toContain('cannot be installed without its scripted mock yet');
    expect(run.out.filter((line) => line.startsWith('  write '))).toEqual([]);
    expect(existsSync(path.join(dir, 'blocks'))).toBe(false);
  });
});

describe('the authored manifests declare the data axis the CLI resolves', () => {
  // Read from the SOURCE registry through the same loader the CLI uses, never
  // from `dist/blocks`: that copy is a build artifact, so a manifest assertion
  // against it would assert whatever the last build wrote.
  const BLOCKS_SOURCE = path.join(
    path.dirname(createRequire(import.meta.url).resolve('@kitn.ai/blocks/package.json')),
    'blocks',
  );

  it('every declared mock file is a file the block actually ships', async () => {
    const source = await loadBlocks(BLOCKS_SOURCE);
    expect(source.length, 'the authored registry is empty').toBeGreaterThan(0);
    for (const block of source) expect(() => declaredMockFiles(block), block.name).not.toThrow();
  });

  it('the two blocks this change wires declare their mock and their gateways', async () => {
    const byName = new Map((await loadBlocks(BLOCKS_SOURCE)).map((block) => [block.name, block]));
    const ids = new Set(listIntegrations().map((integration) => integration.id));
    for (const name of ['support-widget', 'in-app-assistant']) {
      const block = byName.get(name);
      expect(block, `${name} is not in the authored registry`).toBeDefined();
      // The seam resolves ONE file per data mode, and the mock it resolves must be
      // among the files the manifest declares. Grading the two declarations against
      // each other rather than against a filename means a rename moves both, instead
      // of silently invalidating an assertion written when the file was called
      // something else.
      const seamMock = block!.manifest.wiring?.modeFiles?.mock;
      expect(seamMock, `${name} declares no data-mode seam, so its mock cannot resolve`).toBeDefined();
      expect(declaredMockFiles(block!), name).toContain(seamMock);
      const gateways = block!.manifest.wiring?.gateways ?? [];
      expect(gateways.length, `${name} declares no gateway, so --gateway can never satisfy it`).toBeGreaterThan(0);
      // The declared ids are the CATALOG's, checked where the real catalog is:
      // the registry's own validator grades them against an injected list, and
      // the fixture list it injects in the blocks package is a fixture.
      for (const id of gateways) expect(ids.has(id), `${name} declares ${id}`).toBe(true);
    }
  });

  it('no manifest carries an unconditional route dependency, which every install would resolve', async () => {
    // `wiring.gateways` is the capability list; a `route:` dep is a route that
    // resolves on EVERY install, including the default mock one.
    for (const block of await loadBlocks(BLOCKS_SOURCE)) {
      const routes = (block.manifest.registryDependencies ?? []).filter((dep) => dep.startsWith('route:'));
      expect(routes, `${block.name}: ${routes.join(', ')}`).toEqual([]);
    }
  });
});

describe('refusals name the way out', () => {
  it('an unknown block points at --list', async () => {
    const dir = await project('unknown', { name: 'host' });
    const run = await runInto(dir, ['no-such-block']);
    expect(run.code).toBe(1);
    expect(run.err.join('\n')).toContain('create-kai add --list');
  });

  it('every delivery form is accepted and --form wc is refused by name', () => {
    // The accepted set is the form axis itself, DERIVED here as `add.ts`
    // derives it: a fourth delivery form is accepted and named in the refusal
    // with nothing on either side to hand-edit. Hand-typing the list is how
    // the flag came to accept a form the axis had dropped.
    for (const { id } of BLOCK_FORMS) expect(parseAddArgs(['support-widget', '--form', id]).errors, id).toEqual([]);
    const legacy = parseAddArgs(['support-widget', '--form', 'wc']);
    const message = legacy.errors.join(' ');
    expect(message).toContain('--form must be');
    for (const { id } of BLOCK_FORMS) expect(message, id).toContain(id);
    expect(message).toContain("got 'wc'");
  });

  // The three cases that stood here pinned `wrapEntryScript` and `bodyToJsx`,
  // the regex JSX translation the parsed template replaced. They are deleted
  // with the functions: the grammar's refusals have their own cases in
  // packages/blocks/tests/parse-template.test.ts.
});

describe('dependency merging never downgrades what the project already chose', () => {
  it('keeps an existing entry and says so', () => {
    const merged = mergeDependencies(
      JSON.stringify({ name: 'host', dependencies: { '@kitn.ai/ui': '^0.1.0' } }),
      { '@kitn.ai/ui': KIT_RANGE },
    );
    expect(merged.kept).toEqual(['@kitn.ai/ui']);
    expect(merged.added).toEqual([]);
    expect(JSON.parse(merged.text).dependencies['@kitn.ai/ui']).toBe('^0.1.0');
  });
});

describe('menu honesty: every --form value the flag accepts writes a real tree', () => {
  // `menu-honesty.test.ts`'s rule applied to the delivery-form flag. The
  // accepted set is the axis itself, and every value in it is driven through
  // the REAL runAdd into a real temp project. A form the flag accepts but the
  // generator cannot emit fails here whether or not anyone remembered a case,
  // and PR B2's four forms are covered on arrival.
  it('has forms and blocks to drive, so the loops below are not vacuous', () => {
    expect(BLOCK_FORMS.length).toBeGreaterThan(1);
    expect(blocks.length).toBeGreaterThan(0);
  });

  for (const form of BLOCK_FORMS) {
    it(`--form ${form.id} writes every file the form renders`, async () => {
      for (const block of blocks) {
        // A project with NO framework signal, so the flag is the only thing
        // deciding: a leg that also matched detection would pass on detection.
        const dir = await project(`form-${form.id}-${block.name}`, { name: 'host' });
        const run = await runInto(dir, [block.name, '--form', form.id]);
        expect(run.code, `${block.name} --form ${form.id}: ${run.err.join('\n')}`).toBe(0);
        const planned = planAdd(
          { blocks: [block], routes: [] },
          { form: form.id, kitRange: KIT_RANGE, kitVersion: KIT_VERSION },
        ).files;
        expect(planned.length, `${block.name} --form ${form.id}: planned nothing`).toBeGreaterThan(0);
        for (const file of planned) {
          expect(existsSync(path.join(dir, file.path)), `${block.name} --form ${form.id}: ${file.path} not written`).toBe(true);
        }
      }
    });
  }
});

describe('SECURITY: a fetched item cannot name a path outside the project', () => {
  // `fileTarget` (packages/blocks/src/targets.ts) joins a block's name and a
  // file's path onto the install root with a raw string concatenation, and
  // `runAdd` writes at `path.join(root, file.path)` -- neither normalizes,
  // so a hostile "name" or files[].path in a fetched item JSON plans a write
  // outside the project. `blockFromItemJson` is the one gate a fetched item
  // passes through (there is no directory scan to check it against, unlike
  // a bundled block's dirName match), so these two cases exercise it
  // directly and confirm nothing lands outside the temp project root.
  it('rejects a hostile "name" (path segments, escapes the project)', async () => {
    const dir = await project('hostile-name', { name: 'host' });
    const before = (await readdir(root)).sort();
    const item = {
      name: '../../.git/hooks',
      title: 'Hostile',
      description: 'a hostile item',
      type: 'registry:block',
      files: [{ path: 'pre-commit', type: 'registry:page', content: '#!/bin/sh\necho pwned\n' }],
    };
    const run = await runInto(dir, ['https://registry.example/r/hostile.json'], {
      fetchJson: async () => item,
    });
    expect(run.code).not.toBe(0);
    expect(run.err.join('\n')).toContain('../../.git/hooks');
    expect(run.err.join('\n')).toMatch(/does not match/);
    expect(existsSync(path.join(root, '.git'))).toBe(false);
    expect((await readdir(root)).sort()).toEqual(before);
  });

  it('rejects a hostile files[].path (".." segment, escapes the project)', async () => {
    const dir = await project('hostile-path', { name: 'host' });
    const before = (await readdir(root)).sort();
    // A REAL block's item (controller, cross-checked bindings, everything
    // the renderer needs), with ONLY its registry:page file's path corrupted
    // -- so the traversal is the one thing standing between this item and a
    // clean write, not one of several reasons it fails. A minimal hand-typed
    // item (no controller.ts) fails earlier, at the html renderer's own
    // "needs a controller" check, before the write path is ever reached;
    // that would leave the filesystem assertions below unable to fail even
    // with the path rule disabled, which is exactly what the coordinator's
    // re-review caught.
    const block = blocks[0];
    const item = buildRegistryItem(withStrippedTwins(block, (source) => source));
    const pageEntry = item.files.find((f) => f.type === 'registry:page');
    if (!pageEntry) throw new Error('fixture block has no registry:page entry');
    // installRoot('html', block.name) is 'blocks/<name>' (two segments), so
    // the payload climbs THREE levels -- past the page's own directory, past
    // 'blocks', and out of the project dir itself -- landing at
    // <root>/evil.txt, a sibling of the project rather than something inside
    // it. Two '../'s only reaches back to the project root (still "inside
    // the project"), which would leave the filesystem assertions below
    // unable to fail even with the rule disabled.
    const hostilePath = '../../../evil.txt';
    pageEntry.path = hostilePath;
    // item.name stays the block's own (a valid name) -- this case is about
    // a hostile files[].path in isolation; the hostile-NAME case above
    // already covers "name" on its own.
    const run = await runInto(dir, [`https://registry.example/r/${block.name}-hostile-path.json`], {
      fetchJson: async () => JSON.parse(JSON.stringify(item)),
    });
    expect(run.code).not.toBe(0);
    expect(run.err.join('\n')).toContain(hostilePath);
    expect(run.err.join('\n')).toContain('".." segment');
    expect(existsSync(path.join(root, 'evil.txt'))).toBe(false);
    expect((await readdir(root)).sort()).toEqual(before);
  });

  it('the three bundled blocks all pass the name-and-path rule (not over-strict)', () => {
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(unsafeNameReason(block.name), block.name).toBeNull();
      for (const file of block.manifest.files) {
        expect(unsafeFilePathReason(file.path), `${block.name}: ${file.path}`).toBeNull();
      }
    }
  });
});
