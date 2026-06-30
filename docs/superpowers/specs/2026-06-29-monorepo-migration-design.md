# Monorepo migration — design

**Date:** 2026-06-29
**Repo:** `kitn-ai/ui` (root `/Users/home/Projects/kitn-ai/kitn-chat`)
**Status:** approved design — proceeds to `writing-plans`

---

## 1. Context & motivation

`@kitn.ai/ui` is a single-package npm repo today: the kit (Solid source → `kai-*` web
components + generated React wrappers + the `kai` MCP) lives at the root, and the public
docs site (`docs-site/`, Astro Starlight → ui.kitn.ai) is a second, **decoupled** app that
consumes the kit by **copying `dist/` into `public/kitn/` as raw assets** (`sync-kit.mjs`)
and loading `/kitn/kai.es.js` at runtime via a URL import.

That decoupling is the root cause of the packaging-bug class we fought in 0.18.0: because
the docs app has **no `@kitn.ai/ui` dependency** and fetches a raw bundle URL, a
non-registering bundle shipped silently — no bundler resolution, no `sideEffects` honoring,
no typecheck across the boundary.

Rob wants to convert the repo into a **monorepo (pnpm workspaces + NX)**. Beyond the stated
ergonomics, the structural prize is that a `workspace:*` dependency from the docs app to the
kit **deletes the entire hand-rolled sync mechanism and its whole drift/fragility class**.

### Motivations (Rob's)
- Run Storybook **and** the docs site at once (`pnpm dev` launches both — impossible today).
- Launch the examples easily.
- Formally move things into packages.
- Rename `docs-site` to a conventional name.

---

## 2. Goals / non-goals

### Goals
- pnpm workspaces + NX; one root install, one lockfile, NX-orchestrated parallel `dev`/`build` with caching.
- The kit becomes `packages/ui` (`@kitn.ai/ui`) — **identical published artifact**: same exports (`.`, `./react`, `./elements`, `./provider`, `./state`, `./mcp`), same `bin`, same version line.
- `docs-site` → `apps/docs`, consuming the kit via `workspace:*`; `sync-kit.mjs` deleted; the raw-bundle URL fetch replaced by real package-import resolution.
- All `examples/*` become `workspace:*` consumers, updated to the current `kai-*` API, building/running green.
- release-please keeps working, **single-package mode**, cutting `@kitn.ai/ui` from `packages/ui`.
- CI (test / deploy-docs / release-please) reworked for pnpm + NX; the required-checks contract preserved.
- Git history preserved across all moves (`git mv`).

### Non-goals (explicitly out of scope)
- **Not** splitting the `kai` MCP into its own package — it stays inside `packages/ui` (preserves `npx @kitn.ai/ui mcp`; keeps one publishable package; keeps release-please simple).
- **No** change to the public package API, exports, or `bin`.
- **No** Turborepo (NX chosen).
- The AI/UI landing redesign (separate branch) is untouched.
- Rob's `docs/notes.md` / `docs/notes-native.md` are untouched.
- The richer "consistent mini-chat showcase + per-framework gotcha narrative" example content is a **fast-follow**, not part of this migration (see §7).

---

## 3. Target structure

```
/                              (private root — orchestration only)
├─ package.json                # private, name e.g. "kitn-ai", scripts → nx; devDeps: nx, pnpm-managed
├─ pnpm-workspace.yaml         # packages: [packages/*, apps/*, examples/*]
├─ pnpm-lock.yaml              # the single lockfile (replaces root + docs-site npm locks)
├─ nx.json                     # task graph + targetDefaults + caching
├─ tsconfig.base.json          # optional shared compiler options
├─ release-please-config.json  # points at packages/ui (was ".")
├─ .release-please-manifest.json
├─ .github/workflows/          # test.yml, deploy-docs.yml, release-please.yml (reworked)
├─ README.md  LICENSE  CLAUDE.md
├─ docs/                       # repo-meta docs (superpowers specs, package-consumer-issues, Rob's notes) — stay at root
│
├─ packages/
│  └─ ui/                      # = the kit today (@kitn.ai/ui), moved wholesale
│     ├─ package.json          # @kitn.ai/ui — exports/bin/version unchanged
│     ├─ src/                  # primitives · ui · components · elements · agent-tooling (MCP)
│     ├─ frameworks/react/     # generated React wrappers
│     ├─ bin/                  # the MCP bin
│     ├─ scripts/              # gen-*, verify-*, build-theme-tokens, …
│     ├─ tests/  .storybook/
│     ├─ vite.config.*.ts  vitest.*.config.ts  playwright.*.config.ts
│     ├─ tsconfig*.json  postcss.config.js
│     ├─ theme.css  context7.json
│     └─ (generated: theme.tokens.css, llms.txt, llms-full.txt, element-meta.json, dist/)
│
├─ apps/
│  └─ docs/                    # = docs-site, renamed; depends on @kitn.ai/ui via workspace:*
│     ├─ package.json          # @kitn.ai/docs (private)
│     ├─ astro.config.*  src/  public/   (public/kitn/ raw-sync GONE)
│
└─ examples/                   # each a workspace:* consumer
   ├─ react/  vue/  angular/  solid/  vanilla/       (refreshed to current API)
   ├─ nextjs/  tanstack-start/                        (already file:../.. → workspace:*)
   └─ composable/ widget/ remote-host/ remote-provider/ …  (re-homed, made runnable)
```

