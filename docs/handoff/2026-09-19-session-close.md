# Handoff — session close on `update/primitives` (everything you need after a session reset)

**Date:** 2026-09-19 · **Branch:** `update/primitives` · **HEAD:** `7d648581` · **Working tree:** clean
**Written for:** whoever picks this up next, with no memory and no context. Read this first, then the
three session handoffs it points at.

---

## 1. What this branch is, in one paragraph

`packages/ui` (`@kitn.ai/ui`) is a framework-agnostic, Shadow-DOM web-component library for AI chat
UIs, authored in SolidJS. Its layers are `src/primitives` (headless logic + cross-layer data shapes) →
`src/components` (the Solid components) → `src/web-components` (the coarse `kai-*` facades over them)
→ `frameworks/react` (generated wrappers). One package, platform-named internals, one tarball with
independently importable subpaths. This branch is a long refactor of that structure: a family-folder
reorg of `src/components`, a rename of the facade layer from "elements" to "web-components", the
extraction of non-components, a guarded layer order, a security audit's findings, and real
tree-shaking proofs.

**Before touching anything:** the repo's rules are in [`CLAUDE.md`](../../CLAUDE.md) (long, load-bearing,
current) and the cross-layer dependency register is [`docs/coupling-map.md`](../coupling-map.md).

## 2. The arc, as commits

All on this branch, oldest first. Each was verified and committed on its own; the messages carry the
measurements, and they are the primary record.

| commit | what it did |
|---|---|
| `605148ad` | `src/components`: 284 flat files → 92 family folders |
| `1fad7fa4` | fixed the `verify:dts` blocker the reorg caused (depth-derived dts rewrite) |
| `373a99f6` | three non-components out of `src/components` into `src/primitives` |
| `9629f924` | `src/elements` → `src/web-components`, clean, no alias (BREAKING) |
| `2a9651e2` | the 38 story-only entries → `src/stories/showcase/` |
| `777c4dcc` | the rest of the rename: public symbols, data keys, event types, generated names |
| `ba6862f0` | `lint:layer-names` + `docs/README.md` (the archive's receipt) |
| `b9257f7d` | `src/web-components` folded into 88 family folders |
| `e624bc3e` | every upward VALUE import removed: the layer order is a DAG |
| `b0511f52` | `lint:layer-direction` (the guard that found the last upward edge) |
| `3437cde1` | security: the `Card` href sink takes the policy; the third URL classifier deleted |
| `f0d8099a` | eager size proofs for `./react`, `./solid` and one web component |
| `158e456a` | the autoloader demo works, and the autoloader's module map is checked |
| `e0ee652f` | `composedFrom`'s synthetic `storyId` deleted |
| `a05ab28e` | handoff: the layering DAG, the audit, the shaking proofs, the autoloader fixes |
| `7d648581` | docs(security): the model-image decision, recorded at the sinks and pinned |

Three handoffs carry the detail, in order:
`2026-09-19-components-reorg-and-naming.md` → `2026-09-19-web-components-rename.md` →
`2026-09-19-layering-security-and-shaking.md`. **Read the third one for the current state**; the first
two explain how the tree got its shape.

## 3. The renaming decision, and the vocabulary rules you must not undo

The `kai-*` layer is called **web components**: `src/web-components/`, `@kitn.ai/ui/web-components`,
`web-component-meta.json`. "elements" is retired as the layer's name (Carbon was the model:
`@carbon/web-components`; their `@carbon/elements` is a design-tokens package, unrelated).

**`lint:layer-names` enforces this** (self-tested, required CI). What it deliberately does NOT fire on,
because these name the DOM's own concepts rather than the layer: `HTMLElement`, `customElements`,
`createElement`, `JSX.IntrinsicElements`, a plain HTML element, and the generated DOM-interface family
`Kai<Name>Element` / `Kai<Name>ElementProps` / `KaiElementJsxProps` (a consumer writes
`document.querySelector('kai-chat') as KaiChatElement`, so that name IS the element interface). Also
deliberately left: `parseKai*Element` helpers (they parse element NODES) and `walkElements` in
`@kitn.ai/blocks` (a TemplateNode walker).

