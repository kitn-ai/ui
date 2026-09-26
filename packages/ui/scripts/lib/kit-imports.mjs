// RESOLVE A CATALOG SNIPPET'S KIT IMPORTS AGAINST THE KIT'S REAL MODULES.
//
// WHY THIS EXISTS, and it is a security-policy problem rather than a nicety. The
// acceptance floor (invariant-floor.mjs) executes every `examples[].right` form as
// a SCRIPT in a `vm` with named bindings, where `import` fails with "Cannot use
// import statement outside a module" — measured, by trying it. That one constraint
// is why the invariant catalog used to HAND-TYPE the URL scheme lists inside its
// snippets (`['http:','https:','mailto:']`), a second copy of what
// src/primitives/url-scheme-policy.ts owns, with nothing keeping the two in step.
// It is the repo's "derive it, don't type it" rule broken on a security policy.
//
// The fix is NOT to teach the vm ESM. It is to rewrite each kit specifier to the
// FILE the imported symbol actually lives in, so esbuild bundles the shipped module
// into the snippet and the predicate that runs IS the shipped one — its list, its
// base-resolution, its empty-string refusal, all of it. A snippet that hand-types a
// list can no longer be passed off as executed advice.
//
// EVERY PATH HERE IS DERIVED FROM THE KIT. The specifier must be a key in the
// package's own `exports` map, which is exactly the "a consumer could write this
// import" claim the catalog makes about its examples. For the root barrel, which
// symbol comes from which module is read out of the barrel's own
// `export { … } from './x'` statements — never listed here, because a hand-typed
// list of names is the thing that rots (see SUBPATH_SOURCES for the one map that
// cannot be derived, and why).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const KIT_SPECIFIER = '@kitn.ai/ui';

/** One named-import statement. `import type` is captured separately so a type-only
 *  import can be checked and then erased rather than resolved to a value module. */
const NAMED_IMPORT = /import\s*(type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\3\s*;?/g;

/**
 * Where each published subpath's SOURCE barrel lives, so a specifier can be
 * resolved to the module that really defines the symbol. Not `src/<sub>/index.ts`
 * by convention: that convention silently skipped five subpaths — react,
 * web-components, solid, provider, autoloader — which is to say `Chat`,
 * `useKaiChat` and `webComponentsReady`, exactly what the pack leans on. A silent
 * miss is the shape this repo keeps deleting, so an unmapped subpath is a hard
 * failure naming this table rather than a pass.
 *
 * ONE copy, two callers: acceptance-pack.mjs resolves the symbols the pack NAMES
 * in prose through it, and the floor resolves the symbols a `right` form IMPORTS
 * through it. Two maps of the same fact is the defect this module exists to undo.
 */
export const SUBPATH_SOURCES = {
  '.': 'src/index.ts',
  'web-components': 'src/web-components/register/register.ts',
  solid: 'src/solid.ts',
  state: 'src/state/index.ts',
  wire: 'src/wire/index.ts',
  schemas: 'src/schemas/index.ts',
  react: 'frameworks/react/index.tsx',
  provider: 'src/remote/provider.ts',
  autoloader: 'src/web-components/autoloader/autoloader.ts',
};

/** The extensions a bundler would try, in the order TypeScript's own resolver does. */
const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

function resolveSourceFile(base) {
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

/** `a, b as c` -> the names a site can see, each as `[imported, local]`. */
function clausePairs(clause) {
  return clause
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [first, second] = part.split(/\s+as\s+/).map((s) => s.trim());
      return { first, second: second ?? first };
    });
}

/**
 * name -> the module it is re-exported from, read out of the barrel itself.
 * `export { internal as public }` is keyed by the PUBLIC name, which is the one an
 * importer writes. Not a list of names anywhere: a hand-typed list of which symbol
 * lives in which module is the thing that rots when the tree moves.
 */
