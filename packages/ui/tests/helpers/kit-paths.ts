// Resolve a source file by basename under `src/components/` and `src/primitives/`,
// plus the package root, so a guard can name the file it asserts about without
// pinning a depth.
//
// `src/components/` is 92 family folders and `src/primitives/` holds the headless
// logic and cross-layer data shapes (2026-09-01, widened 2026-09-19 when
// attachment-types, use-card-resolution and construct-form-paths moved there).
// Every guard that hard-coded `src/components/x.tsx` went red for a reason that
// had nothing to do with the behaviour it guards. A basename stays true across a
// move; a depth does not. Basenames are unique across both trees, which is what
// makes the lookup unambiguous — a duplicate throws here rather than silently
// picking the first match, because "the scan resolved to a file nobody meant" is
// how a guard starts asserting about nothing.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// NOT src/web-components: a facade and its Solid component share a basename by
// design (switch.tsx exists in both), so folding them into one basename index made
// this helper throw on a legitimate lookup. A guard that means the FACADE names its
// path (or walks the layer). Widened once, reverted the same day, with the reason.
const SOURCE_DIRS = ['src/components', 'src/primitives'].map((d) => resolve(PKG_ROOT, d));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else out.push(p);
  }
  return out;
}

const SOURCE_FILES = SOURCE_DIRS.flatMap((dir) => sourceFiles(dir));

/** The absolute path of the one `src/{components,primitives}/**\/<basename>`. Throws if
 *  it is not exactly one, so a rename or a duplicate is loud instead of a silent miss. */
export function componentSourcePath(basename: string): string {
  const hits = SOURCE_FILES.filter((p) => p.endsWith(`/${basename}`));
  if (hits.length !== 1) {
    throw new Error(
      `kit-paths: expected exactly one src/{components,primitives}/**/${basename}, found ${hits.length}` +
        (hits.length ? `: ${hits.map((h) => relative(PKG_ROOT, h)).join(', ')}` : ''),
    );
  }
  return hits[0];
}

/** The same file spelled relative to the package root, e.g. `src/components/x/x.tsx`. */
export function componentSourceRel(basename: string): string {
  return relative(PKG_ROOT, componentSourcePath(basename));
}

/** The component's own source text. */
export function componentSource(basename: string): string {
  return readFileSync(componentSourcePath(basename), 'utf8');
}
