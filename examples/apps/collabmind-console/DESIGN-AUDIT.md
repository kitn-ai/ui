# CollabMind Console: design audit (v1)

Audited 2026-10-31 against the live services. Every finding below was reproduced in the running console at `localhost:8788`.

## The core problem

v1 shows **plumbing instead of state**. It answers "what endpoints exist and where do they point", which the operator already knows. It does not answer the operator's real questions:

1. Is anything broken right now, and where?
2. Which model or runtime will my request land on?
3. Let me call any endpoint quickly and read the result.

All of the data needed to answer 1 and 2 was already being fetched. It was just rendered as collapsed JSON.

## Findings

### A. Information design (severity: high)

| # | Finding | Evidence |
|---|---|---|
| A1 | Real failures are hidden behind collapsed JSON nodes. | Fleet status reads `summary: {3}`. Inside: **3 of 7 runtimes degraded**. You had to click twice to find out. |
| A2 | Health dots lie. They only ping `/health`. | Kiro shows green while **49 of 72 requests (68%) failed** and non-stream chat returns 502. Fleet shows green with 3 runtimes down. |
| A3 | The largest number on screen is a vanity metric. | "1057 operations" sits top-left. It never changes and drives no decision. |
| A4 | The four service cards lead with config (upstream URL, wrapper prefix, auth source). | Config belongs in Settings. The cards push live data below the fold. |
| A5 | Useful aggregates are never computed. | LiteLLM spend by model, models by provider, Fleet roles per runtime, Kiro errors by route: all available, none shown. |

### B. Explorer (severity: high)

| # | Finding | Evidence |
|---|---|---|
| B1 | **Bug:** the nav list re-renders on every click and jumps back to the top. | `renderOpList` rewrites `innerHTML`. In LiteLLM's 998-op list you lose your place after every selection. |
| B2 | Operations are listed by path only. The human name is in a hover tooltip. | `/v1/x`, `/x`, `/openai/v1/x` look identical in meaning; "Generate Key Fn" is invisible. |
| B3 | Tag hygiene. | `Policies` and `policies` are separate groups; Fleet's 8 ops sit under `untagged`; 96 LiteLLM tags in flat alphabetical order. |
| B4 | Request and response are stacked vertically. | A generated `/key/generate` body is 40+ lines; the Send button and response fall below the fold. |
| B5 | Descriptions render as raw text. | Markdown links and parameter lists from LiteLLM show as plain wrapped text. |
| B6 | Service filter chips have inverted logic. | Nothing selected means "all"; selecting one hides the rest. No visible "all" state. |
| B7 | No request history. | Re-running a call means rebuilding the form. |

### C. Chat (severity: medium)

| # | Finding | Evidence |
|---|---|---|
| C1 | Errors are shown as raw upstream HTML. | A full Cloudflare 502 page appears inside the assistant bubble. |
| C2 | Targets are named by endpoint, not intent. | "Kiro Gateway · /api/kiro/chat/raw" says nothing about what it does differently. |
| C3 | Kiro raw replies render as JSON. | The answer is in `agent_message_chunk` events; v1 printed the whole envelope. |
| C4 | No guidance on known upstream failures. | Non-stream Kiro chat always 502s; the UI lets you pick it without a warning. |
| C5 | Markdown is not rendered. | Kiro replies like `_⚡ glm-5 · ⊙ 1.5%_` show literal underscores. |

### D. Visual system (severity: medium)

| # | Finding |
|---|---|
| D1 | Generic dark "SaaS card kit": every block is the same rounded card with the same weight, so nothing reads as more important. |
| D2 | Monospace used for labels as well as code, so paths and prose blur together. |
| D3 | Numbers are not tabular; latencies and counts don't align. |
| D4 | Uppercase tracked section labels and "A · B · C" meta strings everywhere add noise without information. |

### E. Settings and trust (severity: low)

| # | Finding |
|---|---|
| E1 | No way to test a token. You save, then go hunting for a panel that turns green. |
| E2 | The active credential source (browser token, server key, none) is shown only on the dashboard. |

## What v2 changes

- **Overview** opens with a live **routing map**: Console to each service to its runtimes, coloured by real health, not ping. Below it, an **attention list** that names every problem in one sentence.
- Each service gets a purpose-built summary: tables for runtimes, roles, spend and errors. JSON is one click away, never the default.
- **Explorer** becomes three panes: navigation (human names first, normalised tags, stable scroll), request, response side by side, plus history.
- **Chat** names targets by intent, extracts text from every reply format, turns upstream errors into one readable line, and renders basic Markdown.
- **Settings** shows the credential source per service with a Test button.
- Visual system: blue-graphite instrument palette, IBM Plex Sans for interface, Plex Mono only for paths and code, tabular numbers.
