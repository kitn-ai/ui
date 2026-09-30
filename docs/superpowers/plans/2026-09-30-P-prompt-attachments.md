# P — Prompt Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let content grow into the prompt input's own card (`above` / `below` regions over a hairline divider), then retire `PromptDock` / `kai-prompt-dock` and migrate its users.

**Architecture:** Extract A5's measured-height `Band` from `prompt-dock.tsx` into a shared `MeasuredPresence` primitive; `DefaultPromptInput` renders its attachment regions inside the card's surface element with parts for each region and divider; the facade exposes them as slots. Then delete the dock.

**Tech Stack:** SolidJS, `defineWebComponent`, `readSlots`, vitest (unit + storybook), Playwright screenshot compare.

**Spec:** `docs/superpowers/specs/2026-09-30-P-prompt-attachments-design.md` (umbrella ruling 20).

## Global Constraints

- Plan A's Global Constraints apply (worktree setup, untouchable paths and ports, `kai-` contract, decide loudly, `build:api`, commit trailer, no push).
- **Nothing attached is pixel-identical to today.** Capture the before screenshots FIRST.
- Break now: `PromptDock` / `kai-prompt-dock` are deleted with no alias.
- Visual reference: branch `feat/comp-c0`, `packages/ui/src/stories/checkpoint/prompt-attachments.stories.tsx`, story `B. Grows into the input`. The mockup reached inside the input with descendant selectors (`[&_[data-prompt-input]]`); the real version must not: the card renders the regions itself.

## Shared files (supervisor serializes)

`src/solid.ts`, `web-components/register/register-impl.ts`, `web-components/slots/slots.ts` + `slots.test.ts`, `components/prompt/default-input.tsx` (P1 only; later B5/C4 edit `chat-app.tsx`, not this file), every generated artifact.

## Task graph

```
P1 attachment regions (after A, now) ── P2 retire PromptDock + migrate
```
B5 and C4 need P1 merged; P2 can run in parallel with B5 (disjoint files).

## Review Focus

1. A consumer who never attaches anything upgrades and sees NO change at all (size, padding, ring, shadow) — pinned in P1 Step 1 (screenshot equality, light and dark).
2. Attached content that contains a focusable control: the card's focus ring must appear when that control is focused, not only when the textarea is — pinned in P1 Step 1.
3. Content attached at first render must appear without animating in (no slide on page load) — pinned in P1 Step 1.
4. `above` content that grows while open (a plan expanding) animates to the new height and never clips — pinned in P1 Step 1.
5. The Codex lab's bottom project row must still sit visually under the input after migration — pinned in P2 Step 1 (screenshot read-back).

---

### Task P1: Attachment regions inside the prompt input's card

