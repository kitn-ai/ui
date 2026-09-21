# @kitn.ai/cli

The `kai` command line for [`@kitn.ai/ui`](https://www.npmjs.com/package/@kitn.ai/ui): scaffold a
project or add a block to one, diagnose its kit wiring, and run the construct tooling.

It is optional. `npm install @kitn.ai/ui` and importing components needs no command line at all;
this is the tool you install when you want the convenience.

## Install

```bash
npm i -g @kitn.ai/cli      # kai ... anywhere, like any other CLI
npm i -D @kitn.ai/cli      # pinned per project: npx kai ...
npx -y @kitn.ai/cli add support-widget   # no install at all
```

## Verbs

| verb | what it does |
|---|---|
| `kai create [dir]` | the scaffolder wizard (the same one `npm create kai` runs) |
| `kai add <block>` | writes a block from the registry into an existing project |
| `kai add --list` | prints the blocks this release ships |
| `kai doctor` | diagnoses this project's kit wiring, versions and registration |
| `kai mcp` | runs the MCP server for an AI coding harness, if that package is installed |
| `kai dev <construct.json>` | live preview with reload-on-edit |
| `kai dev --builder` | the visual builder plus live preview |
| `kai compile <construct.json> [outDir]` | one self-registering `.js` |
| `kai eject <construct.json> <outDir>` | writes the generated Solid project out; the source is yours |
| `kai validate <construct.json>` | checks a construct and prints problems with paths |

## doctor

```bash
kai doctor            # human-readable
kai doctor --json     # the findings, for a CI job or an agent
kai doctor --strict   # warnings fail the run too, for CI
```

It also runs the MCP `debug` tool's rule set over your own source files — the forty-odd classic
kai-* mistakes (an array prop set as an HTML attribute, a wrong import path, and so on) — reporting
each matched rule with the files it matched and the fix. Those are warnings by default, since a rule
matches a PATTERN and a doc example can look like the mistake; `--strict` makes them fail.

It reports the CLI version and the kit it was built against, the kit range this project declares
versus the version actually installed, whether `kai.json` is present, whether anything under `src/`
references the kit, whether a kit stylesheet is referenced, and whether the MCP package is
installed. It exits non-zero only for a real problem; "no `kai.json`" is information, because a
hand-built project is not broken.

## How the forwards work

`create` and `add` are implemented by [`create-kai`](https://www.npmjs.com/package/create-kai), the
package `npm create kai` resolves — so there is one implementation, and `kai add` and
`npx create-kai add` cannot drift. `kai mcp` forwards to
[`@kitn.ai/mcp`](https://www.npmjs.com/package/@kitn.ai/mcp) when it is installed, and otherwise
says so and names `npx -y @kitn.ai/mcp`. That split is deliberate: the MCP is the only piece that
needs the MCP SDK, and installing this CLI should not download it.

## Docs

- [Getting started](https://ui.kitn.ai/guides/getting-started/) — scaffold your first project
- [For AI agents](https://ui.kitn.ai/guides/for-ai-agents/) — wiring the MCP into a harness (Claude Code, Codex, VS Code, Copilot, Cursor, Windsurf, Cline, Zed, Gemini CLI, OpenCode, dsh, Hermes; and what to do on Pi, which has no MCP in its core)
- [Blocks](https://ui.kitn.ai/blocks/) — what `kai add` can write