---

## 4. Tooling — pnpm workspaces + NX

- **pnpm workspaces** is the layer that does the real work: `workspace:*` deps resolve the
  live in-repo package, killing `sync-kit`. Root `pnpm-workspace.yaml` globs
  `packages/*`, `apps/*`, `examples/*`.
- **NX orchestrates the existing scripts — it does not rewrite them.** We keep the kit's
  current `vite`/`tsc`/`storybook`/`playwright` scripts in `packages/ui/package.json` and let
  NX run them as inferred/`run-script` targets, with `nx.json` `targetDefaults` providing the
  task graph (`build` depends on upstream `^build`) and computation caching. This is the
  lowest-friction NX adoption — no porting 7 vite builds into NX executors.
- Root scripts become thin: `pnpm dev` → `nx run-many -t dev` (Storybook + docs, optionally
  examples, in parallel); `pnpm build` → `nx run-many -t build`; `pnpm test` →
  `nx run-many -t test`. NX builds `ui` before `docs` automatically (graph dependency).
- Toolchain is present locally: pnpm 10.24, Node 22. Root pins `packageManager: pnpm@…`.

---

## 5. `packages/ui` — the kit (incl. the MCP)

- The entire current kit moves under `packages/ui/` via `git mv` (src, frameworks, bin,
  scripts, tests, .storybook, all build/test configs, theme.css, context7.json).
- `package.json` is unchanged in substance: same `name` (`@kitn.ai/ui`), `version`,
  `exports` map (`.`, `./react`, `./elements`, `./provider`, `./state`, `./mcp`), `bin`,
  `sideEffects`, `files`. Internal script paths stay relative, so they keep working from the
  package root.
- The two build guards (`verify-elements-bundle.mjs`, `verify-react-wrappers.mjs`) move with
  `scripts/` and remain wired into the build — they are the regression net for the 0.18.0
  bug class and must stay green.
- The MCP (`src/agent-tooling/`, `vite.config.mcp.ts`, `tsconfig.mcp.json`, the `./mcp`
  export + `bin`) stays inside this package. `npx @kitn.ai/ui mcp` is unchanged.
- `dist/`, `node_modules` remain gitignored at the package level.

---

## 6. `apps/docs` — the win (delete sync-kit)

`docs-site` → `apps/docs`, `package.json` name → `@kitn.ai/docs` (private), gains a
`@kitn.ai/ui: workspace:*` dependency. The consumption model changes in three concrete spots:

1. **Interactive examples loader** (`src/components/example/kit.ts`): today
   `import(`${base}/kitn/kai.es.js`)` — a runtime URL fetch of the synced raw bundle.
   → becomes a real package import (`import('@kitn.ai/ui/elements')`, lazy as needed), which
   Astro/Vite resolves against the workspace package and honors `sideEffects`. **This is the
   change that deletes the bug class** — registration is now bundler-verified, not a raw URL.
2. **Props/events/composedFrom tables**: `sync-kit` copies `element-meta.json` → docs
   `src/data/`. → replaced by a **workspace import** of the meta JSON. If `element-meta.json`
   is not already a public subpath export, add one (it is a generated artifact of `build:api`)
   so docs reads it through the package, not a copied file. Same for `llms.txt` /
   `llms-full.txt` served at the site root.
