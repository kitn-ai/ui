# Handoff — the layering DAG, a security audit's findings, and real tree-shaking proofs

**Superseded as an entry point by:** [`2026-09-19-session-close.md`](2026-09-19-session-close.md) (the whole arc, the owner's decisions, open work, traps). This file is the technical detail for one session.

**Date:** 2026-09-19 (third session) · **Branch:** `update/primitives` · **Status:** all work landed
and verified. Continues `2026-09-19-web-components-rename.md` (the rename, the family folders) and
`2026-09-18-src-ui-merge-and-footprint.md` (§6, the "no size proof for ./react or ./solid" note).

---

## 1. The layer order is now a DAG, and a guard keeps it that way

`lint:layer-direction` (`packages/ui/scripts/lint-layer-direction.mjs`), self-tested (24 cases), in the
required CI job, with a wiring test that RUNS it against synthesized trees.

**The rule:** no VALUE import may point at a layer ranked above the importer. Type-only imports are
allowed upward — already the repo's stated position, written at the site in `src/wire/diagnostics.ts`
("TYPE-ONLY, and that is what makes it legal here"): a type-only import vanishes at runtime, so it
cannot create a load-order or bundler cycle.

**The order, bottom to top:** `src/utils`, `src/primitives`, `src/schemas`, `src/state`, `src/stores`,
`src/wire`, `src/diagnostics`, `src/components`, `src/web-components`, `frameworks`, `mcp`.
`state` BELOW `stores` is deliberate and measured: a store is a reactive wrapper over the pure folds
(create-kai-chat consumes appendMessage/updateMessage/createAssistantStream; nothing in state imports
stores). Two self-test cases flip if that order is swapped back.

**Measured before** (value edges only): 7 `primitives -> components`, 1 `primitives -> state`, 1
`state -> components`, 1 `components -> web-components`, 2 into `mcp/construct`. **After:** zero,
with two declared `mcp/construct` exceptions (the construct engine is the kit's own builder runtime;
moving its zod schema into `src/` is a separate, larger change). An exception whose edge stops firing
fails the run, so the table cannot rot open.

Four misfilings fixed to get there, each moved to the layer it belongs to:

- `primitives/card-registry.tsx` -> `components/card/`: a `.tsx` mapping card types to seven Solid
  components. Its non-component halves were ALREADY in primitives on purpose (`card-tags.ts`,
  `card-component-types.ts`), so the `.tsx` was the last file in primitives that a Node/no-DOM entry
  could not import.
- `components/tool/tool-classify.ts` -> `primitives/`: a pure classifier, no JSX.
- `web-components/prompt/default-input.tsx` -> `components/prompt/`: registers nothing; a Solid
  component that a Solid component (chat-thread) was importing upward.
- `primitives/create-kai-chat.ts` -> `stores/`: a Solid store. **The guard found this one; my own
  measurement missed it**, because my scan's regex could not span NEWLINES and its `../state/index`
  import is written across four lines. I had reported "zero upward value edges" one message earlier.
  Assume any hand-rolled import scan is wrong until a guard disagrees with it.
- plus `partsToText` (three lines, pure) moved from `state/messages.ts` to `primitives/parts-text.ts`
  and re-exported from state, because `primitives/message-feedback.ts` value-imported it.

**CONSEQUENCE, recorded rather than discovered later:** `kai-prompt-input`'s `composedFrom` is now
`['DefaultPromptInput']` rather than the three primitives inside the helper, because the helper left
the layer and the facade composes it directly. The in-layer recursion that produced the old list is
now exercised by nothing (the remaining local imports are a CSS string and a validator).
`tests/scripts/composed-from.test.ts` says so at the assertion.

## 2. Tree-shaking: what is now PROVEN, and what the numbers say

`verify:consumer` had bounded exactly two imports (`cn`, `Button` off the package root). There was no
size proof for `./react`, `./solid`, or any per-module `./web-components/<name>` import. Five probes
and a CONTROL now cover them, measured on the packed tarball in a scratch app with the Vite the script
pins:

| probe | eager | lazy (not counted) |
|---|---:|---:|
| `wc-chat-eager` (`web-components/chat`) | 519,826 B | 13 chunks, 929,607 B |
| `wc-loader-eager` (`web-components/loader`) | 156,832 B | - |
| `react-button` (`react`) | **4,557 B** | 23 chunks, 1,959,196 B |
| `solid-thread` (`solid`) | 305,199 B | 13 chunks, 929,863 B |
| `solid-badge` (control) | **32,350 B** | - |

**What that establishes.** One web component through node_modules does NOT drag the register-all
bundle: `dist/kai.es.js` and its 761 kB register-impl chunk appear in the LAZY set, never in the eager
closure. A React wrapper is glue — 4.5 kB eager — because each element's module arrives through the
wrapper's own dynamic import. And `./solid` is per-module and measurably so: a leaf costs 32,350 B
while a composite costs 305,199 B. That pair is the evidence, because one number cannot distinguish
"per-module output works" from "this component happens to be small" — the badge probe exists to make
the claim falsifiable.

**Vue, Svelte, Angular and plain HTML are ONE code path, not four.** They all resolve
`@kitn.ai/ui/web-components[/<name>]` and register the same custom elements; only React and Solid have
their own generated surface. So the two web-component probes cover all four, and a fourth probe per
framework would measure the same bytes.

Harness facts a future probe author needs: the resolve trace now records ANY kit specifier (it recorded
only the bare root, so a subpath probe would have asserted nothing); the expected dist file is per
PROBE (`expectEntry`), not per condition; and react/react-dom are installed into the scratch app
because the `./react` wrappers import `react/jsx-runtime`. Floors are ~half the measured value and
ceilings ~1.5x: the floor is what stops a probe passing because it measured an EMPTY bundle.

## 3. The autoloader / CDN path: three defects, all found by checking it

1. **`apps/docs/public/autoloader-demo.html` could not work**, and had not since the copy script was
   written. It loaded the autoloader from the site's own public dir; the autoloader resolves each
   module against ITS OWN directory (`BASE` from `import.meta.url`), so it fetched
   `/kitn/web-components/chat.js` — and that directory held exactly one file, `autoloader.js`. Every
   element fetch 404'd, reported only as a console warning. Serving it locally means serving
   `dist/web-components/*.js` plus the ~92 shared chunks they import (measured: define 145 kB, markdown
   46 kB, shiki payloads beyond), which is the full-bundle mirror `copy-kit-assets.mjs` exists to
   avoid. The page now loads the autoloader from the CDN pin it demonstrates, and the local copy is
   dropped (three raw-served assets, not four).
2. **Its live log matched the retired path.** The `PerformanceObserver` regex was
   `/\/kitn\/elements\/.../`, so after the rename the panel that exists to show which modules the
   autoloader pulled printed nothing. It matches the module dir now.
3. **The autoloader's module map was unchecked.** The autoloader fetches
   `${base}${manifest.tags[tag]}.js`, so every tag needs a real emitted module at
   `dist/web-components/<module>.js`; nothing asserted it, and the layer's layout has changed twice
   this week. `verify-web-components-bundle.mjs` (which already reads that manifest) checks it now,
   deriving the emitted set from the DIRECTORY rather than restating the map, with a vacuity floor.
   Mutation-proved: deleting `dist/web-components/loader.js` turns it red naming
   `kai-loader -> dist/web-components/loader.js`.

Also fixed on the way: two fixtures wrote the manifest as `tags: { 'kai-chat': {} }`, a shape NO BUILD
PRODUCES (the real artifact maps tag -> module BASENAME — the string the autoloader fetches), so the
guard could read the map without ever resolving it.

And a guard working as designed: the demo's new CDN pin was refused by `lint:cdn-pins` with "This file
holds a live pin but is NOT in release-please-config.json extra-files. A release bumps the version and
leaves this pin behind, turning this guard red on the release commit." Fixed by wiring it (5 live pins,
5 entries).

