# AI/UI Agent Tooling — Design Spec

**Date:** 2026-06-19 · **Status:** Draft for review

## Summary

Make any AI coding harness (Claude Code, Codex, OpenCode, Copilot, Pi) fluent at building with AI/UI — and able to scaffold a working chat surface wired to the developer's real backend, end to end. A developer says *"give me an assistant on the side, wired to my OpenRouter / Vercel AI SDK / Pydantic AI / LangGraph / Cloudflare,"* answers a short intake, and the harness produces a running front-end plus a backend route. Dev-time only — nothing ships to the end product beyond the code it writes.

## Goals

- Coding harnesses know the real AI/UI API (no `kitn-` / Claude-Artifacts hallucinations).
- One intake → a working, wired chat surface for the dev's use case, backend, placement, and framework.
- Reach the harnesses developers actually use — including Context7, where most already are.
- Single source of truth: adding an integration or example updates docs and tooling together.

## Non-goals

- Runtime kitn agent components (`@kitn/core` registry) — separate product.
- Authoring the developer's agent logic — we wire the UI to their backend; we don't write their agent.
- Native per-harness skills in v1 (phase 2).
- A static "discovery questionnaire" in the docs — the intake is interactive, in the tool.

## Distribution — three channels

| Channel | Job | Reach | Phase |
|---|---|---|---|
| **Context7** (register repo) | Reference — know the API, contract, guides, examples | Widest (devs already on Context7) | 1 |
| **AI/UI MCP** | Action — scaffold, theme, debug, component reference | All MCP harnesses, incl. Pi | 1 |
| **Native skills** (CLI installer) | Always-loaded native UX | Claude Code, Pi | 2 |

Context7 = retrieval; the MCP = action. They complement rather than overlap.

## The scaffold matrix (core idea)

A working chat surface is the composition of these axes — three of which map to docs sections that already exist:

- **useCase / archetype** → the **Examples** section (assistant · Q&A · knowledge-base/RAG · agentic-workspace · support-widget · commerce-assistant). Decides the component composition: knowledge-base → sources/citations; agentic → tool/reasoning/artifact cards; support → docked widget.
- **integration** → the **Integrations** section (openrouter, vercel-ai-sdk, pydantic-ai, langgraph, cloudflare, ollama, mastra/pi…). Decides the backend route, stream mapping, and language.
- **placement** → side (docked) · full-page · docked-widget · inline.
- **framework** → html · react · next · vue · svelte.
- **audience** (light modifier) → consumer vs internal/dev — affects defaults (auth stub, empty state), not the core wiring.

The MCP/skill runs a brief **intake** (*who's it for · what's the job · where does it sit · what backend · what framework*) and composes the matrix. The intake is interactive at build time — not a static docs questionnaire.

## Catalogs (single source of truth)

Two data-driven catalogs feed both the docs and the scaffolder:

- **Integration entry:** `{ id, title, category: provider|gateway|framework|harness, language: ts|python, streamFormat, routeTemplates (per framework/runtime), streamToMessagesMapping, envVars, runNote, docsSlug }`.
- **Archetype/example entry:** `{ id, title, componentComposition (kai-* parts), defaultPlacement, docsSlug }`.

Consumed by (a) the MCP `scaffold` tool and (b) the docs — structured bits (config tables, route snippets) render from the catalog; narrative prose stays in MDX. Adding an integration or example = one catalog entry + a short MDX page.

**Launch integrations:** openrouter, vercel-ai-sdk (+ gateway), langgraph (ts), cloudflare, ollama, mastra/pi (harnesses), **+ pydantic-ai (python)**. Extensible.

## The AI/UI MCP server

Ships as a `bin` in `@kitn.ai/ui` (`npx @kitn.ai/ui mcp`); reads the package's own `custom-elements.json` + the catalogs. Stateless, local, no network. Tools return code/data; the harness writes files.

| Tool | Input → Output |
|---|---|
| `scaffold` | `{ useCase, integration, placement, framework, audience? }` → composed front-end (kai-* for the archetype + placement) + backend route (per integration + language) + stream→`messages` wiring |
| `component_reference` | `{ name \| "list" }` → props, events, attributes, the property-vs-attribute contract, from the live manifest |
| `theme` | `{ brand \| description, mode? }` → a `kai-` token override block + apply steps |
| `debug` | `{ symptom \| snippet }` → likely cause + fix for the classic failures (array-as-attribute, no-rerender, event-not-firing, SSR/island, wrong prefix) |

Install = a per-harness MCP config snippet, documented on the hub page.

## Context7 registration

- Add `context7.json` at repo root: `projectTitle: "Kitn AI/UI — Web UI SDK for AI Agents"`, a category-signaling description ("Framework-agnostic web components for AI chat and agents — streaming, tool calls, reasoning, generative-UI cards, artifacts; React/Vue/Svelte/Angular/HTML"), `folders` covering the docs content + `llms-full.txt` + the `.md` twins, and any indexing rules. Submit the repo at context7.com.
- Verify post-registration: `resolve-library-id` returns the entry.

## Docs changes

- Elevate **"For AI Agents"** → **"For AI Agents & MCP"**; move it up in the Docs sidebar (promote to a top-level nav tab post-launch). Pick-your-channel hub: lead · Context7 · MCP install + tools · native skills (later) · `llms.txt`/`.md` twins · custom-elements.json · "what agents get wrong".
- **Examples** = the archetype catalog (the scaffolder's `useCase` axis); keep it canonical.
- Add **Pydantic AI** to **Integrations** (Python — our first non-JS backend).
- One line on the hub: "the scaffolder asks what you're building and wires the matching example to your backend." No separate questionnaire section.

## Languages

TS/JS + Python (Pydantic AI). The catalog carries the backend language; `scaffold` emits the right server shape — Next.js route handler, Express, FastAPI, or a Cloudflare Worker.

## Phasing

- **Phase 1:** catalogs (integrations + archetypes) · MCP (`scaffold`/`component_reference`/`theme`/`debug`) · Pydantic AI integration (docs + catalog) · Context7 registration · hub page.
- **Phase 2:** native skills installer (Claude Code, Pi) · more integrations · docs rendered more fully from the catalogs.

## Testing / verification

- **MCP:** unit-test each tool's output against the catalogs; for the launch matrix (framework × integration × a few archetypes), assert the scaffolded app compiles/runs; IVP one generated app end-to-end (Playwright).
- **Context7:** `resolve-library-id` returns the entry after registration; spot-check a `query-docs` answer uses `kai-`.
- **Docs:** build clean; IVP the hub page.

## Open questions

- Catalog format/location (TS modules vs JSON) and how much of the docs renders from them in v1 (recommend: structured bits only — config tables, route snippets).
- MCP packaging: `bin` in `@kitn.ai/ui` vs a separate `@kitn.ai/ui-mcp` package.
- How far the `audience` modifier changes output (auth stub? empty state?) — keep minimal in v1.
