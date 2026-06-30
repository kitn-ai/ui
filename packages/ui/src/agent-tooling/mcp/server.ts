import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { reference } from './tools/reference';
import { scaffold } from './tools/scaffold';
import { theme } from './tools/theme';
import { debug } from './tools/debug';
import type { Tool } from './tools/types';

const tools: Tool[] = [reference, scaffold, theme, debug];

/**
 * The AI/UI MCP server. A stdio server (see ./stdio.ts) exposing the AI/UI tools
 * to any MCP harness. Registers four tools; Tasks 2–5 fill in each handler.
 *
 * The returned `Server` is augmented with `__listToolsForTest()`, a test-only
 * helper that returns the registered tool names without touching the transport.
 */
export interface AiUiServer extends Server {
  __listToolsForTest(): string[];
}

export function createServer(): AiUiServer {
  const server = new Server(
    { name: '@kitn.ai/ui', version: '0.15.0' },
    { capabilities: { tools: {} } },
  ) as AiUiServer;

  const byName = new Map(tools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      // The protocol requires a JSON Schema. We use zod 4's native converter
      // (the repo is on zod 4); the SDK-bundled zod-to-json-schema only
      // understands zod 3 and emits an empty schema for our zod 4 objects.
      inputSchema: z.toJSONSchema(t.inputSchema) as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
      };
    }
    return tool.handler(request.params.arguments ?? {});
  });

  server.__listToolsForTest = () => tools.map((t) => t.name);

  return server;
}
