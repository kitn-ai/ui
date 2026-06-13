# Phase 2 — Auto-generated specs for the SolidJS + UI components

> Design **and** implementation plan. Continuation of the 0.7.0 web-component spec system
> (`docs/superpowers/specs/2026-06-13-web-component-spec-system-design.md`, "Phase 2" section).
> Execute with superpowers:subagent-driven-development (or inline). Steps use `- [ ]`.

**Goal:** Generate the same kind of API spec — and surface it on the **API tab** — for the public **SolidJS components** (`src/components/*`) and **UI primitives** (`src/ui/*`), the same way the 28 web components got it in 0.7.0.

**Why now:** the web-component API tab already links to these via "Composed from" (`Components/ChatThread`, `UI/Resizable`, …). Right now those links land on component stories that have **no generated spec**. Phase 2 closes that loop.

---

## What phase 1 (0.7.0) already built — reuse all of it

- `scripts/gen-element-api.mjs` — TS-compiler parser over `defineKitnElement(tag, defaults, facade)` facades → in-memory `elements` model → `src/elements/element-meta.json` (props/events/composedFrom/tokens + `displayType`/`displayDetail`), `dist/custom-elements.json`, types, react wrappers, llms, and `docs/web-components.md` tables.
- `scripts/gen-web-components-md.mjs` — exports `shorten(type)` (the alias map: collapses expanded types to `ChatMessage[]` etc.). Reuse it for components too.
- `.storybook/api-tab.tsx` — manager addon adding an **API** tab. Currently `match: ({storyId}) => storyId.startsWith('web-components-')` and reads `element-meta.json`. **This is the file to extend.**
- `src/stories/docs/element-controls.ts` — `argTypesFor(tag)` + `specDescription(tag, paragraphs)` (the latter prepends the "Full API reference → API tab" pointer). The web-component stories use these.

## Key difference: components are not facades

`defineKitnElement` is a uniform marker; plain Solid components are not. So:
- **Inputs** are **props**, not properties+attributes. Some props are **callbacks** (`onValueChange`, `onSubmit`, function-typed) — treat these as the component's "events/outputs". The rest are data props.
- **Slots** = `children` (and named compound children).
- **No** CustomEvents / attributes.
- **Tokens** are global (same `--color-*`); only a few component-specific (`Tool` → `--color-tool-*`, code, scrollbar/sidebar). Reuse the curated map idea.
- **Defaults** are fuzzy: components default via `props.x ?? fallback` / `splitProps` rather than a defaults object literal. Best-effort only (extract from JSDoc `@default` or obvious `?? literal`; otherwise omit).
- **Compound components**: one file often exports several (e.g. `ChatContainer`, `ChatContainerContent`, `ChatContainerScrollAnchor`). Each public export is its own spec entry.

## Source of truth for "which components are public"

`src/index.ts` re-exports the public API (49 `export {…}` lines). Parse THOSE exported identifiers; for each, resolve its declaration (a function whose first param is `props: SomethingProps`) and extract the `Props` interface members. Skip type-only exports, hooks (`useX`), and non-component utilities (`cn`, `buttonVariants`). Group by source path: `src/components/*` → `Components`, `src/ui/*` → `UI`.

## File structure

