# Handoff -- packaging, naming and CLI decisions, and what follows from them

**Date:** 2026-09-20 · **Branch:** `update/primitives` · **Status:** decisions taken, work not started.
**Companion:** [`2026-09-20-invariant-floor-imports.md`](2026-09-20-invariant-floor-imports.md) (the
invariant floor, the F-5 coverage, the flake, the wording sweep). This file is the packaging thread,
which that one does not cover.

---

## 1. The decision: ONE published kit package, subpaths for everything

Asked directly and answered by the owner: `@kitn.ai/ui/<name>` stays the shape. No `@kitn.ai/solid`,
no `@kitn.ai/react`, no `@kitn.ai/web-components`, no `@kitn.ai/styles`, no `@kitn.ai/core`.

Reasoning, so it is not re-opened without new facts: the subpath form keeps the `@kitn.ai/ui` namespace
honest (everything under it IS the kit), and it leaves `@kitn.ai/<something>` free for a genuinely
different thing later. It is also the import shape Carbon already has -- a barrel, deep per-component
paths, the manifest, the CSS entries -- so nothing about the import surface needed to change to match
the blueprint.

This SUPERSEDES the close doc's §5.1 answer only in its reasoning, not its verdict: it was already
"ONE package, platform-named internals, NOT a multi-package split". §5.1's stated prize was wrong,
though, and this session measured it: it claimed ~13%, from `dist/web-components` 1.3 M + `dist/react`
200 K of ~11.5 M unpacked. Those are `du` block sizes. The file-content sums are 324,658 B and
193,768 B, so the real prize for a consumer who uses neither surface is **518,426 B of a 12,010,318 B
tarball = 4.3%**.

## 2. The kit's importable surface, as it stands (21 specifiers)

Read from `packages/ui/package.json`'s `exports` map. Nothing here changes.

| specifier | what it is |
|---|---|
| `@kitn.ai/ui` | Solid components, root barrel |
| `@kitn.ai/ui/solid` | the complete Solid surface (superset of the root) |
| `@kitn.ai/ui/web-components` | register-all: defines every `kai-*` element |
| `@kitn.ai/ui/web-components/<name>` | one element, e.g. `/web-components/chat` |
| `@kitn.ai/ui/autoloader` | lazy loader for no-build / CDN pages |
| `@kitn.ai/ui/react` | generated React wrappers (self-register) |
| `@kitn.ai/ui/state` | pure message folds, `createAssistantStream` |
| `@kitn.ai/ui/wire` | provider SSE adapter, `readOpenAIStream`, `toOpenAIMessages` |
| `@kitn.ai/ui/stores` | Solid store, `createKaiChat` |
| `@kitn.ai/ui/schemas` · `/schemas/*` | card schemas, provider tool definitions |
| `@kitn.ai/ui/define` | `defineWebComponent` factory |
| `@kitn.ai/ui/diagnostics` | diagnostics events for subscribers |
| `@kitn.ai/ui/construct` · `/construct/templates` | construct engine API, template registry |
| `@kitn.ai/ui/provider` | remote provider runtime (iframe transport) |
| `@kitn.ai/ui/theme.css` | design tokens + kit CSS, as Tailwind source |
| `@kitn.ai/ui/theme.tokens.css` | precompiled tokens, for `<link>` / CDN |
| `@kitn.ai/ui/solid.css` | Tailwind source for light-DOM Solid apps |
| `@kitn.ai/ui/web-component-meta.json` | generated API metadata (tooling reads it) |
| `@kitn.ai/ui/icon-names.json` | curated icon name roster |
| `@kitn.ai/ui/package.json` | manifest |

`kit-base.css` ships at the package root with no exports key of its own, and that is correct: it has to
be there because `solid.css` does `@import "./kit-base.css"`. It is not dead weight and must not be
trimmed.

## 3. What the packaging thread measured, so nobody re-derives it

Per-framework component entry, from the scaffolder (`COMPONENT_ENTRY`, derived from the `Framework`
enum, asserted complete in `scaffold.test.ts`):

- `solid` -> `@kitn.ai/ui/solid`
- `react`, `next`, `tanstack-start` -> `@kitn.ai/ui/react`
- `html`, `vue`, `svelte`, `angular`, `express`, `fastapi`, `worker` -> `@kitn.ai/ui/web-components`
- all of them add `/state` and `/wire`; routes add `/schemas`; CSS is `theme.tokens.css` (10 emitted
  references), `theme.css` (3), `solid.css` (2)