function barrelExports(barrelSource) {
  const byName = new Map();
  for (const m of barrelSource.matchAll(/export\s*(?:type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2/g)) {
    for (const { second } of clausePairs(m[1])) byName.set(second, m[3]);
  }
  return byName;
}

/**
 * A resolver over one kit checkout. `rewrite(code)` returns the snippet with every
 * `@kitn.ai/ui…` named import pointed at the file that defines the symbol; anything
 * it cannot resolve throws, because the alternative is a snippet that runs against
 * a copy of the policy while the floor reports PASS.
 *
 * `resolved` is the live record of what it rewrote, which the floor reports: an
 * "imports were executed" claim that nothing derived would be the same hand-typed
 * assurance this module exists to remove.
 */
export function createKitImportResolver({ root }) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const exportsKeys = new Set(Object.keys(pkg.exports ?? {}));
  const barrelFile = join(root, SUBPATH_SOURCES['.']);
  const barrel = barrelExports(readFileSync(barrelFile, 'utf8'));
  const resolved = [];

  const fail = (msg) => {
    throw new Error(`kit import resolver: ${msg}`);
  };

  const fileForSubpath = (spec) => {
    const sub = spec.slice(KIT_SPECIFIER.length + 1);
    const key = `./${sub}`;
    const wildcard = [...exportsKeys].some((k) => k.endsWith('/*') && key.startsWith(k.slice(0, -1)));
    if (!exportsKeys.has(key) && !wildcard) {
      fail(
        `\`${spec}\` is not a key in packages/ui/package.json's exports map, so the catalog must not recommend it — a consumer could not write that import.`,
      );
    }
    const rel = SUBPATH_SOURCES[sub];
    if (!rel) {
      fail(
        `\`${spec}\` has no source barrel in SUBPATH_SOURCES (scripts/lib/kit-imports.mjs), so its imports cannot be resolved to the real module and the snippet would go unmeasured. Add one, or import from the root specifier.`,
      );
    }
    const file = join(root, rel);
    if (!existsSync(file)) fail(`SUBPATH_SOURCES maps \`${spec}\` to ${rel}, which does not exist in the tree.`);
    return file;
  };

  const targetFor = (spec, name) => {
    if (spec !== KIT_SPECIFIER) return fileForSubpath(spec);
    const target = barrel.get(name);
    if (!target) {
      fail(
        `\`${spec}\` does not re-export \`${name}\` from src/index.ts (its named \`export { … } from './x'\` statements are the only source read here). Either the name is wrong, or it is declared inline in the barrel rather than in its own module.`,
      );
    }
    const file = resolveSourceFile(join(dirname(barrelFile), target));
    if (!file) fail(`\`${spec}\` re-exports \`${name}\` from \`${target}\`, which does not resolve to a file.`);
    return file;
  };

  function rewrite(code) {
    const out = code.replace(NAMED_IMPORT, (whole, typeOnly, clause, _quote, spec) => {
      if (spec !== KIT_SPECIFIER && !spec.startsWith(`${KIT_SPECIFIER}/`)) return whole;
      const pairs = clausePairs(clause);
      if (!pairs.length) fail(`an import from \`${spec}\` names nothing, so there is nothing to resolve.`);
      if (typeOnly) {
        // Types do not exist at runtime, so esbuild would erase this anyway. Check
        // that every name is really exported and then erase it here, rather than
        // bundling the module to produce nothing.
        for (const { first } of pairs) targetFor(spec, first);
        return `/* the floor erased \`import type { ${pairs
          .map((p) => p.first)
          .join(', ')} }\` from \`${spec}\`: a type-only import has no runtime binding to execute */`;
      }
      return pairs
        .map(({ first, second }) => {
          const file = targetFor(spec, first);
          resolved.push({ specifier: spec, name: first, file: relative(root, file) });
          return `import { ${first}${second === first ? '' : ` as ${second}`} } from ${JSON.stringify(file)};`;
        })
        .join('\n');
    });

    // Anything left is a form this resolver does not handle — a namespace import, a
    // default import, or a side-effect import. Leaving it would let esbuild resolve
    // the specifier against node_modules, where it is either absent or a BUILT
    // dist that may be older than the tree under test. Fail instead.
    for (const m of out.matchAll(/from\s*(['"])@kitn\.ai\/ui(?:\/[^'"]*)?\1/g)) {
      fail(
        `\`${m[0]}\` was not rewritten: only a NAMED import (\`import { x } from '${KIT_SPECIFIER}'\`) is resolved here. A namespace, default or side-effect import needs handling in this module before it can be executed.`,
      );
    }
    return out;
  }

  return { rewrite, resolved };
}
