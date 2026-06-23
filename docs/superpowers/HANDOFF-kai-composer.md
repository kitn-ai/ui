# HANDOFF — `kai-composer` rich input (prototype)

**Status:** in progress, NOT merged, NOT pushed. Working prototype, all gates green.
**Branch:** `worktree-kai-composer` (base `main` @ `c05d506`). **Worktree:** `.claude/worktrees/kai-composer`. **~34 commits.**
**Specs:** `docs/superpowers/specs/2026-06-21-kai-composer-rich-input-design.md` · plan `docs/superpowers/plans/2026-06-21-kai-composer-rich-input.md`.

## What this is
A new contenteditable rich input (NOT an RTE): types like a textarea, supports atomic inline **entity pills** (skills/agents/plugins), `/` and `@` trigger menus, keyword highlighting, undo/redo, and emits a structured `{ doc, text, entities }` for an agent backend to expand. Built Solid → web component. The shipping `<kai-prompt-input>`'s `<textarea>` has been **replaced** by this composer engine (pixel-perfect), so pills work inside the real prompt input.

## Architecture (two-model split, OpenCode-faithful)
- `src/primitives/composer-model.ts` — pure: `Segment`/`EntityRef`/`ComposerDoc`, `normalizeValue`, `serializeToText`, `entitiesOf`, `docIsEmpty`. No DOM.
- `src/primitives/composer-triggers.ts` — pure: `detectTrigger`, `activeTriggerFor`.
- `src/components/composer-dom.ts` — DOM↔model glue: `ZWSP`, `entityStore` (WeakMap), `parseDom`, `renderDoc`, `createEntityEl`, `createTextWalker` (skips pill-internal text), `kindGlyph` (built-in agent/plugin glyphs).
- `src/components/composer-history.ts` — pure undo/redo snapshot stack.
- `src/components/composer-highlight.ts` — pure `findHighlightMatches` + CSS Custom Highlight API wiring.
- `src/components/composer.tsx` — the `Composer` Solid view (~800 lines; menu + caret + insert + keydown + history wiring; reviewer-flagged extract candidate).
- `src/elements/composer.tsx` — registers `<kai-composer>`.
- `src/components/prompt-input.tsx` — `PromptInputTextarea` now renders `<Composer bare>` (was `<textarea>`); `PromptInput` frame unchanged.
- `src/elements/default-input.tsx` / `src/elements/prompt-input.tsx` — `DefaultPromptInput` + `<kai-prompt-input>` thread `triggers` / `kindIcons` / `onComposerChange` to the composer.

## Model + events
- Internal doc: `Segment[]` = `{type:'text',text}` | `{type:'entity', entity: EntityRef}`. EntityRef = `{ kind, id, label, icon?, promptText?, data? }`.
- `<kai-composer>` events: `kai-submit`/`kai-value-change` (`{doc,text,entities}`), `kai-focus`/`kai-blur`, `kai-entity-add`/`-remove`, `kai-trigger`/`-close`.
- `<kai-prompt-input>` events: existing `kai-submit`/`kai-value-change` now ALSO carry `{doc, entities}` alongside the back-compat `value` string (+ `kai-suggestion-click`, `kai-slash-select`, etc., unchanged).

