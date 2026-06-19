# Integration & Archetype Catalogs + Pydantic AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the typed, data-driven catalogs (integrations + archetypes) that power the MCP scaffolder (Plan 3) and, later, the docs — and add Pydantic AI as the first Python integration (catalog entry + docs page).

**Architecture:** TypeScript modules under `src/agent-tooling/`. Each **integration** is a typed object describing how to wire a backend into `kai-chat` (route template per runtime, stream→`messages` mapping, language, env vars). Each **archetype** maps a use case to a component composition + default placement. A barrel exports both registries plus lookup helpers. The launch entries are ported from the existing `docs-site/src/content/docs/integrations/*.mdx` and `examples/*.mdx` — the docs are the source content; the catalog is the structured form.

**Tech Stack:** TypeScript, Vitest (the repo's test runner — confirm in `package.json`), Zod (already a dep) for runtime validation of entries.

## Global Constraints

- Elements are prefixed `kai-`; the submit event is `kai-submit` with `event.detail.value`; array/object props set in JS.
- Browser reads OpenAI-format SSE (`data: {choices:[{delta:{content}}]}` … `data: [DONE]`) per the Streaming recipe — route templates must emit that, or document the transform.
- Catalog files are plain data + types — no side effects, no network. They must import cleanly in both the package build and the MCP server.
- Launch integrations: `openrouter`, `vercel-ai-sdk`, `langgraph`, `cloudflare`, `ollama`, `mastra`, `pi`, **`pydantic-ai`**. Source content for each lives in the matching `docs-site/src/content/docs/integrations/*.mdx` (and `harnesses.mdx` for mastra/pi).

## File Structure

- `src/agent-tooling/types.ts` — `Integration`, `Archetype`, enums, the Zod schemas.
- `src/agent-tooling/integrations/<id>.ts` — one file per integration entry.
- `src/agent-tooling/archetypes.ts` — the archetype entries.
- `src/agent-tooling/registry.ts` — barrel: arrays + `getIntegration(id)`, `getArchetype(id)`, `listIntegrations()`, `listArchetypes()`.
- `src/agent-tooling/registry.test.ts` — catalog tests.
- `docs-site/src/content/docs/integrations/pydantic-ai.mdx` — the new integration doc.

---

### Task 1: Catalog types + Zod schemas

**Files:**
- Create: `src/agent-tooling/types.ts`, `src/agent-tooling/types.test.ts`

**Interfaces:**
- Produces: `Integration`, `Archetype`, `IntegrationSchema`, `ArchetypeSchema` (Zod), and the union enums (`Category`, `Language`, `StreamFormat`, `Placement`, `Framework`).

- [ ] **Step 1: Write the failing test** (`types.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { IntegrationSchema } from './types.js';

it('validates a minimal integration entry', () => {
  const ok = IntegrationSchema.safeParse({
    id: 'openrouter', title: 'OpenRouter', category: 'gateway', language: 'ts',
    streamFormat: 'openai-sse', envVars: ['OPENROUTER_API_KEY'],
    routeTemplates: { next: 'export async function POST() {}' },
    streamMapping: 'OpenAI SSE — pipe upstream.body straight through.',
    runNote: 'Set OPENROUTER_API_KEY.', docsSlug: 'integrations/connect-any-model',
  });
  expect(ok.success).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/agent-tooling/types.test.ts`) — "Cannot find module './types.js'".

- [ ] **Step 3: Implement `types.ts`**

```ts
import { z } from 'zod';

export const Category = z.enum(['provider', 'gateway', 'framework', 'harness']);
export const Language = z.enum(['ts', 'python']);
export const StreamFormat = z.enum(['openai-sse', 'ai-sdk', 'native']);
export const Framework = z.enum(['html', 'react', 'next', 'vue', 'svelte', 'fastapi', 'express', 'worker']);
export const Placement = z.enum(['side', 'full-page', 'docked-widget', 'inline']);

export const IntegrationSchema = z.object({
  id: z.string(), title: z.string(), category: Category, language: Language,
  streamFormat: StreamFormat,
  envVars: z.array(z.string()).default([]),
  routeTemplates: z.record(z.string()),  // keyed by Framework value → code string
  streamMapping: z.string(),             // prose: how the stream maps to messages
  runNote: z.string(),
  docsSlug: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

export const ArchetypeSchema = z.object({
  id: z.string(), title: z.string(),
  components: z.array(z.string()),       // kai-* tags, e.g. ['kai-chat','kai-sources']
  defaultPlacement: Placement,
  docsSlug: z.string(),
});
export type Archetype = z.infer<typeof ArchetypeSchema>;
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(agent-tooling): catalog types + zod schemas"`

---

### Task 2: Integration entries (TS-backend launch set)

**Files:**
- Create: `src/agent-tooling/integrations/{openrouter,vercel-ai-sdk,langgraph,cloudflare,ollama,mastra,pi}.ts`

**Interfaces:**
- Consumes: `Integration` (Task 1).
- Produces: a default-exported `Integration` per file.

Port each entry's `routeTemplates`, `streamMapping`, `envVars`, `runNote` **verbatim from the corresponding `docs-site/src/content/docs/integrations/*.mdx`** (the code in those pages is already verified and IVP'd). One worked example:

