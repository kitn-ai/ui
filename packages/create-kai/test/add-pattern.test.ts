/**
 * `create-kai add <pattern>` through the real `runAdd` path, against the
 * patterns the CLI actually ships (`dist/patterns`, the copy the build makes).
 * The fixture pattern is `hello-pattern`; the loop over EVERY shipped pattern
 * means one added later is covered on arrival.
 */
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runAdd } from '../src/add';
import type { AddEnv } from '../src/add';
import { loadPatterns } from '../src/blocks';
import { BLOCKS_ROOT, KIT_RANGE, KIT_VERSION } from './helpers';

const PATTERNS_ROOT = path.resolve(BLOCKS_ROOT, '../patterns');
let root: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'create-kai-add-pattern-'));
});
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function run(dir: string, argv: string[], over: Partial<AddEnv> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runAdd(argv, {
    cwd: dir,
    blocksRoot: BLOCKS_ROOT,
    kitRange: KIT_RANGE,
    kitVersion: KIT_VERSION,
    interactive: false,
    io: { ask: async (axis) => axis.options[0].id, state: () => {} },
    out: (l) => out.push(l),
    error: (l) => err.push(l),
    ...over,
  });
  return { code, out, err };
}

async function fresh(id: string, pkg: object | null): Promise<string> {
  const dir = path.join(root, id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  if (pkg !== null) await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg));
  return dir;
}

const authored = (file: string) => readFile(path.join(PATTERNS_ROOT, 'hello-pattern', file), 'utf8');
const written = (dir: string, file: string) => readFile(path.join(dir, 'src/patterns/hello-pattern', file), 'utf8');

describe('add <pattern>', () => {
  it('ships hello-pattern in the CLI build', async () => {
    expect((await loadPatterns(PATTERNS_ROOT)).map((p) => p.name)).toContain('hello-pattern');
  });

  it('into a project: files land byte-identical under src/patterns/<id>/, kit added to deps', async () => {
    const dir = await fresh('project', { name: 'app', dependencies: {} });
    const { code, err } = await run(dir, ['hello-pattern']);
    expect(err).toEqual([]);
    expect(code).toBe(0);
    for (const file of ['hello-pattern.html', 'hello-pattern.ts']) expect(await written(dir, file)).toBe(await authored(file));
    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@kitn.ai/ui']).toBe(KIT_RANGE);
  });

  it('with no project: identical except the kit import line, which is pinned to the CDN', async () => {
    const dir = await fresh('bare', null);
    const { code, out } = await run(dir, ['hello-pattern']);
    expect(code).toBe(0);
    expect(await written(dir, 'hello-pattern.html')).toBe(await authored('hello-pattern.html'));
    const before = (await authored('hello-pattern.ts')).split('\n');
    const after = (await written(dir, 'hello-pattern.ts')).split('\n');
    expect(after).toHaveLength(before.length);
    const changed = after.map((line, i) => [line, before[i]]).filter(([a, b]) => a !== b);
    expect(changed).toHaveLength(1);
    expect(changed[0][0]).toContain(`@kitn.ai/ui@${KIT_VERSION}/dist/kai.es.js`);
    // Decided loudly: the note says the script is TypeScript.
    expect(out.join('\n')).toMatch(/pinned to jsDelivr/);
  });

  it('refuses to overwrite, listing the files', async () => {
    const dir = await fresh('collide', { name: 'app' });
    expect((await run(dir, ['hello-pattern'])).code).toBe(0);
    const again = await run(dir, ['hello-pattern']);
    expect(again.code).toBe(1);
    expect(again.err.join('\n')).toContain('src/patterns/hello-pattern/hello-pattern.html');
  });

  it('says out loud that --form has no meaning for a pattern', async () => {
    const dir = await fresh('form-flag', { name: 'app' });
    const { code, out } = await run(dir, ['hello-pattern', '--form', 'react']);
    expect(code).toBe(0);
    expect(out.join('\n')).toMatch(/is a pattern, which has no per-framework form; --form react is ignored/);
  });

  it('an unknown name still fails as a block lookup, naming --list', async () => {
    const dir = await fresh('unknown', { name: 'app' });
    const { code, err } = await run(dir, ['no-such-thing']);
    expect(code).toBe(1);
    expect(err.join('\n')).toMatch(/no block named "no-such-thing"/);
  });

  it('--list shows the pattern, and --list --json carries a patterns array', async () => {
    const text = await run(root, ['--list']);
    expect(text.out.join('\n')).toMatch(/hello-pattern .*\(pattern\)/);
    const json = await run(root, ['--list', '--json']);
    const parsed = JSON.parse(json.out.join('\n'));
    expect(parsed.patterns.map((p: { name: string }) => p.name)).toContain('hello-pattern');
  });

  it('resolves a pattern item JSON URL through the same path', async () => {
    const dir = await fresh('url', { name: 'app' });
    const item = {
      name: 'hello-pattern',
      kind: 'pattern',
      title: 'Hello',
      description: 'From a URL.',
      files: [
        { path: 'hello-pattern.html', type: 'html', content: '<kai-button>x</kai-button>' },
        { path: 'hello-pattern.ts', type: 'ts', content: "import '@kitn.ai/ui/web-components';\n" },
      ],
    };
    const { code, err } = await run(dir, ['https://example.test/r/hello-pattern.json'], { fetchJson: async () => item });
    expect(err).toEqual([]);
    expect(code).toBe(0);
    expect(await written(dir, 'hello-pattern.html')).toBe('<kai-button>x</kai-button>');
  });

  it('refuses a hostile pattern item JSON (path traversal)', async () => {
    const dir = await fresh('hostile', { name: 'app' });
    const item = {
      name: 'evil',
      kind: 'pattern',
      title: 'E',
      description: 'E.',
      files: [{ path: '../../x.html', type: 'html', content: '' }],
    };
    const { code, err } = await run(dir, ['https://example.test/r/evil.json'], { fetchJson: async () => item });
    expect(code).toBe(1);
    expect(err.join('\n')).toMatch(/"\.\." segment/);
    expect((await readdir(dir)).includes('src')).toBe(false);
  });
});
