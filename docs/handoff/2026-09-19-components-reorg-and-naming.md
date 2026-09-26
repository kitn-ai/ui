# Handoff — components reorg, the naming pass, and where it stopped

**Date:** 2026-09-19 · **Branch:** `update/primitives` · **Status:** the reorg is DONE and
uncommitted; the build is RED on `verify:dts` (4 references). Read §4 first.

Continues `2026-09-18-src-ui-merge-and-footprint.md` (§1–§11 there: the token surface, the palette
defects, the docs decisions — all committed).

---

## 1. What the owner asked for, in order

1. Organize `src/components/` — it was 285 flat entries and felt like "a lot to look at".
2. While refactoring, move things that are NOT components (types, hooks, logic) out of
   `components/` — the examples given were `attachment-types` and `use-card-resolution`.
3. Stop calling the `kai-*` layer "elements": they are **web components**. No deprecated alias.
4. Use **Carbon as the structural template** — "we aren't reinventing the wheel".

**The naming decision, settled with the owner:** one package (`@kitn.ai/ui`), platform-named
internals, i.e. NOT multi-package. Final shape:

```
packages/ui/
  src/components/        the Solid implementation        (the reorg: family folders)
  src/web-components/    the kai-* layer  <- RENAME from src/elements
  src/primitives/        headless logic + cross-layer data shapes
  frameworks/react/      generated wrappers (kept separate ON PURPOSE: regenerated, never hand-edited)
```

Carbon's own layout is the model: `packages/react` · `packages/web-components` · `packages/styles` ·
`packages/themes` — they name by platform, and `@carbon/web-components` is the full word, hyphenated.
`web-components` (not `web`) is also the right call *here specifically* because "web" already means
the browser runtime in this repo's vocabulary (`route-web` tsc project, the `browser` build
condition) — naming the layer `web` would collide with it. Carbon's `@carbon/elements` is their
DESIGN TOKENS package, unrelated to ours, which is another reason our `elements` name was wrong.

## 2. The reorg — DONE (uncommitted)

`src/components/`: **284 files → 92 family folders.** A family folder holds the component, its
sub-parts, and their stories + tests together (`row/{row,row-group,row.stories,row-group.stories,…}`,
`tool/{tool,tool-classify,tool-types}`, `tabs/{tabs,tab-bar}`, `message/`, `card/`, `composer/`,
`conversation/`, `builder/`×12 …). Singletons get their own folder. All moves via `git mv`, so
history follows.

How it was done, and the traps (each cost real time):

- **A mapping is required, not a prefix script.** First-token grouping would put `tooltip` inside
  `tool` and `text-shimmer` inside `text`. The curated rules are in the commit/PR description; the
  generated old→new map was written to `/tmp/moves.json` (a scratch file — regenerate it if needed).
- **The import codemod** rewrote **~1285** specifiers across `src`, `tests`, `config`, `frameworks`,
  `mcp`, `scripts`, `apps`, `apps/docs/src`. Two bugs of my own, both caught by `tsc`:
  1. it ran after the moves, so it could not resolve old specifiers — it had to work from the
     old→new map, and it must ALSO fix specifiers whose *target* did not move but whose *importer*
     did (`../utils/cn` → `../../utils/cn`), which is most of them;
  2. it stripped explicit `.mjs` extensions (`…/rubric.mjs` → `…/rubric`), causing 62 resolution
     errors. Rule: when a specifier points at a `.mjs`/`.js` file, keep the extension.
