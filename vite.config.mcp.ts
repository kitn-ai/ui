import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

// Third build (after main + provider). Compiles the stdio MCP entry to a runnable
// Node ESM bundle so `bin/mcp.js` can `import()` it — a bin runs under plain Node,
// which can't execute .ts.
//
// Approach: an SSR (Node-target) build rather than browser `lib` mode. The brief
// suggests mirroring vite.config.provider.ts's `lib` config, but `lib` mode is a
// browser build — it would pull in browser polyfills/conditions. `build.ssr`
// gives a Node bundle directly (Node export conditions, no polyfills) with one
// knob, which is cleaner for a tool that only ever runs under Node. We name the
// output mcp.es.js via output.entryFileNames (build.ssr takes precedence over
// lib.fileName, so we set the filename on rollup output instead).
//
// Other knobs and why:
//  • emptyOutDir: false — main build (vite.config.ts) ran first with
//    emptyOutDir: true; we must NOT clobber its dist output.
//  • external — keep deps the runtime provides out of the bundle: zod, the whole
//    @modelcontextprotocol/sdk (regex covers its subpaths like /server/stdio.js),
//    and every Node builtin (bare + node: prefixed). OUR code (registry, tools)
//    is bundled inline.
const external = [
  'zod',
  /^@modelcontextprotocol\/sdk/,
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

export default defineConfig({
  build: {
    emptyOutDir: false,
    ssr: 'src/agent-tooling/mcp/stdio.ts',
    target: 'node18',
    rollupOptions: {
      external,
      output: { entryFileNames: 'mcp.es.js' },
    },
  },
});
