# @kitn.ai/mcp

The Model Context Protocol server for [`@kitn.ai/ui`](https://www.npmjs.com/package/@kitn.ai/ui). It
gives an AI coding harness the real component API, a scaffolder, a theme tool and a debug tool, so
it builds with this library instead of guessing at it.

It runs **locally, over stdio, with no state and no network calls of its own**: your harness launches
it as a child process when a session starts and stops it when the session ends. You configure it
once; you never start it by hand.

## Configure

The server is one program, so every harness config is the same two facts: launch `npx -y
@kitn.ai/mcp`, over stdio, with no arguments. These are the mainstream harnesses; the full list of
thirteen we have tested, each with its own file and key name, is on
[ui.kitn.ai/guides/for-ai-agents](https://ui.kitn.ai/guides/for-ai-agents/).

**Claude Code** — the CLI writes the config, or put it in `.mcp.json`:

```bash
claude mcp add kai -- npx -y @kitn.ai/mcp
```

```json
{ "mcpServers": { "kai": { "command": "npx", "args": ["-y", "@kitn.ai/mcp"] } } }
```

**Codex** — `~/.codex/config.toml` (global) or `.codex/config.toml` (project):

```toml
[mcp_servers.kai]
command = "npx"
args = ["-y", "@kitn.ai/mcp"]
```

**VS Code** — `.vscode/mcp.json`, or **MCP: Open User Configuration** for the user-level file. The
top-level key is `servers`, not `mcpServers`, which is the usual copy-paste mistake:

```json
{ "servers": { "kai": { "type": "stdio", "command": "npx", "args": ["-y", "@kitn.ai/mcp"] } } }
```

**GitHub Copilot CLI** — a different file from VS Code's Copilot Chat:

```bash
copilot mcp add kai -- npx -y @kitn.ai/mcp
```

**Cursor**, **Windsurf**, **Cline**, **Zed**, **Gemini CLI** — the same `mcpServers` shape Claude Code
uses, in each tool's own config file.

**Hermes** — in `config.yaml`, or through its CLI:

```yaml
mcp_servers:
  kai:
    command: "npx"
    args: ["-y", "@kitn.ai/mcp"]
```

```bash
hermes mcp add kai --command npx --args -y @kitn.ai/mcp
hermes mcp test kai        # exits 0 on a completed connect
```

**Pi has no MCP in its core**, by design — its README says to build CLI tools with READMEs, or add
MCP through an extension. So on Pi, use the command line as a tool (`npx -y @kitn.ai/cli doctor`)
and paste `llms.txt` for the API, or add MCP with an extension and launch `npx -y @kitn.ai/mcp`
through it.

## Tools

| tool | what it answers |
|---|---|
| `component_reference` | the real `kai-*` API: props, events, slots, the property-vs-attribute rule |
| `scaffold` | generates a working chat surface wired to your backend |
| `theme` | brands the kit from a color or a description |
| `debug` | catches the classic wiring mistakes |

## What it reads, and why that matters

It runs in your project's directory and resolves the `@kitn.ai/ui` you have **installed**, so the
answers describe the API that project actually has, and it reports that version on `initialize`.
The range it declares is checked against the kit in the workspace by the repo's
`verify:workspace-ranges` guard, because a stale bound would point an agent at an API the app does
not have.

## Pinning

`npx -y @kitn.ai/mcp` fetches the latest each session. If you would rather the server match the kit
your project pins, install it and point the config at the local binary:

```bash
npm i -D @kitn.ai/mcp
```

## Not the command line

The `kai` command line — `create`, `add`, `doctor`, `dev`, `compile`, `eject`, `validate`, and a
`mcp` verb that forwards to this server — is
[`@kitn.ai/cli`](https://www.npmjs.com/package/@kitn.ai/cli). It is a separate install on purpose:
this package is the only one carrying the MCP SDK, so a developer who only wants `kai add` does not
download it.