3. **The deliberately-standalone autoloader demo** (`public/autoloader-demo.html`) loads
   `/kitn/elements/autoloader.js` + `theme.tokens.css` as raw assets — it is plain static
   HTML demonstrating the **zero-build CDN path** and genuinely cannot use package imports.
   → keep a **minimal, explicit** asset step that copies *only* those few files from the
   resolved `@kitn.ai/ui` package into `public/` at build (or references them from
   `node_modules`). This is a bounded, intentional 2-file copy — **not** the fragile
   full-bundle sync, and it does not reintroduce the bug class (that bug was the *register-all*
   bundle being raw-loaded as the app's primary path; the autoloader is a standalone demo).

`sync-kit.mjs` and the `predev`/`prebuild` hooks are **deleted**. `apps/docs` builds via
`nx build docs`, which builds `ui` first.

> Note: the GitHub-Pages base-path config (`/chat`) and the ui.kitn.ai custom domain are a
> deploy detail and carry over unchanged.

---

## 7. Examples — re-wire + make-current + green

Every example becomes a `workspace:*` consumer **and** is brought to the current `kai-*` API
so it builds/runs green. Each example also gets a runnable `dev`/`build` script so
`nx run-many -t dev` can launch them and CI can build them (doubling as consumer-regression
evidence).

- **Framework examples** (`react`, `solid` pinned `^0.2.0`; `vue`, `angular` pinned `^0.4.0`):
  drop the version pin for `workspace:*`, update pre-rename `kc-*`/old-API usage to current
  `kai-*`. `angular` has no MCP scaffold support → hand-written.
- **Already-current** (`nextjs`, `tanstack-start`, on `file:../..`): switch `file:` →
  `workspace:*`; otherwise minimal change.
- **Static / feature examples** (`vanilla`, `composable`, `widget`, `remote-host`,
  `remote-provider`, `shared`, `artifact-fixtures`): re-home as workspace members; give each a
  `package.json` + a minimal runnable setup (the `remote-*` pair already has vite dev scripts
  — `dev:host`/`dev:provider`). `vanilla` demonstrates `import '@kitn.ai/ui/elements'` /
  the autoloader via a tiny local vite.

**Out of scope here (fast-follow):** the richer "consistent representative mini-chat across all
frameworks + each surfacing its framework gotcha, tied to docs integration pages" showcase
content. The bar for *this* migration is **current API + green build**, not a content rewrite.

---

## 8. release-please — single-package, new path (the one risky step)

- `release-please-config.json`: the `packages` key moves from `"."` to `"packages/ui"`
  (`release-type: node`, `package-name: @kitn.ai/ui`, `bump-minor-pre-major: true`).
- `.release-please-manifest.json`: `{ "packages/ui": "0.18.0" }`.
- `CHANGELOG.md` moves to `packages/ui/CHANGELOG.md`.
- `release-please.yml` publish step runs from the package dir (`pnpm --filter @kitn.ai/ui
  publish --access public`, or `cd packages/ui`). OIDC trusted publishing / provenance is
  unchanged.
- **This is the single highest-risk mechanical step** (a wrong path could mis-cut or
  fail-to-cut a release). Mitigation: **dry-run release-please against the new path** (and
  confirm a no-op/expected release PR) on the migration branch before merge; verify the
  manifest + config resolve to `@kitn.ai/ui @ packages/ui`.

---

## 9. CI rework

All three workflows move from `npm ci` → `pnpm install --frozen-lockfile` (via
`pnpm/action-setup` + `setup-node` with `cache: pnpm`), and from direct `npm run …` → NX
targets. Node standardized to **22** across all three (today `test.yml` is on 20).

- **`test.yml`** (the REQUIRED check): build + typecheck + jsdom unit + react adapter + the
  cross-origin e2e security matrix — run via `nx`-scoped targets on `ui`. The non-required
  `storybook` browser job carries over. The required-checks contract (branch protection) is
  preserved — same logical gates, new runner.
- **`deploy-docs.yml`**: drop the separate docs `npm ci` + the implicit `sync-kit`; build via
  `nx build docs` (NX builds `ui` first). Upload `apps/docs/dist`.
- **`release-please.yml`**: pnpm + publish from `packages/ui` (see §8).

---

## 10. Developer experience (the payoff)

- `pnpm install` at root → all workspaces, one lockfile.
- `pnpm dev` → `nx run-many -t dev` → Storybook (6006) **and** the docs site together
  (optionally examples). This is the thing that's impossible today.
- `nx build ui` → identical `dist/`; the two verify guards pass.
- NX caching makes re-runs (typecheck/build) near-instant when inputs are unchanged.

---

## 11. Package-manager + history migration

- **npm → pnpm**: delete `package-lock.json` (root) and `docs-site/package-lock.json`;
  generate a single `pnpm-lock.yaml`. Watch for peer-dep strictness differences (pnpm is
  stricter than npm's hoisting); add `.npmrc` / `pnpm` overrides only if a real peer issue
  surfaces.
- **`git mv` everywhere** to preserve blame/history through the moves.

---

## 12. Staging plan — Hybrid (C)

### PR 1 — "Lift into the monorepo" (one atomic, coherent change; internally staged commits)
Coupled pieces that can't safely live half-done on `main` (the package move + release-please
+ CI), landed together, validated green end-to-end, release-please dry-run-verified **before**
merge. Suggested internal commit stages:

1. Introduce pnpm + `pnpm-workspace.yaml` + NX skeleton (root `package.json`, `nx.json`); no moves yet.
2. `git mv` the kit → `packages/ui`; fix internal paths; `nx build ui` reproduces `dist/`; guards + typecheck + unit + react + e2e green.
3. `git mv docs-site` → `apps/docs`; add `@kitn.ai/ui: workspace:*`; switch the three consumption spots (§6); **delete `sync-kit.mjs`** + its hooks; `nx build docs` green.
4. NX `targetDefaults` + root `dev`/`build`/`test` scripts; verify `pnpm dev` runs Storybook + docs together.
5. release-please config/manifest path move + CI rework (3 workflows); **release-please dry-run** confirms `@kitn.ai/ui @ packages/ui`.

### PR 2+ — Examples refresh (independent, parallelizable; off the critical path)
Each example (or a small batch) re-wired to `workspace:*` + brought to current API + green,
as separate follow-up PRs. Does not block or risk the structural win.

> Rationale: keep the tightly-coupled, not-safely-half-done parts atomic and releasable; keep
> the independent, parallelizable part (examples) out of the critical path where it could stall
> the migration.

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| **release-please mis-cuts from the new path** (highest risk) | Dry-run on the branch before merge; verify config+manifest resolve to `@kitn.ai/ui @ packages/ui`; first post-merge release watched. |
| Published artifact drifts (exports/bin/contents change) | `nx build ui` must reproduce `dist/` byte-for-intent; both verify guards stay wired; diff `npm pack` file list before vs after. |
| pnpm peer-dep strictness breaks installs | Convert lockfile early (stage 1); resolve real peer issues with targeted `.npmrc`/overrides only. |
| docs autoloader demo breaks (raw-asset path) | Keep the minimal explicit 2-file asset step (§6.3); verify the standalone demo renders. |
| CI required-checks contract changes | Preserve the same logical gates; keep the `storybook` job non-required; confirm branch-protection still maps. |
| NX + pnpm + Solid/Vite friction | NX only orchestrates existing scripts (no executor rewrite); validate each stage green before the next. |
| Long-lived branch drift | PR 1 is one coherent change landed promptly; examples deferred to follow-ups. |

---

## 14. Verification strategy (supervisor / orchestrate-and-verify)

Each staged commit is verified to its change type before proceeding:
- **Kit move / packaging** → `nx build ui` + both verify guards + `npm pack` file-list diff + typecheck (4 passes) + unit (~1225) + react + e2e.
- **Docs** → `nx build docs` green + the interactive examples actually register (browser IVP on `nx dev docs`, not a static build — storybook-static/static builds can't register web components) + autoloader demo renders.
- **release-please** → dry-run output inspected.
- **`pnpm dev`** → both Storybook + docs come up.
- **Examples** → each builds + runs green (per-framework smoke).

The full visual IVP is deferred to the **end** of the migration (Rob reviews live), run via
`nx dev` on a real dev server, not a static build.

---

## 15. Open questions (settle during planning)

- Exact NX target wiring: rely on NX package.json-script inference vs explicit `project.json`
  targets per package (lean inference first).
- Whether `element-meta.json` / `llms.txt` get a formal public subpath export or are read via
  a workspace-internal path by docs (lean: small, intentional export).
- Root private package name.
- Whether examples live under `examples/*` (kept) or move under `apps/examples/*` (lean: keep
  `examples/*` — it's the conventional, discoverable location and matches the docs links).
