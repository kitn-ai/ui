# Consumer Regression — recipes & reference

Heavy reference for the `consumer-regression` skill. Exact commands, the test matrix, and the mock-backend recipes proven in the 2026-06 hardening campaign.

## Conventions — resolve paths at runtime, NEVER hardcode

The repo lives in a different place on every machine. Derive everything from the repo root:

```bash
REPO="$(git rev-parse --show-toplevel)"           # the @kitn.ai/ui library repo root (run this from anywhere inside the repo)
HARNESS="$(dirname "$REPO")/consumer-harness"     # a sibling dir, OUTSIDE the repo (keeps the repo's git clean)
```

Every command + script below uses `$REPO` / `$HARNESS`. In Node scripts, derive them the same way (the gen script shows how). When you dispatch a `consumer-probe`, pass the resolved absolute paths in the prompt — the agent does not guess them.

---

## Setup (Phase 0)

```bash
REPO="$(git rev-parse --show-toplevel)"; HARNESS="$(dirname "$REPO")/consumer-harness"
cd "$REPO"
# 1. Build + pack the LOCAL package (so unmerged fixes are testable, NOT the published npm version)
npm run build && git checkout -- src/components/component-meta.json && npm pack    # → kitn.ai-ui-<v>.tgz
# 2. Stable copy the probes install from (a fix's re-pack can't race a reading probe)
mkdir -p "$HARNESS" && cp kitn.ai-ui-*.tgz "$HARNESS/kitn-stable.tgz"
```

After a **library** change: re-run the build + `npm pack` + refresh `$HARNESS/kitn-stable.tgz`, then re-probe.
After a **scaffold.ts** change: rebuild ONLY the MCP bin (fast) before regenerating scaffolds:
```bash
npx vite build --config vite.config.mcp.ts
```

## Generating scaffolds from the live MCP bin

The MCP is a stdio server; drive it with a tiny JSON-RPC client. It resolves its own paths via git, so it's portable:

```js
// run from anywhere inside the repo: node /tmp/gen.mjs  — writes <name>.md per cell into $HARNESS/scaffolds
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
const REPO = execSync('git rev-parse --show-toplevel').toString().trim();
const HARNESS = join(dirname(REPO), 'consumer-harness');
mkdirSync(join(HARNESS, 'scaffolds'), { recursive: true });
const p = spawn('node', [join(REPO, 'bin/mcp.js')], { cwd: REPO, stdio: ['pipe','pipe','pipe'] });
let buf=''; const out=[];
p.stdout.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);if(l.trim()){try{out.push(JSON.parse(l))}catch{}}}});
const s=o=>p.stdin.write(JSON.stringify(o)+'\n');
s({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'g',version:'0'}}});
s({jsonrpc:'2.0',method:'notifications/initialized',params:{}});
const cells=[ // [name, scaffold args]
  ['react', {useCase:'drop-in-chat',integration:'mock',placement:'full-page',framework:'react',suggestions:["What's new?","Ask for help?"]}],
  // state & hooks scenario: imports useKaiChat + createAssistantStream, streams a reply, asserts message appears
  ['react-state-hooks', {useCase:'drop-in-chat',integration:'mock',placement:'full-page',framework:'react',suggestions:["Test state helpers"]}],
  // …one per framework/scenario…
];
cells.forEach((c,i)=>s({jsonrpc:'2.0',id:40+i,method:'tools/call',params:{name:'scaffold',arguments:c[1]}}));
setTimeout(()=>{p.kill();cells.forEach(([n],i)=>{const t=out.find(m=>m.id===40+i)?.result?.content?.[0]?.text||'';writeFileSync(join(HARNESS,'scaffolds',`${n}.md`),t);console.log(n,t.length);});process.exit(0);},3000);
```

The same client calls the other tools: `theme` (brand → token block), `component_reference` (the real API), `debug` (gotcha → fix).