Tarball, 12,010,318 B unpacked / 2.51 MiB packed / 1468 files, by content bytes:

| area | bytes | share |
|---|---:|---:|
| 145 top-level shared chunks (`dist/*.js`) | 3,686,938 | 30.7% |
| `dist/node_modules/**` (shiki, lucide, marked, floating-ui) | 2,300,220 | 19.2% |
| `dist/components/**` | 1,841,132 | 15.3% |
| `dist/register-impl-*.js` | 761,481 | 6.3% |
| `dist/custom-elements.json` | 663,095 | 5.5% |
| `dist/mcp.es.js` (the MCP server) | 615,762 | 5.1% |
| `dist/builder-page` + `dist/theme-studio` (dev pages) | 602,266 | 5.0% |
| `src/web-components/*.json` | 481,285 | 4.0% |
| `dist/web-components` + `dist/react` | 518,426 | 4.3% |

Dedupe, measured by resolving every relative specifier in the built entries: 71 top-level chunks are
shared between the root entries and the web-components facades, **507,382 B**. That is what a split
would have to duplicate or coordinate.

Dev tooling that every consumer installs today, whether or not they ever run a command:

| item | cost | needed when |
|---|---|---|
| `@modelcontextprotocol/sdk` in `dependencies` | **5.9 MB installed, 17 direct deps** (express, hono, ajv, jose) | only `mcp/mcp/**` and the build config |
| `dist/mcp.es.js` + `bin/` | 615,762 B + 5,157 B | `npx @kitn.ai/ui mcp` |
| `dist/builder-page` + `dist/theme-studio` | 602,266 B | `kai dev` serves them from the installed package |
| `dist/blocks/**` | 285,755 B | nothing at install time: create-kai bundles blocks from `@kitn.ai/blocks`, the docs site reads the workspace |
| `frameworks/**` | 201,686 B | nothing at install time: verified, no shipped code reads it from disk; only comments mention it |

Carbon, for reference (npm registry, so the next person does not re-research it): one package per
concern, split by IMPLEMENTATION and by SIZE, never by core-vs-facade. `@carbon/react` 5.26 MB / 1997
files (a full React implementation, not a wrapper), `@carbon/web-components` 24.15 MB / 5263 files (Lit;
no react dep, and no `@carbon/web-components-react` exists), `@carbon/styles` 3.68 MB (Sass peer),
`@carbon/icons` 54 MB / 24923 files with the generated `@carbon/icons-react` 17 MB / 11157 files as its
own package, `@carbon/upgrade` 1.65 MB (codemods, not a dependency of `@carbon/react`). Import style:
one package, deep paths (`@carbon/web-components/es/components/dropdown/index.js`), exports keys for
`./es`, `./es/`, `./lib/`, `./scss/`, `./es/components/*`, `./custom-elements.json`.

## 4. Work at hand, ranked

### 4.1 Write the entry-point table where a developer can find it (LANDED)

`guides/installation.mdx`'s "Entry points" table now names all 21 keys (minus the manifest, declared
excluded with a reason), and `apps/docs/test/entry-points.test.ts` fails if a future exports key has no
row, if a row names something the package does not export, or if the exclusion list stops naming a real
key. Three mutations watched red: dropping the `/stores` row, inventing a specifier on the page, and
leaving a stale exception. `verify:docs` independently confirms every symbol the new rows name resolves
against the shipped API, and its own prose scan covers the reverse direction (so this guard is the
cheap, fast-failing second opinion, not the only line of defence).

The list in §2 exists in the `exports` map, in `llms.txt` / `llms-full.txt` (generated) and in the
acceptance pack's `DELIVERY.md` (agent-only, and a test asserts it names every exports key). It does NOT
exist on the docs site in any complete form: the site names 14 of the 21 specifiers anywhere,
`guides/installation.mdx` names 11, `packages/ui/README.md` names 10, and Storybook has nothing. Nine
are documented nowhere: `/schemas`, `/schemas/*`, `/stores`, `/define`, `/diagnostics`, `/construct`,
`/construct/templates`, `/web-component-meta.json`, `/icon-names.json`, plus the per-module
`/web-components/<name>` form.

