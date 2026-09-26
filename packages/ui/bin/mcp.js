#!/usr/bin/env node
// The MCP server and the construct CLI MOVED OUT of @kitn.ai/ui, and then SPLIT in two:
// the MCP server is @kitn.ai/mcp, and the rest of the command line is @kitn.ai/cli.
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
    '[kai] The MCP server and the construct CLI moved out of @kitn.ai/ui.',
    '[kai]   npx @kitn.ai/ui mcp  ->  npx -y @kitn.ai/mcp',
    '[kai]   npx @kitn.ai/ui dev  ->  npx -y @kitn.ai/cli dev',
    '[kai] An MCP client config needs no verb: "args": ["-y", "@kitn.ai/mcp"].',
    '[kai] Update your MCP client config (or the script) and retry.',
  ].join('\n'),
);
process.exit(2);
