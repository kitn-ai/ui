# Handoff -- where the tree is after PR #382, and what is left

**Date:** 2026-09-21 · **Branch:** `chore/kai-followups` (new, based on `main` @ `743b6a0c`) ·
**Status:** PR #382 MERGED and deleted. **Nothing has been PUBLISHED yet**: the release PR is the next step,
and it is the only thing that exercises the packaging change.

Read this first, then the three documents it points at. It does not restate them.

---

## 1. What just merged, and where the detail lives

PR #382 ("major refactor") merged `update/primitives` into `main` as `743b6a0c`. 80 commits, ~1187 files.
It is four threads, each with its own handoff:

| thread | doc |
|---|---|
| the components reorg, the naming decision, the `verify:dts` blocker | [`2026-09-19-components-reorg-and-naming.md`](2026-09-19-components-reorg-and-naming.md) |
| `src/elements` -> `src/web-components`, the family folders, the archive exemption | [`2026-09-19-web-components-rename.md`](2026-09-19-web-components-rename.md) |
| the layer DAG + its guard, the security audit's findings, tree-shaking proofs | [`2026-09-19-layering-security-and-shaking.md`](2026-09-19-layering-security-and-shaking.md) |
| the whole arc's decisions, the verified ladder, the traps (superseded in part) | [`2026-09-19-session-close.md`](2026-09-19-session-close.md) |
| the invariant floor, F-5 coverage, the flake, the wording sweep | [`2026-09-20-invariant-floor-imports.md`](2026-09-20-invariant-floor-imports.md) |
| the packaging thread: one package with subpaths, the `@kitn.ai/kai` peel, the ten discoveries | [`2026-09-20-packaging-and-cli-decisions.md`](2026-09-20-packaging-and-cli-decisions.md) |

The last one is the live one for packaging. Its §6 holds the discoveries that are NOT expressed in code
(the measured correction that un-externalizing the MCP SDK costs +45 KB rather than 5.9 MB, why the
release-time registry check is not worth adding, the revised `serverInfo` recommendation, the CLI verb
conclusions). Read it before proposing anything in that area.

## 2. What is in the tree now, that was not before

- **`@kitn.ai/kai` is a published package** (`packages/kai/`): bins `kai` + `kai-mcp`, commands
  `mcp`/`dev`/`compile`/`eject`/`validate`. It owns the MCP server bundle, the construct CLI, the two
  prebuilt dev pages and the `@modelcontextprotocol/sdk` dependency. Its SOURCES stay in `packages/ui/mcp`
  and `packages/ui/apps` (they cannot move: `mcp/construct/**` is the source of the public `./construct`
  export and `src/primitives/construct-form-paths.ts` imports it). So `packages/kai` is a thin publishing
  shell: package.json, `bin/`, `config/vite/{node,page}.ts`, a tsconfig, and two guards.
- **`@kitn.ai/ui` kept its 21 specifiers.** Nothing a consumer imports changed, which was the owner's
  decision: `@kitn.ai/solid`, `/react`, `/web-components`, `/styles`, `/core` are NOT packages and never
  were. Only the CLI invocation moved: `npx @kitn.ai/ui mcp` -> `npx @kitn.ai/kai mcp`, and
  `packages/ui/bin/mcp.js` is now a dependency-free STUB that names the new command and exits 2.
- **Measured effect:** `@kitn.ai/ui` 2.51 -> 2.05 MiB packed / 11.45 -> 9.67 MiB unpacked; `@kitn.ai/kai`
  0.37 MiB packed; a browser consumer no longer installs the SDK (5.9 MB, 17 direct deps).
