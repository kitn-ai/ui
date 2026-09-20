# Handoff — the acceptance floor resolves kit imports, so the catalog stops copying the URL policy

**Date:** 2026-09-20 · **Branch:** `update/primitives` · **Status:** landed and verified.
**Preceded by:** [`2026-09-19-session-close.md`](2026-09-19-session-close.md) — read that first for the
arc, the owner's decisions and the traps. This file supersedes its §7.1 only.

---

## 1. What was open, and what it was

The close doc's §7.1: the MCP's invariant catalog told a consumer to hand-type the URL scheme lists,
under a note explaining that it had to, because the acceptance floor EXECUTES every `examples[].right`
form as a SCRIPT in a `vm` with named stand-ins and an `import` there fails with
"Cannot use import statement outside a module" (measured at the time by trying it). The predicates were
already exported (`isSafeUrl`, `isScriptUrl`, `isSafeImageSrc`, `isRenderableLink`), so the remaining
defect was exactly the repo's "derive it, don't type it" rule broken on a security policy: a second copy
of `SAFE_SCHEMES` in `mcp/catalog/invariants.ts`, with nothing keeping the two in step, in every
generated app's instructions.

## 2. What landed

**A resolver, not a bigger vm.** `scripts/lib/kit-imports.mjs` (new) rewrites a snippet's
`@kitn.ai/ui…` named imports to the FILE each symbol is defined in, and the floor then lets esbuild
BUNDLE the fragment, so the predicate that runs is the shipped one — its list, its base resolution, its
empty-string refusal. Every path is derived: the specifier must be a key in the package's own `exports`
map (which is the "a consumer could write this import" claim the catalog makes about its examples), and
for the root barrel, which symbol comes from which module is read out of `src/index.ts`'s own
`export { … } from './x'` statements. Never a list of names, because a list of names is what rots.

`SUBPATH_SOURCES` — the one map that cannot be derived, since the subpath-to-source-barrel convention
missed five subpaths — moved out of `acceptance-pack.mjs` into that module, so the pack's prose check
and the floor's import check now read ONE map instead of two.

**The floor** (`scripts/lib/invariant-floor.mjs`):
- `execute` compiles through a new `compile` helper: rewrite kit imports, then `esbuild.buildSync` with
  `bundle: true`. `format: 'esm'`, not `cjs` — esbuild refuses to EMIT a cjs bundle containing
  top-level await and two catalog examples are exactly that.
- `runFloor(invariants, helpers, { harnesses, resolveImports })`. A snippet containing an `import` with
  no resolver supplied is a HARD FAILURE with a message naming the module to pass, because silently
  ignoring the import would leave the example unmeasured while its row still read PASS.
- The floor reports what the resolver actually rewrote (`imports`), attributed to its own run by slicing
  at a mark — the resolver accumulates across runs, so a report that read it directly would credit one
  run with another's imports. `selfTest` asserts that attribution.
- `formatFloor` prints an `imports:` line derived from that list, so "we executed the shipped predicate"
  is a measurement rather than a sentence somebody typed.

**The catalog** (`mcp/catalog/invariants.ts`): the two URL snippets now import the real predicates, and
their notes say the base-vs-no-base split IS `isRenderableLink`'s behaviour rather than restating it.
`untrusted-model-output`'s statement now says to import rather than re-type either list.

**The guard that keeps the copy from coming back** (`mcp/catalog/invariants.test.ts`, new case): it reads
the scheme literals out of `src/primitives/url-scheme-policy.ts` and `link-preview.ts` and fails any
`right` form that spells one out. `IMAGE_SCHEMES` is deliberately excluded — that list is about an
`<img src>`, no example imports it, and `data:image/` is a legitimate spelling a snippet may name.

**The pack report** (`scripts/acceptance-pack.mjs`): `FLOOR.md` gained a section saying the one thing in
a right form that is NOT a stand-in is a kit import, and naming each symbol executed from source this
run, derived from `floor.imports`.

## 3. Mutation proofs (the guards were watched failing)

