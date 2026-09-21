import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// The MCP server bundle: dist/mcp.es.js, the stdio server launched by bin/kai-mcp.js.
// A build.ssr bundle targeting node18, with the standard library, zod and the whole
// @modelcontextprotocol/sdk external.
//
// WHY THE SOURCES STAY IN packages/ui AND ONLY THE BUILD LIVES HERE. `mcp/mcp/**` is
// typechecked by ui's tsconfig.mcp.json and sits beside the catalog and the construct
// engine it shares types with, and `mcp/construct/**` cannot move at all (it is the
// source of the kit's public `./construct` export). So this package owns the PUBLISHING
// of one bundle whose entry point is the kit's, and builds it from `../ui`. That is the
// same shape packages/cli uses for its bundle; the difference is that THIS package is
// the only one carrying the MCP SDK dependency.
//
// CONSEQUENCE, stated rather than discovered later: this build needs the monorepo
// checkout, exactly as every other workspace package's does. `packages/mcp` alone is not
// buildable. What it must NOT do is read the checkout at RUNTIME: the bundle resolves the
// kit's manifest through the published package, which is why `@kitn.ai/ui` is a real
// dependency here and not a devDependency.
const UI_PKG = resolve(__dirname, '../../../ui');
const MCP_PKG = resolve(__dirname, '../..');

// The MCP `instructions` name this server's OWN version, and `mcp/mcp/server.ts` cannot
// read it at runtime: this package has no `exports` map to self-resolve through, and that
// module runs at two depths (packages/ui/mcp/mcp/ under vitest, packages/mcp/dist/ in the
// bundle). Substituted here, declared in packages/ui/mcp/mcp/mcp-version.d.ts, and
// read back out of the built artifact by verify:bundle-shape.
//
// Rename the key in server.ts and not here and tsc still passes, while the bundle keeps a
// bare identifier: measured, the CLI then exits 1 with
// `[kitn-mcp] fatal: ReferenceError: __MCP_VERSION__ is not defined`.
function packageVersion(dir: string): string {
  const manifest = join(dir, 'package.json');
  const { version } = JSON.parse(readFileSync(manifest, 'utf-8'));
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(`config/vite/node.ts: ${manifest} has no string "version" to substitute.`);
  }
  return version;
}

const MCP_VERSION = packageVersion(MCP_PKG);

const NODE_BUILTINS = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

interface Target {
  entry: string;
  out: string;
  external: (string | RegExp)[];
}

const TARGETS: Record<string, Target> = {
  mcp: {
    entry: 'mcp/mcp/stdio.ts',
    out: 'mcp.es.js',
    // What the runtime provides. OUR code (the catalog, the tools, the invariant
    // engine) is bundled inline, which is why the shipped artifact carries the catalog
    // rather than reading it from disk.
    //
    // `@knit.ai/ui` IS LISTED EXPLICITLY, and that is load-bearing rather than
    // belt-and-braces: vite's SSR build externalises declared dependencies by name, but a
    // package LINKED into the workspace resolves to a real path outside node_modules and
    // gets bundled as source instead. Measured: without this entry the bundle is 616,800 B
    // and carries a snapshot of the kit's schemas and wire; with it, 572,000 B and both
    // stay specifiers, which is the design -- the MCP describes the kit it RESOLVES at
    // runtime, and packages/mcp's `verify:versions` guard is what keeps the range honest.
    external: ['zod', /^@modelcontextprotocol\/sdk/, /^@kitn\.ai\/ui(\/|$)/, ...NODE_BUILTINS],
  },
};

const requested = process.env.KAI_BUILD ?? '';
if (!Object.hasOwn(TARGETS, requested)) {
  throw new Error(
    `config/vite/node.ts: KAI_BUILD must be one of [${Object.keys(TARGETS).join(', ')}], got ${JSON.stringify(process.env.KAI_BUILD)}`,
  );
}
const target: Target = TARGETS[requested];

export default defineConfig({
  root: MCP_PKG,
  define: {
    __MCP_VERSION__: JSON.stringify(MCP_VERSION),
  },
  build: {
    // Empty, because one target owns this dist/ entirely -- unlike the CLI's, where the
    // first target carries the clean and the later ones write into the same directory.
    emptyOutDir: true,
    // build.ssr rather than lib mode: lib is a browser build and would pull browser
    // polyfills into a tool that only ever runs under Node. The filename is set on the
    // rollup output because build.ssr takes precedence over lib.fileName.
    ssr: resolve(UI_PKG, target.entry),
    target: 'node18',
    rollupOptions: {
      external: target.external,
      output: { entryFileNames: target.out },
    },
  },
});
