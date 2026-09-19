# Handoff — the components reorg's blocker, the non-component extraction, and the `web-components` rename

**Date:** 2026-09-19 (second session) · **Branch:** `update/primitives` · **Status:** the blocker is
fixed, the extraction and the rename are landed and green. Step 5(a) — the family-folder reorg of
`src/web-components/` — is NOT started; its mapping and every coupling are measured below.

Continues `2026-09-19-components-reorg-and-naming.md` (the reorg, the naming decision, the open
`verify:dts` blocker) and `2026-09-18-src-ui-merge-and-footprint.md` (§1–§11).

---

## 1. The blocker in the previous handoff (§4 there) — ANSWER: it was NEW, and the guard failed OPEN

The previous handoff asked for a `git stash` experiment to decide between "new failure" and "stale
allowance". The tree was already committed, so the experiment ran against git instead, and the
answer is the first option. Three measurements:

1. **The old tree was green by MECHANISM, not by accident.** At `fb735a7d` the files were flat:
   `src/components/builder-start.tsx` held `'../../mcp/construct/templates'`, emitted at
   `dist/components/builder-start.d.ts`, i.e. depth 1. `config/vite/lib.ts`'s `beforeWriteFile`
   matched it, `depth === 1` passed, and `replaceAll("'../../mcp/", "'../agent-tooling/")` produced
   `'../agent-tooling/construct/templates'` — which resolves inside `dist/`.
2. **The reorg defeated the regex, not the depth check.** The new specifier is `'../../../mcp/…'`.
   `MCP_SPECIFIER = /…['"]\.\.\/\.\.\/mcp\//` requires the literal `'../../mcp/` straight after the
   quote, and `'../../../mcp/` does NOT contain that substring (after `../../../` comes `mcp`, so
   there is no `../..` + `/mcp`). The hook returned early. The `depth !== 1` throw written to catch
   exactly this case became **unreachable for the case it was written for** — the check was gated by
   a depth-baked prefix.
3. The `replaceAll` also only matched single quotes, so a double-quoted crossing was never rewritten.

**The fix** (`1fad7fa4`): the rewrite became a pure function, `config/vite/mcp-dts-rewrite.ts`. It
derives the upward prefix from the emitted file's own path, handles double quotes, `import()` and
`require`, and **throws on any specifier it cannot make resolve inside `dist/`, naming the file** —
so a future move fails at emit time with the file and the depth, not at postbuild with the file
alone. `tests/config/mcp-dts-rewrite.test.ts` derives its cases over depths 0–3 (so the next move
cannot pick the one depth nobody listed) and pins the throw. Both halves were mutation-proved: the
old depth-baked prefix → red, escape check disabled → red, restored → green.

**Trap this cost me:** running `npm run verify:generated` in PARALLEL with `tsc` produced three fake
`TS1005` JSON parse errors — `verify-generated-sync` rewrites source-tree artifacts in place, and
`tsc` read one mid-write. Nothing was broken; the serial run was clean. Do not parallelize a
generator against a typecheck.

## 2. Step 3 landed (`373a99f6`): the three non-components

`attachment-types.ts`, `use-card-resolution.ts` and `construct-form-paths.ts` moved to
`src/primitives/`. Everything else stays in its component folder on purpose; `action-icons.ts`
remains the flagged exception; no `types/` folder.

Two things the handoff priced as "one line" that were not: the three files' OWN relative imports
changed depth (`../../../mcp/construct/schema` → `../../mcp/construct/schema`,
`../../primitives/card-contract` → `./card-contract`), and the colocated
`construct-form-paths.test.ts` moved to `tests/primitives/`, where its `../../../mcp/*` specifiers
needed one `..` fewer. `tsc` caught both; the import sweep did not, because it only enumerated
IMPORTERS, not the moved files themselves. **Sweep the moved files' own imports in the same pass.**

`tests/helpers/kit-paths.ts` and `tests/styles/solid-css-contract.test.ts`'s pre-build fallback now
walk `src/primitives/**` as well as `src/components/**`. The fallback widening is mutation-proved:
emptying the derived file list fires that guard's own vacuity check (2 red), restoring it is green —
which also proves the fallback is the path being exercised.