- **Guards added, each with a self-test and a mutation proof.** Read the header of each before touching it;
  every one records the failure it exists for, and two record a correction to their own first claim:
  - `packages/ui/scripts/lint-release-wiring.mjs` -- the three hand-typed release literals
    (`release-please-config.json`'s `packages{}`, `.release-please-manifest.json`, the publish loop), the
    publish ORDER derived from dependencies, and the two ways a publish ships nothing (no pre-pack hook; a
    `bin` the `files` array does not cover). Knows a `bin` under `dist/` is absent before a build.
  - `packages/kai/scripts/verify-kit-range.mjs` -- kai's `@kitn.ai/ui` range, asserted by EQUALITY of the
    lower bound (a membership check can never fire; `^0.31.0` contains `0.32.0`).
  - `packages/kai/scripts/lint-cli-invocations.mjs` -- prose may not invoke the CLI under the retired
    package. Nothing else reads a CLI invocation: the docs suite, `verify:docs`, `lint:cdn-pins` and
    `lint:gate-parity` all accepted the old command in silence (measured).
  - `packages/kai/scripts/verify-bundle-shape.mjs` -- both CLI bundles present, a floor, the SDK still a
    specifier, no `dist/node_modules`.
- **Three new required-CI steps** (lint leg: kit-range, CLI-invocations, release-wiring; construct leg:
  build kai + bundle-shape). `lint:gate-parity` reports 64+ gates; it will tell you if a new step's shape
  is unrecognised.
- **`./solid` gained two exports** (`CardSurface`, `DefaultPromptInput`) because `verify:solid-coverage`
  was failing on this branch and would have blocked the merge.

## 3. Next work, ranked, with entry points

### 3.1 WATCH THE RELEASE. Nothing about the peel has been exercised by a release.

There is an open release PR: **#379 `chore: release main`** (`release-please--branches--main`). The Release
workflow ran on `main` when #382 merged, so it has been updated with this branch's commits. Merging it
triggers `release-please.yml`, which publishes `packages/ui`, `packages/create-kai`, then `packages/kai`.
What to check when it runs, in order:

1. **The order held.** The loop is `for pkg in packages/ui packages/create-kai packages/kai`, and
   `lint:release-wiring` fails if kai precedes the kit it depends on.
2. **`node-workspace` bumped kai's range.** If the release PR bumps `packages/ui` to 0.33.0 and does NOT
   bump `@kitn.ai/kai`'s `^0.32.0`, `verify:kit-range` fails that PR's CI -- loudly, and that is the
   intended catch. Do not "fix" it by widening the range; bump the bound.
3. **kai's `prepublishOnly` produced a real tarball.** `cd packages/kai && npm publish --dry-run` proves the
   hook offline: it runs the four vite targets and packs 12 files. A published kai without `dist/` means the
   hook did not run.
4. **The docs deploy goes green after the release.** It is RED on `main` right now and that is CORRECT:
   `apps/docs`' `verify:preview --require-published` refuses to deploy because
   `@kitn.ai/ui@0.32.0/dist/web-components/autoloader.js` 404s on the CDN -- the entry arrives with the next
   release. Do not weaken the gate; merge the release.

### 3.2 The CLI consolidation (the owner asked for it; the shape is decided)

One verb surface, `create`/`add`/`doctor`(+`mcp`/`dev`/`compile`/`eject`/`validate`), with `create-kai`
reduced to a SHIM so `npm create kai` keeps working (that package name IS the npm-create mechanism, so it
cannot fold in). Also decided, so do not re-open: `doctor` not `check` (Svelte's `check` means typecheck);
NO `remove`; NO self-update verb (`npx` makes it pointless; `doctor` reporting CLI-vs-kit version skew is
the useful half); `upgrade` needs its MEANING decided before it is built (re-diffing scaffolded templates is
light and belongs with the templates; migrating kit API usage in hand-written code is heavy and becomes its
own package, the `@carbon/upgrade` shape).

Price, so it is not discovered mid-move: moving the scaffolding source into `@kitn.ai/kai` makes
`create-kai` depend on it, i.e. a second intra-workspace edge (`create-kai -> kai -> ui`), a second range
with its own guard, and a three-package publish order. Precedents: Svelte (`sv create/add/check/migrate`,
`create-svelte` deprecated), Angular (`ng new/add/update`), TanStack, shadcn; Vite/Next/Astro kept the
`create-*` convention.

### 3.3 `serverInfo` and `instructions` (small)

The MCP reports `@kitn.ai/ui` + the kit's version, which is honest about the API it describes and is
derived, not typed. The useful addition is kai's OWN version in MCP's `instructions`, injected at build
time (create-kai's `__KIT_VERSION__` pattern). Do not rename `serverInfo` to `@kitn.ai/kai` without solving
resolution: kai has no `exports` map, so self-reference does not work, and adding one for `./package.json`
is a public-surface change.

### 3.4 The relative-specifier resolver guard (recommended, not shipped)

CI's storybook job caught a real defect -- a stale SIDE-EFFECT import in a story, `import
'../web-components/register'`, whose path lost a `..` in the family-folder reorg. tsc cannot see it (this
repo's documented trap) and the unit project excludes `*.stories.*`. A sweep of 1150 files / 2990
statement-position relative specifiers found exactly one, so the guard is cheap and worth having. Measured
false-positive classes it must handle first: a line inside a TEMPLATE LITERAL that emits code for a
generated project (`codegen.ts`'s `import { App } from './App'`, a node-safety probe `'./${tsx}'`). Track
template-literal state, or restrict the first cut to side-effect imports (no `from`), which is the class
tsc is blind to.

### 3.5 kai has no pack-weight guard

`verify-pack-weight.mjs` is `packages/ui`-specific. kai's tarball is 0.37 MiB packed today, by inspection
only. The failure to catch is a step change (a dependency copied into `dist/`, a page bundling the kit's
dist), not normal drift.

## 4. Traps from this session (the older lists still apply: see §8 of the session-close doc)

1. **A pre-build lint leg cannot check build outputs.** `build` failed in 28s because my new guard demanded
   that `packages/create-kai/dist/index.js` exist -- it is gitignored and built later. Reproduce that state
   locally by moving `packages/create-kai/dist` aside; that is what the guard's self-test now covers.
2. **`cmd | tail` reports the PIPE's exit code.** It read as success while the command had failed, twice in
   this session. Capture `$?` directly.
3. **`json.dump` on a repo JSON file escapes non-ASCII** (`—` -> `\u2014`) and reformats arrays, so a
   one-value edit becomes a whole-file diff. Use the edit tool on `package.json`, `release-please-config.json`
   and the manifest. It cost two reverts.
4. **`__dirname` depth off by one, twice.** A file at `packages/kai/config/vite/x.ts` is THREE levels below
   the repo root, and a script at `packages/ui/scripts/x.mjs` too. Both bugs surfaced as "cannot resolve
   entry module" / "scandir packages/packages".
5. **A guard that runs its real check on import** kills an ad-hoc probe (and would kill a test). Gate it on
   the entry point, in the repo's required form: `process.argv[1] && import.meta.url ===
   pathToFileURL(process.argv[1]).href`. The NEGATED spelling is false on a path with a space, and
   `tests/scripts/main-module-guards.test.ts` exists to catch exactly that.
6. **A story's import list is not covered by tsc or the unit project.** Only the browser job sees it. See
   3.4.
7. **CI legs have different artifacts.** The build leg runs `nx build ui` only; the construct leg downloads a
   `packages/ui/**` artifact. Anything kai ships must be built in the leg that needs it, which is why
   `nx build kai` is a step there and why kai's nx target declares `dependsOn: []` (its build reads ui's
   SOURCES, so `^build` would rebuild all of ui for nothing).
8. **`verify:artifact-glob` and `verify:fresh` exit 1 standalone, by design.** The first needs
   `ARTIFACT_GLOB_BEFORE` (CI sets it); the second needs a build to have run after the last source edit.
   Both read as defects the first time.

## 5. Verification ladder (run in this order; serial, never parallel with a build)

```
pnpm install                       # lockfile must stay in sync (CI: --frozen-lockfile)
pnpm exec nx build ui --skip-nx-cache   # a cached build looks exactly like a successful one
pnpm exec nx build kai             # and nx build docs when the docs change
pnpm --filter @kitn.ai/ui exec vitest run --project=unit   # 423 files / 6038 tests
pnpm --filter @kitn.ai/ui exec vitest run --project=emitted
pnpm --filter @kitn.ai/kai exec vitest run
pnpm --filter create-kai exec vitest run ; pnpm --filter @kitn.ai/docs run test
tsc -p tsconfig.tests.json / .mcp.json / .apps.json (and kai's own `npm run typecheck`)
npm run verify:generated ; npm run verify:pack ; npm run verify:solid-coverage
npm run verify:scaffold ; npm run verify:construct ; npm run verify:consumer
npm run lint:release-wiring ; kai's verify:kit-range / lint:cli-invocations / verify:bundle-shape
```
CI is the only check on the browser legs (storybook shards, browser IVPs, e2e) and on the network-bound
guards (`verify:starters`, create-kai's `verify:add`). Before pushing, run the suite that covers whatever
you touched: the one time this session skipped that, CI caught it (the main-module idiom).
