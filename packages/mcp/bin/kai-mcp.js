#!/usr/bin/env node
// The @kitn.ai/mcp launcher: a stdio MCP server, and NOTHING else. `npx -y @kitn.ai/mcp`
// is the whole invocation, which is why this package has one bin and no subcommands.
//
// WHY THIS IS A SEPARATE PACKAGE FROM @kitn.ai/cli. Measured: the MCP is the only part
// of the dev tooling that needs `@modelcontextprotocol/sdk` (5.9 MB installed, 17 direct
// deps), and `dist/construct-cli.es.js` does not import the kit or the SDK at runtime at
// all. One package for both jobs meant `npx @kitn.ai/cli dev` installed the SDK for a
// verb that never touches it.
//
// A bin must run under plain Node, which cannot execute .ts, so this imports the dist
// ESM emit. The built module auto-starts the server on import; the fatal-error / exit
// handling lives here, in a .js file outside tsc's typed sources, so the stdio entry
// source stays free of Node globals.
import { fileURLToPath } from 'node:url';

// stdout is the JSON-RPC channel; diagnostics must go to stderr.
function fatal(err) {
  console.error('[kitn-mcp] fatal:', err);
  process.exit(1);
}
process.on('unhandledRejection', fatal);
process.on('uncaughtException', fatal);

// Anything after the package name is a mistake: this server takes no subcommands, and
// silently ignoring an argument would leave a harness looking at a server it configured
// wrongly. Exit 2 rather than starting and answering nothing.
const [, , ...rest] = process.argv;
if (rest.length > 0) {
  console.error(
    `[kitn-mcp] unexpected argument(s): ${rest.join(' ')}\n` +
      `[kitn-mcp] The MCP server is \`npx -y @kitn.ai/mcp\` with no arguments.\n` +
      `[kitn-mcp] The kit's CLI verbs (create, add, doctor, dev, compile, eject, validate) live in @kitn.ai/cli as \`kai <verb>\`.`,
  );
  process.exit(2);
}

const entry = fileURLToPath(new URL('../dist/mcp.es.js', import.meta.url));
import(entry).catch(fatal);
