# The empty state and the guides — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The assistant block opens on a real onboarding surface — four cards that open developer guides, four question-shaped suggestions that demo the product, and follow-up labels after every turn — and a developer can see how to replace the whole thing.

**Architecture:** The KIT owns the surface (centring, the `empty` slot, the suggestion rendering) and nothing about the content. The BLOCK owns the cards, the labels, the per-turn lookup and the scripted conversations. Spec 3's gate keeps the guides' TypeScript true.

**Tech Stack:** SolidJS, Tailwind v4 (scanned sheet), Vitest (jsdom), Playwright (the `probe-*.mjs` pattern), the block driver.

**Specs:** `docs/superpowers/specs/2026-09-26-empty-state-and-guides-design.md` (this work) and `2026-09-26-guide-conversations-design.md` (the guides' content and its gate). **The conversations themselves are written and approved in `docs/superpowers/specs/2026-09-26-guide-conversations-storyboard.md` — that file is the content source; do not rewrite prose that is already there.**

## Global Constraints

- Behaviors prop-driven; never CSS-manipulate a consumer's node, never pierce a shadow root.
- **Derive it, don't type it.** A number, a label or a list that the code can know, the code reads.
- **Decide loudly.** Anything the kit cannot honour is reported.
- The four suggestion labels and the four cards are APPROVED content (spec 4 §3–§4). Titles, summaries and labels are NOT to be reworded by an implementer; if one cannot be built as written, report it.
- **The guides may not mention `deviceId` or `enumerateDevices`** — spec 2 is designed and unbuilt, and spec 3's gate exists to catch exactly this.
- Comments in `src/**` may not cite a spec section, task/round ID, or dated ruling; one comment token over 20 lines needs a stated reason.
- **Stage only the files you touch**, and check `git diff --cached --name-only` before committing. The repo's spec/plan documents are dirty on purpose.
- Search with a path, never from the repo root.
- **A BLOCK change needs `gen-blocks` then `copy-blocks`; a KIT change needs `nx build ui` then `copy-kit-assets`.** A stale copy has already produced a false measurement once.

---

### Task 1: The empty region gets a height, and the centring stops clipping

**Files:** `packages/ui/src/components/empty/empty.tsx`, `packages/ui/src/components/thread/thread.tsx` (the empty slot's wrapper), `packages/ui/scripts/probe-composer-states.mjs` (or a sibling probe), tests in `packages/ui/src/components/empty/`.

**Interfaces:** produces a centred-when-short, top-aligned-and-scrollable-when-tall empty region.

- [ ] **Step 1: Measure the defect, do not assume it.** With `pnpm dev:blocks` running, measure the empty region's box and its content's box in Chromium: today the `Empty` renders at its CONTENT height (measured 180px) inside a much taller area, so `flex-1` is not resolving. Record both numbers in the report — they are this task's before-picture.
- [ ] **Step 2: Give the region a definite height** so `flex-1` resolves.
- [ ] **Step 3: Replace the centring.** `justify-center` → a centred auto margin on the content. Rationale to write at the site: `justify-center` clips the top of content taller than its box; an auto margin collapses on the overflow side and leaves it scrollable from the top. **Assert the tall case, not the short one** — `justify-center` passes the short case and fails the tall one, so a short-only assertion proves nothing.
- [ ] **Step 4: Prove it in the browser, with the watch-it-fail.** A probe case per state: short content → the content's centre equals the region's centre; tall content → the region's top equals the first child's top (nothing clipped) and the region scrolls (`scrollHeight > clientHeight`). Revert the auto margin and confirm the tall case fails naming the clipped offset.
- [ ] **Step 5:** Full unit suite, both lints, `npm run typecheck`. Commit.

---

### Task 2: The cards

**Files:** `packages/blocks/blocks/assistant/assistant.html`, `assistant.controller.ts`, `assistant.css`.

**Interfaces:**
- Consumes: the four card titles/summaries from spec 4 §3 (approved), and the `empty` slot the kit already ships.
- Produces: a card region in the empty state; clicking a card starts that guide's conversation (Task 5 supplies the turns).

- [ ] **Step 1: Render four cards** — title, summary, one click target each. Compose them from kit parts (a `Button`, the `Empty` parts); **do not add a kit `Card` API for one screen** (spec 4 §7).
- [ ] **Step 2: Card order is the path** — Get it running, Wire a model, Add voice, Send a card.
- [ ] **Step 3: Clicking one seeds the thread** with that guide's opening exchange. **This is the seeding the earlier round could not land** (spec 3 §9.7): seeding at BOOT broke six driver states. Seeding on a CLICK does not — the state is produced by a user action, not a first-run condition — and the task must verify that against the driver.
- [ ] **Step 4:** A driver state per card (the click lands and the guide's first exchange appears). Commit.

---

### Task 3: The suggestions, as rows

**Files:** `assistant.controller.ts`, `assistant.html`.

**Interfaces:**
- Consumes: the four labels (spec 4 §4, approved) and the kit's `PromptSuggestion` `block` variant.
- Produces: the labels rendered as full-width rows, from the transport's own list.

- [ ] **Step 1:** Render the four labels as `PromptSuggestion` `block` rows — the variant the kit's `Components/Empty > Suggestions: List (block)` story demonstrates.
- [ ] **Step 2:** Clicking one submits it as a real user message through the **submit path** (so it behaves exactly like typing it), never as a special "suggestion" event.
- [ ] **Step 3:** Verify in Chromium that each click produces a user turn, an assistant turn, and the next turn's `*Next:*` labels. Commit.

---

### Task 4: Follow-ups after every turn, in the block's transport

**Files:** `assistant.controller.ts`, `assistant.transport.mock.ts`.

**Interfaces:**
- Consumes: the `*Next:*` line for every turn, from the storyboard.
- Produces: `suggestions` recomputed per assistant turn, keyed by the turn index and the prompt that opened the arc.

- [ ] **Step 1:** Move the labels into a per-turn table derived from the storyboard — **one entry per assistant turn**, so a turn with no label is a visible hole rather than a silent one. The lookup keys on the arc (the user's opening prompt) and the turn index.
- [ ] **Step 2:** Stop clearing `suggestions` when messages exist (`assistant.controller.ts:660` is the line that makes them vanish after turn one). Replace it with the per-turn value.
- [ ] **Step 3:** **Do not touch the kit.** The prompt input renders whatever array it is given; the transport already receives the whole thread. A kit-side suggestion engine is the wrong shape (spec 4 §9.6).
- [ ] **Step 4:** A driver state that shows a conversation's `*Next:*` labels mid-thread, and one that shows the cross-links at the end of an arc. Commit.

---

### Task 5: The four guides' turns

**Files:** `assistant.transport.mock.ts`, `assistant.controller.ts`.

**Interfaces:**
- Consumes: the storyboard's four guide conversations, turns and TypeScript fences, verbatim.
- Produces: each card's conversation scripted, ending on the turn whose `*Next:*` line names the next guide.

- [ ] **Step 1:** Script the four guides from the storyboard. **The prose is approved — reproduce it, do not rewrite it.** Where a fence is marked as an excerpt, the rule from the storyboard's preamble applies.
- [ ] **Step 2:** Each guide's last turn offers the next guide in the path first. **`Send a card` is last, so its end line names `Get it running` first**, which makes the four walkable as a loop and keeps every guide's end line the same shape.
- [ ] **Step 3:** The `AssistantTransport` fence's prose says it is the contract a transport satisfies, not a file to create (the storyboard's own note).
- [ ] **Step 4:** A driver state per guide. Commit.

---

### Task 6: The four arcs' turns

**Files:** `assistant.transport.mock.ts`.

**Interfaces:**
- Consumes: the storyboard's four arcs, each three turns, with the card shapes named.
- Produces: four arcs keyed by their labels, each ending with the card that settles the turn.

- [ ] **Step 1:** Script the four arcs. **Each arc's first `*Next:*` entry is the user's next INTENT** — the thing they would say to move forward (`Post it to #metrics`, `Use what I typed`) — not a question whose answer is already on screen, and not a line a form cannot echo. The storyboard's own review flagged three labels here; use the corrected ones.
- [ ] **Step 2:** The arc cannot branch (the storyboard says so and the writing carries it): where a card asks, the next turn acknowledges what it assumed.
- [ ] **Step 3:** Verify each arc in Chromium end to end, including that every click produces the turn the label promised. Commit.

---

### Task 7: Spec 3's gate — the fences are extracted and compiled

**Files:** a new test beside `packages/ui/mcp/tests/` (or wherever the kit's own gates live), reading the block's scripted conversations.

**Interfaces:**
- Consumes: the `ts` fences inside the guides' scripts, and an excerpt marker for fragments.
- Produces: a gate that fails naming the guide and the line.

- [ ] **Step 1:** Extract every fence's body and write it to a real module; compile against the kit's published types. Model it on `verify:scaffold`, which already compiles emitted strings with real tsc.
- [ ] **Step 2:** Handle the two forms the storyboard uses: whole units, and fragments marked as excerpts whose API repeats inside a compiled fence **in the same guide**. An unmarked fragment, or one whose API is never compiled, is a failure — that is the point of the gate.
- [ ] **Step 3: Watch it fail.** Rename a prop inside one fence and confirm the gate names that guide and that line. Restore.
- [ ] **Step 4:** Run it in the repo's verification path. Commit.

---

### Task 8: The stories

**Files:** `packages/ui/src/components/empty/empty.stories.tsx` (or a sibling), the send-button and squared-shape stories named in spec 1 if they are still outstanding.

**Interfaces:**
- Consumes: the kit's `empty` slot; the block's default empty state as the contrast.
- Produces: a story a developer reads to see their own empty state replacing ours (spec 4 §6, the owner's ask).

- [ ] **Step 1:** The custom-empty-state story: a host's own title, description, content and suggestions projected into `empty`, beside the default. **This is the story the owner asked for by name** — a slot nobody sees replaced is a slot nobody uses.
- [ ] **Step 2:** The list-variant suggestions story (`PromptSuggestion` `block`), since that is now the template's rendering.
- [ ] **Step 3:** Stories that render a slot or a variant must not claim behaviour they do not show (this run has fixed four stories that did). Commit.

---

### Task 9: The driver states and the re-recorded artifacts

**Files:** `packages/blocks/blocks/assistant/states.mjs`, `packages/ui/scripts/block-driver/baselines/assistant.json`, `screenshots-assistant/`.

- [ ] **Step 1:** The states this plan added: one per card, the labels mid-thread, the cross-links at an arc's end, and the custom-empty-state contrast if it lives in the block.
- [ ] **Step 2:** Re-record the baseline and the screenshots — the empty state is now a different screen, so every screenshot that shows it is stale.
- [ ] **Step 3:** `verify:blocks`, and the full unit suite with the file count printed. Commit.

---

## Self-review

**Spec coverage.** Spec 4 §2 (the layout) → Task 1. §3 (the cards) → Task 2. §4 (the suggestions) → Task 3. §5 (follow-ups) → Task 4. §6 (replaceable) → Task 8. §7 (non-goals) → no task, correctly. §8 (testing) → Tasks 1, 4, 6, 7, 9. Spec 3's guides → Tasks 5 and 7; its arcs → Task 6.
**Gaps found and closed:** the storyboard's own review flagged three arc labels and the last guide having no next guide to name; both are Task 5/6 steps rather than leftover notes.
**Type consistency.** `suggestions` is the kit's existing prop, `persistSuggestions` is a `ChatThread` prop this block does not use, `PromptSuggestion` `block` is the rendering, and the transport's per-turn table is the only new structure. No new kit API anywhere in this plan.