- **Prose referencing old flat paths** was swept in a second pass: **~190 references across ~85
  files** (comments and doc-strings in `src`, `scripts`, `mcp`, `config`). Deliberately NOT swept:
  the `docs/` archive (same precedent as the `lint-cdn-pins` `historical` waiver),
  `src/elements/v0.stories.tsx` (it names v0's OWN internal components, not ours), and a dead
  reference to `components/stat.tsx` (a file that has never existed).

## 3. Guard fallout — FIXED, and the fix is the interesting part

15 tests in 12 files failed, all one class: a guard that resolved a component's source by a
hard-coded flat path, or globbed `src/components/*.tsx` non-recursively. Fixed by a lane that
created **`tests/helpers/kit-paths.ts`**: it walks `src/components/**`, resolves a component by
UNIQUE basename, and **throws on 0 or >1 hits** — so the guards derive the path instead of pinning
one, and a future move cannot silently make them pass vacuously.

That lane also found three things the brief missed, worth knowing:

- `scripts/gen-element-types.mjs` emitted 4 stale relative specifiers — it would have regressed the
  regenerated `src/elements/element-types.d.ts` on the very next build.
- `src/elements/slots.test.ts` had 3 red tests (not in the failure list I gave it).
- **Two `vi.mock('../primitives/toast-store')` paths resolved to nothing and the tests passed
  anyway** (vitest does not error on an unused bad mock path). A guard that was passing vacuously,
  now fixed.
- 7 of the 15 files I named were already green — my failure list came from grepping the log, which
  lists files that merely appear in it. Don't treat a log grep as a failure set.

Mutations were run for four guards (red → restore) so "green" is not the only evidence.

## 4. THE OPEN BLOCKER — `verify:dts` fails, 4 references escape `dist/`

`npm run build` exits **1** at the last postbuild step, `verify:dts`:

```
✗ 4 declaration reference(s) ESCAPE dist/ — these only resolve because raw src/ still ships:

  dist/components/builder/builder-panel-derived.d.ts   imports '../../../mcp/construct/templates'
  dist/components/builder/builder-panel-derived.d.ts   imports '../../../mcp/construct/schema'
  dist/components/builder/builder-start.d.ts           imports '../../../mcp/construct/templates'
  dist/components/construct-form-paths/construct-form-paths.d.ts  imports '../../../mcp/construct/schema'
```

**The mechanism, measured:** those three source files import the construct engine's source directly
(`src/components/builder/builder-start.tsx:4`, `builder-panel-derived.tsx:26-27`,
`construct-form-paths.ts:23`). Before the move they were at `src/components/<file>.tsx` and imported
`../../mcp/construct/*` (two up = package root). The move put them one level deeper, so the codemod
correctly rewrote them to `../../../mcp/construct/*` — and `preserveModulesRoot: 'src'` keeps a
relative specifier for anything outside `src/`, so `dist/components/builder/x.d.ts` now points at
`<pkg>/mcp/construct/*`, i.e. at raw source, outside `dist/`.

**THE DECISIVE EXPERIMENT, not yet run** (cheap, do this first): `git stash` the work, `npm run build`,
and read whether `verify:dts` was already green with the OLD depth-2 specifier `../../mcp/construct/*`
— from `dist/components/` that also resolves outside `dist/`, so either the guard has an allowance
for this case that the new depth defeats, or the emitted graph differed. The answer decides the fix:

- if it is genuinely new: the honest fixes are (a) point those imports at a **public subpath**
  (`exports` has `./construct`) since the guard explicitly allows "a public package subpath listed in
  the exports map" — check first that `TEMPLATES`/`BuildableTemplate`/`ConstructSchema` are actually
  exported from it, or (b) move the construct schema/templates into `src/` so they are emitted into
  `dist/` like everything else. (b) is architecturally cleaner and larger; (a) is a 4-line change if
  the exports line up;
- if it is NOT new, the guard's own allowance is stale and THAT is the bug.

## 5. Next, in order

1. Fix §4. Then `npm run build` must exit 0, and `verify:dts` + `verify:consumer` (it packs and
   bundles) must pass before committing the reorg.
2. **Commit the reorg** — it is currently uncommitted, deliberately, because the build is red and this
   repo does not commit red. Everything else about it is verified: `tsc` ×4 green,
   `lint-story-conventions` green (150 stories), docs build green (127 pages), the dist-dependent test
   that was red (`tests/elements/element-types-lib-check.test.ts`) passes after a build.
3. **Extract the non-components** (§6). Do it AFTER the reorg is committed, so each change is
   verifiable on its own.
4. **Rename `src/elements` → `src/web-components`** (§7).

## 6. The non-component extraction (decided, not started)

`src/components/` holds 20 non-`.tsx` files. Three of them are not components and move to
`src/primitives/` (the precedents are already there: `primitives/card-data-types.ts`,
`use-audio-analysis`, `visualizer-sequences`):

| file | why | import sites |
|---|---|---|
| `components/attachment-types/attachment-types.ts` | a pure type, JSX-free by its own doc, consumed by components + elements + state + wire | 16 |
| `components/use-card-resolution/use-card-resolution.ts` | a headless resolution controller, no JSX | 5 |
| `components/construct-form-paths/construct-form-paths.ts` | construct↔form translation logic + schema walk + visibility registry | 5 |

Everything else STAYS in its component folder, deliberately — a component's own logic and types
belong with it (`tool/tool-types`, `composer/composer-*`, `response/response-compare-types`,
`button/button-variant-names`, `builder/builder-preview`, `audio-visualizer/{sizes,fit-scale,*.glsl.ts}`).
Flagged exception: `action-icons.ts` (a `ChatMessageAction` → lucide lookup used by components AND
elements — not a component, but presentation, so `primitives/` would mean primitives importing
lucide). `audio-visualizer.voice-fixture.ts` is test data and should move to its test/story.

**No `types/` folder** — the repo's convention is types near their domain (`primitives/*-types.ts`,
`elements/chat-types.ts`, `wire/media-types.ts`, plus the public `src/types.ts`).

