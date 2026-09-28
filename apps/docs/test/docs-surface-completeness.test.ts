// GUARD -- the docs-alignment gate REFUSES to report on a surface it cannot trust.
//
// WHY THIS FILE EXISTS. Every number `scripts/docs-alignment/index.mjs` prints is computed
// from `loadSurface()`, and `loadSurface` reads the BUILT types under `packages/ui/dist`.
// A build caught mid-write therefore looks exactly like a smaller package, and the gate
// answers with a plausible count instead of an error: one tree here reported 70 then 85
// advisories four minutes apart, and the only tell was `9 entry points` instead of `14` on
// line two of the output. A number that looks like evidence and is not is worse than a
// failure, and this repo already answers that shape elsewhere by failing loudly and naming
// the artifact it wanted (see `packages/ui/mcp/mcp/manifest.ts`).
//
// WHAT IT IS HELD TO, all derived, none hand-typed:
//   · the package's own `exports` map declares which typed entry points exist, so each must
//     have its `.d.ts` on disk and that file must export at least one name;
//   · a typed WILDCARD entry (`./web-components/*`) must match at least one file;
//   · `web-component-meta.json` and the built `dist/web-components.d.ts` are generated from
//     one source, so every element meta declares needs its `Kai<Name>Props` interface.
//
// BOTH DIRECTIONS, because a guard that always fires is as useless as one that never does:
// the fixture below PASSES when complete and the same tree, minus one file, must THROW with
// the missing path in the message. A guard for a silent wrong answer that was never shown to
// fire is decoration.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  loadSurface,
  declaredTypedEntries,
  surfaceIncompleteness,
  incompleteSurfaceMessage,
} from '../scripts/docs-alignment/surface.mjs';

const require = createRequire(import.meta.url);

/** The real package root, reached the way the docs app reaches it -- through its own
 *  dependency, so a moved or renamed manifest fails here rather than checking a stale copy. */
const UI_ROOT = dirname(require.resolve('@kitn.ai/ui/package.json'));

/**
 * A deliberately TINY package that satisfies every expectation above: two typed entry
 * points, one typed wildcard matching one module, and one element that the meta and the
 * built types agree about. The fixture passes as written, and `omit` names the single
 * expectation to remove so the same tree fails.
 */
function fixture(omit: null | 'entry' | 'wildcard' | 'empty' | 'element'): string {
  const root = mkdtempSync(join(tmpdir(), 'kai-surface-'));
  mkdirSync(join(root, 'dist/web-components'), { recursive: true });
  mkdirSync(join(root, 'src/web-components'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture-ui',
      version: '0.0.0',
      exports: {
        '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        './web-components': { types: './dist/web-components.d.ts', default: './dist/web-components.js' },
        './web-components/*': { types: './dist/web-components/*.d.ts' },
      },
    }),
  );
  if (omit !== 'entry') writeFileSync(join(root, 'dist/index.d.ts'), 'export declare const kaiFixture: number;\n');
  writeFileSync(
    join(root, 'dist/web-components.d.ts'),
    omit === 'empty'
      ? ''
      : `${omit === 'element' ? 'export interface KaiAbsentProps { n?: number }\n' : 'export interface KaiThingProps { label?: string }\n'}export declare const kaiFixture: number;\n`,
  );
  if (omit !== 'wildcard') writeFileSync(join(root, 'dist/web-components/thing.d.ts'), 'export declare const kaiThing: string;\n');
  writeFileSync(
    join(root, 'src/web-components/web-component-meta.json'),
    JSON.stringify([{ tag: 'kai-thing', className: 'KaiThing', props: [] }]),
  );
  return root;
}

/** What `loadSurface` would build for a fixture: specifier -> exported names. The guard
 *  reads this map, so the fixtures state it rather than pretending to have compiled it. */
const fakeEntries = (names: Record<string, string[]>) =>
  new Map(Object.entries(names).map(([k, v]) => [k, new Map(v.map((n) => [n, { value: true, type: false }]))]));