- **Create** `scripts/gen-component-api.mjs` — the component extractor (mirrors gen-element-api's TS-compiler approach).
- **Create (generated, tracked)** `src/components/component-meta.json` — the component spec model.
- **Modify** `.storybook/api-tab.tsx` — handle Components/UI stories too.
- **Modify** `scripts/gen-element-api.mjs` (or the build script) — invoke `gen-component-api` in the same build pass.
- **Modify** the `Components/*` + `UI/*` story files — add the `specDescription`-style API pointer + `argTypesFor` (optional, can be deferred).

---

## Tasks

### Task 1: `gen-component-api.mjs` — extract the component model

**Files:** create `scripts/gen-component-api.mjs`; emit `src/components/component-meta.json`.

- [ ] Build a TS `Program` over `tsconfig.json` (copy the setup from `gen-element-api.mjs` lines ~20-30, plus `membersOf`, `renderType`, `jsdocOf`, `isScalar` — consider extracting those shared helpers into `scripts/_ts-helpers.mjs` and importing from both, to avoid duplication).
- [ ] Parse `src/index.ts`: collect every named export + the module it comes from. Keep only those whose module is under `./components/` or `./ui/` and whose symbol resolves to a **function** declaration (a component). Record `{ name, group: 'Components'|'UI', sourceFile }`.
- [ ] For each component: find its `props` parameter type (the `XxxProps` interface or inline type), run `membersOf` on it. For each member, classify: `kind: 'callback'` if the type is a function (`(…) => …`) — these are the component's outputs; else `kind: 'prop'`. Detect `children` → list as a **slot**. Compute `displayType` via `shorten` (import from `gen-web-components-md.mjs`).
- [ ] Best-effort defaults: read the component body for `props.<name> ?? <literal>` or a JSDoc `@default`; attach `default` when found, else omit.
- [ ] Component-specific tokens: reuse a curated map (`{ Tool: ['--color-tool-blue', …], CodeBlock: ['--color-code-foreground'], ConversationList: ['--color-sidebar','--color-scrollbar-thumb'] }`).
- [ ] Emit `src/components/component-meta.json`: array of `{ name, group, props:[{name,type,displayType,optional,default?,scalar,description}], callbacks:[{name,type,displayType,description}], slots:[{name,description}], tokens:[string] }`, sorted by group+name.
- [ ] **Verify:** `node scripts/gen-component-api.mjs` (or via build) writes the JSON; spot-check `Button`, `ChatContainer` (compound — make sure all sub-exports appear), `Message`, `PromptInput`, `ConversationList`. Confirm callback props (e.g. `onValueChange`) land under `callbacks`, `children` under `slots`. Commit.

### Task 2: Wire it into the build

**Files:** modify `scripts/gen-element-api.mjs` (the `import.meta.url` block) or `package.json` build script.

- [ ] In the same build pass that runs the element generator, also run the component generator (so `component-meta.json` regenerates on `npm run build`). Easiest: at the end of `gen-element-api.mjs`'s main block, `await import('./gen-component-api.mjs')` and call its exported `generate()`. Keep it idempotent (rebuild → zero diff).
- [ ] **Verify:** `npm run build` regenerates both metas; `git status` clean on second build. Commit.

### Task 3: Extend the API tab to Components + UI

**Files:** modify `.storybook/api-tab.tsx`.

- [ ] Import `component-meta.json` alongside `element-meta.json`.
- [ ] Broaden `match` to also `storyId.startsWith('components-') || storyId.startsWith('ui-')`.
- [ ] In the panel: derive the source from the story title — `Web Components/<tag>` → element-meta (existing path); `Components/<Name>` / `UI/<Name>` → component-meta (new path). Render a component spec: **Props** table (name · type/values · default · notes), a **Callbacks** table (name · signature · notes) labelled as the component's outputs, a **Slots** row (`children` etc.), **Composed-of** (optional), **Theming**. Reuse the existing table styles + `formatType`.
- [ ] Keep it scoped/themed exactly like the web-component path (top-aligned wrap, manager theme colors).
- [ ] **Verify (screenshot, light + dark):** the API tab now appears on `Components/Button`, `Components/Message`, `UI/Tooltip`, etc., rendering their props/callbacks/slots. Confirm it's still correct on a web component and still absent on Examples/Patterns. Commit.

### Task 4: API pointer + Controls on Components/UI stories (can be deferred / lighter)

**Files:** the `src/components/*.stories.tsx` + `src/ui/*.stories.tsx`.

- [ ] Add the same `specDescription`-style pointer to each Components/UI story's `docs.description` so readers are directed to the API tab. (Note: `specDescription` currently keys off web-component tags for the pointer text only — generalize it, or add a `componentDescription(name, paragraphs)` sibling.) Add `argTypesFor`-equivalent for scalar props if useful (the UI stories like button/tooltip already have hand-written argTypes — don't clobber).
- [ ] This is the largest-surface, lowest-risk task — parallelize across subagents (group ~8 stories each). Skip stories that are pure visual demos with no props worth documenting if it adds noise.
- [ ] **Verify:** typecheck; spot-screenshot a few; the pointer shows on Components/UI Docs tabs.

### Task 5: Validation gate

- [ ] `npm run build` (both metas regenerate, idempotent) + `npm run typecheck` + `npm test` (baseline = 3 Shiki failures in `tests/primitives/highlighter.test.ts`) + `npm run test:react` (5/5).
- [ ] a11y audit: serve `npm run examples` (:8000) → `node scripts/audit-a11y.mjs` → 0 violations light+dark.
- [ ] Screenshots: API tab on a Component, a UI primitive, and a Web Component (regression), light + dark.
- [ ] One squashed `feat(storybook):` (or `refactor:`) commit; PR; merge via REST (`gh api --method PUT repos/kitn-ai/chat/pulls/N/merge -f merge_method=merge`).

---

## Gotchas (from phase 1)

- **Solid stories vs React docs/manager**: the API tab is a **manager addon** (React) — built separately from the Solid stories, so React JSX there is fine. Do NOT try to render Solid components in the docs page; that's why the spec moved to the manager-addon tab. Keep component-meta a plain JSON the React tab reads.
- **Type expansion**: the TS compiler emits fully-expanded inline types. Always run them through `shorten()` for display (and store both `type` + `displayType`).
- **Release semantics**: Storybook-only changes are `refactor:` (no npm release); if `component-meta.json` shipping in `src` counts, it's still no consumer API change. Per [[version-bump-each-change]] release-please cuts a version only on `feat:`/`fix:`. Merging a release-please PR publishes via OIDC. Merge PRs with REST (gh-cli Projects bug).
- **Verify VISUALLY** with Playwright screenshots — "it compiles" missed real bugs repeatedly this session.