## Taxonomy (settled with Rob)
- `/` → **skills** (instructions). `@` → **agents + plugins** as **sections** in one Codex-style menu (per-item `kind` overrides the trigger's default `kind`).
- **Plugins** aren't a separate trigger — they're items (often with their own icon) carrying `data:{plugin,tool}`; the model-invoked tool is machinery, the pill references the capability.
- Trigger config: `triggers: [{ char, kind, items: [{ id, label, icon?, description?, group?, kind?, promptText?, data? }] }]`. Menu groups by `group`, shows `description`, filters by label+description, excludes already-added (by kind+id).
- Per-kind default icons: typed **`kindIcons?: Record<kind, imageSrc>`** prop. Icon resolution: item `icon` > `kindIcons[kind]` > built-in glyph (agent=bot, plugin=plug) > nothing (**skills plain**). (Chose typed prop over CSS custom-property theming — discoverable in the type system for the MCP scaffolder / AI consumers; principle: **content via props, style via CSS**.)

## DONE + verified
Document model + serialization · triggers/menu (sectioned, descriptions, icons, caret-anchored, filter, exclude-added) · atomic pills (insert via `/`@`, backspace/delete whole) · **many pills** (cap bug fixed) · undo/redo (Cmd/Ctrl+Z, Shift+Z/Ctrl+Y; native suppressed) · decoration-only keyword highlighting · textarea→composer swap **pixel-perfect** (8 baseline-vs-after screenshots identical) · prompt-input behavior parity (Enter submits+clears, Shift+Enter newline, click-to-focus, leading-whitespace strip, aria-label) · per-kind glyphs + `kindIcons` · placeholder via `::before` (axe-exempt, caret at start) · pill spacing/alignment.

## Verify (each project passes in isolation)
- Unit (jsdom): `npx vitest run .test` → ~1021 pass. Composer-only: `npx vitest run src/**/composer* src/components/default-input.test.tsx`.
- Storybook (browser+axe): `npm run test:storybook` → 416 pass. (Run projects separately — a combined `npm test` shows a few browser-contention timeout FLAKES under load, not regressions.)
- Composer IVP (real browser, Playwright): `npm run test:composer-ivp` → 10 pass (`tests/e2e/composer-ivp.spec.ts`).
- Prompt-input pills IVP: `npx playwright test --config playwright.promptinput.config.ts promptinput-pills` → 5 pass. Behavior: `… promptinput-behavior`. Screenshots: `SHOT=after … promptinput-shot` → `tests/e2e/__screenshots__/promptinput/{baseline,after}/`.
- Typecheck: `npm run typecheck` (4 passes). Build: `npm run build` then `git checkout -- src/components/component-meta.json`.
- The IVP configs auto-start Storybook on :6006 (reuseExistingServer). KILL stray storybook before a full `npm test` (`pkill -f storybook`) or browser contention causes flakes.

## Demo
`npm run dev` → **Components/PromptInput → Entity Pills** (the `@` sectioned menu + pills) and **Solid (Advanced)/Elements/Composer** + **Elements/Composer**.

## Hard-won gotchas (jsdom CANNOT reproduce these — the Playwright IVP is the only guarantee)
1. **Shadow DOM + selection:** `document.getSelection()` retargets OUT of an open shadow root in Chromium → use `ShadowRoot.getSelection()` (`getActiveSelection` in composer.tsx). Without it, pills land in light DOM + submit never fires.
2. **Bogus `<br>`:** contenteditable leaves a trailing `<br>` when cleared → `parseDom` drops a trailing `<br>` so empty reads empty (placeholder returns, no phantom `\n`).
3. **Reactive `class` clobbers `classList`** in Solid → the empty/placeholder class is folded into `class`, not a separate `classList`.
4. **Cap bug:** trigger-token delete used a GLOBAL text offset; pills+ZWSP are 0-width there, so it ate the previous pill (capped at 2). Now deletes N chars BACKWARD from the caret (stops at a pill).
5. Controlled `value` re-renders on genuine external change (incl. clear-after-submit) via TEXT comparison, not a focus guard.

## Deferred / next candidates
- **Programmatic pill pre-population** via `value` as a `ComposerDoc` (interactive insertion + string round-trip work today; seeding pills from a doc value is not wired end-to-end — composer accepts string|doc, but the prompt-input value path is string-only).
- Declarative `<kai-trigger>`/`<kai-trigger-item>` light-DOM children (prop-driven `triggers` only; `parseKaiTriggerItemElement` helper exists, unused).
- React wrapper (`@kitn.ai/ui/react`) — intentionally out of v1.
- `highlights` prop reactivity when ONLY highlights change (recomputes on input/value/mount).
- Extract `composer.tsx` (~800 lines) into menu/caret/history modules.
- **Land the branch** (merge/PR) — Rob reviews/merges; nothing pushed yet.

## Workflow notes
- Review-before-commit/push/merge (Rob approves). Conventional commits → release-please; never hand-edit package.json version.
- IVP everything contenteditable-related with Playwright before claiming done.