Do: a page (or a section of `guides/installation.mdx`) carrying §2's table, PLUS a guard that every
`exports` key appears there -- otherwise it is another hand-typed list that rots the next time a subpath
lands. That guard belongs beside the pack's own `verifySpecifiers` check, which already resolves
`@kitn.ai/ui...` specifiers out of the workspaces it scans.

### 4.2 Trim `files` (488 KB, no specifier changes)

`dist/blocks` (285,755 B) and `frameworks` (201,686 B) are in the tarball and read only from the
workspace, verified: no exported key reaches either, no shipped code reads `frameworks/` from disk, and
create-kai bundles blocks from `@kitn.ai/blocks` rather than from this package. Do it as `files`
negations (`!dist/blocks`, drop `frameworks`), then re-run `verify:pack` -- its Rule 3 allowlist is a
hand-kept copy, and a narrower packed set goes the SAFE direction (allowlist wider than what ships), so
expect an advisory note rather than a failure. This also hands back ~490 KB of a ceiling that currently
has only ~50 KB of headroom (`2.51 MiB` against `2.56 MiB`).

### 4.3 Peel dev tooling into `@kitn.ai/kai` (LANDED)

**The two facts that decide the shape**, both verified after a read-only inventory lane proposed a
bigger move than necessary:

- **The catalog is inlined at BUILD time.** `dist/mcp.es.js` carries the invariant ids themselves (grep
  for `reactivity-two-halves`: 7 hits), and the bundle's only runtime filesystem reads are the CEM, the
  meta JSON and emitted scaffold files. So the MCP's SOURCE can stay where it is; nothing needs a new
  `exports` key, and the settled 21-specifier surface does not move.
- **`mcp/construct/**` cannot move at all.** `src/primitives/construct-form-paths.ts` and
  `src/components/builder/builder-start.tsx` import it (the two declared `lint:layer-direction`
  exceptions), and it is the source of the PUBLIC `@kitn.ai/ui/construct` export.

So the shape is a THIN PUBLISHING SHELL, not a source move:

```
packages/kai/
  package.json      name @kitn.ai/kai, bins kai + kai-mcp -> ./bin/mcp.js
                    dependencies: @modelcontextprotocol/sdk, @kitn.ai/ui (workspace:*)
                    files: dist, bin       prepublishOnly: npm run build
  bin/mcp.js, bin/route.js, bin/route.test.js     (moved from packages/ui/bin)
  config/vite/{node,page}.ts                       (the four targets, building FROM ../ui sources)
packages/ui/
  keeps: mcp/** (all sources, tests, catalog, construct), apps/{builder,theme-studio} sources
  loses: bin/, the four build invocations, the bin/files entries, the SDK dependency
```

Why it is safe for the agent tooling, and the three things that MUST change with it:

1. **The MCP found its manifest as a SIBLING** (`mcp/mcp/manifest.ts`). `@kitn.ai/ui/custom-elements.json`
   is NOT an exports key (corrected here: this section claimed it was, and the lane measured
   `ERR_PACKAGE_PATH_NOT_EXPORTED`). The fix addresses the PACKAGE -- `@kitn.ai/ui/package.json`, which is
   exported -- and takes one checked hop to `dist/custom-elements.json`, keeping the file's own
   "address it, never search" rule. The meta JSON is a real exported key and resolves as such.
2. **`kai dev`'s `/theme-studio/kit/*` route serves the KIT's dist** (`mcp/construct/dev.ts` maps it to
   `dirname(studioDir)`). Once the pages build into kai's dist, that is kai's dist, which has no
   `kai.es.js`. The route must resolve `@kitn.ai/ui`'s dist root explicitly, or it 404s silently.
3. **Release plumbing is hand-typed and NOTHING-guarded** (see `docs/coupling-map.md` §1):
   `release-please-config.json`'s `packages{}`, `.release-please-manifest.json`, and the publish loop at
   `.github/workflows/release-please.yml:230` (`for pkg in packages/ui packages/create-kai`). Miss either
   of the first two and kai is silently never published. `packages/kai/dist` is auto-gitignored (root
   `.gitignore` is a bare `dist/`), and kai needs no CI upload glob.

Migration: `npx @kitn.ai/ui mcp` becomes `npx @kitn.ai/kai mcp`, and it is in the docs, `llms.txt` and
EVERY existing user's MCP client config. Leave a `bin/mcp.js` stub in `@kitn.ai/ui` that exits non-zero
naming the new command, so an old config fails loudly with the fix in the message. Do not keep both
working: the SDK is the whole reason for the peel.