**The dated archive is NOT swept, on purpose.** `docs/{handoff,superpowers,research,proposals,decisions,provenance}`
and `packages/ui/CHANGELOG.md` are records of what the tree looked like then (docs/superpowers alone
names the old subpath in 235 files). Rewriting them would falsify them — the same precedent as
`lint:cdn-pins`' `historical` waiver. The exemption is legitimate because
[`docs/README.md`](../README.md) carries the old→new table and explains itself, and `lint:layer-names`
FAILS if that note stops saying what happened. So the honest completion check is a grep that excludes
`dist/` and those dated directories, not a bare grep:

```bash
git grep '@kitn\.ai/ui/elements' -- . ':!packages/ui/dist' ':!docs/handoff' ':!docs/superpowers' \
  ':!docs/research' ':!docs/proposals' ':!docs/decisions' ':!docs/provenance' ':!packages/ui/CHANGELOG.md'
```

## 4. The layer order is a DAG, and `lint:layer-direction` keeps it that way

**Rule:** no VALUE import may point at a layer ranked above the importer. **Type-only imports may go
upward** — the repo's own stated position, written at the site in `src/wire/diagnostics.ts`: a
type-only import vanishes at runtime, so it cannot create a load-order or bundler cycle.

**Order, bottom to top:** `src/utils`, `src/primitives`, `src/schemas`, `src/state`, `src/stores`,
`src/wire`, `src/diagnostics`, `src/components`, `src/web-components`, `frameworks`, `mcp`.
`state` BELOW `stores` is deliberate and measured (a store wraps the pure folds; nothing in state
imports stores). Two self-test cases flip if that order is swapped back.

Two declared exceptions, both the construct boundary (`src/primitives/construct-form-paths.ts` and
`src/components/builder/builder-start.tsx` into `mcp/construct`), with the reason in the guard. An
exception whose edge stops firing fails the run, so the table cannot rot open.

## 5. Decisions the owner made (do not re-litigate; the reasoning is here so you can re-open it if facts change)

