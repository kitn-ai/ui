# Handoff — the block's open questions, and where everything else lives

**Written at session end, 2026-09-28.** The owner is clearing his session and will answer the five questions below afterwards. Everything else about this work — what landed, the traps, the rulings — is in [`2026-09-27-composer-empty-state-and-rail.md`](2026-09-27-composer-empty-state-and-rail.md) and the ledgers under `.superpowers/sdd/`.

Branch `feat/blocks-exemplar-and-wiring`. **Nothing is running. The tree is clean.**

## The state in one paragraph

The assistant block is at the product bar and its ladder is green: the composer with its palette and tools menu, the empty state with guide cards and suggestion rows, the rail with projects, folders, per-row glyphs and section chrome, the disclaimer, and underneath it all a store that persists groups, a published roving-tab primitive, four delivery forms with template typing, and a menu that can no longer run away in either direction. **Every gate ran on the built tree** — unit, emitted, blocks, both cells, scaffold, consumer, fences, preview, typechecks, and three lints.

## The five questions

Each is a sentence from the owner, not a round. **My recommendation is a recommendation, not a default** — nothing moves until he answers.

### 1. Should `kai-badge` grow an outlined variant?

**Where:** the kit and its Storybook — *not* the block.

**Why it came up:** the v0 story distinguishes a live version chip from an earlier one, and the badge has no outlined or quiet variant, so the story works around it with the documented `::part(badge)` hook plus a local `<style>` block.

**Question:** add the variant, or keep the workaround?

**Recommendation: add it.** His own reference screenshots use outlined chips, so it is a treatment the kit lacks rather than one story wanting something exotic.

**Cost:** one round — the variant, a story, the regenerated docs.

### 2. The task-list arc renders a second card instead of a revision

**Where:** the assistant block — **the one item that touches content the owner actually reads.**

**Why it came up:** the approved storyboard says the task-list guide **revises** a card as the conversation continues; the demo renders a second card, so it reads as two task lists rather than one evolving.

**Question:** does the storyboard win?

**Recommendation: make it a revision.** The storyboard was approved content, and a card updating in place is the stronger demonstration — the generative-UI story rather than two snapshots of it.

**Cost:** small — the mock script reuses the card's id.

### 3. Should the 240px menu floor yield to a narrower clipping container?

**Where:** the kit — visible in the block, but the value is the kit's.

**Why it came up:** the menu surface has a 15rem minimum width. In a 200px clipping sidebar the panel **overflows its clip by 48px**, so rows are cut.

**Question:** does containment win over the floor?

**Recommendation: yes.** A clipped row is worse than a narrow one, and his references put a ~240px menu in a ~280px rail — so the floor is right for the common case and only needs to yield in the edge.

**Cost:** one `min()` in the existing cap.

### 4. Should the four action rows be shorter than 32px?

**Where:** the assistant block.

**Why it came up:** those rows are a fixed `h-8` (32px), so the new 2px padding is absorbed and they do not shrink. The conversation rows are now 32px too — **they match exactly.**

**Question:** shrink them anyway?

**Recommendation: leave them.** They match the conversation rows now, which is the consistency he asked for, and shrinking them breaks that match again. If they feel heavy, that is probably weight or colour rather than height.

**Cost:** nothing, or one height value.

### 5. The markup size ceiling has been passed

**Where:** the assistant block.

**Why it came up:** a lint caps block files at zero headroom, derived from the largest file when it was written. `assistant.html` is **907 lines against an 893 ceiling** — 896 before — and the growth is real features (the palette, the chrome, the theme binding).

**Question:** raise the ceiling, or have the page give something up?

**Recommendation: raise it once, with the reason in the commit** — the growth is features rather than creep, which is the distinction a ratchet exists to make. **Then treat the next growth as the signal to split the page**, the way splitting the controller was deliberately stopped.

**Cost:** one line in the lint, plus its self-test.

## Engineering follow-ups — no decision needed, they are mine

- **A kit build invalidates the recorded baseline.** Found today: after `nx build ui` the served pages carry new values while the committed expectation still describes the old ones, so `verify:blocks` goes red on values nobody's change explains. The rule is written down; it wants to be enforced where the build runs.
- **The baseline records a machine-specific port**, so it would read as a regression on another machine.
- **The screenshot tolerance was derived from the driver's images and applied to the e2e captures by analogy** — worth re-measuring rather than inheriting.
- **The lint step is hand-typed in CI** while the browser leg beside it is derived from `package.json` scripts. Same improvement, one line.

## Before telling him to look at anything — the sync rule

**A kit change is invisible until `nx build ui` runs**, and a block change needs the copies. Twice this session the preview lagged because that step was queued and nobody came back for it, and once because the generated artifacts described the previous values.

- **Block change** → `gen-blocks` → `copy-blocks` (local) → `copy-kit-assets`.
- **Kit change** → `nx build ui --skip-nx-cache` **first**, then `build:api` if derived artifacts move, then the block chain, **then restart `dev:blocks`**.
- **Then verify the served copy**, not the source: a 200 on `/blocks/local/assistant.html` **and** a grep for the thing that changed.
- **Commit the regenerated artifacts in the same breath.**

The preview is `http://localhost:4321/blocks/`, served in local mode.


## The prompt to paste back after clearing the session

```
Repo /Users/home/Projects/kitn-ai/kitn-chat, branch feat/blocks-exemplar-and-wiring.
I cleared my session; you have no memory of what was done.

Read first, in this order:
1. docs/handoff/2026-09-28-block-tuning-and-open-questions.md - the state, my five
   open questions, and the recommendation on each.
2. Only if you need the detail: docs/handoff/2026-09-27-composer-empty-state-and-rail.md
   and the ledgers under .superpowers/sdd/.

Then, before trusting anything written down, check the tree yourself:
  git status --porcelain
  git log --oneline -8
  ps -A -o command= | grep async-cfg

Then:
- My preview is http://localhost:4321/blocks/ in local mode. RUN THE SYNC CHAIN BEFORE
  TELLING ME TO LOOK - the rule is in the handoff. A kit change is invisible until
  `nx build ui` runs.
- Present the five open questions tersely, with your recommendation on each, and I
  will answer them.

My answers: [leave blank to answer in chat, or fill in any you want to settle now]
```