## 4. Security: an independent audit, and its three findings

A read-only lane enumerated every model-output-to-sink path (the CLAUDE.md threat model). **Verdict:
no live unguarded model-to-script sink.** Every `<img src>` is inert by construction (an image cannot
execute a scheme); the three raw HTML writes are Shiki output and a static glyph. Three findings, all
fixed:

- **F-1, the asymmetry.** `Card`/`CardSurface` put the raw href on the anchor while the sibling `Row`
  had applied `isSafeUrl` to the identical sink since the HomePanel work, with the rule in its doc
  comment. Both now apply it, and an href that FAILS the policy forces the inert branch — my first cut
  left `clickable` able to promote the card into a `role=button` emitter that still fired
  `onCardClick`, and the test I wrote alongside it caught that. The rule is stated on `CardProps`, and
  the `<kai-card href>` ATTRIBUTE path is tested through the element, with a safe-href control so the
  inert assertions cannot pass vacuously.
- **F-2, the third policy.** `renderIcon` classified a url with its own regex inside a package that
  claims one policy. It now calls `isSafeImageSrc` in the module that owns policies: an `<img src>` is
  a different question (`data:image/` is legitimate and used; `javascript:` is inert), so the allowlist
  is wider on one axis and narrower on another. It asks two questions and the first is not optional —
  resolving a bare word against a base classifies `definitely-not-an-icon` as a relative URL, and the
  first cut painted every typo'd icon as an `<img>` and stopped reporting it. The icon suite caught it.
- **F-3, partly.** The scheme predicates are now EXPORTED (`isSafeUrl`, `isScriptUrl`,
  `isSafeImageSrc`, `isRenderableLink`), because the MCP's invariant catalog told consumers to
  hand-type the scheme lists in app code with nothing keeping the copies in step. What is NOT done:
  the catalog's own `right` forms still cannot import, because the acceptance floor EXECUTES each one
  as a SCRIPT in a vm with named stand-ins and an import fails there with "Cannot use import statement
  outside a module" (measured, by trying it). The snippets stay self-contained; their notes now say
  the predicate is importable, name it, and give the real reason for the copy. **Follow-up worth
  doing:** teach the floor to resolve imports, which would make it execute the SHIPPED predicate
  instead of a hand-typed copy.

