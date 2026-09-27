# Handoff — the composer spec, and what the mock reorder left behind

**Date:** 2026-09-26 · **Branch:** `feat/blocks-exemplar-and-wiring` · **Tree:** dirty, nothing committed this round
**Status:** spec written and awaiting owner review; the plan follows it. The mock turn-order change is in the tree and its copy follow-up is pinned below.

## 1. Where the tree is

| item | state |
|---|---|
| tip | `9618ad92` — *fix: the block template's review round, and eight kit defects it exposed* |
| uncommitted | the two lanes below, plus `CLAUDE.md`'s search trap and the regenerated `llms-full.txt` |
| spec | `docs/superpowers/specs/2026-09-26-composer-states-and-tools-menu-design.md` (uncommitted) |
| preview | `pnpm dev:blocks` → <http://localhost:4321/blocks/>, `KAI_BLOCKS_KIT=local` |

Uncommitted work, all verified green on its own scopes:

1. **Message spacing** — `messageGap` joined the density table (`gap-0` compact,
   `gap-3` default, default byte-identical), the thinking row is `mb-3`, and
   compact's between-message gap was confirmed as already 8px.
2. **Mock turn order** — `createMockResponder` now emits reasoning → **tool calls**
   → text → citations, so a tool call reads above the answer it produces. Framing
   of every frame is byte-identical; only the two blocks moved.

## 2. Pinned follow-up: the scripted lead-ins now read backwards

**Owner ruling, 2026-09-26: this is a follow-up, to be done after the composer
change. Not now.**

The reorder was mechanical, but the *copy* in those scripts was written for the old
order. These sentences are lead-ins to a call and now render **below** the call
they introduce:

- `Let me look that up.` — `packages/ui/mcp/recipes/composed-thread.ts` and its
  materialized twin `examples/apps/composed-thread/src/main.ts`
- `Let me pull up that order.` — `packages/ui/.kai/acme-support/src/App.tsx`
- `Give me a second to read the document.` / `Searching for that now.` — the
  shared `packages/ui/mcp/construct/mock-script.ts`
- `Reading q3-metrics.pdf now.` — `packages/blocks/blocks/assistant/assistant.transport.mock.ts`

`mock-script.ts` is the one that matters: it feeds both `mcp/mcp/tools/scaffold.ts`
and `mcp/construct/codegen.ts`, so **every emitted starter and every construct app
with a tool surface** shows a lead-in sentence under its tool row.

Two fixes, owner's choice when it is picked up: rewrite each as a **post-call**
sentence ("Here is what I found."), or **drop** it where a call immediately
follows, leaving `reasoning → tool → answer`. Reverting the order is not the fix —
the reading order is the wanted one; the copy is what lagged.

## 3. What the owner has ruled on the composer

Recorded in the spec's §12, listed here so the next session does not re-ask:

- The `+` becomes a menu; the dev chooses how it works and looks.
- **Claude Code's menu is the template's default look**; ChatGPT's removable chip is
  the reminder, and **both** are supported.
- `chip` defaults to **false** — a host opts in per capability.
- The composer's radius is a **fixed** token, not `--radius-pill` (which clamps to
  half the box and would keep the expanded state fully round).
- The dev chooses the layout and it **stays chosen**: `expanded` pins two rows or
  one row; omitted derives. Default is the clean collapsed look.
- Nothing consumes the kit yet, so breaking changes are free — hence one event, no
  aliases, and `webSearch` / `kai-web-search` removed rather than deprecated.

Still to design, as its own spec: **voice and microphone device selection** (device
enumeration, permission, labels, the live level meter, the mic menu). The kit
already has `use-voice-recorder` (no device id), `use-audio-analysis`
(`{ bands, volume }` — the meter's source) and `<kai-voice-input>`.