Order: package shell and ui's removals -> manifest resolution -> dev-server mount -> docs and llms sweep
-> release plumbing -> one build, then the full ladder (`verify:construct` and `verify:scaffold` are the
two that would catch a broken CLI or a missing shipped file).

**What landed, and what it measured.** Three parallel lanes took the manifest resolution, the dev-server
mount, and the docs/CLI sweep; the shell, the release plumbing and the ui-side removals were done here.

| | before | after |
|---|---|---|
| `@kitn.ai/ui` tarball | 2.51 MiB packed / 11.45 MiB unpacked / 1468 files | **2.05 MiB / 9.67 MiB / 1441 files** |
| `@kitn.ai/kai` tarball | -- | 0.37 MiB packed / 1.34 MiB unpacked / 12 files |
| a browser consumer's install | `@modelcontextprotocol/sdk` + its 17-package tree, 5.9 MB | none of it |

The peel is `packages/kai/{package.json,bin,config/vite}` plus a tsconfig, with the CLI's SOURCES staying
in `packages/ui/mcp/**` and the dev pages' sources in `packages/ui/apps/**` (the docs site imports the
theme-studio component by relative path, and `src/primitives/construct-form-paths.ts` imports
`mcp/construct/**`; see the shape note above). So kai declares `@kitn.ai/ui` as a real dependency, which
makes this the first published package here that depends on another one -- and npm cannot express that as
`workspace:` (measured: `npm pack` ships the literal string). The range is therefore a literal with its own
guard, `packages/kai/scripts/verify-kit-range.mjs`, which asserts EQUALITY of the lower bound (a
membership check is true by construction, the `lint:cdn-pins` lesson) and is wired into the required CI
lint leg.

Also changed with it, each because it would otherwise fail or rot: `verify-construct.mjs` now drives
`packages/kai/bin/mcp.js` (it ran the real CLI by path and would have failed loudly, which is how the
stale path was caught); kai's own bin test moved with the CLI and needed its own CI step or it would have
stopped running entirely; the manifest resolution, the `/theme-studio/kit/*` mount (which resolved the
kit's dist as `dirname(studioDir)` and would have 404'd silently), the boot-time CI upload globs (unchanged:
`packages/ui/**` is still all the downstream legs need), `release-please-config.json`, the manifest and the
publish loop (all three hand-typed and NOTHING-guarded), and ~20 prose references.

Still open from this, in order:

1. **Nothing catches a stale CLI invocation in prose.** The docs sweep's own mutation proved it: putting
   `npx @kitn.ai/ui mcp` back into an `.mdx` page leaves the docs suite, `verify:docs`, `lint:cdn-pins` and
   `lint:gate-parity` all green. Only a grep finds it. A guard belongs here (scan the same roots
   `lint:cdn-pins` does, exempt `packages/ui/bin/mcp.js` -- it names the old command as the INPUT side of
   the migration message -- and the dated archive).
2. **`serverInfo` still reports `@kitn.ai/ui`.** It is derived (it resolves the kit's package.json, so the
   version is right), and it is honest about the API the server describes, but the running package is now
   `@kitn.ai/kai`. Deciding that means deciding whether the agent should learn the CLI's version or the
   kit's; a self-reference needs an `exports` map kai does not have.
3. **kai has no pack-weight guard.** `verify-pack-weight.mjs` is `packages/ui`-specific, so the new tarball
   has a ceiling only by inspection (0.37 MiB packed today). its `prepublishOnly` builds, which is the
   part that matters for shipping.
4. `examples/apps/composed-thread/README.md:57` still names `@kitn.ai/ui/bin/mcp.js`, and is left alone on
   purpose: it is a record of a builder run against a pinned 0.26.0 tarball, so rewriting the path would
   describe a run that never happened. The `lint:cdn-pins` `historical` waiver is the same precedent.

The largest single win measured this session: ~10% of the tarball, 616 KB off the pack ceiling, and
**5.9 MB of installed dependencies plus 17 packages out of every consumer's `node_modules`**. With a
separate package, `npm install @kitn.ai/ui` never sees the SDK; a developer running `npx @kitn.ai/kai
mcp` pulls the CLI into the npx cache. That is exactly what Carbon does with `@carbon/upgrade`.