Also fixed there: `audio-visualizer.voice-fixture.ts` is story data whose `.d.ts` was SHIPPING
(`dist/**` is in `files`). It moved to `src/stories/fixtures/`, which the dts build already excludes;
measured, the declarations are gone from `dist`.

## 3. Step 4 landed (`9629f924`): `src/elements` → `src/web-components`, clean, no alias

The rename, as priced. `element-meta.json` → `web-component-meta.json` (and the exports key),
`element-manifest` / `element-nonscalar` / `element-types.d.ts` → `web-component-*`,
`dist/elements*` → `dist/web-components*`, 8 generator/guard scripts, `tests/elements/` →
`tests/web-components/`, 38 `*-element.test.tsx` → `*.test.tsx` (the directory says it now), and
`ElementCount.astro` → `WebComponentCount.astro`.

**Deliberately NOT renamed** (each is API or schema churn the layer rename does not require; any of
them is a one-batch follow-up): `HTMLElement` / `JSX.IntrinsicElements` / `createElement` /
`customElements` / "custom element" in the DOM-spec sense and "the `<audio>` element" prose; the
public symbols `elementsReady` and `ElementMeta`; the `element.*` DIAGNOSTICS EVENT PREFIX
(`diagnostic-events.ts` emits `element.violation` / `element.registry` — a runtime contract for
subscribers); create-kai's `registration: 'elements'` enum value; the catalog's data key
`derived.elements` (35 usages, 7 files); the acceptance pack's own per-tag `elements/<tag>.md` page
directory and its `ELEMENTS.md`; `custom-elements.json` (the CEM convention).

**The DATED ARCHIVE is not swept**, by the same precedent as `lint:cdn-pins`' `historical` waiver:
`docs/{handoff,superpowers,research,proposals,decisions,provenance}` and `packages/ui/CHANGELOG.md`
are records of what the tree looked like then (`docs/superpowers` alone holds 2698 `elements`
mentions). Rewriting them would falsify them. **So the honest completion check is:**

```bash
git grep '@kitn\.ai/ui/elements' -- . \
  ':!packages/ui/dist' ':!docs/handoff' ':!docs/superpowers' ':!docs/research' \
  ':!docs/proposals' ':!docs/decisions' ':!docs/provenance' ':!packages/ui/CHANGELOG.md'
# -> nothing. Verified zero. The bare grep cannot be empty, and that is the decision, not a miss.
```

### Three defects the rename EXPOSED, each fixed and pinned

- **`config/vite/react.ts` held the subpath inside REGEXES** (`@kitn\.ai\/ui\/elements`) for
  `aliasesExclude` and the wrappers' `external` list. A plain-string sweep cannot see `\/`. **Any
  subpath rename must sweep a second, escaped spelling.**
- **The split build still wrote `elements/[name].js`** (`config/vite/web-components.ts`'s
  `entryFileNames`) while its exports key became `./web-components/*` — every per-web-component
  import would have 404ed. The exports map and the emitted directory are two ends of one promise.
- **`scripts/acceptance-pack.mjs` parsed subpaths with `([a-z]+)`**, so a HYPHENATED
  `web-components` fell silently out of its symbol-coverage check. The test that pins that coverage
  (`tests/scripts/acceptance-pack.test.ts`) is what caught it. The capture is now `[a-z0-9-]+`.

### Two stale paths the prose lanes found (both were real, both fixed)

- `scripts/gen-catalog.mjs` excluded `join(SRC, 'elements/define.tsx')` — a path that no longer
  exists, so the exclusion had silently stopped applying. Regenerated `derived.json` is unchanged in
  CONTENT (still exactly 3 event exceptions; `define.tsx` contributes none), which is why nothing
  went red — the fix matters the day that file grows a `dispatchEvent`.