**Files:**
- Create: `packages/ui/src/components/presence/measured-presence.tsx`, `measured-presence.test.tsx` (the logic moved out of `components/prompt/prompt-dock.tsx:59-170`, `Band`)
- Modify: `packages/ui/src/components/prompt/prompt-dock.tsx` (use `MeasuredPresence`; the dock is deleted in P2, but it must keep working until then), `packages/ui/src/components/prompt/default-input.tsx` (props `above`, `below`; regions inside the card's surface element), `packages/ui/src/web-components/prompt/prompt-input.tsx` (slots `above`, `below` via `readSlots` + `MutationObserver`), `packages/ui/src/web-components/slots/slots.ts` (slots and parts `attachment-above`, `attachment-below`, `divider-above`, `divider-below` with recipes), stories in `components/prompt/prompt-input.stories.tsx` (`With Content Above`, `With Content Below`, `Growing Content`)
- Test: `packages/ui/src/components/prompt/default-input-attachments.test.tsx`, `packages/ui/src/web-components/prompt/prompt-input-attachments.declarative.test.tsx`, `packages/ui/tests/e2e/prompt-attachments.browser.test.ts`

**Interfaces:**
- Produces: `MeasuredPresence(props: { open: boolean; children: JSX.Element; class?: string })` (grows from 0 to measured height, re-measures while open, no animation on first paint, snaps under reduced motion, unmounts content once closed); `DefaultPromptInput` props `above?: JSX.Element`, `below?: JSX.Element`; `kai-prompt-input` slots `above`, `below`.

- [ ] **Step 1: Capture, then write failing tests**
  - Before editing anything: screenshot `components-promptinput--playground` (and the `kai-prompt-input` facade fixture) in light and dark into the supervisor's scratch dir; commit nothing.
  - Unit: with no `above`/`below` the rendered DOM has no `[part~="attachment-above"]`, no divider part, and the same element tree as before (snapshot the tree before editing); with `above` the content is a descendant of the card's surface element and precedes `[part~="divider-above"]`, which precedes the textarea; `below` mirrors it after the input row; content added after first render appears; removing it collapses and then unmounts.
  - `measured-presence.test.tsx`: the three A5 behaviours that were tested on `prompt-dock.test.tsx` move here unchanged (re-measure while open, first paint does not animate, reduced motion snaps).
  - Browser: screenshot equality with the captures (nothing attached); the card's ring shows when a button inside `above` is focused; height animates from 0 to measured; growth while open animates; axe light and dark.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Move `Band`'s logic into `MeasuredPresence` and make `PromptDock` use it (its tests stay green). In `DefaultPromptInput`, render `<MeasuredPresence open={!!props.above}>` holding the region (`part="attachment-above"`, card horizontal padding, no background) followed by a hairline (`part="divider-above"`, `border-t border-border`, inset to the card's padding), then the existing input row; mirror for `below`. The card element keeps its surface, shadow and `focus-within` ring, so the ring covers attached content by construction. The facade passes `above`/`below` only when the slot has assigned content.
- [ ] **Step 4: Run** unit, the browser test, storybook project for `components/prompt web-components/prompt`, typecheck, `build:api` (commit artifacts), `verify:generated`.
- [ ] **Step 5: Commit** — `feat(ui): content grows into the prompt input's card through above and below regions`.

**Verification type:** screenshot equality (nothing attached) + unit + in-browser animation/focus + axe.

---

### Task P2: Retire `PromptDock` and `kai-prompt-dock`

**Files:**
- Delete: `packages/ui/src/components/prompt/prompt-dock.{tsx,test.tsx,stories.tsx}`, `packages/ui/src/web-components/prompt/prompt-dock.{tsx,test.ts}`
- Modify: `packages/ui/src/solid.ts`, `web-components/register/register-impl.ts`, `web-components/slots/slots.ts` + `slots.test.ts`, `tests/web-components/attribute-removal.test.tsx`, `components/dock/dock.tsx` and `web-components/dock/dock.tsx` (comments), `stories/showcase/claude-code.stories.tsx` (top notice → `above`, bottom mode row → `below`), `stories/showcase/codex.stories.tsx` (bottom project/control row → `below`), `apps/docs/src/content/docs/guides/composition.mdx` (the slots example becomes `kai-prompt-input` `above`), `apps/docs/src/content/docs/guides/app-shell.mdx`, the prompt-dock docs page if present (delete + redirect to the prompt-input page); regenerated meta, types, manifest, React wrappers, `mcp/catalog/derived.json`, `llms-full.txt`, `docs/web-components.md`.

- [ ] **Step 1: Failing check**: `customElements.get('kai-prompt-dock')` is undefined after importing register-all (add to `web-component-registry.test.ts`); the scoped grep `grep -rlE "PromptDock|kai-prompt-dock|prompt-dock" packages/ui/src packages/ui/tests packages/ui/scripts packages/ui/mcp packages/ui/frameworks apps/docs/src examples packages/blocks` returns files.
- [ ] **Step 2: Delete and migrate** until the grep returns only history lines. Screenshot the two showcase stories before and after; the lips now sit inside the input card (the intended change), with the same content.
- [ ] **Step 3: Run** unit, emitted, storybook project, `build:api`, `verify:generated`, `verify:consumer`, `verify:scaffold`, docs build, `verify:docs`.
- [ ] **Step 4: Commit** — `feat(ui)!: retire kai-prompt-dock; content attaches inside the prompt input`.

**Verification type:** unit + consumer gates + docs build + screenshot read-back of the two labs.
