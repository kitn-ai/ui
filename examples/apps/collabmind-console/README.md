# CollabMind Console

An operator console over three real AI backends, built from the kit's web components with no framework.

| Service | Upstream | Wrapper prefix | Endpoints |
|---|---|---|---|
| Kiro Gateway 3.0.0 | https://kiro-gw.collabmind.dev | `/svc/kiro` | 51 |
| LiteLLM Proxy 1.106.5 | https://litellmproxy.collabmind.dev | `/svc/litellm` | 998 |
| Fleet Control 1.0.0 | http://127.0.0.1:8091 | `/svc/fleet` | 8 |

The browser only talks to one zero-dependency Node wrapper (`server/server.mjs`). It proxies every upstream endpoint under `/svc/{service}`, keeps API keys server-side, streams SSE through, and serves a merged OpenAPI document of all 1057 endpoints at `/openapi.json`.

## Run it

```bash
nx build ui                                                   # the app resolves @kitn.ai/ui through workspace:*
cp examples/apps/collabmind-console/.env.example examples/apps/collabmind-console/.env   # add KIRO_API_KEY / LITELLM_API_KEY
pnpm --filter @kitn.ai/ui-app-collabmind-console dev          # wrapper :8790 + UI http://localhost:5190
```

`npm start` builds the UI and lets the wrapper serve it on `:8790`. `npm run refresh-specs` re-downloads all three OpenAPI specs on startup.

## What's in it

- **Overview**: a routing map from the console to each service and what sits behind it (Kiro's models, OpenCode, agents and sessions; LiteLLM's providers; each Fleet runtime with its latency), coloured by real failure data rather than a ping. Below it, every problem in one sentence, then a summary card per service.
- **Chat**: one composed thread over five targets: Kiro streaming, Kiro one-turn (ACP thoughts and tool calls become reasoning and tool parts), LiteLLM, a Fleet role, and OpenCode. Streams go through the kit's own `readOpenAIStream`. Conversations persist in the browser; `@` picks a Kiro agent.
- **API explorer**: all 1057 endpoints in a file tree grouped by service and tag, a request form generated from each spec (path, query and header parameters, JSON bodies from schemas, multipart uploads), the response in a code block with headers and a copy-ready curl, and a history of calls.
- **Connections**: which credentials each service uses, a browser-token override, a Test button, and the spec refresh.

`DESIGN-AUDIT.md` records why the console is laid out this way.

## Components used

The app registers the whole kit (`import '@kitn.ai/ui/web-components'`) and places these directly:

| Area | Components |
|---|---|
| Shell | `kai-nav`, `kai-status`, `kai-toast-region` |
| Overview | `kai-card`, `kai-notice`, `kai-row-group`, `kai-row`, `kai-badge`, `kai-progress-bar`, `kai-code-block`, `kai-button`, `kai-skeleton`, `kai-text-shimmer` |
| Explorer | `kai-resizable`, `kai-resizable-item`, `kai-search`, `kai-segmented`, `kai-tabs`, `kai-file-tree`, `kai-input`, `kai-select`, `kai-switch`, `kai-markdown`, `kai-kbd`, `kai-code-block`, `kai-empty` |
| Chat | `kai-conversations`, `kai-thread`, `kai-prompt-input`, `kai-model-switcher`, `kai-thinking-bar`, `kai-select`, `kai-segmented` |
| Connections | `kai-settings-group`, `kai-setting-item`, `kai-input`, `kai-button`, `kai-badge` |

`kai-thread` in turn renders `kai-message`, `kai-markdown`, `kai-code-block`, `kai-reasoning` and `kai-tool` for the parts the backends send.
