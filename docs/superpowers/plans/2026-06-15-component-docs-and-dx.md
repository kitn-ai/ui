# Implementation Plan — Component Docs & DX (2026-06-15)

Executes `docs/superpowers/specs/2026-06-15-component-docs-and-dx.md` on branch
`feat/component-docs-dx`. Phased so each phase is a coherent, reviewable checkpoint. Nothing
merges to `main` without Rob's review. Gate after each phase: `npx tsc --noEmit` + `npm test`
+ `npm run test:storybook` + `npm run build` (regenerates metas — commit the regen).

Legend: ⏳ in progress · ☐ todo · ✅ done. **[FAN-OUT]** = good for parallel subagents
(author + a separate verifier per item).

---

## Phase 1 — Close the in-flight composite gaps (FeedbackBar + kc-action) ⏳
Already largely built; finish + verify so the open loop is closed.
- ✅ `FeedbackBar` rebuilt as a self-contained state machine (ask → optional detail → thanks);
  `collectDetail`, `categories`, `detailTitle`, `detailPlaceholder`, `submitLabel`,
  `thanksMessage`; events `onFeedback` / `onSubmitDetail` / `onClose`. 9 unit tests pass.
- ✅ `<kc-feedback-bar>` element updated (new attrs + `feedbackdetail` event).
- ✅ `kc-message` + `<kc-action>` declarative children + tooltips; `kc-action` story added.
- ☐ Update **component** story `feedback-bar.stories.tsx` with the new options (WithDetail,
  CustomThanks; argTypes + description).
- ☐ Update **element** story `elements/feedback-bar.stories.tsx` (collect-detail + categories;
  JSX intrinsic types for new attrs/events).
- ☐ Update **message-actions** stories (`WithFeedbackBar`, `FullExample`) to the self-contained
  behavior (vote no longer hides the bar; only `close` removes it).
- ☐ Update **message-actions Usage** snippets (`feedbackBar`, `fullExample`) across 6 frameworks
  to the self-contained behavior.
- ☐ `npm run build` (regen metas: element-meta, framework-usage, react wrappers, docs, llms) +
  full gate.

## Phase 2 — Taxonomy + "when to use" (docs) ☐
- ☐ Promote `ChoosingComponents.mdx` → **Docs/Getting Started/Choosing Components**; add to
  `.storybook/preview.ts` storySort; expand with the published taxonomy + decision test (spec §1).
- ☐ Add a short **"Patterns vs Recipes vs Components"** section to the Introduction.
- ☐ **[FAN-OUT]** Add a **"Use this when… / Placement"** line to every element story's
  `docs.description.component` that lacks it (~20 leaf elements; one agent per ~5 elements,
  a verifier checks tone + accuracy against the element's real API).
- ☐ Reclassify the 4 single-element "Examples" (Reasoning, Sources, Prompt Input Variants,
  Context Usage): either fold into the Component page or convert to thin Pattern stubs that link
  to the component. Decide per item; keep Message Actions / Streaming / Checkpoint as Patterns.
- ☐ Cross-link card elements (`Generative UI/Cards`) ↔ `Components` (Catalog + decision guide).

## Phase 3 — Declarative-children rollout [FAN-OUT] ☐
Mirror the `<kc-action>` template. Per element: read children via `querySelectorAll` + a
`MutationObserver`, merge with the array prop; a parent demo story; a thin child API page that
says "must be a child of `<kc-…>`"; regen metas; unit tests.
- ☐ **`kc-suggestions` + `<kc-suggestion value>Label</kc-suggestion>`** (exemplar #1).
- ☐ **`kc-sources` + `<kc-source>`** (exemplar #2; pairs with `numbered`).
- ☐ `kc-conversations` + `<kc-conversation>` (+ `<kc-conversation-group>`).
- ☐ (later) `kc-choice` + `<kc-option>`, `kc-tasks` + `<kc-task>`, `kc-model-switcher` + `<kc-model>`.

## Phase 4 — Top composite UX gaps [FAN-OUT] ☐
From the capability audit (each its own small spec + tests; `feat!`):
- ☐ `kc-sources` **`numbered`** citations ([1][2][3]).
- ☐ `kc-prompt-input` **`stoppable`** + `stop` event; custom toolbar `actions`.
- ☐ `kc-context` payload **thresholds** (`warnThreshold`/`dangerThreshold` + `thresholdchange`).
- ☐ Custom-icon descriptors on `kc-checkpoint` / `kc-empty` / `kc-chain-of-thought`.
- ☐ Add the missing **`kc-scroll-button`** element (currently only a Solid primitive).

## Phase 5 — Per-component page polish [FAN-OUT] ☐
- ☐ **Anatomy** section for compound elements (labeled slots/children), per the spec skeleton.
- ☐ More **tiny single-feature examples** per element (Web Awesome density), live-preview-first.
- ☐ Fill the ~5 non-intentional missing **Solid** Usage tabs (suggestions, sources,
  conversations, scope-picker, skills).
- ☐ Give the 4 **Patterns** a Usage/Code tab (they're the most copy-paste-worthy).

## Phase 6 — AI-consumable docs (stretch) ☐
- ☐ "Using with AI" doc; consider an Agent-Skills-style markdown export beside `llms.txt`.

---

### Execution notes
- Run feature builds + `npm run build` from the **main checkout** (worktrees pollute meta paths).
- Snippets are template-literal STRINGS — `tsc` can't validate them; a verifier agent must check
  every snippet's API against `element-meta.json`.
- Checkpoint with Rob after Phase 1 (and Phase 2) before the large fan-out phases.
