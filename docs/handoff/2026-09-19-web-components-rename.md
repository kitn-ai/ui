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

## 5. Still open: step 5(a), the family folders for `src/web-components/`

### What it is, in plain terms

The layer's own source is 174 files sitting FLAT in `src/web-components/`: `chat.tsx`,
`chat-types.ts`, `chat-actions.ts`, `card.tsx`, `cards.tsx`, `card-schemas.declarative.test.tsx`,
`message.tsx`, `message-skills.tsx`, `validate-messages.ts`, and so on. `src/components/` does not
look like that any more — the 2026-09-19 reorg gave it 92 family folders (`row/{row,row-group}`,
`tool/{tool,tool-classify,tool-types}`, `tabs/{tabs,tab-bar}`). Step 5(a) is "do that here too",
which is what the owner asked for when they said the Carbon shape is the target.

### What it is NOT — the part that makes it decide-able

**No consumer can see a folder under `src/web-components/`.** The per-web-component build names its
output after the source FILE (`entryFileNames: 'web-components/[name].js'`), so
`@kitn.ai/ui/web-components/chat` resolves to `dist/web-components/chat.js` whether `chat.tsx` sits
at the layer root or in `chat/chat.tsx`. No export key, no emitted filename, no public type name
changes. It is a purely internal layout change, reverting it is one `git revert`, and the whole
build+test ladder is the check. That is why it is safe to do, and also why it is not urgent.

### The work, measured

1. **Groupings — the only judgement call, and ~20 cases.** A mechanical rule does most of it: family
   roots are the non-test modules, and a file joins the LONGEST hyphen-boundary prefix match
   (`audio-visualizer.declarative.test.tsx` -> `audio-visualizer/`; `card-schemas.…` -> `card/`;
   `tab-bar-item.tsx` -> `tab-bar/`). Then mirror `src/components/`, which is what "the same family
   folders" means: `message/` <- `message-skills.tsx`, `messages-guard.…`, `validate-messages.ts`;
   `prompt/` <- `prompt-dock.tsx`, `prompt-input*`, `prompt-suggestions.tsx`, `default-input.tsx`;
   `tabs/` <- `tab-bar.tsx`, `tab-bar-item.tsx`; `pane/` <- `pane-group.tsx`, `pane-grid.tsx`;
   `row/` <- `row-group.tsx`; `card/` <- `cards.tsx`, `card-media.jpg`; `conversation/` <-
   `conversation-item.tsx`, `conversation-list.tsx`; `checkbox/` <- `checkbox-group.tsx`; `radio/` <-
   `radio-group.tsx`; `settings/` <- `setting-item.tsx`, `settings-group.tsx`; `workspace/` <-
   `chat-workspace.tsx`; `chat/` <- `chat-actions.ts`, `chat-types.ts`, `chat-scope-picker.tsx`.
   Layer infrastructure, which has no component: `define/` <- `define.tsx`, `define-entry.ts`,
   `define-entry.test.ts`, `css.ts`, `slot-text.ts`; `register/`; `slots/`; `autoloader/`;
   `web-component/` <- every `web-component-*.ts`, `diagnostic-events.ts`, and the layer-wide tests.
2. **Leave four generated artifacts at the layer root** (`web-component-meta.json`,
   `-manifest.json`, `-nonscalar.json`, `-types.d.ts`, plus `icon-names.json`, `styles.css`): their
   paths are `exports` map keys, generator outputs and three guards' inputs. Moving them buys
   tidiness and costs a cross-cutting path change for no reader benefit.
3. **One atomic codemod**, the shape built for step 5(b): `git mv` everything, then rewrite relative
   specifiers by RESOLUTION (resolve against the OLD directory, re-emit relative to the new one),
   line-wise, skipping comments and template literals. Do not prefix-replace.
4. **The couplings** (all measured): `config/vite/web-components.ts` pins five paths (`register.ts` as
   a rollup entry, `autoloader.ts` and `remote.tsx` in the split build's input map, and it READS
   `web-component-manifest.json` at config time); `config/vite/lib.ts` pins `define-entry.ts` twice
   (the `./define` and `./define.server` targets); `tests/helpers/kit-paths.ts` must gain
   `src/web-components` in `SOURCE_DIRS` in the same change (a dozen guards resolve a facade by
   basename through it and throw on 0 hits — a hard, good failure); and the three generators that walk
   the directory (`gen-web-components-manifest`, `gen-web-component-api`, `gen-catalog`) must be read
   before anything moves. `.storybook`'s glob and both catalog guards walk recursively and tolerate
   the move.
5. **Verify** as steps 4 and 5(b) were: `tsc` ×6, `--project=unit`, `npm run build`,
   `verify:generated`, plus `nx build docs`, `verify:scaffold` and `verify:consumer` because the
   scaffolder's emitted specifiers are generated from the same walk.

### Recommendation

**Do it, in one commit, after printing the mapping for review.** The grouping is the only taste call
and is worth five minutes of reading a table before 174 files move — mis-grouping is cheap in git and
expensive in attention. Everything else is mechanical and already guarded.

**Do not do it** if the diff is unwelcome this week: nothing is broken by leaving the layer flat, the
visible win (38 story-only entries out of the facade directory) already landed, and this is the one
remaining item from the arc that no consumer, guard or doc depends on.

## 6. Traps from this session (do not re-derive)

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
| `--project=unit` | 420 files, 6001 tests green |
| `--project=emitted` | 5 files, 36 tests green |
| `verify:generated` | 19 artifacts in sync |
| `verify:quarantine` | clean, no entries owed |
| `lint:story-conventions` | 150 stories; `lint:catalog-drift` 28 rows; `lint:gate-parity` clean |
| `lint:cdn-pins`, `lint:llms-size`, `lint:silent-drops`, `lint:attachment-object-urls`, `lint:pack-parse` | green |
| `verify:scaffold` | green (11 integrations × 8 surfaces, 110 emitted routes, 6 block forms) |
| `verify:consumer` | register-all 96/96 tags, per-web-component 1/1; four eager ceilings hold |
| `verify:pack` | 2.50 MiB packed against a 2.56 MiB ceiling |
| `test:geometry-token` | 6/6 browser |
| `nx build docs` | 127 pages |
| `packages/blocks` | 142 tests, tsc ×2 green; `apps/docs` 58 tests green |

Commits on this branch from this session: `1fad7fa4` (the dts rewrite), `373a99f6` (the extraction),
`9629f924` (the rename), `2a9651e2` (the showcase move), `777c4dcc` (symbols, data keys, event types,
generated names — the owner's call, pre-1.0), `ba6862f0` (the straggler guard and the archive note).

Landed after the tables above were written: `lint:layer-names` 14/14 self-test cases and clean over
2603 tracked files; 421 files / 6008 unit tests; create-kai 909 after rebuilding its `dist/templates`,
which is where its three failures came from — a stale artifact, not source.
