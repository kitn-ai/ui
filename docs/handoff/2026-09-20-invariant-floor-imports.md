# Handoff — the acceptance floor resolves kit imports, so the catalog stops copying the URL policy

**Date:** 2026-09-20 · **Branch:** `update/primitives` · **Status:** landed and verified.
**Preceded by:** [`2026-09-19-session-close.md`](2026-09-19-session-close.md) — read that first for the
arc, the owner's decisions and the traps. This file supersedes its §7.1–§7.4: the floor resolves kit
imports (§1–§5), the security audit's remaining coverage vectors are pinned (§6), the flake is pinned
(§7), the leftover wording is swept (§8), and the nested `.d.ts` question is measured and declined (§9).

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

## 4. Verified ladder (raw numbers, at HEAD)

| check | result |
|---|---|
| `tsc --noEmit` src / tests / mcp | all exit 0 |
| `--project=unit` | **424 files, 6043 tests** passed (6036 at the branch's start: +1 the new invariants case, +4 the three F-5 vectors, +2 the flake controls) |
| `--project=emitted` | 5 files, 36 tests, green (re-run after the emitted scaffold wording moved, §8) |
| `acceptance-pack.mjs --floor` | exit 0, **15 examples executed**, `imports: 2 kit symbol(s) executed from the module that defines them` |
| `acceptance-pack.mjs --self-test` | exit 0, every planted fault detected, 3 of them new |
| `lint:catalog-drift` | `3 recipes, 7 invariants, 28 inventory rows resolved clean (5 reported gaps)` |
| `lint:gate-parity` | clean, `59 gate(s) … (73 run steps)` |
| `lint:layer-names` | clean, `2616 file(s) walked` |
| `verify:generated` | green, all 19 artifacts rewritten and matching |
| `lint:llms-size` | green, `344,902 bytes … ceiling 352,256`, 7.2 KiB headroom |
| `verify:pack` | `2.51 MiB packed (ceiling 2.56 MiB); 11.45 MiB unpacked and 1468 files` |
| `verify:web-components-bundle` · `lint:story-conventions` · `verify:quarantine` | clean (`150 .stories.tsx`, `314 files outside src/`) |
| `packages/blocks` · `create-kai` | 142 tests · 909 tests |

Not run for these changes, and why: `verify:consumer`, `verify:scaffold` and `test:geometry-token`
measure the built bundle, and nothing under `dist/` moved for any of the four items (§9's measurements
were read off the existing `dist/`, not produced by a build). Run them before a release.

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

## 6. F-5: the three remaining coverage vectors, covered (`§7.2` of the close doc)

The security audit's [`security-sink-audit.md`](2026-09-19-lane-reports/security-sink-audit.md) listed
8 vectors with exact strings. Covered already: the `Card` href (component and `<kai-card>` attribute),
the three predicates, the four image sinks. This session closed the remaining three.

**Vector 6, `artifact-card`'s model-supplied `height` — and the audit's premise needed correcting.**
The audit said a single CSS property value "is parsed as one declaration, CSSOM drops the rest".
Measured, that is only true on the path the artifact card actually takes. `data.height` is DYNAMIC, so
the Solid compiler emits `style.setProperty('height', v)` per key, and `'1px; background:
url(https://evil.tld/beacon)'` is rejected WHOLESALE: no height, no background, no `style` attribute
at all. A STATIC style value is folded into the template's own `style` attribute, where the same value
DOES apply both declarations — verified by compiling the JSX with `babel-preset-solid`, and by
rendering both shapes. So the sink is safe *because the value is dynamic*, which is now stated at
`resolveHeight` and pinned by two assertions in `tests/primitives/artifact-card.test.tsx`: the hostile
value applies nothing, and an arbitrary but VALID length (`100000px`) is applied verbatim (the ceiling
is the app's call; the kit does not clamp).

**Vector 7, the attachment url.** `SECURITY.md` already named it among the model-supplied image
URLs and pointed at `tests/components/model-image-sinks.test.tsx`, which did not cover it — the doc was
ahead of its own pin. The path (`Attachment` + `AttachmentPreview`, both `attachments.tsx` and
`message.tsx`) is an `<img src>`, so it takes the same recorded decision; the case is now in that file
and the header names it. Non-vacuity is the image's own `alt`, not visible text, because a GRID image
tile deliberately renders no caption (`AttachmentInfo` suppresses it for `mediaCategory === 'image'`).

**Vector 8, `kai-navigate`'s raw url.** The event reports the url AS IT ARRIVED, including one the
preview refused — correct for auditing, and `artifact-card` feeds it straight back into the envelope.
The obligation moves to the consumer, so the event's own doc (and the Solid `onNavigate` prop) now says
it is NOT scheme-validated and to guard it with `isSafeUrl`. `tests/web-components/artifact.test.tsx`
asserts both halves: the raw `javascript:` url is what `detail.url` carries, and the iframe never took
it. Editing that doc comment moved five generated artifacts (`web-component-meta.json`,
`web-component-types.d.ts`, `frameworks/react/index.tsx`, `docs/web-components.md`, `llms-full.txt`),
regenerated with `npm run build:api` and confirmed with `verify:generated`.

Mutation-proved, each watched failing and then restored:

| mutation | result |
|---|---|
| `style={{ height: … }}` → `style={`height: ${…}`}` (the cssText path) | the injection assertion reddens: `el.style.backgroundImage` becomes the beacon url |
| `framedUrl` returns `u` unconditionally (the scheme filter disabled) | the navigate test reddens on the iframe assertion |
| the attachment `<img src>` routed through `isSafeUrl` | the model-image case reddens — which is the point: a filter there is a visible decision, not a silent one |

## 7. The recorded flake, pinned (`§7.3` of the close doc)

`tests/scripts/solid-coverage-guard-wiring.test.ts` failed once in a full parallel run and passed
everywhere else. It is not reproducible on demand: 6 concurrent copies of the file (72 spawns at once)
also a failure, 12/12 green. 8 concurrent copies on a box already at load 6.7 pushed the worst case to
**2558ms**, half the strict 5000ms default, which bounds the timeout explanation rather than proving
it. So the fix is not a guess at the cause; it is making the cause NAME ITSELF next time.

**The harness was throwing the distinction away.** `execFileSync`'s `status` is `null` BOTH for a child
the OS killed and for one that never started, and `runGuard` folded both into `code: -1` with empty
output. So "the guard disagreed with a healthy package" and "the machine gave us no guard" arrived as
one line, which is exactly why the flake stayed unattributable. `runGuard` is now a thin wrapper over
`runProcess`, which reports `never-ran` with the signal or the errno in the output:

```
[the guard process was killed by SIGKILL -- there is no guard verdict below]
[the guard process could not be started (ENOENT from spawnSync node-that-does-not-exist: ...)]
```

Two controls pin that, each watched red first: a nonexistent binary must be named `ENOENT`, and a
`process.kill(pid, 'SIGKILL')` child must be named `SIGKILL`. Without them the branch that does the
naming is itself unproven.

**And the file got the budget the measurement justifies** (`COMPILES_TYPESCRIPT`, in
`test-timeout-budgets.ts`), because 9 of its 12 cases spawn a node process that loads the TypeScript
compiler. Mutation-proved: set the entry to 1ms and every case in the file goes red, so the setup file
really does apply this entry rather than the table merely listing it.

**Left alone, recorded rather than churned:** the file creates 12 temp dirs per run and never removes
them (853 were in TMPDIR at the time of this session). House style across `tests/scripts/` is to leak
(19 of 24 files do), and keeping the fixture is what makes a failing case inspectable, so this is a
noted leftover, not a fix.

## 8. The wording sweep (`§7.4` of the close doc)

"Generated console wording that still says 'elements' in places." It is real, and `lint:layer-names`
can neither catch it nor should: it is a SPELLING guard for retired spellings, and the DOM's own
vocabulary must not fire it. A wording lint would be a false-positive machine -- "listen on the
element" and "N elements" are the same two words -- so this is a reviewed sweep with the boundary
written down in the commit message rather than a new guard.

Changed where "element(s)" named the LAYER: the two `gen-web-component-api.mjs` console lines and the
`gen-llms.mjs` one (the sibling generators already said "web components", so the api one was the
straggler); the SHIPPED `llms.txt` / `llms-full.txt` section `Element reference` ->
`Web component reference` (key, pointer, heading and `FULL_BODY_ORDER` entry together, since
`llms-index-coverage.test.ts` matches the key against the heading) and "All N elements are also
exported individually"; MCP answers (`Unknown element:` -> `Unknown web component`, debug's rule id
`elements-not-registered` -> `web-components-not-registered`, "one or two elements"); emitted consumer
code (scaffold's loading-options note, create-kai's framework-fallback note); the CI error strings in
`verify-web-components-bundle.mjs` and `lint-catalog-drift.mjs` plus their self-test expectations and
the wiring test's pin; `packages/blocks`' legacy-prefix error; and a story fixture whose title AND
stale `/docs/elements` URL both predated the rename.

Deliberately left, each the DOM's own vocabulary: "custom elements", `custom-elements.json` / Custom
Elements Manifest, "listen on the element" / "the element instance" / `Kai<Name>Element`, the
"kai-* elements are registered" doc on `webComponentsReady` (it describes `customElements.whenDefined`),
`parse-template.ts`'s "kai-* elements", and `element.*` / `elementsReady` / `derived.elements` -- which
the rename doc keeps on purpose. Also left: test titles that merely say "element".

The straggler that proves the sweep was worth running: `gen-web-component-nonscalar.mjs`'s header
claimed "all 550 props across all 80 elements". The workspace is **97 web components**, so those
numbers were wrong as well as stale -- the same "derive it, don't type it" defect in a comment.

## 9. The nested per-module `.d.ts`: measured, and deliberately NOT excluded (`§7.4` of the close doc)

**Verdict: do not exclude.** A read-only lane proposed it ("dist/** shipping nested per-module .d.ts
that mirror src/ - a files-map exclusion is a packaging change with its own verification"), and its own
measurements say no. Re-measured here rather than trusted:

| fact | measured |
|---|---|
| `.d.ts` under `packages/ui/dist` | **459 files**; nested (`-mindepth 2`) **441 files / 989,013 B** |
| relative specifiers in `dist/index.d.ts` | **178**, e.g. `from './components/toast/toast.js'`, `from './stores/create-kai-chat.js'` |
| do they point INTO the mirror? | yes -- `dist/components/toast/toast.d.ts` is what that specifier resolves to |
| what produces the mirror | `config/vite/lib.ts`, `perModule: true` + `entryRoot: 'src'` on the barrel target's `dts` block |
| current pack weight | `verify:pack`: **2.51 MiB packed (ceiling 2.56 MiB)**, 11.45 MiB unpacked, 1468 files |

So the premise in the open item is FALSE: the mirror is not an accidental byproduct. The per-module
`.js` are deliberate (`preserveModules`), and the `.d.ts` beside them are the declaration targets the
published barrels' own relative re-exports need. Removing them breaks types for `.`, `./solid`,
`./state`, `./wire`, `./stores`, `./diagnostics`, `./schemas` and `./provider` at once.

What a lane CAN say safely is narrower: 65 of the 441 nested `.d.ts` (171,067 B unpacked, ~75 KB
packed) are reachable from no shipped declaration at all -- a ~1.5% cut off a ceiling with ~50 KB of
headroom, whose correctness depends on a static reachability closure a source change can invalidate,
and no guard catches a wrong call (`verify:dts` stays green for an unreachable file). Not worth it.
The lever that WOULD matter is `rollupTypes: true` (one bundled `dist/index.d.ts`), and `lib.ts`
records that it was tried and failed resolving `dist/state.js` while walking the tree; that is a
separate, build-verified change.

## 10. Still open

1. The owner's deferred question -- whether to split into packages. §5.1 of the close doc has the
   measurements and the conditions that would flip the answer.
2. The 65 unreachable nested `.d.ts`, ~75 KB packed, and `rollupTypes` as the larger version of the
   same question (§9). Both need a build to act on, which is why neither was taken here.
3. The 12 leaked temp dirs per run of the solid-coverage wiring test (§7).
