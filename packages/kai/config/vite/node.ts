import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// The `kai` CLI's two Node bundles: dist/mcp.es.js (the MCP stdio server, launched
// by bin/mcp.js) and dist/construct-cli.es.js (dev/compile/eject/validate). Both are
// build.ssr bundles targeting node18 with the standard library and zod external.
//
// WHY THE SOURCES STAY IN packages/ui AND ONLY THE BUILD LIVES HERE. `mcp/construct/**`
// cannot move: it is the source of the kit's PUBLIC `./construct` export, and
// `src/primitives/construct-form-paths.ts` imports it (a declared
// `lint:layer-direction` exception, with `src/components/builder/builder-start.tsx`).
// `mcp/mcp/**` is likewise typechecked by ui's tsconfig.mcp.json. So this package owns
// the PUBLISHING of two bundles whose entry points are the kit's, and builds them from
// `../ui`.
//
// CONSEQUENCE, stated rather than discovered later: this build needs the monorepo
// checkout, exactly as every other workspace package's does. `packages/kai` alone is
// not buildable. What it must NOT do is read the checkout at RUNTIME -- the bundles
// resolve the kit's manifest through the published package (see
// mcp/mcp/manifest.ts), which is why `@kitn.ai/ui` is a real dependency here.
const UI_PKG = resolve(__dirname, '../../../ui');
const KAI_PKG = resolve(__dirname, '../..');

// `__KAI_VERSION__`: the MCP `instructions` name the CLI's OWN version, and `mcp/mcp/server.ts`
// cannot read it at runtime (no `exports` map here to self-resolve through, and that module runs
// at two depths). Substituted here and in packages/ui/vitest.config.ts, both from this package's
// manifest; declared in packages/ui/mcp/mcp/kai-version.d.ts.
//
// Rename the key in server.ts and not here and tsc still passes, while the bundle keeps a bare
// identifier: measured on a bundle built with the key renamed, the CLI exits 1 with
// `[kitn-ui-mcp] fatal: ReferenceError: __KAI_VERSION__ is not defined`. verify:bundle-shape
// reads the substitution back out of the artifact so the build leg catches it instead.
//
// Both targets, not just `mcp`: this is a fact about the package, like its name.
function packageVersion(dir: string): string {
  const manifest = join(dir, 'package.json');
  const { version } = JSON.parse(readFileSync(manifest, 'utf-8')) as { version?: unknown };
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(`config/vite/node.ts: ${manifest} has no string "version" to substitute.`);
  }
  return version;
}

const KAI_VERSION = packageVersion(KAI_PKG);

const NODE_BUILTINS = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

interface Target {
  /** Entry point, relative to packages/ui. */
  entry: string;
  /** Emitted filename under this package's dist/. */
  out: string;
  external: (string | RegExp)[];
}

const TARGETS: Record<string, Target> = {
  // The MCP server. `build.ssr` rather than lib mode: lib is a browser build and would
  // pull browser polyfills into a tool that only ever runs under Node. The filename is
  // set on rollup output because build.ssr takes precedence over lib.fileName.
  //
  // external: what the runtime provides -- zod, the whole @modelcontextprotocol/sdk
  // (the regex covers its subpaths), and every Node builtin. OUR code (the catalog,
  // the tools, the construct engine) is bundled inline, which is why the shipped
  // bundle carries the invariant catalog rather than reading it from disk.
  mcp: {
    entry: 'mcp/mcp/stdio.ts',
    out: 'mcp.es.js',
    external: ['zod', /^@modelcontextprotocol\/sdk/, ...NODE_BUILTINS],
  },
  // dev/compile/eject/validate. vite + vite-plugin-solid are NOT bundled: the CLI runs
  // them inside the GENERATED project through that project's own npm scripts.
  'construct-cli': {
    entry: 'mcp/construct/cli-entry.ts',
    out: 'construct-cli.es.js',
    external: ['zod', ...NODE_BUILTINS],
  },
};

const FIRST_TARGET = 'mcp';

const requested = process.env.KAI_BUILD ?? '';
if (!Object.hasOwn(TARGETS, requested)) {
  throw new Error(
    `config/vite/node.ts: KAI_BUILD must be one of [${Object.keys(TARGETS).join(', ')}], got ${JSON.stringify(process.env.KAI_BUILD)}`,
  );
}
const target = TARGETS[requested];

export default defineConfig({
  root: KAI_PKG,
  define: {
    __KAI_VERSION__: JSON.stringify(KAI_VERSION),
  },
  build: {
    // The `mcp` build runs first in `npm run build` and owns the clean, so the three
    // later targets (which write into the same dist/) cannot wipe its output. The
    // ordering is in package.json's `build` script, and this is the only place that
    // knows it.
    emptyOutDir: requested === FIRST_TARGET,
    ssr: resolve(UI_PKG, target.entry),
    target: 'node18',
    rollupOptions: {
      external: target.external,
      output: { entryFileNames: target.out },
    },
  },
});