- The block driver served `/kit/elements/autoloader.js` from a dist that no longer has it
  (`scripts/block-driver/pages/kai-chat-facade/index.html`, plus the preview checker's fixtures).
  `serve.mjs` and the pages now name `web-components/`.

### One thing that is now stale in a way nobody can fix by a sweep

`web-component-meta.json`'s `composedFrom[].storyId` values are SYNTHETIC
(`solid-advanced-<source-dir>-<name>--docs`). The `Solid (Advanced)/Elements` tier they were minted
for was retitled in 2026-09-18 and no story title carries it any more, so they resolve to nothing
either way. The segment follows the source dir, so it now reads `web-components`. If anyone wants
real ids, the generator should read the story's own `title`, not reconstruct one.

## 4. Step 5(b) landed (`2a9651e2`): the 38 story-only entries

`src/web-components/` had 58 story files; 38 are not a web component's story — `builder-*` surfaces
(11), `proof-*` pages (5), `labs-*` (2), the competitor/design reproductions (`chatgpt`,
`claude-code`, `codex`, `lovable`, `perplexity`, `perplexity-pro`, `v0`, `t3code`, `wisp`), the slot
galleries, plus `composer-showcase`, `form-controls`, `user-menu`, `workspace-home`. They are now
`src/stories/showcase/`, next to the docs-style stories. Membership is DERIVED (a story-only entry is
one with no same-stem implementation in that directory), so the next one is classified by rule.

**The codemod trap, and it is the interesting part.** Imports were rewritten by RESOLUTION (resolve
each specifier against the file's OLD directory, re-emit relative to the new one) rather than by
prefix. The first pass still broke something: it rewrote a story's `docs.source.code` TEMPLATE
LITERAL, turning a snippet's `'./debounce'` into `'../../web-components/debounce'`. That changes what
the story SHOWS, not what the module imports. The rewrite is now line-wise, skips comment lines and
anything inside a template literal. Reset and redone — the diff of a moved story shows only real
imports.

Path mentions were swept with spelling-exact rules only (three full spellings per moved path, never
a bare basename) across 20 files. One was FUNCTIONAL: `examples/demos/vesper/tools/extract-from-story.mjs`
resolves `packages/ui/src/web-components/v0.stories.tsx` ON DISK. A comment-only sweep would have
left a broken tool.

**A guard had to grow with the tree, and its own vacuity check said so.**
`mcp/catalog/surfaces.test.ts` derived the Labs/Apps corpus with a flat `readdirSync` of
`src/web-components/`; the move took it to 0 and `expect(appFiles.length).toBeGreaterThan(0)` fired
in 49ms. It now walks all of `src/` recursively — the same move `lint-catalog-drift.mjs` already
documents ("Walks ALL of src/, not src/web-components/: measured, not assumed"). Red before the fix,
green after: the mutation is a failure that actually happened.

## 5. Step 5(a) landed (`b9257f7d`): the layer folded into 88 family folders

167 files that sat flat in `src/web-components/` now live in a folder per family — the shape
`src/components/` got on 2026-09-19. Seven generated artifacts stay at the layer root
(`web-component-{meta,manifest,nonscalar}.json`, `web-component-types.d.ts`, `icon-names.json`,
`styles.css`, `compiled.css`): their paths are exports-map keys, generator outputs and three guards'
inputs.

**Invisible to consumers, by design.** The per-web-component build names its output after the source
FILE (`entryFileNames: 'web-components/[name].js'`), so `@kitn.ai/ui/web-components/chat` still
resolves to `dist/web-components/chat.js` whichever folder `chat.tsx` lives in. The manifest's keys
therefore had to stay BASENAMES (they ARE the public module names), and the split build now locates
each source by a recursive walk with a duplicate check. Measured on the packed tarball: register-all
96/96 tags, per-web-component resolves, `verify:pack` 2.51 MiB against the 2.56 MiB ceiling.

**Groupings are derived, not typed.** Family roots are the non-test modules and a file joins the
LONGEST hyphen-boundary prefix match (`audio-visualizer.declarative.test.tsx` → `audio-visualizer/`),
with an override table wherever `src/components/` had already decided: `message/` takes
`message-skills` + `validate-messages`, `prompt/` takes `prompt-input` + `default-input`, `tabs/`
takes `tab-bar[-item]`, `pane/` takes `pane-group` + `pane-grid`, `row/` takes `row-group`, `card/`
takes `cards`, `conversation/`, `checkbox/`, `radio/`, `settings/`, `workspace/`, `chat/` — plus
`define/`, `register/`, `slots/`, `autoloader/`, `web-component/` for the infrastructure that has no
component. 167 files → 88 families, 0 unassigned.

### Four things this broke that no single guard would have caught

1. **`tsc` does not report an unresolved SIDE-EFFECT import in this config.** Measured by appending
   `import './nope'` to `src/index.ts` (no error) beside `import { z } from './nope'` (TS2307). So a
   codemod that rewrites only `from '…'` specifiers leaves `import './x'` pointing at the old
   directory with six green tsc passes: **step 5(b) had already shipped 31 such imports** in the
   showcase stories, and this move added 206 more. Both passes handle `import '…'` now, and the tree
   was verified with a resolver over every relative specifier instead of trusting tsc — the build and
   `--project=unit` catch them, tsc does not.
2. **Two derivations encoded the facade's DEPTH as a string prefix** and silently produced empty
   results for all 97 web components: `gen-web-component-api.mjs`'s `spec.startsWith('../components/')`
   for `composedFrom` (gen-catalog then refused the artifact: *"carries no non-empty composedFrom on
   ANY of its 97"*) and `coverage.test.ts`'s `/^\.\.\/(components|ui)\//` for the Solid-module
   derivation (its own vacuity check fired: *"expected 0 to be greater than 60"*). Both resolve the
   specifier now. `composedFrom` matches HEAD exactly: 92 web components, 164 links, zero missing.
3. **Eight guards walked the layer with a flat `readdirSync`**, so they would have gone VACUOUS rather
   than red — finding 0 facades and asserting nothing. Five had a vacuity floor that said so; three
   did not and were found by reading the failures. All eight walk recursively now.
4. **`dist/web-components/remote.d.ts` disappeared.** The barrel's declaration emit used to mirror
   `src/web-components/remote.tsx` onto that flat path by accident; nesting the emit removed the
   accident without replacing it, so `@kitn.ai/ui/web-components/remote` shipped `.js` with no types.
   `gen-web-component-dts.mjs` now derives its file set from the emitted modules (the public
   per-module set IS the flat `.js` set) rather than from the manifest, which never listed `remote`.

Plus a pile of flat-path pins and depth assumptions, each fixed at the site: the vite targets'
`register`/`autoloader`/`remote` entries, `config/vite/lib.ts`'s define entry,
`emit-subpath-dts.mjs`'s `REAL_TYPES_SOURCE` for `./define`, `gen-web-component-types.mjs`'s emitted
`from './chat-types'` (now `./chat/chat-types`, caught only by `types-lib-check` because
`skipLibCheck` hides it), six emitted-scaffold fixtures that rewrite a specifier into a source path, a
`vi.doMock` path, and tests that read a sibling artifact via `resolve(HERE, …)` after moving one level
deeper.

**One widening was reverted the same day.** `tests/helpers/kit-paths.ts` gained `src/web-components`
so facades would resolve by basename — but a facade and its Solid component share a basename BY DESIGN
(`switch.tsx`, `badge.tsx`, …), so one unique-basename index over both trees threw on a legitimate
lookup. The reason is at the site now. A guard that means the facade names its path or walks the layer.

## 6. Traps from this session (do not re-derive)

**`tsc` is not a check on imports in this repo.** It does not report an unresolved SIDE-EFFECT import
(`import './nope'`) — measured, next to a `from` import that does error. Any structural move must
verify relative specifiers with a resolver, or rely on the build and the unit suite.


1. **`verify:generated` in parallel with `tsc`** produces fake TS1005 JSON errors (it rewrites
   source-tree artifacts in place). Serial.
2. **A guard that fails open is worse than one that fails:** the `beforeWriteFile` hook's throw was
   gated by the same depth-baked regex it was meant to protect. When a check is unreachable for the
   case it names, the comment claiming it fires loudly is the defect.
3. **Escaped spellings exist.** `@kitn\.ai\/ui\/elements` inside a regex survives any plain-string
   sweep. Grep for the escaped form after any subpath rename.
4. **A story's `docs.source.code` is template-literal TEXT.** Any specifier codemod must skip it, or
   it silently rewrites documentation.
5. **Path mentions that are FUNCTIONAL, not prose:** `examples/demos/vesper/tools/extract-from-story.mjs`
   resolves a story path on disk; `scripts/block-driver/*` and the preview checker name the served
   path. Sweep those with the same spelling-exact rules and check each hit's nature.
6. **Bash subtleties that already bit:** `cd X && cmd &` scopes the `cd` to that clause; `pgrep -f`
   lies; `timeout` does not exist on this box; BSD `grep` does not support `\b` in `-E` (a probe with
   `\belements?\b` returned ZERO hits on a tree with thousands — it reads as "nothing to do").
7. **Lanes burned 200+ turns each** (one at 217k tokens) because a scope like "comments in
   `scripts/` and `tests/`" is large. Give a lane the substance first, the report file early, and a
   hard stop; and re-check a lane's first numbers centrally, as asked.

## 8. The straggler guard landed (was "recommended")

`lint:layer-names` (`packages/ui/scripts/lint-layer-names.mjs`), self-tested, in the required CI job,
with `tests/scripts/layer-names-guard-wiring.test.ts` asserting the wiring and RUNNING the linter
against synthesized trees. It fails on a retired name of OUR layer only — the subpath in both
spellings, the three directories, the four artifact names, three public symbols — and never on the
DOM's vocabulary. `docs/README.md` (new) carries the old->new table and is the RECEIPT for the dated
archive's exemption: the guard fails if that note stops saying what happened to the old name, so the
carve-out cannot outlive its explanation.

Three things it caught while being written, all in this session's own work: it waived ITSELF (the
waiver marker is a string constant in the file, so `includes()` matched the guard's own source); its
escaped-subpath pattern was mistyped in the file whose whole job is finding escaped subpaths; and the
filesystem walk reported 114 findings inside gitignored build output plus a sibling checkout. Each is
a trap for the next guard of this shape; the commit message has the detail.

## 9. State at handoff

| check | state |
|---|---|
| `npm run build` | exit 0 |
| `verify:dts` | 364 declarations, 583 relative specifiers, zero escapes |
| tsc src / tests / apps / mcp / react / react.test | all exit 0 |
| `--project=unit` | 421 files, 6008 tests green |
| `--project=emitted` | 5 files, 36 tests green |
| `verify:generated` | 19 artifacts in sync |
| `verify:quarantine` | clean, no entries owed |
| `lint:story-conventions` | 150 stories; `lint:catalog-drift` 28 rows; `lint:gate-parity` clean |
| `lint:cdn-pins`, `lint:llms-size`, `lint:silent-drops`, `lint:attachment-object-urls`, `lint:pack-parse` | green |
| `verify:scaffold` | green (11 integrations × 8 surfaces, 110 emitted routes, 6 block forms) |
| `verify:consumer` | register-all 96/96 tags, per-web-component 1/1; four eager ceilings hold |
| `verify:pack` | 2.51 MiB packed against a 2.56 MiB ceiling (1465 files) |
| `test:geometry-token` | 6/6 browser |
| `nx build docs` | 127 pages |
| `packages/blocks` | 142 tests, tsc ×2 green; `apps/docs` 58 tests green |

Commits on this branch from this session: `1fad7fa4` (the dts rewrite), `373a99f6` (the extraction),
`9629f924` (the rename), `2a9651e2` (the showcase move), `777c4dcc` (symbols, data keys, event types,
generated names — the owner's call, pre-1.0), `ba6862f0` (the straggler guard and the archive note),
`b9257f7d` (the family folders — the last item; step 5 is complete).

Landed after the tables above were written: `lint:layer-names` 14/14 self-test cases and clean over
2603 tracked files; 421 files / 6008 unit tests; create-kai 909 after rebuilding its `dist/templates`,
which is where its three failures came from — a stale artifact, not source.
