# MCP Server Evaluation for `@kitnai/chat`

**Date:** 2026-06-12
**Reviewer role:** Skeptical architect
**Subject:** Should `@kitnai/chat` ship an MCP server to help coding agents (Claude Code, Codex, Copilot) build and configure chat apps with it?
**Library version at time of review:** 0.3.1 (spike/composable-web-components, 28 elements)

---

## 1. What an MCP Server Could Expose

Concretely, an MCP server for this library would draw on one primary artifact: `dist/custom-elements.json` (the Custom Elements Manifest, auto-generated every build from TypeScript source via `scripts/gen-element-api.mjs`). The natural tool surface would be:

### Tools

| Tool | Description | Source |
|---|---|---|
| `list_elements` | Returns all 27+ element tag names with one-line descriptions | `custom-elements.json` |
| `get_element_api(tag)` | Returns full props, attributes, events, and type signatures for one element | `custom-elements.json` |
| `search_config(query)` | Free-text search across element names, prop names, descriptions | `custom-elements.json` + docs |
| `scaffold_integration(framework, layer)` | Emits a starter snippet (plain HTML / React / Vue / SolidJS) wiring up the specified element(s) | Template strings + manifest |
| `explain_pattern(pattern)` | Prose explanation of a specific pattern: streaming, theming, Shadow DOM isolation, event wiring | Static docs |
| `validate_message_schema(json)` | Validates a `ChatMessage[]` object against the `ChatMessage` TypeScript interface | Inline schema |

### Resources

| Resource URI | Content |
|---|---|
| `kitn://manifest` | Raw `custom-elements.json` |
| `kitn://docs/web-components` | Full `docs/web-components.md` |
| `kitn://docs/readme` | `README.md` |

### What would NOT be worth exposing via MCP

- The SolidJS source API (agents writing Solid apps can read `src/index.ts` directly; the manifest covers elements only)
- Storybook / visual rendering (out of scope for a code-assist MCP)
- Any stateful session (the library is stateless by design — all state lives in the host app)

---

## 2. Value vs. Static `llms.txt` + `custom-elements.json` + Good Docs

This is the crux. The question is not "could MCP add value in theory" but "does MCP add *enough* value over static files to justify building and maintaining it."

### Where static files win outright

**Zero setup.** An agent operating in a repo with `@kitnai/chat` installed can read `node_modules/@kitnai/chat/dist/custom-elements.json` right now, with no server, no config, no `npx`. Claude Code literally has a Read tool. The manifest is 75 KB of well-structured JSON with full type signatures. An LLM can parse it in one context window. `docs/web-components.md` is 4 KB of prose with the full `ChatMessage` schema and complete working examples. `README.md` adds integration patterns (streaming, TTS, theming). Combined, these three files answer ~95% of what an agent needs to write integration code.

**Versioned with the install.** The manifest in `node_modules` is exactly the manifest that shipped with the installed version. There is no version-skew risk — if you install `0.3.1`, you get `0.3.1`'s manifest. An MCP server that wraps the latest published manifest would give agents wrong answers for users on older versions.

**Offline / no subprocess required.** Agents running in CI, air-gapped environments, or constrained sandboxes can read static files. An MCP server requires a running subprocess.

**`llms.txt` is a proven pattern.** A well-written `llms.txt` at the package root — a compact prose summary of the library's mental model, its two-layer architecture, the property/event/attribute contract, and the key gotchas (Shadow DOM isolation, controlled data model, `new array + new object` for streaming re-renders, `--kc-*` CSS override surface) — costs one afternoon to write and essentially never needs updating unless the architecture changes. Combined with the machine-readable manifest, it gives agents exactly what they need.

### Where MCP genuinely wins

There are three specific scenarios where a runtime MCP server would be meaningfully better:

**1. Always-current API queries across versions.** If a team maintains multiple apps on different versions of `@kitnai/chat`, a server could query "what does `kitn-chat` look like in version 0.2.x vs 0.3.x" — something static per-install files cannot do. This is real but narrow: version-skew issues are uncommon for a single UI component library and are addressed adequately by checking the installed manifest.

**2. Scaffolding with project introspection.** A `scaffold_integration(framework, layer)` tool could inspect the user's actual project (detect React vs Vue, detect existing theme files, detect whether `@kitnai/chat` is installed) and emit a complete, ready-to-run integration. This is beyond what static files offer. However, Claude Code's own native tools (Read, Bash, Write) let the agent do the same thing without any MCP server — it reads `package.json`, reads the manifest, and writes the file. The MCP tool would be a thin wrapper that the agent's built-in tools already replicate.

**3. Validation.** A `validate_message_schema` tool could catch a malformed `ChatMessage[]` at the call site. In practice, TypeScript types in the installed package already do this at compile time; the marginal value at LLM-query time is low.

### Net assessment

The use cases that benefit from MCP are either narrow (multi-version comparison) or already covered by the agent's own native capabilities (scaffolding, validation). The static approach — `llms.txt` + `custom-elements.json` + `docs/web-components.md` — gives agents everything they need to write correct integration code today, without any server, configuration, or maintenance burden.

---

## 3. Cost / Maintenance / Distribution

Even if the value case were stronger, the cost/maintenance picture pushes against shipping an MCP server at this stage.

### Distribution and setup friction

Users would need to:
1. Add MCP config to their agent's settings (Claude Code `~/.claude/mcp.json`, VS Code Copilot config, etc.)
2. Either run a persistent server (`npx @kitnai/mcp-server`) or rely on stdio transport launched on demand
3. Keep the MCP server version aligned with their installed library version

