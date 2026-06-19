# AI/UI MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an MCP server (`npx @kitn.ai/ui mcp`) that makes any MCP-capable coding harness (Claude Code, Codex, OpenCode, Copilot, Pi) able to look up the real `kai-` API and scaffold a working chat surface wired to the developer's backend.

**Architecture:** A stdio MCP server built on `@modelcontextprotocol/sdk`, exposed as a `bin` in `@kitn.ai/ui`. Four tools — `component_reference`, `scaffold`, `theme`, `debug` — with Zod input schemas. Handlers compose from the Plan 2 catalogs (`src/agent-tooling/registry.ts`) and the package's own `dist/custom-elements.json`. No network; everything is local + version-matched.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` (add as dep), Zod (existing), Vitest. **Depends on Plan 2** (the catalogs).

## Global Constraints

- Elements are `kai-`; submit event `kai-submit` → `event.detail.value`; array/object props in JS; browser reads OpenAI-format SSE.
- Tools **return** code/text; they never write files (the harness applies). Stateless, no network.
- `scaffold` composes the matrix: `useCase` (archetype) × `integration` × `placement` × `framework`. Reject unknown ids with a helpful message listing valid ones.
- The server must start over stdio and pass `tools/list` before any tool work (smoke test in Task 1).

## File Structure

- `src/agent-tooling/mcp/server.ts` — creates the MCP `Server`, registers tools, stdio transport. Exported `createServer()` for tests; a thin entry calls it.
- `src/agent-tooling/mcp/tools/{reference,scaffold,theme,debug}.ts` — one tool per file: `{ name, description, inputSchema (zod), handler }`.
- `src/agent-tooling/mcp/manifest.ts` — loads + queries `dist/custom-elements.json`.
- `bin/mcp.js` — `#!/usr/bin/env node` shim that imports the built server entry.
- `src/agent-tooling/mcp/*.test.ts` — per-tool tests.
- Modify: `package.json` (`bin`, dep, build), `docs-site/.../for-ai-agents.mdx` (MCP install section).

---

### Task 1: MCP server skeleton + stdio smoke test

**Files:**
- Create: `src/agent-tooling/mcp/server.ts`, `bin/mcp.js`, `src/agent-tooling/mcp/server.test.ts`
- Modify: `package.json` (add `@modelcontextprotocol/sdk`; `"bin": { "kitn-ui-mcp": "./bin/mcp.js" }`; ensure build emits the mcp entry)

**Interfaces:**
- Produces: `createServer(): Server` registering the four tools (stubs ok this task).

- [ ] **Step 1: Add the dep** — `npm i @modelcontextprotocol/sdk` (in repo root). Verify the current API surface (`Server`, `StdioServerTransport`, `ListToolsRequestSchema`, `CallToolRequestSchema`) against the installed version's README before coding.

- [ ] **Step 2: Failing test** (`server.test.ts`) — the server lists exactly the four tools:

```ts
import { describe, it, expect } from 'vitest';
import { createServer } from './server.js';

it('registers the four tools', async () => {
  const tools = createServer().__listToolsForTest(); // helper returns the registered tool names
  expect(tools.sort()).toEqual(['component_reference', 'debug', 'scaffold', 'theme']);
});
```

- [ ] **Step 3: Run → FAIL.**

- [ ] **Step 4: Implement `server.ts`** — register the four tool modules (import from `./tools/*`), wire `ListToolsRequestSchema` → the tools' `{name, description, inputSchema}` and `CallToolRequestSchema` → dispatch to the matching handler; expose a `__listToolsForTest()` helper. `bin/mcp.js` connects `createServer()` to a `StdioServerTransport`.

