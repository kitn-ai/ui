// Resolve a component's SOURCE by basename under `src/components/`, and the
// package root, so a guard can name the component it asserts about without
// pinning a family folder.
//
// `src/components/` is 92 family folders now (2026-09-01), and every guard that
// hard-coded `src/components/x.tsx` went red for a reason that had nothing to do
// with the behaviour it guards. A basename stays true across a reorg; a depth
// does not. Basenames are unique across the tree, which is what makes the lookup
// unambiguous — a duplicate throws here rather than silently picking the first
// match, because "the scan resolved to a file nobody meant" is how a guard starts
// asserting about nothing.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const COMPONENTS_DIR = resolve(PKG_ROOT, 'src/components');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else out.push(p);
  }
  return out;
}

const COMPONENT_SOURCES = sourceFiles(COMPONENTS_DIR);

/** The absolute path of the one `src/components/**\/<basename>`. Throws if it is
 *  not exactly one, so a rename or a duplicate is loud instead of a silent miss. */
export function componentSourcePath(basename: string): string {
  const hits = COMPONENT_SOURCES.filter((p) => p.endsWith(`/${basename}`));
  if (hits.length !== 1) {
    throw new Error(
      `kit-paths: expected exactly one src/components/**/${basename}, found ${hits.length}` +
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
