# Handoff — element capability batches + "Full Example" kitchen-sinks (2026-06-15)

**Read this top-to-bottom before doing anything.** This is the resume point for a
long session that (a) shipped the per-story "Usage" tabs, (b) ran a capability
audit, (c) shipped element capability **batch 1**, and (d) started — but has NOT
finished — the **"Full Example" (kitchen-sink)** stories. There is uncommitted
work and one important course-correction from Rob captured below.

---

## 0. TL;DR / immediate state

- **Branch:** `main`. **Uncommitted changes sit directly on `main`'s working tree** (a mistake — the kitchen-sink WIP was edited on main, not a feature branch):
  - `src/stories/message-actions.stories.tsx` — adds a `FullExample` story.
  - `src/stories/examples/usage/message-actions.ts` — adds a `'Full Example'` per-story Usage entry.
  - **These two files are WIP and must be REVISED (see §4) and moved to a new branch** before committing. (Also present untracked, unrelated, leave alone: `docs/notes.md` = Rob's parking lot; `docs/handoff/2026-06-15-resolved-cards-and-iframe-transport.md` = not ours.)
- **Shipped to main this session:** PR #73 (per-story Usage tabs, `docs`) and PR #74 (`feat!` element capabilities batch 1).
- **Release:** release-please PR **#75 `chore(main): release @kitn.ai/chat 0.13.0`** is OPEN. **Rob cuts releases** — do NOT merge it unless he says so. Merging it publishes 0.13.0 via npm OIDC.
- **Merging PRs:** always via REST — `gh api -X PUT repos/kitn-ai/chat/pulls/<n>/merge -f merge_method=merge` (the `gh pr merge` Projects-classic bug). Repo uses merge commits.
- **Rob's frustration that ended the session:** responses were too slow / over-deliberated. Next model: **be faster and more decisive, less back-and-forth.** Rob is technical, action-oriented, and dislikes naming drift and over-thinking.

---

## 1. What shipped: per-story "Usage" tabs (#26) — PR #73, on main

A **"Usage"** tab on element-centric Examples/Patterns teaching "how you do this"
(representative props/events, NOT an exact copy of the demo), **keyed per story**
(eyebrow = example name, title = story name). Rendered tab renamed **Canvas →
Demo**; code tab → **Usage**; six framework tabs **HTML·React·Svelte·Vue·Angular·Solid**.

- Data: hand-authored `ExampleUsage` modules in `src/stories/examples/usage/` —
  `{ title, intro, snippets, stories?: Record<storyName, StoryUsage> }`. Barrel
  `index.ts` → imported **directly** by the manager addon `.storybook/api-tab.tsx`
  (no generator/JSON). `.storybook/manager.ts` does the Demo/Usage labels + tab
  visibility. Per-story lookup uses `useStorybookState()` (storyId → index entry's
  `title` + `name`).
- 9 examples have a Usage tab; layout/meta (Centered Conversation, Chat Panel
  Layout, Docked Widget, Composed shell, Catalog) intentionally do NOT.
- Spec: `docs/superpowers/specs/2026-06-15-per-story-usage-tabs.md`. Prior handoff:
  `docs/handoff/2026-06-15-example-code-tabs.md`.

### ⚠️ Known shipped inaccuracy to fix
In `src/stories/examples/usage/message-actions.ts`, the **"Copy with Confirmation"**
story `intro` claims *"`<kc-message>` handles the copy interaction for you … it
copies the content to the clipboard."* **This is FALSE.** `kc-message`'s built-in
`copy` action does NOT copy — `MessageActionBar` only **emits** the `messageaction`
event (`action: 'copy'`); the consumer must do the clipboard write. (The
`navigator.clipboard.writeText` in `src/components/message.tsx` is in the separate
`MessageCopyButton` component, which the element's action bar does NOT use.) Fix
that intro to say the consumer handles copy on the `messageaction` event.

---

## 2. What shipped: element capabilities batch 1 — PR #74 (`feat!`), on main

Closed the 3 top recurring gaps from the audit (§3) on `kc-message` (and `kc-chat`
per message). Pre-1.0, so **no backward-compat required** — Rob's explicit instruction.

1. **`actions-reveal="always" | "hover"`** on `kc-message` + `kc-chat` (default
   `always`). On `hover`, the element adds `group` to the row and the bar gets
   `opacity-0 group-hover:opacity-100` — the element owns the affordance; no consumer CSS.
2. **Avatar from payload:** `message.avatar` (type **`AvatarData { src?, fallback?,
   alt? }`** in `chat-types.ts` — named to mirror the sibling `AttachmentData` and to
   avoid clashing with the `MessageAvatar` *component*) + scalar conveniences
   `avatarSrc` / `avatarFallback`. `kc-message` rendered no avatar before.
3. **Custom action descriptors:** `actions: (ChatMessageAction | CustomAction)[]`,
   `CustomAction = { id, label, icon? }`. `icon` is a **curated name** from the new
   `src/ui/action-icons.ts` registry (fixed `name → lucide-solid` map; NO arbitrary
   SVG/URL; unknown/absent → label-only button). `BUILTIN_ACTION_LABEL` also there.

Architecture: a shared **`MessageActionBar`** (in `src/components/message.tsx`,
exported) renders the bar from the mixed `(string | CustomAction)[]` with a
`reveal` prop + `onAction(id)` callback, and **replaced the duplicated action-button
blocks in BOTH render paths** — `src/elements/message.tsx` (single `kc-message`) and
`src/components/chat-thread.tsx` (the `kc-chat` message loop). Future per-message
capabilities should land in `MessageActionBar` / those two paths.

**Breaking:** `messageaction` event detail `action` widened to **`string`** (built-in
name OR custom id). `chat-workspace.tsx` also widened (it re-declares the event).

New stories on `kc-message` (Components/Message): "Avatar + Custom Action" and
"Actions Reveal on Hover". 12 new unit tests in `src/components/message-action-bar.test.tsx`.
Spec: `docs/superpowers/specs/2026-06-15-element-capabilities-batch1.md`.
Independently verified (diff review, `tsc`, 12 tests re-run, Playwright: avatar +
Share render; hover-reveal bar `opacity-0` by default with `.group`/`group-hover` wired).

---

## 3. The capability audit — the roadmap for future element batches

`docs/superpowers/specs/2026-06-15-element-capability-gaps.md` (committed via #74).
A 12-analyst fan-out compared every Example/Pattern demo against the backing
`kc-*` element and found **38 real gaps** — behaviors a demo shows that the element
can't express via props/payload. Governing principle (saved to memory
`components-prop-driven-not-css`): **kc-* behaviors must be driven by props/JSON
payload, not CSS manipulation or shadow-piercing; a CSS-only behavior is a gap.**

- Concentrated in `kc-message` (15) and `kc-prompt-input` (6).
- Recurring cross-element themes (design once, apply consistently): **(1) reveal**
  [DONE in batch 1], **(2) avatar payload** [DONE], **(3) custom action/icon
  descriptors** [DONE for message actions; also wanted on kc-prompt-input/kc-chat
  toolbars, kc-checkpoint/kc-empty/kc-chain-of-thought icons], **(4) streaming/markdown**
  (kc-response-stream needs a `markdown` prop — high; kc-message needs a `streaming` mode).
- Other highs: kc-sources `numbered` citations; kc-prompt-input `stoppable`/`stop`.
- Structural find: **there is no `kc-scroll-button` element** (only a Solid primitive).
- Medium/low + borderline (need human judgment, don't auto-build): kc-message
  `feedbackBar`/`pending`/`measure`/`bubble`; kc-context thresholds; kc-suggestions
  grouping; kc-checkpoint/kc-empty icons. Full per-element list is in the doc.

**Future "batch N" efforts** = pick a theme from this doc, write a small spec, TDD,
regenerate metas, ship as `feat!`. Each batch is its own branch/PR.

---

## 4. ACTIVE TASK: the "Full Example" (kitchen-sink) — CORRECTED DEFINITION

Rob wants **one "Full Example" story added per Example** that shows **all of that
example's stories' features combined as much as possible**, with a Usage tab giving
the complete "if you want to do all this, here's how" code. It is a **teaching
composition**, not a single-element showcase.

### ❗ The correction that ended the session (do NOT repeat my mistake)
I wrongly assumed the Full Example had to be expressible through one `<kc-message>`
payload, and proposed a "batch 2" to add `feedbackBar`/copy-confirm **props** to
kc-message. **Rob rejected that.** His exact intent:

- The Full Example is **"all of the stories combined as much as possible."**
- It **may COMPOSE multiple components/elements.** The **Feedback Bar is its own
  component** (`kc-feedback-bar` / the `FeedbackBar` primitive) — so the Full Example
  should **compose it in**, NOT motivate a new `feedbackBar` prop on kc-message.
- **Copy with Confirmation** = include the copy→**check** confirmation behavior too.
- It's about *"showing the story: if you wanted to do this, this is how you do it"* —
  the whole point of the Examples.

So for **Message Actions**, the Full Example must combine the features of all five
stories: **avatar** + **markdown content** + the **action bar** (built-in
copy/like/dislike/regenerate **plus** custom **Share/Bookmark**) + **copy→check
confirmation** + an inline **Feedback Bar** (`kc-feedback-bar` / `FeedbackBar`).
(Reveal mode: pick one — with this much going on, **always-visible** probably reads
better than hover.)

### Current WIP (uncommitted on main) — what exists and what's WRONG with it
- `src/stories/message-actions.stories.tsx` → `FullExample` story: a Solid
  composition with avatar + a 6-button bar (incl. Share/Bookmark) + hover-reveal.
  **MISSING: the copy→check confirmation and the Feedback Bar.** Fix: add the
  copy-confirmation signal (like the existing `WithCopyConfirmation` story) and a
  `<FeedbackBar title="Was this response helpful?">` below the message.
- `src/stories/examples/usage/message-actions.ts` → `'Full Example'` Usage entry:
  currently shows ONE `<kc-message>` rich payload (avatar + actions incl custom +
  `actions-reveal`). **It must be expanded to show the full composition**: the
  message PLUS handling `messageaction 'copy'` to copy + show a check (since the
  element doesn't, see §1), PLUS composing `<kc-feedback-bar>` (web-component tabs)
  / `<FeedbackBar>` (Solid tab) with its `feedback`/`close` events. i.e. the Usage
  must teach how to assemble all the pieces, across all six frameworks.

### How to finish (recommended)
1. Move the two WIP files to a fresh branch (e.g. `feat/example-full-examples`) off
   main — do NOT commit kitchen-sink work straight to main.
2. Revise the `FullExample` Solid story to include copy-confirmation + FeedbackBar
   (compose `Message` + `MessageAvatar` + `MessageContent` + `MessageActions` with a
   copy-confirm signal + custom buttons, then `<FeedbackBar>`).
3. Revise the `'Full Example'` Usage entry so each of the 6 framework snippets shows
   the **complete composition** (kc-message + consumer copy/confirm handling +
   kc-feedback-bar; Solid = the granular composition). Also fix the "Copy with
   Confirmation" intro inaccuracy from §1 while in this file.
4. Decide the Demo style with Rob: I had left the Demo as a Solid composition for
   consistency. Rob is fine with composition; just make sure the Usage code can
   actually reproduce what the Demo shows (no Demo-shows-what-code-can't mismatch —
   he hates that).
5. Playwright-verify (Demo + Usage tab per framework). Then roll the same "Full
   Example" pattern out to the OTHER examples (combine each one's stories) — Rob
   liked the author+verify subagent fan-out for repetitive work; use it.

### kc-feedback-bar API (for the snippets)
Props: `barTitle` (attr `bar-title`). Events: `feedback` → `{ value: 'helpful' |
'not-helpful' }`, `close` (no detail). React displayName `FeedbackBar`.

---

## 5. Process notes, gotchas, and how Rob likes to work

- **Verify before claiming done:** Playwright visual checks are the standard
  (memory `ivp-playwright-verification`). For custom-element stories the content is
  in **Shadow DOM** — Playwright `.hover()` through iframe+shadow is flaky; read the
  shadow root via `frames().find(...).evaluate(() => document.querySelector('kc-*').shadowRoot…)`
  to assert classes/opacity instead of relying on simulated hover.
- **Snippet bugs `tsc` can't catch:** Usage snippets are template-literal STRINGS, so
  `tsc` won't validate them. A verify pass caught the agent using `kc-model-switcher`'s
  Solid-primitive prop `currentModelId`/`e.detail.id` on the web component — the real
  WC API is **`currentModel`** + event `{ modelId }`. Always have a reviewer (agent or
  human) check snippet APIs against `src/elements/element-meta.json`.
- **Meta regen:** `npm run build` (postbuild) regenerates `element-meta.json`,
  `component-meta.json`, `framework-usage.json`, `element-types.d.ts`, the React
  wrappers (`frameworks/react/index.tsx`), `docs/web-components.md`, `llms-full.txt`.
  Run it ONLY from the MAIN checkout (worktrees pollute paths). Commit the regenerated metas.
- **Gate:** `npx tsc --noEmit` + `npm test` + `npm run test:react` + `npm run
  test:storybook` (needs chromium; ~2 min; runs the Storybook browser project) +
  `npm run build`. Last full gate green: 880 unit / 5 react / 362 storybook.
- **Subagent fan-out** works well here for repetitive authoring + a SEPARATE verify
  agent per item (Rob explicitly asked for "deploy to as many agents as you can,
  have other agents verify"). Cohesive multi-file changes (like batch 1) are better
  as ONE focused agent or done directly, not fragmented.
- **Working style:** lead with a decisive recommendation, prototype ONE then roll
  out, don't over-ask (memory `design-decisions-delegation`). Be consistent with
  naming everywhere (memory note: Rob hates drift). Show changes before commit
  (memory `review-before-commit`). **Be faster** — that's what frustrated him.

---

## 6. Where everything lives

- Specs: `docs/superpowers/specs/2026-06-15-{per-story-usage-tabs,element-capabilities-batch1,element-capability-gaps}.md`.
- Handoffs: this file + `docs/handoff/2026-06-15-example-code-tabs.md` (Usage tabs) +
  `docs/handoff/2026-06-15-storybook-docs-ia-and-merge.md` (0.12.0).
- Usage modules: `src/stories/examples/usage/*` (types, index, 9 example modules).
- Addon: `.storybook/api-tab.tsx` (Usage panel + `FrameworkTabs`/`ExamplePanel`) +
  `.storybook/manager.ts` (labels + tab visibility).
- Batch-1 source: `src/elements/chat-types.ts`, `src/ui/action-icons.ts`,
  `src/components/message.tsx` (`MessageActionBar`), `src/components/chat-thread.tsx`,
  `src/elements/message.tsx`, `src/elements/chat.tsx`, `src/elements/chat-workspace.tsx`.
- Memory (auto-loaded): `kitn-chat-state` (state), `components-prop-driven-not-css`
  (the audit principle), `design-decisions-delegation`, `ivp-playwright-verification`,
  `review-before-commit`, `version-bump-each-change`, `gh-cli-projects-classic-bug`.

---

## 7. Concrete next steps (in order)

1. **Decide on release PR #75 (0.13.0)** — ask Rob whether to cut it (he cuts releases).
2. **Move the two uncommitted WIP files to a fresh branch** off main.
3. **Fix the Full Example for Message Actions** per §4 (add copy→check confirmation
   + compose the Feedback Bar; expand the Usage entry to the full composition across
   all 6 frameworks; fix the "Copy with Confirmation" intro inaccuracy from §1).
4. **Playwright-verify**, show Rob, iterate.
5. **Roll "Full Example" out to the other examples** (combine each one's stories),
   using the author+verify subagent fan-out.
6. **Future element batches** from the audit (§3) — streaming/markdown, kc-sources
   numbered, kc-prompt-input stoppable/toolbar-actions, the missing kc-scroll-button
   element, etc. Each its own spec + branch + `feat!`.
