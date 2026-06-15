# Handoff — per-story "Usage" tabs for Examples/Patterns (#26) (2026-06-15)

**Branch:** `feat/example-code-tabs` (off `main`, **not committed/pushed** — review-before-commit).
**Status:** full rollout built + Playwright-verified; **nothing committed.**
**Storybook:** `npm run dev` (6006) → **Examples → any element-centric example → "Usage" tab.**

Implements backlog item **#26** (continues `2026-06-15-storybook-docs-ia-and-merge.md` / 0.12.0).

---

## What it is

Each Example/Pattern is a granular SolidJS demo. A **"Usage" tab** teaches **how you
do the same thing — the props you set, the events you handle — in each framework.**
Snippets are **representative, not a literal copy** of the demo. The framing that
matters: *"here's how you do this,"* not *"here's the exact source."*

- **Per story.** Content is keyed to the **story** you click. Eyebrow = example
  name ("Message Actions"); title = the story ("Actions on Hover"); the code
  changes per story. An example-level fallback covers any story without its own entry.
- **Six framework tabs:** HTML · React · Svelte · Vue · Angular · **Solid**. The
  five web-component tabs drive the `kc-*` element (one data-fed model); the
  **Solid** tab is the granular primitive composition the demo actually uses.
- **Labels:** the rendered tab is **Demo** (was Canvas/Preview), the code tab is
  **Usage** (was API/Code). The old in-panel "Build this" heading is **removed**
  (both old labels implied "copy the exact thing you previewed").
- Snippets render via Storybook's `SyntaxHighlighter` (highlighted, `copyable`).

## Why this shape (the decisions, condensed)

- **Representative, per-story, not exact.** Rob: the code should show the props
  enabled + events subscribed for the story — not a pixel copy. So no source
  extraction, no per-variant-exact fidelity.
- **Solid is the native layer, kept as a tab.** The demos are written in granular
  SolidJS; that composition genuinely differs per story, so the Solid tab is the
  most faithful. The five web-component tabs are the "port it to your framework"
  recipe (the element does each thing one canonical way).
- **Honesty over faking.** Where a demo does something the element can't express
  (e.g. "Always Visible" adds Share/Bookmark, which aren't in `kc-message`'s fixed
  action set), the `intro` says so and the snippet shows what the element *can* do.

## Data model — `src/stories/examples/usage/`

`types.ts`: `ExampleUsage extends StoryUsage { title; stories?: Record<storyName, StoryUsage> }`,
`StoryUsage = { intro; snippets: Partial<Record<FrameworkKey, string>> }`.
- One module per example (`message-actions.ts`, …), default-exporting an `ExampleUsage`.
- `stories` is keyed by the story **display name** (the `.stories.tsx` `name:` field).
- `index.ts` barrel aggregates → `exampleUsageByTitle` + `exampleUsageStoryIdPrefixes`.
  The manager addon imports the TS modules **directly** — no generator, no JSON.
- `.storybook/api-tab.tsx` `ExamplePanel` resolves the per-story entry from
  `useStorybookState()` (storyId → index entry's `title` + `name`).
  `.storybook/manager.ts` shows the tab on authored example storyIds + renames
  Canvas→Demo + orders Demo·Docs·Usage via `previewTabs`.

## Coverage

**9 examples have a Usage tab** (element each maps to):
Message Actions→`kc-message` (**reference**, 4 stories) · Streaming Response→`kc-response-stream`
· Conversation with Reasoning→`kc-chain-of-thought` · Conversation with Sources→`kc-message`+`kc-sources`
· Prompt Input Variants→`kc-prompt-input` (+`kc-model-switcher`) · Context & Token Usage→`kc-context` (+`kc-model-switcher`)
· Checkpoint & Restore→`kc-checkpoint` · Full Chat App→`kc-chat` · Empty State→`kc-empty`.

**No tab (intentional, layout/meta — not single-element teaching):** Centered
Conversation, Chat Panel Layout, Docked Widget, Composed chat shell, Catalog.

## How it was built (reusable process)

Reference (`message-actions.ts`) authored by hand, then the **spec**
`docs/superpowers/specs/2026-06-15-per-story-usage-tabs.md` was written, then a
**background Workflow fanned out 8 author agents + 8 verify agents** (one
author + one verifier per example). The verifiers caught a real bug the
authors made and `tsc` **cannot** catch (it lives inside template-literal
strings): the `kc-model-switcher` web-component prop is **`currentModel`** (not
the Solid primitive's `currentModelId`) and its event detail is **`{ modelId }`**
(not `.id`). Fixed in `prompt-input-variants.ts` + `context-usage.ts` (the Solid
snippets correctly keep `currentModelId`). **Lesson:** snippet correctness needs
a reviewer that knows the real API — `tsc` won't see inside the strings.

## Follow-ups

1. **Usage-spec generator (parked).** Generalize `gen-framework-usage.mjs`'s
   `buildSnippets` to real values + handlers, defined once per story (props +
   events), rendering the 5 web-component frameworks — covers single elements +
   element-trees. The hand-authored modules are its reference output. Limits:
   granular Solid / layout / stateful demos stay bespoke; the universal version
   is Mitosis (out of scope). Rob is fine hand-coding for now (rarely changes).
2. **Layout/meta examples** — decide if any want a bespoke recipe later.
3. Native Solid *source* surfacing is **no longer needed** — Solid is a tab.

## Verify / status

- `npx tsc --noEmit` clean. Playwright: per-story title/eyebrow + 6 tabs; Demo|Usage
  labels; layout patterns have no tab; model-switcher fix renders (`currentModel`).
- **Before commit:** `npm run test:storybook` (needs chromium; not in the quick gate),
  then version-bump via release-please, merge via REST.

## Files

`.storybook/api-tab.tsx`, `.storybook/manager.ts`, `src/stories/examples/usage/*`
(types + index + 9 modules), `docs/superpowers/specs/2026-06-15-per-story-usage-tabs.md`.
