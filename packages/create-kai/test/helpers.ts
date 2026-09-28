/**
 * Shared test fixtures for the CLI's own suites: the bundled block registry
 * (the same `dist/blocks` copy `node dist/index.js add` walks) and the
 * fake-but-stable kit pins tests build a plan against.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import { componentName } from '@kitn.ai/blocks/forms';

import { loadBlocks } from '../src/blocks';
import type { Block } from '../src/blocks';

export const BLOCKS_ROOT = path.resolve(__dirname, '../dist/blocks');
export const KIT_RANGE = '^9.9.9';
export const KIT_VERSION = '9.9.9';

export async function loadBundledBlocks(): Promise<Block[]> {
  if (!existsSync(BLOCKS_ROOT)) {
    throw new Error(`no blocks at ${BLOCKS_ROOT} - run \`pnpm --filter create-kai run build\` first`);
  }
  return loadBlocks(BLOCKS_ROOT);
}

/**
 * A block authored ON the contract: one marked block root, the wiring on the
 * markup, and a controller instead of an entry script.
 *
 * A synthetic one keeps a case about route resolution or write targets from
 * also being a case about whichever real block happens to suit it: no authored
 * block declares a `route:` dependency, and none should have to. The type
 * names the controller declares are fixed by the contract, so they are derived
 * from the block id here too.
 */
export function authoredBlock(name: string, manifest: Partial<Block['manifest']> = {}): Block {
  const component = componentName(name);
  // A GATEWAY IS A CLAIM ABOUT A ROUTE, and the manifest validator (`packages/
  // blocks/src/registry.ts`) enforces that a block advertising one ships the
  // SEAM that makes it real: `wiring.modeTarget` plus one authored source per
  // data mode. So a fixture that declares a gateway gets the same seam an
  // authored block does - otherwise the fixture advertises a capability with
  // nothing behind it, which is exactly what the validator rejects.
  const wiring = manifest.wiring;
  // Each seam source ships as its `.ts` AND its already-JavaScript `.js` twin,
  // exactly what `writeBlockTree` does for the controller and what the build
  // does for every authored `.ts`. The twin is not decoration: the html form
  // ships JavaScript and refuses a `.ts` without one, and the strip happens at
  // BUILD time - a fixture is written at test time, so it carries its own.
  const seamSources = ['mock', 'real', 'none'].map((mode) => `${name}.transport.${mode}`);
  const seamFiles = seamSources.flatMap((base) => [`${base}.ts`, `${base}.js`]);
  const hasSeam = (wiring?.gateways?.length ?? 0) > 0;
  const files = new Map<string, string>([
    [
      `${name}.html`,
      `<!doctype html>\n<html><body><kai-thread data-block-root id="t" #ref="thread" .messages="messages"></kai-thread></body></html>`,
    ],
    [
      `${name}.controller.ts`,
      [
        ...(hasSeam
          ? [
              `import { transport } from './${name}.transport';`,
              '/** the resolved transport, re-exported so a bundler cannot prune the seam */',
              'export { transport };',
            ]
          : []),
        `export interface ${component}State { messages: unknown[]; }`,
        `export interface ${component}Refs { thread: unknown; }`,
        `export interface ${component}Actions { boot(): Promise<void>; }`,
        `export function createController(deps: { refs: () => ${component}Refs }) {`,
        '  return deps as never;',
        '}',
        '',
      ].join('\n'),
    ],
    [`${name}.controller.js`, 'export function createController(deps) {\n  return deps;\n}\n'],
  ]);
  const manifestFiles: NonNullable<Block['manifest']['files']> = [
    { path: `${name}.html`, type: 'registry:page' },
    { path: `${name}.controller.ts`, type: 'registry:file' },
    { path: `${name}.controller.js`, type: 'registry:file' },
  ];
  const declaredWiring = hasSeam
    ? {
        ...wiring,
        mockFiles: wiring?.mockFiles ?? [`${name}.transport.mock.ts`],
        modeTarget: wiring?.modeTarget ?? `${name}.transport.ts`,
        modeFiles: wiring?.modeFiles ?? {
          mock: `${name}.transport.mock.ts`,
          real: `${name}.transport.real.ts`,
          none: `${name}.transport.none.ts`,
        },
      }
    : wiring;
  if (hasSeam) {
    for (const path of seamFiles) files.set(path, seamSource(name, path));
    for (const path of seamFiles) manifestFiles.push({ path, type: 'registry:file' });
  }
  return {
    name,
    manifest: {
      name,
      title: component,
      description: `the ${name} test fixture`,
      type: 'registry:block',
      files: manifestFiles,
      ...manifest,
      ...(declaredWiring !== undefined ? { wiring: declaredWiring } : {}),
    },
    files,
  };
}

/**
 * One authored seam source per data mode, named at its own path (never at the
 * target, which `add` writes). Mode-distinguishable so a case can tell which
 * variant landed at the target.
 */
function seamSource(name: string, path: string): string {
  const mode = path.includes('.mock.') ? 'mock' : path.includes('.none.') ? 'none' : 'real';
  return [
    `/** ${name}'s ${mode} transport: the authored source the \`${mode}\` data mode is written from. */`,
    `export const transport = { mode: '${mode}' } as const;`,
    `export const ${mode}Transport = transport;`,
    '',
  ].join('\n');
}
