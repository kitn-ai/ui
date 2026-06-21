# Hero demo — live agent flow (design)

- **Date:** 2026-06-20
- **Status:** approved direction, pending final sign-off
- **Branch / PR:** `worktree-unocss-research` (PR #98)
- **Scope:** `docs-site/src/components/landing/HeroChat.tsx` (single component; no/minimal `Hero.astro` change)

## Problem

The hero's `<kai-chat>` seeds a static exchange on load. It can read as a screenshot, and it omits the library's differentiators (tool calls, structured results, live streaming). Make it **auto-play a believable, streaming agent flow** so a visitor immediately sees a live component doing real agent work.

## Decisions (brainstormed with Rob, 2026-06-20)

- **Direction:** DEPTH — one coherent agent flow (not a feature reel, not free-form interactivity).
- **Scenario:** the existing **p99 latency debugging** (real-world, dev-credible; keep the copy).
- **Climax:** a tool call that returns **structured data** (see *Card rendering* — delivered as the tool panel's output + a markdown breakdown, not a standalone cards element).
- **Playback:** auto-play **once when the hero is in view** (≈ on load, above the fold); replay if it re-enters the viewport; then **settle** on the completed conversation with the live input intact.
- **Streaming:** the assistant answer streams token-by-token via the chat's real mechanism (reassigning message `content` each tick).
- **Reduced motion:** `prefers-reduced-motion` → skip animation, render the completed conversation immediately.

## The flow (auto-played beats)

1. **User message** drops in: the p99 question (existing copy).
2. **Reasoning panel:** shimmer → "Thought for 4s" (existing reasoning text).
3. **Tool-call panel** animates through states: `query_traces(service: "checkout", window: "1h")` — `input-available` (amber, "running") → `output-available` (green) with structured `output` (slowest spans: `db.query 680ms` = the N+1, `auth.verify 40ms`, …).
4. **Assistant answer streams in** word-by-word, including a compact markdown breakdown of the spans (the "data card" within the chat's supported schema), then the diagnosis.
5. **Message actions** fade in (copy / like / dislike).

Then **settle**. Live input remains → submit streams the existing canned follow-up.

## Card rendering (the one schema constraint)

`ChatMessage` supports inline `reasoning` + `tools[]` (`ToolPart` with structured `input`/`output`) + markdown `content` + `actions` — but **no inline generative-UI "card" field**. The standalone `kai-cards` element is separate and would crowd the half-width hero column. So the "data card" is delivered as:

- (a) the **tool panel's structured `output`** (renders as a formatted result, green `output-available` state), and
- (b) a **compact markdown table/breakdown** in the streamed answer.

Fully supported, no second element, reads as a real structured tool result. Standalone generative-UI cards stay showcased in the generative-ui docs + their feature card.

## Implementation sketch

- Rewrite `HeroChat.tsx`'s `SEED` into a multi-beat **SCRIPT** (array of steps with delays). A small **sequencer** (async / `setTimeout` chain) applies each beat by reassigning `host.messages` to a fresh array (the streaming contract).
- **Tool state transitions:** push the `ToolPart` at `input-available`, then patch to `output-available` with `output` (the same `.map()` patch pattern as content streaming).
- **IntersectionObserver:** start the sequence when the hero is ≥ ~40% visible; a `played` guard; reset + replay on re-entry. `matchMedia('(prefers-reduced-motion: reduce)')` → render the final state immediately.
- Keep the existing `onSubmit` streamed follow-up, model switcher, context meter, and suggestions.

## Verification

Playwright: load the hero, assert the sequence animates (message count grows; tool panel present and transitions to `output-available`; answer streams; actions appear) and then settles; assert the reduced-motion path renders the completed conversation; check mobile (stacks, fits). Capture a screenshot for visual sign-off.

## Out of scope

Real backend / model calls; the standalone `kai-cards` element in the hero; artifacts / split canvas (cramped here, showcased elsewhere); interactivity beyond the existing submit.