Also, when `kit-paths.ts` is touched: extend its walk to `src/primitives/**` as well, or the first
extraction breaks it.

## 7. The rename: `src/elements` → `src/web-components` (decided, not started)

Clean rename, **no deprecated alias** (owner's call). Priced by measurement, so it can be planned:

- `@kitn.ai/ui/elements` → `@kitn.ai/ui/web-components`, and the `./elements/*` wildcard likewise:
  **1048 occurrences across 290 files** (docs, scaffolds, README, MCP, examples) — the consumer-facing
  bulk, and the reason the completion check is `grep -r '@kitn.ai/ui/elements'` returning NOTHING
  outside `dist/`. `lint:cdn-pins` only guards versions, so nothing else would catch a straggler.
- internal path `src/elements/` → `src/web-components/`: ~530 references, 157 files referencing it,
  and **155 of those hits are in `scripts/`** (the manifest/api/nonscalar/types/dts/react generators,
  the element-bundle and coverage guards, the catalog).
- 69 `*element*` files/dirs under src/scripts/tests/mcp, including 8 named scripts
  (`gen-elements-manifest`, `gen-element-api`, `gen-element-nonscalar`, `gen-element-types`,
  `gen-element-dts`, `gen-element-react`, `verify-elements-bundle`, `postprocess-element-css`) plus
  `lib/element-meta-keys.mjs` and `tests/elements/`.
- **Vocabulary that must NOT be renamed**: `HTMLElement`, `JSX.Element`, `document.createElement`,
  DOM prose. The raw word "element" appears ~6000 times in `src` and almost none of it is ours —
  a sed over the word is wrong; the rename targets the names above.
- Generated artifact names (`element-manifest.json`, `element-meta.json`, `element-nonscalar.json`,
  `element-types.d.ts`) rename and regenerate through the build — but `GENERATED_SOURCES` in
  `verify-artifact-fresh.mjs`, the `GENERATED` list in `verify-generated-sync.mjs`, and the
  `docs/coupling-map.md` rows that name them all move in the same change.
- Then the web-components TREE gets the same family folders, and the **38 story-only entries**
  (measured: `builder-*` surfaces ×11, `proof-*` ×5, `labs-*` ×2, competitor/design references
  (`chatgpt`, `claude-code`, `codex`, `lovable`, `perplexity`, `v0`, `t3code`, `wisp`) ×9, slot
  galleries ×3, plus `composer-showcase`, `form-controls`, `user-menu`, `workspace-home`, …) move to
  **`src/stories/showcase/`** — they document surfaces and other products' designs, not an element.
  `src/stories/` already holds the docs-style stories (token reference), so that is their home.

## 8. Traps that cost time (do not re-derive)

- **`cd X && cmd &` scopes the `cd` to that clause only.** Then the next command runs in the original
  cwd and `ls src/components` fails with "No such file". Happened three times. Use absolute paths or
  re-`cd`.
- **`pgrep -f "npm run build"` matches an unrelated long-lived shell** (`… && storybook dev`), so
  "is my build running" lies. Write a sentinel into the log instead: `bash -c 'CMD; echo SENTINEL=$?'`.
- **Never run the unit suite while a build runs**: `dist/` is mid-wipe and generated artifacts are
  half-written, producing ~61 false failures (observed).
- **The e2e/globalSetup freshness gate refuses to run when any file under `src/` is newer than
  `dist/kai.es.js`** — including a colocated test you just edited for its comments. A full rebuild is
  the only honest way past it; do not `touch` the bundle.
- **`docs/` (the archive) is out of scope** for sweeps of this kind, by precedent.

## 9. Verification state at handoff

| check | state |
|---|---|
| `tsc` src / tests / apps / mcp | green (after the 62-extension repair) |
| `lint-story-conventions` | green — 150 stories scanned |
| full `--project=unit` | 1 failed pre-build, and that one (`element-types-lib-check`, stale `dist/elements.d.ts`) passes after a build |
| `nx build docs` | green — 127 pages built |
| `npm run build` | **RED at `verify:dts`** (§4) — everything before it in the chain ran |
| `verify:generated`, `verify:pack`, `verify:scaffold`, `verify:consumer`, browser guard | green as of the previous batch (3 commits earlier); re-run after the fix |

## 10. Deliberate non-goals (decided, do not re-propose)

Border width (102 sites), ring width/offset (45) and opacity (25) compile to Tailwind LITERALS, so
tokenizing them is per-call-site work, not a rung. Transition durations: 7 sites, three deliberate
micro-timings. Easing: the token catalogue rule would demand three bezier text fields, which is a wart
in a panel that exists to offer good choices. A geometry "ladder" view in the builder: hand-written
demo markup cannot follow the kit's tokens (measured), and the canvas already demonstrates every knob
on real components. Details in §11 of the 2026-09-18 handoff.