- [ ] **Step 1: Write `openrouter.ts`**

```ts
import type { Integration } from '../types.js';
const openrouter: Integration = {
  id: 'openrouter', title: 'OpenRouter', category: 'gateway', language: 'ts',
  streamFormat: 'openai-sse', envVars: ['OPENROUTER_API_KEY'],
  routeTemplates: {
    next: `export async function POST(req: Request) {
  const { model, messages } = await req.json();
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${process.env.OPENROUTER_API_KEY}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  return new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } });
}`,
  },
  streamMapping: 'OpenRouter returns OpenAI-format SSE — pipe upstream.body straight to the browser; the Streaming-recipe reader handles it.',
  runNote: 'Set OPENROUTER_API_KEY. Model ids are vendor/model, e.g. openai/gpt-4o.',
  docsSlug: 'integrations/connect-any-model',
};
export default openrouter;
```

- [ ] **Step 2: Repeat for** `vercel-ai-sdk` (route from vercel-ai-sdk.mdx, streamFormat 'ai-sdk'), `langgraph` (langgraph.mdx, streamMode messages), `cloudflare` (cloudflare-ai.mdx, Workers AI endpoint), `ollama` (ollama.mdx, localhost:11434/v1), `mastra` + `pi` (harnesses.mdx — category 'harness'). Each: copy the verified route + mapping from its doc.

- [ ] **Step 3: Commit** — `git commit -m "feat(agent-tooling): TS-backend integration entries"`

---

### Task 3: Archetype entries

**Files:**
- Create: `src/agent-tooling/archetypes.ts`

**Interfaces:**
- Consumes: `Archetype` (Task 1).
- Produces: `export const archetypes: Archetype[]`.

- [ ] **Step 1: Author entries** from the Examples section (`docs-site/src/content/docs/examples/*`):

```ts
import type { Archetype } from './types.js';
export const archetypes: Archetype[] = [
  { id: 'drop-in-chat', title: 'Drop-in chat', components: ['kai-chat'], defaultPlacement: 'full-page', docsSlug: 'examples/drop-in-chat' },
  { id: 'support-widget', title: 'Support widget', components: ['kai-chat'], defaultPlacement: 'docked-widget', docsSlug: 'examples/support-widget' },
  { id: 'knowledge-base', title: 'Knowledge base / RAG', components: ['kai-chat', 'kai-sources'], defaultPlacement: 'full-page', docsSlug: 'examples/rag-assistant' },
  { id: 'agentic', title: 'Agentic assistant', components: ['kai-chat', 'kai-tool', 'kai-reasoning'], defaultPlacement: 'side', docsSlug: 'examples/agentic-assistant' },
  { id: 'workspace', title: 'Agentic workspace', components: ['kai-chat', 'kai-artifact', 'kai-resizable'], defaultPlacement: 'side', docsSlug: 'examples/workspace' },
  { id: 'voice', title: 'Voice assistant', components: ['kai-chat', 'kai-voice-input'], defaultPlacement: 'full-page', docsSlug: 'examples/voice-assistant' },
];
```

(Verify each `components` tag against `src/elements/element-meta.json` and each `docsSlug` against the Examples sidebar.)

- [ ] **Step 2: Commit** — `git commit -m "feat(agent-tooling): archetype entries"`

---

### Task 4: Registry barrel + tests

