#!/usr/bin/env node
// The kai MCP server and the construct CLI MOVED to @kitn.ai/kai.
//
// This stub ships so that an existing MCP client config (or a script) that still says
// `npx @kitn.ai/ui mcp` fails loudly and names the fix, instead of looking like a server
// that started and then produced nothing. It is deliberately dependency-free: it must run
// in an install that never had the MCP's SDK, which is the whole point of the move.
//
// Callers: `npx @kitn.ai/ui mcp|dev|compile|eject|validate` all land here. Delete this
// file (and the `bin` entry in package.json) when the migration window closes.
console.error(
  [
    '[kai] The kai MCP and the construct CLI moved to @kitn.ai/kai.',
    '[kai]   npx @kitn.ai/ui mcp  ->  npx @kitn.ai/kai mcp',
    '[kai]   npx @kitn.ai/ui dev  ->  npx @kitn.ai/kai dev',
    '[kai] Update your MCP client config (or the script) and retry.',
  ].join('\n'),
);
process.exit(2);