Also hardened: `isSafeUrl('')` returned TRUE (`new URL('', base)` inherits `http:`), which is a bypass
waiting for a caller that "neutralises" an unparseable url by blanking it. The empty string is refused
now, and the refused branch is the inert one at every sink. Covered by
`tests/primitives/url-scheme-policy.test.ts`, which also pins the whitespace/newline normalisation
(`java\nscript:` and a padded `  javascript:`) that is the reason the module parses rather than
matching a regex.

**Left for the owner as a decision, not a defect:** model-supplied IMAGE urls
(`choice.options[].media.image`, `link.image`, `link.favicon`, `embed.poster`, attachment urls) are not
scheme-filtered, so a model can force an outbound GET (tracking pixel / referrer leak) and an
arbitrarily large image. XSS-clean. The audit recommends leaving the request decision to the consumer
("kit decides HOW, app decides WHETHER") and NOT adding a sixth policy; the shared `isSafeImageSrc`
predicate exists if that changes.

## 5. `composedFrom`'s storyId is gone

Every entry carried `storyId: solid-advanced-<dir>-<name>--docs` for a Storybook tier retitled on
2026-09-18, so all 164 ids in the published `web-component-meta.json` resolved to nothing — and
nothing read the field (the docs render `name`, gen-catalog maps `name`, the MCP serves names; storyId
never even reached `derived.json`). The generator emits `{ name, group }`; the test that pinned the id's
SHAPE now pins its ABSENCE, which is what makes this a decision rather than a diff. **Lesson: a test
pinning the shape of a value nothing consumes is what keeps the value alive.**

## 6. Traps from this session

1. **A hand-rolled import scan that cannot span newlines is wrong, and silently.** It reported zero
   upward value edges while four files had them; the guard found the one I had also "fixed" by moving
   a file. Use the guard, or make the scan multi-line aware AND assert on a fixture.
2. **A guard that waives itself.** `lint-layer-names` first matched its own waiver-marker CONSTANT, so
   it reported a clean tree regardless. Waivers now require a reason (`-- <reason>`), and the two files
   that must contain the retired spellings are skipped by name.
3. **The acceptance floor executes invariant snippets as scripts, not modules.** An `import` inside a
   `right` form fails with "Cannot use import statement outside a module". Any future attempt to emit
   imports there has to teach the floor first.
4. **Fixtures that model a shape no build produces** hide the check they were written for (two
   manifest fixtures wrote tag -> `{}`). When adding a check over a generated artifact, read the real
   artifact and fix the fixtures in the same commit.
5. **`kit-paths.ts` must NOT index `src/web-components` with `src/components`**: a facade and its Solid
   component share a basename by design (`switch.tsx`), so one unique-basename index threw on a
   legitimate lookup. The reason is at the site.
6. **A prefix test encodes depth.** Two derivations (`composedFrom`, the Solid-module scan) used
   `startsWith('../components/')`, which silently returned nothing for all 97 web components the moment
   the files moved one level deeper. Both resolve specifiers now.
7. Bash: `$?` after a pipe reports the PIPE's status; `git commit --amend --no-edit` is the clean way
   to fold a fixture fix into the commit that added the check.

## 7. State at handoff

| check | state |
|---|---|
| `tsc` src / tests / apps / mcp / react / react.test | all exit 0 |
| `--project=unit` | 423 files, 6030 tests |
| `--project=emitted` | 5 files, 36 tests |
| `npm run build` | exit 0 |
| `verify:generated` | 19 artifacts in sync |
| `lint:layer-names` | clean (2604 files) |
| `lint:layer-direction` | clean (1168 files, 1225 specifiers, 2 declared exceptions) |
| other lints | story-conventions 150 · catalog-drift 28 rows · gate-parity · silent-drops · cdn-pins 16 pins/5 wired · attachment-object-urls · llms-size · pack-parse · verify:quarantine |
| `verify:web-components-bundle` | 12/12 self-test; real run green |
| `verify:scaffold` | green (11 integrations x 8 surfaces) |
| `verify:consumer` | 9 eager probes inside their floors and ceilings |
| `verify:pack` | 2.51 MiB packed against 2.56 MiB |
| `test:geometry-token` | 6/6 browser |
| `packages/blocks` · `create-kai` · `apps/docs` | 142 · 909 · 58 |
| `nx build docs` | 127 pages |

Commits from this session: `e624bc3e` (the DAG), `b0511f52` (the guard), `3437cde1` (security),
`f0d8099a` (probes), `158e456a` (autoloader + CDN), `e0ee652f` (storyId).

**Open, in priority order:** (1) teach the acceptance floor to resolve imports so the invariant catalog
can emit the real predicates (removes the last hand-typed copies of the scheme lists); (2) the
model-image request-leak decision above; (3) the F-5 coverage gap from the security audit — 8 vectors
with exact strings are listed in `/tmp/kai-lanes/lane-security-audit.md`, of which the `Card` href and
the predicate cases are now covered and the image-sink pins are not.