**Sanity:** the bin is `$REPO/bin/mcp.js` (built by `vite.config.mcp.ts` → `$REPO/dist/mcp.es.js`). If a generated `.md` comes out empty/tiny, the bin didn't run — `ls "$REPO/bin/mcp.js" "$REPO/dist/mcp.es.js"`, rebuild the bin, re-run. Always eyeball one generated scaffold (it should contain `kai-chat` / `<Chat`, the suggestions, and the backend block) before fanning out probes against it.

## The test matrix

Build a cell for each combination you care about. Full matrix axes:

- **framework** (scaffold `framework`): `react` (Vite SPA) · `next` · `vue` · `svelte` · `html` (Vite vanilla) · `tanstack-start`
- **archetype** (`useCase`): `drop-in-chat` · `support-widget` · `knowledge-base` · `agentic` · `workspace` (+ `voice`)
- **integration** (`integration`): `mock` · `openrouter` · `vercel-ai-sdk` · `langgraph` · `cloudflare` · `ollama` · `pydantic-ai` (Python) · `mastra`/`pi` (harnesses)
- **placement**: `full-page` · `side` · `docked-widget` · `inline`

**Core sweep** (cheapest high-signal set): `drop-in-chat × mock × full-page` across ALL 6 frameworks — runnable with no creds (mock streams client-side), so it isolates packaging/scaffold bugs. Start here.

**Then expand:** one real JS backend (e.g. `next × openrouter` or `vercel-ai-sdk`), the Python backend (`html × pydantic-ai`), each non-trivial archetype (`agentic`, `knowledge-base`, `workspace`), `theme` applied, and each placement.

### State & hooks scenario

Exercises the `@kitn.ai/ui/state` public surface end-to-end in a real consumer app. Build a Vite React-TS SPA against `$HARNESS/kitn-stable.tgz`. The app imports `useKaiChat` from `@kitn.ai/ui/react` and `createAssistantStream` from `@kitn.ai/ui/state`, renders `<Chat {...chat.bind} />`, and on submit calls `chat.append(userMsg)` then `createAssistantStream(chat.setMessages)`, emitting three mock chunks before calling `s.done()`. Playwright asserts: (1) `<Chat>` renders in the shadow root, (2) the mock chunks appear as a single assistant message in the thread, (3) zero console errors. Probe cell name: `react-state-hooks`. Layer diagnosis surface: LIBRARY (bad exports or types from `@kitn.ai/ui/state`) · SCAFFOLD-OUTPUT (wrong import path or missing `chat.setMessages` access).

## Fresh-app scaffold commands (per framework)

| Framework | Create | Build cmd | Notes |
|---|---|---|---|
| react | `npm create vite@latest <n> -- --template react-ts` | `npm run build` (tsc -b && vite build) | Vite SPA, no SSR |
| vue | `npm create vite@latest <n> -- --template vue-ts` | `npm run build` (vue-tsc) | add `isCustomElement: t=>t.startsWith('kai-')` to vite config (scaffold says so) |
| svelte | `npm create vite@latest <n> -- --template svelte-ts` | `npm run build` + `npm run check` (svelte-check) | |
| html | `npm create vite@latest <n> -- --template vanilla-ts` | `npm run build` | Vite resolves the bare `@kitn.ai/ui/elements` import |
| next | `npx create-next-app@latest <n> --ts --app --no-tailwind --no-eslint --no-src-dir --import-alias "@/*" --use-npm` | `npm run build` (next build) | scaffold uses `dynamic({ssr:false})` |
| tanstack-start | the official scaffold (verify current via Context7/docs) | `npm run build` | scaffold uses `createFileRoute({ ssr:false })` |

Then in each: `npm install "$HARNESS/kitn-stable.tgz"` (NOT npm).

## Mock-backend recipes (no API keys)

Never skip the stream test. By integration:

- **Proxy routes** (openrouter / ollama / cloudflare-next): the route `fetch`es an upstream that returns OpenAI-format SSE. Run a tiny local Node server that emits `data: {"choices":[{"delta":{"content":"<tok>"}}]}\n\n` … `data: [DONE]\n\n`, and point the route's upstream URL at it.
- **Vercel AI SDK** (`streamText`): swap the model for the AI SDK's mock — verify the CURRENT mock API against the installed `ai` version (it moved across v3/v4/v5/v6: `MockLanguageModel*`).
- **LangGraph** (`createReactAgent`): give it a LangChain **fake** chat model (`FakeListChatModel` / `FakeStreamingChatModel`) — verify the current API.
- **Pydantic AI** (FastAPI `run_stream`): construct the `Agent` with `pydantic_ai.models.test.TestModel` (canned output, no network). `pip install fastapi uvicorn pydantic-ai`; permissive CORS (`allow_methods=['*']`).
- **Cloudflare worker template**: needs `wrangler`/miniflare with a mocked `env.AI` — usually inspect-only; the `next` proxy variant is the easy end-to-end test.

Verify the route streams with curl before the browser test:
```bash
curl -N -X POST localhost:3000/api/chat -H 'content-type: application/json' \
  -d '{"model":"mock","messages":[{"role":"user","content":"hi"}]}'   # expect data:{choices:[{delta:{content}}]} … [DONE]
```

## SSR import-safety check

The elements bundle must not throw when imported with no DOM:
```bash
REPO="$(git rev-parse --show-toplevel)"
node --input-type=module -e "await import('$REPO/dist/kitn-chat.es.js'); console.log('SSR-OK')"   # no throw
```
For SSR frameworks (Next, TanStack Start, SvelteKit, Remix, Astro) the scaffold ALSO renders the chat client-only (`dynamic({ssr:false})` / `createFileRoute({ssr:false})`) to avoid hydration mismatch — confirm the server HTML omits `<kai-chat>`.

## Playwright (shadow DOM)

Reuse the repo's browser — don't install a second one. Resolve the path from the repo root:
```js
const { execSync } = require('node:child_process');
const REPO = execSync('git rev-parse --show-toplevel').toString().trim();
const pw = require(REPO + '/node_modules/playwright/index.js');
// kai-* live in shadow DOM. Check registration + render:
await page.evaluate(() => customElements.get('kai-chat') !== undefined);  // registered
// pierce: el.shadowRoot.querySelector(...). Playwright CSS also pierces shadow for text.
// Verify: suggestions visible, click a suggestion → assistant reply streams in, 0 console errors.
```
Note: with the SSR fix, registration is async — assert the chat RENDERS (whenDefined resolves), don't rely on a synchronous `customElements.get` immediately after import.

## Layer diagnosis (every issue gets one)

- **LIBRARY** — a bug/gap in `@kitn.ai/ui` itself (packaging/exports/SSR/registration/types/bundle).
- **SCAFFOLD-OUTPUT** — the MCP-generated code is wrong/incomplete/non-runnable (stale SDK API, missing `model`, wrong composition, missing types).
- **FRAMEWORK-SETUP** — config any consumer of this framework must do (Vue `isCustomElement`, Next `'use client'`).
- **CONSUMER** — the probe's own mistake → fix it, don't report it as a product bug.

## Classes of bug this harness has actually caught

Packaging (ships raw source → consumer `tsc` compiles the lib's Solid internals); `/react` not self-registering; `theme.css` importing a devDep; inverted peer deps; a `sideEffects` field tree-shaking the registrations to a hollow bundle; a type-only-entry leak compiling Solid under react-jsx; SSR `window`-at-module-eval; scaffold emitting the wrong CSS path / no `'use client'` / no `model` / dead camelCase attrs / bare propless companions / loose `ChatMessage` types / Cloudflare native-vs-OpenAI SSE / wrong Vue/Svelte property binding / HTML listener-before-element timing. (Unit tests caught NONE of these.)