const COMPLETE_ENTRIES = fakeEntries({
  '@kitn.ai/ui': ['kaiFixture'],
  '@kitn.ai/ui/web-components': ['KaiThingProps', 'kaiFixture'],
});

const withFixture = (omit: Parameters<typeof fixture>[0], body: (root: string) => void) => {
  const root = fixture(omit);
  try {
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const pkgOf = (root: string) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

describe('the surface-completeness guard', () => {
  it('MUST PASS: a complete fixture reports no problem at all', () => {
    withFixture(null, (root) => {
      expect(surfaceIncompleteness(root, pkgOf(root), COMPLETE_ENTRIES)).toEqual([]);
    });
  });

  it('MUST PASS: the REAL package is complete, which is the floor every count is taken against', () => {
    const pkg = pkgOf(UI_ROOT);
    const declared = declaredTypedEntries(UI_ROOT, pkg);
    const surface = loadSurface(UI_ROOT);

    // Anchored on the manifest rather than on a number: the live check is that nothing the
    // exports map declares went unread, which is exactly what a half-written build breaks.
    expect(declared.length).toBeGreaterThan(0);
    expect(surface.entries.size).toBe(declared.length);
    expect(surfaceIncompleteness(UI_ROOT, pkg, surface.entries)).toEqual([]);
  });

  it('MUST FAIL: a declared entry point whose .d.ts was never written is named, not counted', () => {
    withFixture('entry', (root) => {
      const pkg = pkgOf(root);
      const problems = surfaceIncompleteness(root, pkg, fakeEntries({ '@kitn.ai/ui/web-components': ['x'] }));
      expect(problems.join('\n')).toContain('./dist/index.d.ts');
      // What it SAW and what it EXPECTED, both in the refusal -- the failure is only useful
      // if it says which file to go and look at.
      const message = incompleteSurfaceMessage(root, pkg, problems);
      expect(message).toContain(`2 typed entry points are declared in ${join(root, 'package.json')}`);
      expect(message).toContain('1 of them are on disk');
    });
  });

  it('MUST FAIL: an entry point that exists but exports nothing is incomplete, not small', () => {
    withFixture('empty', (root) => {
      // `entries` is the map `loadSurface` builds from the files that exist, so an empty
      // file arrives here as an entry with no names — which is the fact being checked.
      const problems = surfaceIncompleteness(
        root,
        pkgOf(root),
        fakeEntries({ '@kitn.ai/ui': ['kaiFixture'], '@kitn.ai/ui/web-components': [] }),
      );
      expect(problems.join('\n')).toContain('declares NO exports');
      expect(problems.join('\n')).toContain('web-components.d.ts exists but declares NO exports');
    });
  });

  it('MUST FAIL: a typed wildcard that matches no file is named with its pattern', () => {
    withFixture('wildcard', (root) => {
      const problems = surfaceIncompleteness(root, pkgOf(root), COMPLETE_ENTRIES);
      expect(problems.join('\n')).toContain('exports["./web-components/*"]');
      expect(problems.join('\n')).toContain('./dist/web-components/*.d.ts');
    });
  });

  it('MUST FAIL: an element the catalog declares with no interface in the built types', () => {
    withFixture('element', (root) => {
      const problems = surfaceIncompleteness(root, pkgOf(root), COMPLETE_ENTRIES);
      expect(problems.join('\n')).toContain('KaiThingProps');
      expect(problems.join('\n')).toContain('kai-thing');
    });
  });

  it('MUST FAIL: loadSurface itself refuses a half-written tree, and returns on the complete one', () => {
    withFixture(null, (root) => {
      // The same fixture loads when it is whole...
      expect(loadSurface(root).entries.size).toBe(2);
      // ...and the SAME tree, minus one built module, is refused rather than reported on.
      rmSync(join(root, 'dist/web-components/thing.d.ts'));
      expect(() => loadSurface(root)).toThrow(/INCOMPLETE/);
      expect(() => loadSurface(root)).toThrow(/web-components\/\*\.d\.ts/);
    });
  });
});
