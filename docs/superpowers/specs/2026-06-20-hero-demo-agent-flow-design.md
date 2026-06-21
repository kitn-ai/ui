# Hero demo — live agent flow + generative UI (design)

- **Date:** 2026-06-20
- **Status:** approved direction, layout to prototype, pending final sign-off
- **Branch / PR:** `worktree-unocss-research` (PR #98)
- **Scope:** `docs-site/src/components/landing/HeroChat.tsx` + a composed generative-UI card element; possibly minor `Hero.astro`

## Problem

The hero's `<kai-chat>` seeds a static exchange on load — it can read as a screenshot, and it omits the differentiators (tool calls, generative UI, live streaming). Make it **auto-play a believable, streaming agent flow that ends in a real interactive generative-UI card**, so a visitor immediately sees a live agent doing more than emit text.

## Decisions (brainstormed with Rob, 2026-06-20)

- **Direction:** DEPTH — one coherent agent flow.
- **Scenario:** the existing **p99 latency debugging** (real-world, dev-credible; keep the copy).
- **Ambition:** **chat + a real generative-UI card** — the agent flow culminates in an interactive card (the "more than text" moment). NOT the standalone shimmer-in-chat library change (that's a separate future win — see *Thinking*).
- **Playback:** auto-play **once when the hero is in view**; replay on re-entry; then **settle** with the card present and clickable. Live input stays.
- **Streaming:** the answer streams token-by-token via the chat's real mechanism (reassigning `content` each tick).
- **Reduced motion:** `prefers-reduced-motion` → render the completed state immediately.

## Architecture note (what's inline vs. composed)

`kai-chat` renders **inline** from `messages`: `reasoning` (collapsible "Thought for Ns" = in-chat chain-of-thought), `tools[]` (lifecycle panels with a running spinner), markdown `content`, `attachments`, `actions`, plus model switcher / context meter / suggestions. **Generative-UI cards are a separate `kai-cards` element** (`agent → CardEnvelopes → <kai-cards>.cards`) — there's no card field on `ChatMessage`. So the card is **composed alongside** the chat and driven by the same script; resolving it (onAction/onSubmit) feeds a scripted continuation back into the thread (the real generative-UI loop).

## The flow (auto-played beats)

1. **User message:** the p99 question (existing copy).
2. **Reasoning panel:** resolves to "Thought for 4s" (existing reasoning text).
3. **Tool-call panel:** `query_traces(service: "checkout", window: "1h")` — running spinner → `output-available` with structured trace data (slowest spans; `db.query 680ms` = the N+1).
4. **Assistant answer streams in** (markdown), diagnosing the N+1 and proposing a fix.
5. **Generative-UI card materializes** — the "whoa": a `kai-confirm`/`kai-choice` (or `tasks`) card, e.g. **"Ship the fix — timeout + fallback on checkout?" [Apply] [Show diff]**. Interactive.
6. **Settle.** The card is clickable; clicking it runs a scripted continuation (e.g. "Applied — opening a PR…") back in the thread. Live input still works.

## Thinking / shimmer

Conveyed by the reasoning panel + the tool panel's running spinner (both live). A true shimmering "Thinking…" bubble in the thread is **out of scope here** — it'd be a small library add to surface the existing `TextShimmer` "Thinking" loader in the chat's loading state (benefits every consumer; tracked as a follow-up, not built for this demo).

## Layout — the one part to prototype, not spec blind

`kai-chat` is monolithic (thread + its own input). A `kai-cards` element can't go *between* the thread and input (shadow DOM). Candidate placements, to be prototyped and chosen by screenshot:
- (a) card as an **inset/overlay** that animates up within the demo frame at the climax, dismissing on resolve;
- (b) the demo frame as a **flex column**: chat thread (flex-1) with a card **dock** that expands below it at the climax;
- (c) compose from primitives (chat-thread + cards + input) for full control — heavier.
Lean (b) if the frame can grow; fall back to (a). Decide visually. Narrow column (~600px desktop, full-width/short mobile) is the constraint.

## Implementation sketch

- Rewrite `HeroChat.tsx`'s `SEED` into a multi-beat **SCRIPT**; a **sequencer** applies each beat by reassigning `host.messages` to a fresh array. Tool state: push `ToolPart` at `input-available`, patch to `output-available` (same `.map()` pattern as content streaming).
- Add a `kai-cards` (or single card) element + a `CardPolicy`/onAction handler that triggers the scripted continuation.
- **IntersectionObserver** starts the sequence when the hero is ≥ ~40% visible; `played` guard; reset + replay on re-entry; reduced-motion → final state.
- Keep the existing `onSubmit` streamed follow-up, model switcher, context meter, suggestions.

## Verification

Playwright: assert the sequence animates (message count grows; tool panel reaches `output-available`; answer streams; **card appears and is interactive**) then settles; reduced-motion path; mobile fit. Screenshot each layout candidate for Rob to choose.

## Out of scope

Real backend / model calls; artifacts / split canvas; the chat-thread "Thinking…" shimmer library change; interactivity beyond the scripted card + existing submit.