None of these steps are catastrophic, but they are all friction that static files eliminate. For a developer who just ran `npm install @kitnai/chat` and wants to get a snippet from Claude Code, the static path is zero-config.

### Versioning

The manifest is generated per build, versioned with the npm package. An MCP server adds a second artifact that must track the library version. If the server lags behind (the maintainer ships 0.4.0 but the MCP server hasn't been updated), agents get stale or wrong API descriptions — arguably worse than no server. With static files there is no coordination problem.

### Maintenance surface

An MCP server is a production artifact: it needs its own package.json, a test suite, CI, npm publish pipeline, and documentation. For a team already maintaining a 28-element component library with its own build pipeline, codegen scripts, Storybook, Vitest test suite, Playwright tests, and docs, this is a real additional burden. The library's current codegen approach (`scripts/gen-element-api.mjs`) is already the right philosophy — derive artifacts from the TypeScript source, don't hand-maintain them. An MCP server built on that same manifest would be sound architecturally, but adding a third publish target and a separate npm package management line is overhead the current team size may not absorb well.

### Security surface

An MCP server launched via `npx` or stdio runs code on the user's machine. For a read-only information server wrapping static JSON this is low-risk, but it is nonzero. The static approach has no security surface at all.

### Proportionality

`@kitnai/chat` currently exports 27 elements across a deliberate two-layer architecture. The entire public surface fits in three files totaling under 100 KB of text. This is not a sprawling SDK with hundreds of APIs, complex configuration graphs, or runtime state — it is a focused UI component library with a clear controlled-data model. The complexity does not justify an MCP server.

---

## 4. Recommendation: AGAINST (with a clear revisit trigger)

**Recommendation: AGAINST shipping an MCP server now.**

### Reasoning

The static deliverables — `dist/custom-elements.json` (already ships), `docs/web-components.md` (already exists), and a new `llms.txt` at the package root (one afternoon of work) — give coding agents everything they need. The manifest is machine-readable, version-locked to the install, and requires zero setup. Agents with Read/Bash tools (Claude Code, Copilot in agent mode) can ingest these files directly. The MCP server's most defensible value-add (scaffolding with project introspection) is already replicable with native agent tools.

The cost-to-benefit ratio is inverted for this library's current scale: one new publish artifact, version-coordination complexity, setup friction for end users, and ongoing maintenance — in exchange for marginal capability gains that static files already cover adequately.

### What to ship instead (static deliverables that make MCP unnecessary now)

| Deliverable | Effort | Value |
|---|---|---|
| `llms.txt` at package root | ~4 hours | High — compact mental model, gotchas, architecture overview for any LLM |
| `dist/custom-elements.json` | Already ships | High — machine-readable manifest, version-locked |
| `docs/web-components.md` | Already exists | High — full element API with typed schemas and examples |
| Manifest field-quality pass | ~2 hours | Medium — the `kitn-chat` element's fields currently have empty `description` strings in the manifest; filling them in improves agent queries significantly |
| Link manifest in `llms.txt` | Trivial | Medium — tells agents where to find the structured data |

The manifest generation script (`scripts/gen-element-api.mjs`) is already the right foundation: it derives structured docs from TypeScript source automatically. The missing piece is a human-readable companion (`llms.txt`) that explains the mental model an LLM needs to use those docs correctly (the controlled-data pattern, Shadow DOM implications, the `new array + new object` streaming requirement, `--kc-*` token surface).

### Trigger to revisit

Reconsider an MCP server if **two or more** of the following become true:

1. The library grows to 60+ elements across multiple semantic modules (enough that single-file manifest reads are unwieldy)
2. There is a demonstrated agent failure mode that static files cannot fix — e.g., agents consistently misusing the API in ways that prose docs address but agents ignore because they don't read them
3. The team wants to expose **write-side** capabilities: scaffolding that mutates the user's project, migration tools (v0.x → v1.x upgrades), or live theming previews
4. A significant ecosystem forms (10+ third-party integrations, plugin registry) that itself benefits from runtime discovery
5. The library ships an interactive Storybook or playground that already requires a running server — at that point, adding MCP endpoints to the same server is nearly free

Until then, excellent static docs outperform a poorly-maintained MCP server every time, and this library's codegen pipeline is already producing the right artifacts.

---

## Appendix: Minimal Viable MCP Shape (if the decision reverses)

If the team revisits and decides to proceed, the minimum viable design is:

```
@kitnai/mcp-server (npm package, separate from @kitnai/chat)

Entry: mcp-server.mjs (stdio transport, no HTTP — no persistent process required)

Tools:
  - list_elements()                  → array of { tag, description }
  - get_element_api(tag: string)     → full element schema from manifest
  - search_elements(query: string)   → fuzzy match across tags/props/descriptions

Resources:
  - kitn://manifest                  → raw custom-elements.json
  - kitn://docs/web-components       → docs/web-components.md content
  - kitn://docs/readme               → README.md content

Implementation notes:
  - At startup, resolve the INSTALLED version of @kitnai/chat (walk up from cwd,
    find node_modules/@kitnai/chat/dist/custom-elements.json) so the server
    always answers for the version the user actually has installed — not the
    server's own bundled version.
  - Ship the server as a devDependency of @kitnai/chat OR as a standalone package.
    The standalone package avoids polluting production dependencies.
  - Total implementation: ~300 lines, all derived from the manifest JSON.
    No logic beyond JSON parsing + fuzzy search.
```

This design reuses the already-correct codegen pipeline and avoids hard-coding any API knowledge in the server itself. The version-alignment strategy (walk up to find installed manifest) is the most important correctness constraint.
