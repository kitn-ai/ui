import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';

/**
 * Build entry for the AI/UI MCP server. Connects the server (./server.ts) to a
 * stdio transport so any MCP harness (Claude Code, Codex, …) can drive it over
 * stdin/stdout. Compiled to dist/mcp.es.js by the `mcp` target in
 * packages/mcp/config/vite/node.ts (that package's build; see that file for why the
 * sources stay here) and launched by packages/mcp/bin/kai-mcp.js, which handles fatal errors / exit (this file stays free of Node
 * globals so it typechecks under the repo's vite/client-only tsconfig).
 */
export async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Auto-start when imported as the entry (the only consumer is bin/kai-mcp.js).
startStdioServer();
