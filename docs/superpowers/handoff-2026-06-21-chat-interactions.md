# Handoff — chat-interaction components (2026-06-21)

## TL;DR
**PR #102 (`kitn-ai/ui`) is OPEN, ready for Rob's review/merge.** Five new chat-interaction features + a kit-wide animation fix, all built, browser-IVP'd, documented, MCP-wired, with Storybook stories. **Full suite green: 1361 tests, typecheck (4 passes) clean.** 16 commits ahead of `origin/main` (@ 499a8d1 = the merged footprint/hero-demo PR #98).

## Where the work lives (read this — the dir name is misleading)
- **Worktree:** `/Users/home/Projects/kitn-ai/kitn-chat/.claude/worktrees/unocss-research` — its folder is named `unocss-research` but it is on branch **`feat/chat-interactions`** (PR #102). Run everything here. `git branch --show-current` to confirm.
- **Main repo dir:** `/Users/home/Projects/kitn-ai/kitn-chat` is on a STALE local `main` (e210b5c): **27 behind `origin/main`** AND **1 ahead** (an unpushed commit — the state-helpers spec). Fix with `git pull --rebase origin main` there (do NOT hard-reset; the state-helpers commit is unpushed and is the next-project plan). The "old screens" Rob saw were the docs dev server (:4321) running from this stale dir.
- **Merging:** via REST (gh Projects-classic bug) — `gh api -X PUT repos/kitn-ai/ui/pulls/102/merge -f merge_method=merge -f sha=<head>`. Rob reviews/merges; release-please then cuts a release PR.

## What's in PR #102 (16 commits, all pushed)
Five features, SolidJS → `kai-*`, each with tests:
1. **`kai-toast-region` + `toast()`** — imperative transient-toast primitive. `toast.success(...)`, Undo-action, stacking, pause-on-hover. **Default 5s** (7s w/ action). **`target` option** scopes a toast to a container's bounds; the chat passes its root so copy/feedback toasts appear IN the chat; target-less = viewport top-center. Singleton mounts on `document.body` as a styled `kai-*` element. Exported from `.` AND `./elements`.
2. **Stateful message action row** — copy→check + toast; 👍/👎 mark-chosen + **slide-to-fill** (unselected collapses 0fr↔1fr, chosen slides in, reverses on un-vote) + toast. State in `message-feedback.ts` (survives streaming re-renders); optional controlled `ChatMessage.feedback`; `kai-message-action` += additive `state:'on'|'off'`. Extracted shared `MessageBody`.
3. **Card dismiss + recovery** — `dismissed`/`expired` non-terminal `CardResolution` kinds + `reopen` event + `onReopen` + `dismissRecovery()` helper + re-openable stub (defer-not-delete). Additive (no contract-version bump). Resolves #100's design Qs.
4. **`kai-compare`** — "which response do you prefer?": two streaming candidates → pick → collapse → emits `kai-compare-select {chosenId, rejectedIds}`. **Layout `auto`/`columns`/`tabs`**, auto switches by CONTAINER width (columns wide / pills+tabs narrow). The "Pick this" button IS the radio (a11y: no nested-interactive).
5. **Tooltip** — dismisses on trigger click (`dismissOnClick?=true`).

Plus: **kit-wide animation fix** — `styles.css` was missing `@import "tw-animate-css"`, so every `animate-in`/`slide`/`animate-out` (toast, thumb, popover, tooltip, dropdown, hover-card) compiled to nothing. One import restores them all (+0.75 KB gz, measured — keep the lib). Also `ec4baf7` fixed a first-toast upgrade-race (caught by IVP). Generated artifacts regenerated (46 elements; React wrappers `ToastRegion`/`Compare`). Docs pages (toast, compare; dismiss on cards; action-row on message/chat). MCP debug rules + scaffold interaction-patterns. Storybook stories (toast, compare, kai-cards DismissAndRecover; action-row in chat story).

## Verified
typecheck 4 passes clean · full `npm test` = **1361 passed (237 files)** · in-browser Playwright IVP of all 5 (toast slide/auto-dismiss/scoping, copy→check, 👍/👎 slide-to-fill, dismiss→stub→undo→reopen, compare pick→collapse, tabs at 480 vs 1100px) · Storybook stories drive each interaction green.

## OPEN — what's next (in order)
1. **Live docs-site demos** (the ONE unfinished item): the new toast/compare docs *pages* exist but with copy-paste snippets, NOT interactive demos (the docs agent skipped them — needs sample-data + bespoke demo components like the landing demos, with the `customElements.whenDefined` gate). Storybook covers testing for now. Rob to decide: wire these live, or ship docs as-is.
2. **Rob reviews/merges PR #102.**
3. **Minor follow-ups (in the PR body, non-blocking):** dismissed-stub label falls back to "this card" when only `data.heading` (not envelope `title`) set; re-export `dismissRecovery` from `./elements` for CDN consumers.
4. **Parked issues:** #99 (`whenReady()` readiness helper — would retire the upgrade-race class), #100 (cards allow free-text discussion, not just forced selection). Rob prioritizes.
5. **THEN: the state-helpers plan** — `docs/superpowers/plans/2026-06-20-state-helpers-and-hooks.md` (currently only in the unpushed local-main commit e210b5c). Rob wanted this done AFTER the chat-interaction work.

## How to test (Storybook = the surface)
```
cd /Users/home/Projects/kitn-ai/kitn-chat/.claude/worktrees/unocss-research
npm run dev   # Storybook :6006
# Components/Toast · Components/Compare (Default/Columns/Tabs) ·
# Generative UI/kai-cards → DismissAndRecover · Components/Chat (action row)
```

## Key paths
`src/primitives/toast-store.ts` · `src/components/toast.tsx` · `src/elements/toast.tsx` · `src/primitives/message-feedback.ts` · `src/components/message.tsx` (MessageActionBar + MessageBody) · `src/primitives/card-recovery.ts` · `src/components/dismissed-stub.tsx` · `src/components/response-compare.tsx` (+`-types`) · `src/elements/compare.tsx` · `src/ui/tooltip.tsx` · `src/elements/styles.css` (the tw-animate-css import). Plan: `docs/superpowers/plans/2026-06-20-chat-interactions-plan.md`.