Shape: bins `kai` and `kai-mcp`; commands `mcp`, `dev`, `compile`, `eject`, `validate`; carries the MCP
bundle, the construct CLI, the two prebuilt dev pages, and the SDK dependency. No consumer subpaths.

Two things it forces, both small and both named here so they are not discovered mid-move:

1. **The MCP finds its manifest as a SIBLING.** `mcp/mcp/manifest.ts` resolves
   `dist/custom-elements.json` relative to `import.meta.url`, which only works because `dist/mcp.es.js`
   and the manifest sit in one `dist`. After the move it must resolve the EXPORTED keys
   (`@kitn.ai/ui/custom-elements.json`, `@kitn.ai/ui/web-component-meta.json`) instead, and the sibling
   walk must go -- it is the same walk-up class the file's own comment already argues against.
2. **`npx @kitn.ai/ui mcp` is in the docs, `llms.txt`, and every existing user's MCP client config.**
   Measured, that command works today (`npx @kitn.ai/ui frobnicate` exits 2 with the tool's own
   "unknown command" message, so a default bin does resolve even though both bin names point at one
   file). After the peel it becomes `npx @kitn.ai/kai mcp`. Recommended migration: leave a tiny
   `bin/mcp.js` stub in `@kitn.ai/ui` that exits non-zero naming the new command, so an old config fails
   loudly with the fix in the message instead of reading as a mystery server error.

### 4.4 Two calls that are the owner's, not the repo's

- **Minify the two generated JSONs.** `dist/custom-elements.json` 663,095 -> 424,179 and
  `web-component-meta.json` 480,217 -> 387,565, **332 KB (2.8%)**. Cost: the CEM is what editors read
  for autocomplete and `verify:generated` diffs become one line. Cheap, real, taste.
- **Say ESM-only out loud.** No subpath has a `require` condition and there is no CJS build. Fine on
  Node >= 22 and for modern bundlers; the gap is a consumer whose tests run under Jest in CommonJS.
  Currently undocumented either way, which is the only part that is wrong.

## 5. Follow up LATER: `npx kai`, and whether the two CLIs should become one

Raised by the owner, deliberately deferred (this section is the task record, not a decision).

What is true today:

- The unscoped npm name **`kai` is taken** (0.0.2, a placeholder). Bare `npx kai ...` with nothing
  installed is therefore not available, and the npm dispute process is not a foundation for a CLI's DX.
- **`@kitn.ai/kai` is free** (404) and is in our scope. A package named `kai` with a bin named `kai`
  also resolves deterministically under `npx`, because the bin name matches the package name -- today's
  `npx @kitn.ai/ui mcp` only works because both bin names point at the same file.
- **`npm create kai` already works** (`create-kai` 0.5.0, bin `create-kai`). So a `create` subcommand on
  a second CLI would duplicate an existing, documented path.
- With `@kitn.ai/kai` as a project devDependency, `npx kai update` DOES resolve to the local bin, because
  npx prefers a local bin over the registry. So the DX the owner described is reachable two ways:
  `npx @kitn.ai/kai update` (nothing installed) and `npx kai update` (installed locally).
- `add` is documented 9 times as `npx create-kai add`; `mcp` 23 times and `dev` 13 times as
  `npx @kitn.ai/ui ...`.

Options when we take it up:

1. Leave the split as proposed in 4.3: `@kitn.ai/kai` owns `mcp`/`dev`/`compile`/`eject`/`validate`,
   `create-kai` keeps `create`/`add`/`update`. Cheapest, no overlap.
2. One CLI: fold `create-kai` in as a dependency of `@kitn.ai/kai` (or the reverse) so all verbs live
   behind one binary. Cleaner story, but it migrates `npx create-kai add` and re-opens what
   `create-kai` means as a package.
3. Unchanged: no new package, keep everything in `@kitn.ai/ui`. Costs the 5.9 MB SDK tree per consumer,
   which is the whole reason 4.3 exists.

Trigger to take it up: NOW. 4.3 landed, so `@kitn.ai/kai` owns `mcp`/`dev`/`compile`/`eject`/`validate`
and `create-kai` owns `create`/`add`/`update`; the question left is whether that split should stay two
packages or become one binary. Nothing is urgent about it: both work today, and the docs name each verb's
package explicitly.