- [ ] **Step 5: Run → PASS**, then a manual stdio smoke: `node bin/mcp.js` and confirm a `tools/list` JSON-RPC request returns the four tools (or use the SDK's in-memory transport in the test).

- [ ] **Step 6: Commit** — `git commit -m "feat(mcp): server skeleton + four-tool registration"`

---

### Task 2: `component_reference` tool

**Files:**
- Create: `src/agent-tooling/mcp/manifest.ts`, `src/agent-tooling/mcp/tools/reference.ts`, `reference.test.ts`

**Interfaces:**
- Consumes: `dist/custom-elements.json`.
- Produces: tool `component_reference`, input `{ name?: string }` (omit/`"list"` → all element names).

- [ ] **Step 1: Failing test** — `component_reference({ name: 'kai-chat' })` returns the `messages` prop and the `kai-submit` event:

```ts
import { reference } from './tools/reference.js';
it('returns kai-chat props + events', async () => {
  const out = await reference.handler({ name: 'kai-chat' });
  expect(out).toMatch(/messages/);
  expect(out).toMatch(/kai-submit/);
  expect(out).toMatch(/set in JavaScript|property/i); // the contract note
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `manifest.ts` reads `dist/custom-elements.json` (resolve relative to the package root), exposes `getElement(tag)` + `listElements()`. `reference.handler` formats props/attributes/events + the property-vs-attribute contract for the tag (or lists all tags when none given).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(mcp): component_reference tool"`

---

### Task 3: `scaffold` tool (the keystone)

**Files:**
- Create: `src/agent-tooling/mcp/tools/scaffold.ts`, `scaffold.test.ts`

**Interfaces:**
- Consumes: `getArchetype`, `getIntegration` (Plan 2 registry); `manifest` (Task 2).
- Produces: tool `scaffold`, input `{ useCase, integration, placement, framework, audience? }` (Zod; enums from Plan 2 types).

- [ ] **Step 1: Failing tests** — one TS backend, one Python:

```ts
import { scaffold } from './tools/scaffold.js';
it('drop-in chat + openrouter (next) → element + route + stream note', async () => {
  const out = await scaffold.handler({ useCase: 'drop-in-chat', integration: 'openrouter', placement: 'full-page', framework: 'next' });
  expect(out).toMatch(/<kai-chat/);
  expect(out).toMatch(/openrouter\.ai\/api\/v1\/chat\/completions/);
  expect(out).toMatch(/Streaming recipe/);
});
it('pydantic-ai emits a Python (FastAPI) route', async () => {
  const out = await scaffold.handler({ useCase: 'support-widget', integration: 'pydantic-ai', placement: 'docked-widget', framework: 'fastapi' });
  expect(out).toMatch(/from fastapi|uvicorn|run_stream/);
});
it('rejects an unknown integration with the valid list', async () => {
  const out = await scaffold.handler({ useCase: 'drop-in-chat', integration: 'nope', placement: 'side', framework: 'html' });
  expect(out).toMatch(/unknown integration|valid integrations/i);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `scaffold.handler`** — look up archetype + integration (error with valid lists if missing); compose output in three labeled blocks: **(1) front-end** — the archetype's `components` rendered for the `framework`, sized per `placement` (e.g. `side`/`docked-widget` → fixed height + docked container; `full-page` → 100vh), with `messages`/`kai-submit` wiring referencing the Streaming recipe; **(2) backend route** — `integration.routeTemplates[framework]` (or the integration's native language route if the chosen framework doesn't match its language — e.g. pydantic-ai → its `fastapi` template); **(3) run note** — `integration.runNote` + env vars. Keep generated front-end minimal and correct, not exhaustive.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(mcp): scaffold tool (archetype x integration x placement x framework)"`

---

### Task 4: `theme` tool

**Files:** Create `src/agent-tooling/mcp/tools/theme.ts`, `theme.test.ts`

**Interfaces:** tool `theme`, input `{ brand?: string, description?: string, mode?: 'light'|'dark'|'both' }` → a `kai-` token override block + apply steps.

- [ ] **Step 1: Failing test** — `theme({ brand: '#7c3aed' })` returns `--kai-` custom properties and an apply note.

```ts
import { theme } from './tools/theme.js';
it('emits kai- token overrides for a brand color', async () => {
  const out = await theme.handler({ brand: '#7c3aed' });
  expect(out).toMatch(/--kai-/);
  expect(out).toMatch(/:root|data-theme/);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — derive an accent/brand token set from the input color (map to the real `--kai-*` token names from `docs-site/src/styles/tokens.css`; do not invent token names — read that file for the canonical list) and emit a `:root` (+ optional `[data-theme="dark"]`) override block with an apply note. Link the theme editor for fine-tuning.
- [ ] **Step 4: Run → PASS.** [ ] **Step 5: Commit.**

---

### Task 5: `debug` tool

**Files:** Create `src/agent-tooling/mcp/tools/debug.ts`, `debug.test.ts`

**Interfaces:** tool `debug`, input `{ symptom?: string, snippet?: string }` → likely cause + fix.

- [ ] **Step 1: Failing tests** — the classic failures map to fixes:

```ts
import { debug } from './tools/debug.js';
it('array-as-attribute → JS property fix', async () => {
  const out = await debug.handler({ snippet: '<kai-chat messages="[...]"></kai-chat>' });
  expect(out).toMatch(/set .*messages.* in JavaScript|property, not an attribute/i);
});
it('no re-render → new reference fix', async () => {
  const out = await debug.handler({ symptom: "messages don't update when I push" });
  expect(out).toMatch(/new array|new reference/i);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — a small rule set keyed on patterns (attribute-set array, in-place mutation, listening on a parent for events, `kitn-` prefix, SSR of the element) → the matching gotcha + fix, sourced from the "What agents get wrong" content. Fallback: point at `component_reference` + the Streaming recipe.
- [ ] **Step 4: Run → PASS.** [ ] **Step 5: Commit.**

---

### Task 6: Install docs (MCP section on the hub) + scaffold-matrix verification

**Files:**
- Modify: `docs-site/src/content/docs/guides/for-ai-agents.mdx` (add the MCP section)
- Create: `src/agent-tooling/mcp/matrix.test.ts`

**Interfaces:** consumes all tools + the registry.

- [ ] **Step 1: Add the "Use the MCP" section** to the hub page (between "Index it in Context7" and "Machine-readable files"): what `npx @kitn.ai/ui mcp` gives, and a per-harness config snippet — Claude Code (`.mcp.json` / `claude mcp add`), Codex/OpenCode (their MCP config), Copilot, Pi — each adding the `kitn-ui-mcp` stdio server. Verify each harness's exact MCP config key against its current docs before writing.

- [ ] **Step 2: Matrix test** — for a representative grid (`framework` × `integration` × a couple of archetypes), assert `scaffold` returns a non-empty result containing a `kai-` element and the integration's signature (endpoint/import):

```ts
import { scaffold } from './tools/scaffold.js';
import { integrations } from '../registry.js';
it('scaffolds every integration for a drop-in chat without throwing', async () => {
  for (const i of integrations) {
    const fw = i.language === 'python' ? 'fastapi' : 'next';
    const out = await scaffold.handler({ useCase: 'drop-in-chat', integration: i.id, placement: 'side', framework: fw });
    expect(out).toMatch(/kai-chat/);
    expect(out.length).toBeGreaterThan(100);
  }
});
```

- [ ] **Step 3: Run all** — `npx vitest run src/agent-tooling`; `cd docs-site && npm run build`; IVP the hub page (MCP section present, no broken links).

- [ ] **Step 4: End-to-end IVP (one combo)** — generate `scaffold(drop-in-chat, openrouter, full-page, next)`, drop the output into a throwaway Next app (or the existing examples harness), run it, and confirm a streaming reply renders (Playwright). Document the result.

- [ ] **Step 5: Commit** — `git commit -m "feat(mcp): install docs + scaffold-matrix verification"`

---

## Self-Review

- **Spec coverage:** Implements the spec's "AI/UI MCP server" (all four tools, `bin` packaging) + the hub's MCP section. Native per-harness skills remain Phase 2 (out of scope here). ✓
- **Placeholder scan:** Each tool task has real test code + a concrete handler spec; the two genuinely-external unknowns (the MCP SDK API surface, each harness's MCP config key) are explicit *verify-first* steps, not guesses. ✓
- **Type consistency:** tool input enums come from Plan 2's `types.ts`; `getIntegration`/`getArchetype`/`integrations` names match Plan 2's registry exports; `scaffold` keys route templates by the `Framework` enum used in Plan 2. ✓
- **Dependency:** Plan 2 must land first (registry + catalogs). Tasks within Plan 3 are sequential (skeleton → reference → scaffold → theme → debug → docs/verify); each is independently testable.
