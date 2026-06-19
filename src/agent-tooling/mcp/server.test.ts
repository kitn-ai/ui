import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './server';

describe('createServer', () => {
  it('registers exactly the four tools (helper)', () => {
    const tools = createServer().__listToolsForTest();
    expect(tools.sort()).toEqual(['component_reference', 'debug', 'scaffold', 'theme']);
  });

  it('lists the four tools end-to-end over an in-memory transport', async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'component_reference',
      'debug',
      'scaffold',
      'theme',
    ]);
    // Every tool must advertise a JSON Schema object (protocol requirement).
    for (const t of tools) {
      expect(t.inputSchema).toMatchObject({ type: 'object' });
    }

    await client.close();
    await server.close();
  });

  it('dispatches a tool call to its handler', async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({ name: 'component_reference', arguments: {} });
    expect(result.content).toEqual([{ type: 'text', text: 'not yet implemented' }]);

    await client.close();
    await server.close();
  });
});