1. **ONE package, platform-named internals. NOT a Carbon-style multi-package split.** Asked and
   answered twice, including mid-session. The measured case: the source graph is now a DAG, so a split
   is *possible*; the costs are that `web-components` is a thin facade over the SAME Solid components
   (Carbon's split separates two *implementations*), the React wrappers are GENERATED from the
   web-components manifest (a build-order invariant becomes a publish-order one), and 145 shared
   top-level chunks are deduped only because all four builds write one `dist`. The only real win is
   install size for a consumer who uses neither facades nor wrappers: `dist/web-components` 1.3 M +
   `dist/react` 200 K of ~11.5 M unpacked ≈ 13%. **What would flip it:** a second *implementation* of
   the surface (Lit/vanilla) with different runtime deps; the Solid core getting its own consumers or
   release cadence; real install-size complaints; a team-ownership split.
2. **Rename everything, now, pre-1.0** — including public symbols (`elementsReady` →
   `webComponentsReady`, `ElementMeta` → `WebComponentMeta`), the diagnostics event prefix
   (`element.*` → `web-component.*`), create-kai's `registration: 'elements'` → `'web-components'`,
   the catalog's `derived.elements` key → `webComponents`, and the acceptance pack's `elements/<tag>.md`
   page dir → `web-components/` with `ELEMENTS.md` → `WEB-COMPONENTS.md`.
3. **The dated archive keeps its old names**, with `docs/README.md` as the receipt (see §3).
4. **Model-supplied image urls stay UNFILTERED** (`choice` media, link image/favicon, embed poster,
   attachment urls). `<img>` cannot execute a scheme, so there is no script sink; `data:` images are
   legitimate and a navigable allowlist refuses them; the residual (a model can force an outbound GET
   and pick an image size) is filed under decisions the APP owns — CSP `img-src`, an image proxy, or
   filtering the envelope. Recorded in `SECURITY.md`, at the `isSafeImageSrc` doc comment, and at each
   sink; pinned by `tests/components/model-image-sinks.test.tsx`.
5. **Stories stay colocated** in each component's folder. **`framework/react` stays separate** from
   `src/` on purpose: it is regenerated, never hand-edited.
6. **`packages/blocks` and `packages/create-kai` are already separate packages** — that is the
   precedent for when a boundary earns its cost (`blocks` depends on nothing, enforced by declaring no
   ambient types; `create-kai` ships templates).

## 6. What is verified right now (final ladder, HEAD `7d648581`)

| check | result |
|---|---|
| `tsc` src / tests / apps / mcp / react / react.test | all exit 0 |
| `--project=unit` | 424 files, 6036 tests |
| `--project=emitted` | 5 files, 36 tests |
| `npm run build` | exit 0 |
| `verify:dts` (in build) | passes; declarations resolve under bundler and nodenext |
| `verify:generated` | 19 artifacts in sync |
| `lint:layer-direction` | clean, 1168 files / 1225 specifiers, 2 declared exceptions |
| `lint:layer-names` | clean, 2604 files |
| other guards | story-conventions 150 · catalog-drift 28 rows · gate-parity · silent-drops · cdn-pins 16 pins/5 wired · attachment-object-urls · llms-size · pack-parse · verify:quarantine · verify:web-components-bundle 12/12 self-test |
| `verify:scaffold` | green (11 integrations × 8 surfaces + routes + block forms) |
| `verify:consumer` | 9 eager probes inside floors/ceilings; register-all 96/96 tags |
| `verify:pack` | 2.51 MiB packed against a 2.56 MiB ceiling |
| `test:geometry-token` | 6/6 in Chromium |
| `packages/blocks` · `create-kai` · `apps/docs` | 142 · 909 · 58 |
| `nx build docs` | 127 pages |
| Security suites | markdown-xss, artifact-url-xss, hostile-model-output, url-scheme-policy all pass |

**Tree-shaking, measured on the packed tarball** (these are the numbers to compare against if someone
claims a regression, and the ceilings live in `scripts/verify-consumer-sideeffects.mjs`):

| probe | eager | lazy (not counted) |
|---|---:|---:|
| `minimal-cn` (browser, from `.`) | 13,858 B | - |
| `minimal-button` (browser, from `.`) | 33,028 B | - |
| `node-cn` / `node-button` | 13,892 B / 23,395 B | - |
| `wc-chat-eager` (`web-components/chat`) | 519,826 B | 13 chunks, 929,607 B |
| `wc-loader-eager` (`web-components/loader`) | 156,832 B | - |
| `react-button` (`./react`) | 4,557 B | 23 chunks, 1,959,196 B |
| `solid-thread` (`./solid`) | 305,199 B | 13 chunks |
| `solid-badge` (control) | 32,350 B | - |

Reads: one facade does not drag the register-all bundle (it is in the lazy set); a React wrapper is
glue; `./solid` is per-module (a leaf costs 32 KB, a composite 305 KB — the pair is the evidence).
**Vue/Svelte/Angular/plain HTML are ONE code path**, not four: they resolve the same custom elements,
so the two web-component probes cover them.

## 7. Open work, ranked, with entry points

1. **Teach the acceptance floor to resolve imports** so the MCP's invariant catalog can emit the real
   predicates instead of hand-typed scheme lists. The floor
   (`packages/ui/scripts/lib/invariant-floor.mjs`) EXECUTES every `right` form as a SCRIPT in a vm with
   named stand-ins, so an `import` in a snippet fails with "Cannot use import statement outside a
   module" (measured by trying it). The predicates ARE exported now
   (`isSafeUrl`, `isScriptUrl`, `isSafeImageSrc`, `isRenderableLink`), so the change is: resolve a
   snippet's imports against the kit's real modules, then switch the two url snippets in
   `mcp/catalog/invariants.ts` to import them. That removes the last hand-typed copies of the scheme
   lists — the "derive it, don't type it" rule applied to a security policy.
2. **The security audit's remaining coverage vectors (F-5).** Eight vectors with exact strings are in
   `/tmp/kai-lanes/lane-security-audit.md` (a scratch file — if it is gone, the list is reconstructible
   from the audit summary in `2026-09-19-layering-security-and-shaking.md` §4). Covered so far: the
   `Card` href (component and `<kai-card>` attribute), the three predicates, and the four image sinks.
   Not covered: the attachment-url path, `kai-navigate`'s raw-url event, and `artifact-card`'s
   model-supplied `height` (which cannot inject a second CSS declaration but can pick an arbitrary
   height — a UI-level harm worth one assertion).
3. **An observed flake, recorded rather than hidden:** in one full parallel run
   `tests/scripts/solid-coverage-guard-wiring.test.ts` failed; it passes 12/12 alone and in the next
   full run. That file spawns the guard against synthesized temp trees. If it recurs, the suspect is
   temp-dir/parallelism, not the guard's logic.
4. **Cosmetic leftovers, deliberately not churned:** the acceptance pack's page dir is
   `web-components/` while its index is `WEB-COMPONENTS.md` (consistent); a few generated
   console messages still say "elements" in their wording; `dist/**` ships nested per-module `.d.ts`
   that mirror `src/` (1468 packed files, size well under the ceiling — a `files`-map exclusion is a
   packaging change with its own verification).

## 8. Traps that cost real time (do not re-derive)

1. **A fresh clone or worktree needs THREE things before the unit suite means anything:**
   `pnpm install`, `pnpm --filter @kitn.ai/ui run build:css`, then a real build (`nx build ui`). Skip
   any one and the suite fails in a way that reads like a broken checkout. Details in CLAUDE.md.
2. **Do not run the unit suite while a build runs** (`dist/` is mid-wipe → ~61 false failures), and do
   not run `verify:generated` in parallel with `tsc` (the generator rewrites source-tree artifacts in
   place → fake TS1005 JSON parse errors, observed).
3. **`tsc` does NOT report an unresolved SIDE-EFFECT import** (`import './nope'`) in this config —
   measured, next to a `from` import that does error. A codemod that only rewrites `from '…'`
   specifiers leaves `import './x'` pointing at the old directory behind six green tsc passes. It bit
   twice on this branch. Verify structural moves with a resolver, not with tsc.
4. **Any prefix test encodes the file's depth.** Two derivations used
   `startsWith('../components/')` and silently returned nothing for all 97 web components the moment
   the files moved one level deeper. Resolve specifiers instead.
5. **A guard can waive itself**: `lint-layer-names` first matched the waiver-marker constant it
   defines. Waivers now require `-- <reason>` and the two files that must contain the retired
   spellings are skipped by name.
6. **BSD `grep` does not support `\b` in `-E`**, so `git grep -E "\belements?\b"` returns ZERO hits on
   a tree with thousands — it reads as "nothing to do". Use `-w`, or python.
7. **`$?` after a pipe reports the pipe's status.** `cmd | tail` always "succeeds". Capture the exit
   code directly (`cmd > file 2>&1; echo $?`).
8. **Bash `cd X && cmd &` scopes the `cd` to that clause**; `pgrep -f "npm run build"` matches an
   unrelated long-lived shell; `timeout` does not exist on this box. Use absolute paths and a sentinel
   in the log (`bash -c 'CMD; echo SENTINEL=$?'`).
9. **The e2e/globalSetup freshness gate refuses to run** when any file under `src/` is newer than
   `dist/kai.es.js`. A rebuild is the only honest way past it; do not `touch` the bundle.
10. **Subagent lanes**: `.pi/settings.json` pins a retired default model, so pass
    `model: deepseek/deepseek-v4-flash` and `context: fresh` explicitly. Give each lane a disjoint file
    scope, have it write findings incrementally to `/tmp/kai-lanes/<name>.md`, and do not let it run a
    full build. In this session the two most valuable lanes were READ-ONLY (the security audit and the
    tree-shaking plan); the guard lane found a bug in my own measurement, so **treat a lane's first
    numbers as unverified** and re-run them.

## 9. If the next task is "keep going"

The arc is complete: the rename, the reorg of both trees, the extraction, the guarded layering, the
security fixes, the shaking proofs and the autoloader path all landed and verified. The highest-value
next work is §7.1 (it is the last known duplication of a security policy) and §7.2 (coverage). Beyond
that, the open question the owner deferred is **whether to split into packages** — §5.1 has the
measurements and the conditions that would flip the answer.
