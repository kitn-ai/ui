#!/usr/bin/env node
// AI/UI MCP server launcher. Loads the compiled stdio entry (built by
// vite.config.mcp.ts). A bin must run under plain Node, which can't execute .ts,
// so we import the dist ESM emit. `npx @kitn.ai/ui mcp` runs this (the sole bin).
//
// The built module (dist/mcp.es.js) auto-starts the server on import. We own the
// fatal-error / exit handling here (a .js file, outside tsc's typed src/), so the
// stdio entry source stays free of Node globals.
import { fileURLToPath } from 'node:url';

// stdout is the JSON-RPC channel; diagnostics must go to stderr.
function fatal(err) {
  console.error('[kitn-ui-mcp] fatal:', err);
  process.exit(1);
}
process.on('unhandledRejection', fatal);
process.on('uncaughtException', fatal);

// Resolve against this file's own URL so the import works regardless of the cwd
// or how the bin was invoked (npx, global install, symlink).
const entry = fileURLToPath(new URL('../dist/mcp.es.js', import.meta.url));
import(entry).catch(fatal);
