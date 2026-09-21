import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './server';

/**
 * This package's package.json, read off disk by path — deliberately NOT through the
 * `@kitn.ai/ui/package.json` specifier the code under test uses, so the two sides are
 * independent reads rather than one read compared with itself.
 */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8')) as {
  name?: string;
  version?: string;
};

/**
 * The `@kitn.ai/mcp` manifest, two directories over. Read by path for the same reason as `pkg`,
 * and because the MCP's OWN version now travels the other way: `__MCP_VERSION__` is a build-time
 * define (mcp/mcp/mcp-version.d.ts), so the only way to say the substituted value is
 * `@kitn.ai/mcp`'s is to open that package's manifest here and compare.
 */
const mcpPkg = JSON.parse(readFileSync(join(packageRoot, '..', 'mcp', 'package.json'), 'utf-8')) as {
  name?: string;
  version?: string;
};

describe('createServer', () => {
  it('registers exactly the five tools (helper)', () => {
    const tools = createServer().__listToolsForTest();
    expect(tools.sort()).toEqual(['component_reference', 'construct', 'debug', 'scaffold', 'theme']);
  });

  // ── serverInfo ──────────────────────────────────────────────────────────────
  //
  // The version the harness is told on `initialize`. It sat hand-typed at 0.15.0
  // while the kit shipped ten minors past it, and nothing here noticed, because
  // nothing here looked. Both tests below have to fail for that to come back: the
  // first catches a literal that has drifted, the second catches one typed while it
  // is still correct — which is the state every stale literal starts in.

  it("reports THIS package's name and version on initialize", async () => {
    // Anchor first: prove the file this test read is ours and carries a real
    // version, so the comparison below cannot be undefined === undefined.
    expect(pkg.name).toBe('@kitn.ai/ui');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);

    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // What a harness actually reads back: the serverInfo off the initialize result.
    expect(client.getServerVersion()).toMatchObject({
      name: pkg.name,
      version: pkg.version,
    });

    await client.close();
    await server.close();
  });

  it('derives that version instead of holding a literal in the source', () => {
    // Comments stripped first: the note in server.ts quotes the 0.15.0 literal this
    // replaced, and a record of the bug must not read as the bug.
    const source = readFileSync(join(packageRoot, 'mcp/mcp/server.ts'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const literals = source.match(/['"`]\d+\.\d+\.\d+[^'"`]*['"`]/g) ?? [];
    expect(
      literals,
      `server.ts must not carry a version literal — read it from package.json instead. ` +
        `Found: ${literals.join(', ')}`,
    ).toEqual([]);
  });

  // ── instructions ────────────────────────────────────────────────────────────
  //
  // The other half of the identity question. `serverInfo` names the KIT on purpose (that is the
  // API the tool answers describe), so the MCP package's own version is reported here or nowhere,
  // and an agent that can see only one of the two cannot tell which is stale. It is a build-time
  // define
  // because `@kitn.ai/mcp` has no `exports` map to self-resolve through (mcp/mcp/mcp-version.d.ts),
  // which makes this a coupling with three sides: the value, the substitution, and the prose that
  // has to carry it.

  it("reports the @kitn.ai/mcp version it was built from, alongside the kit's", async () => {
    // Anchors first, so the comparison below cannot be undefined === undefined: this package's
    // manifest is the real one and carries a real version.
    expect(mcpPkg.name).toBe('@kitn.ai/mcp');
    expect(mcpPkg.version).toMatch(/^\d+\.\d+\.\d+/);
    // The substituted global, against that manifest read independently. Two substitutions
    // feed this global (packages/mcp/config/vite/node.ts for the bundle, this package's
    // vitest.config.ts for this run) and both read that one field; a value typed into either
    // place, or a read that stopped pointing at @kitn.ai/mcp, fails here rather than passing a
    // comparison between a literal and itself.
    expect(__MCP_VERSION__).toBe(mcpPkg.version);

    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const instructions = client.getInstructions();
    // What a harness reads back on initialize. The SDK spreads `instructions` onto the result
    // ONLY when it is truthy, so this assertion is also what makes an EMPTY string loud: empty,
    // the field is absent and every assertion below would read `undefined` as "no instructions"
    // rather than "instructions that say nothing".
    expect(instructions, 'the SDK omits an empty instructions string entirely').toBeTruthy();
    expect(instructions).toContain(mcpPkg.version);
    expect(instructions).toContain(pkg.version);

    await client.close();
    await server.close();
  });

  it('names every tool it registers, in instructions', async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // Derived from the registry, not from a list typed into the prose: a sixth tool is named
    // the day it is registered, and a hand-written list that fell behind fails here.
    const instructions = client.getInstructions() ?? '';
    for (const name of server.__listToolsForTest()) {
      expect(instructions, `instructions must name the ${name} tool`).toContain(name);
    }

    await client.close();
    await server.close();
  });

  it('lists the five tools end-to-end over an in-memory transport', async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'component_reference',
      'construct',
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
    // component_reference with no args returns the list of all kai-* web components
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/kai-chat/);

    await client.close();
    await server.close();
  });

  // ── argument validation at dispatch ─────────────────────────────────────────
  //
  // Every tool advertises `additionalProperties: false` and a `required` list over
  // the protocol, and the dispatch handler used to enforce neither: it handed
  // `request.params.arguments` straight to the handler. The observed failure
  // (candidate A, twice reproduced — see the ladder spec and the W1 harness
  // report): component_reference called with { element: "kai-chat" } instead of
  // { name: "kai-chat" } silently returned the full index of 80+ web components with
  // isError unset, which reads as a successful answer to the question asked.
  // These tests pin the loud version, uniformly across all four tools, from the
  // ONE validation path in validate-args.ts.

  async function connectedClient() {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const close = async () => {
      await client.close();
      await server.close();
    };
    return { client, close };
  }

  function firstText(result: unknown): string {
    const { content } = result as { content: { type: string; text: string }[] };
    return content[0].text;
  }

  it('rejects an unknown argument key instead of silently answering a different question', async () => {
    const { client, close } = await connectedClient();

    const result = await client.callTool({
      name: 'component_reference',
      arguments: { element: 'kai-chat' },
    });

    expect(result.isError).toBe(true);
    const text = firstText(result);
    // The error teaches: names the wrong key, suggests the right one, and shows
    // the expected arguments — not just "invalid".
    expect(text).toMatch(/unknown argument "element"/i);
    expect(text).toMatch(/did you mean "name"/i);
    expect(text).toMatch(/component_reference/);
    // And it must NOT be the silent index the bug returned.
    expect(text).not.toMatch(/AI\/UI web components \(\d+ total\)/);

    await close();
  });

  it('suggests the near-miss spelling for a typoed key', async () => {
    const { client, close } = await connectedClient();

    const result = await client.callTool({
      name: 'scaffold',
      arguments: { framwork: 'react', integration: 'mock', placement: 'full-page' },
    });

    expect(result.isError).toBe(true);
    const text = firstText(result);
    expect(text).toMatch(/unknown argument "framwork"/i);
    expect(text).toMatch(/did you mean "framework"/i);

    await close();
  });

  it('rejects missing required keys, naming each one', async () => {
    const { client, close } = await connectedClient();

    const result = await client.callTool({ name: 'scaffold', arguments: { useCase: 'drop-in-chat' } });

    expect(result.isError).toBe(true);
    const text = firstText(result);
    for (const key of ['integration', 'placement', 'framework']) {
      expect(text).toMatch(new RegExp(`missing required argument "${key}"`, 'i'));
    }

    await close();
  });

  it('validates every tool through the same path (unknown key errors on all four)', async () => {
    const { client, close } = await connectedClient();

    for (const name of ['component_reference', 'scaffold', 'theme', 'debug']) {
      const result = await client.callTool({
        name,
        ...(name === 'scaffold'
          ? { arguments: { integration: 'mock', placement: 'full-page', framework: 'html', bogus: 1 } }
          : { arguments: { bogus: 1 } }),
      });
      expect(result.isError, `${name} should reject an unknown key`).toBe(true);
      expect(firstText(result)).toMatch(/unknown argument "bogus"/i);
    }

    await close();
  });

  it('still answers a correct call after validation is in place', async () => {
    const { client, close } = await connectedClient();

    const result = await client.callTool({
      name: 'component_reference',
      arguments: { name: 'kai-chat' },
    });
    expect(result.isError).toBeFalsy();
    expect(firstText(result)).toMatch(/<kai-chat>/);

    await close();
  });
});