| mutation | result |
|---|---|
| add `'javascript:'` to `SAFE_SCHEMES` in `src/primitives/url-scheme-policy.ts` | `FAIL untrusted-model-output#1` — "javascript: is blocked -- javascript: reached window.open". Proof the snippet executes the REAL module, not a copy of its list |
| delete the `export { isSafeUrl, … } from './primitives/url-scheme-policy'` line from `src/index.ts` | `FAIL` naming the missing re-export: "`@kitn.ai/ui` does not re-export `isSafeUrl` from src/index.ts". Proof the barrel is the source of which module to bundle |
| add `['http:', 'mailto:']` to a `right` form | the new `invariants.test.ts` case goes red: "untrusted-model-output: the right form spells out the scheme http:, which the policy module owns" |
| the floor's own `--self-test` | three new controls, all watched firing: a kit import executes the SHIPPED predicate (empty string refused, relative path allowed); a name the barrel does not re-export fails the row BY NAME; an import with no resolver supplied is a failure, not a silent skip |

The positive control matters as much as the negative ones: `zz-good-import` asserts `isSafeUrl('')` is
false, which a hand-typed copy of a three-scheme list cannot reproduce — `new URL('', base)` inherits
`http:`, which is the bypass the predicate's empty-string refusal exists for.

## 4. Verified ladder (raw numbers)

| check | result |
|---|---|
| `tsc --noEmit -p tsconfig.tests.json` / `-p tsconfig.mcp.json` | both exit 0 |
| `--project=unit` | **424 files, 6037 tests** passed (6036 before: +1 is the new invariants case) |
| `acceptance-pack.mjs --floor` | exit 0, **15 examples executed**, `imports: 2 kit symbol(s) executed from the module that defines them` |
| `acceptance-pack.mjs --self-test` | exit 0, every planted fault detected, 3 of them new |
| `vitest run --project=unit mcp/catalog tests/scripts mcp/mcp/reference.test.ts` | 43 files, 624 tests |
| `lint:catalog-drift` | `3 recipes, 7 invariants, 28 inventory rows resolved clean (5 reported gaps)` |
| `lint:gate-parity` | clean, `59 gate(s) … (73 run steps)` |
| `verify:quarantine` | clean, `314 files outside src/, 0 with errors` |

Not re-run for this change, and why: nothing under `dist/` moves (`verify:consumer`, `verify:pack`,
`verify:scaffold`, `test:geometry-token` measure the built bundle, and no build output changed); the
`--project=emitted` guards execute the scaffolder's emitted code, which this does not touch. Run them
before a release, not for this.

## 5. Traps this cost time on

1. **`format: 'cjs'` cannot emit top-level await.** Two catalog examples use it, and the failure reads
   as "the catalog's own advice does not run" rather than as a bundler-format problem. `esm` output is
   fine here because the bundle is never loaded as a module — it is wrapped in an async IIFE and run in
   the vm — so the format only decides what esbuild will emit.
2. **`formatFloor`'s `imports:` line is derived, and that is load-bearing.** A hand-typed "we execute the
   shipped predicate" sentence in `FLOOR.md` would be the same class of claim the resolver exists to
   delete. The count is read from what the resolver rewrote during THIS run.
3. **`FAULTS`-style attribution applies to the resolver too.** It accumulates across runs, so a report
   reading `resolved` directly would credit the `--self-test` probes' imports to a later floor run. The
   floor slices at a mark, and `selfTest` pins it with an empty run.
4. **Type-only imports.** With `loader: 'js'` esbuild cannot parse `import type { … }`, so the resolver
   checks the names against the barrel and erases the statement itself rather than routing it to a value
   module. No catalog example does this yet; the case is handled rather than discovered later.

## 6. Still open, unchanged from the close doc

1. **The security audit's remaining coverage vectors (F-5)** — eight vectors with exact strings in
   [`2026-09-19-lane-reports/security-sink-audit.md`](2026-09-19-lane-reports/security-sink-audit.md).
   Covered so far: the `Card` href (component and `<kai-card>` attribute), the three predicates, the four
   image sinks. NOT covered: the attachment-url path, `kai-navigate`'s raw-url event, and
   `artifact-card`'s model-supplied `height`. **This is the highest-value next item** and needs no
   build.
2. An observed flake, recorded not hidden: one full parallel run failed
   `tests/scripts/solid-coverage-guard-wiring.test.ts`; it passes alone and in the next full run.
   Suspect temp-dir/parallelism. It did not recur in the run above.
3. Cosmetic leftovers, deliberately not churned: generated console wording that still says "elements" in
   places; `dist/**` shipping nested per-module `.d.ts` (well under the pack ceiling).
