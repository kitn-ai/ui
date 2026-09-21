# @kitn.ai/mcp

The Model Context Protocol server for [`@kitn.ai/ui`](https://www.npmjs.com/package/@kitn.ai/ui). It
gives an AI coding harness the real component API, a scaffolder, a theme tool and a debug tool, so
it builds with this library instead of guessing at it.

It runs **locally, over stdio, with no state and no network calls of its own**: your harness launches
it as a child process when a session starts and stops it when the session ends. You configure it
once; you never start it by hand.

## Configure

Claude Code:

```bash
claude mcp add kai -- npx -y @kitn.ai/mcp
```

Any client that takes a JSON config (VS Code, Cursor, OpenCode, Windsurf, Codex, Copilot, …):

```json
{
  "mcpServers": {
    "kai": {
      "command": "npx",
      "args": ["-y", "@kitn.ai/mcp"]
    }
  }
}
```

Every harness we have tested, with its own config file and key name, is on
[ui.kitn.ai/guides/for-ai-agents](https://ui.kitn.ai/guides/for-ai-agents/).

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