**Files:**
- Create: `src/agent-tooling/registry.ts`, `src/agent-tooling/registry.test.ts`

**Interfaces:**
- Produces: `integrations: Integration[]`, `archetypes: Archetype[]`, `getIntegration(id): Integration | undefined`, `getArchetype(id)`, `listIntegrations()`, `listArchetypes()`.

- [ ] **Step 1: Failing test** — assert the launch set is present + every entry validates against the Zod schema:

```ts
import { describe, it, expect } from 'vitest';
import { integrations, getIntegration, archetypes } from './registry.js';
import { IntegrationSchema } from './types.js';

it('has the launch integrations', () => {
  const ids = integrations.map((i) => i.id);
  for (const id of ['openrouter','vercel-ai-sdk','langgraph','cloudflare','ollama','mastra','pi'])
    expect(ids).toContain(id);
});
it('every integration validates and has at least one route template', () => {
  for (const i of integrations) {
    expect(IntegrationSchema.safeParse(i).success).toBe(true);
    expect(Object.keys(i.routeTemplates).length).toBeGreaterThan(0);
  }
});
it('getIntegration looks up by id', () => {
  expect(getIntegration('ollama')?.language).toBe('ts');
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `registry.ts`** (import the entry files + archetypes; expose arrays + lookups).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(agent-tooling): registry barrel + tests"`

---

### Task 5: Pydantic AI integration (catalog entry + docs page)

**Files:**
- Create: `src/agent-tooling/integrations/pydantic-ai.ts`
- Create: `docs-site/src/content/docs/integrations/pydantic-ai.mdx`
- Modify: `docs-site/astro.config.mjs` (Integrations sidebar)
- Modify: `src/agent-tooling/registry.ts` (register the entry)

**Interfaces:**
- Consumes: `Integration`.
- Produces: the `pydantic-ai` entry (language `python`, a FastAPI route template).

- [ ] **Step 1: Verify Pydantic AI's streaming API** against current docs (Context7 `resolve-library-id` "Pydantic AI" → `query-docs` "stream agent run as SSE in FastAPI", or fetch ai.pydantic.dev). Confirm: `Agent.run_stream()` / `agent.iter()`, how to get text deltas, and the FastAPI streaming response. **Do not write code from memory** — Pydantic AI's API moves.

- [ ] **Step 2: Write `pydantic-ai.ts`** — `language: 'python'`, `streamFormat: 'openai-sse'` (the FastAPI route re-frames deltas as OpenAI SSE so the browser reader is unchanged), a `routeTemplates.fastapi` with the verified `run_stream` code that yields `data: {choices:[{delta:{content}}]}` lines, `envVars: ['OPENAI_API_KEY']` (or the model's), `streamMapping` + `runNote` (uvicorn run command), `docsSlug: 'integrations/pydantic-ai'`.

- [ ] **Step 3: Write `pydantic-ai.mdx`** — same structure as the other integration docs (lead, the FastAPI route, "the browser side is the Streaming recipe loop", a note that it's Python/uvicorn, Next steps). Use the verified code from Step 1.

- [ ] **Step 4: Register + sidebar** — add `pydantic-ai` to `registry.ts`; add `{ label: 'Pydantic AI', slug: 'integrations/pydantic-ai' }` to the Integrations sidebar (after Ollama).

- [ ] **Step 5: Verify** — `npx vitest run src/agent-tooling` (registry test now expects `pydantic-ai`; add it to the launch-set assertion); `cd docs-site && npm run build`; IVP `/integrations/pydantic-ai/` (200, no broken links).

- [ ] **Step 6: Commit** — `git commit -m "feat: add Pydantic AI integration (catalog + docs)"`

---

## Self-Review

- **Spec coverage:** Implements the spec's "Catalogs (single source)" + "Pydantic AI" + the Python-language requirement. Docs-render-from-catalog is intentionally deferred (spec marks it v2/structured-bits-only). ✓
- **Placeholder scan:** Task 2 ports verbatim from existing verified docs (not invented); Task 5 Step 1 verifies the Pydantic API before writing (the one moving external API). ✓
- **Type consistency:** `Integration`/`Archetype` defined in Task 1, consumed identically in Tasks 2–5; `getIntegration` name stable. ✓
- **Open item carried to Plan 3:** the MCP imports `registry.ts`; route templates are keyed by `Framework` enum values.
