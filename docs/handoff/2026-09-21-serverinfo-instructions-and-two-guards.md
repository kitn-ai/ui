# Handoff -- the three follow-up items after PR #382, and what CI caught on the way

**Date:** 2026-09-21 · **Branch:** `chore/kai-followups` (based on `main` @ `743b6a0c`) ·
**PR:** #383 · **Status:** §3.3, §3.4 and §3.5 of
[`2026-09-21-after-382-and-next-work.md`](2026-09-21-after-382-and-next-work.md) are LANDED.
§3.1 (the release) and §3.2 (the CLI consolidation) are NOT, and §3.2 needs a decision the start
doc's price note does not price. Read that doc first; this one adds only what is new.

---

## 1. What landed, and where

| item | commit | what |
|---|---|---|
| §3.3 `serverInfo` / `instructions` | `ebb7b2e6` | The MCP keeps naming `@kitn.ai/ui` in `serverInfo` (derived from the kit's manifest, and honest about the API the tool answers describe) and now reports the CLI's OWN version in `instructions`, via a `__KAI_VERSION__` build-time define. |
| §3.4 the relative-specifier guard | `523e6b5a` (+ `499e4235`) | `lint:dangling-imports`: every statement-position relative import in the tree must resolve to a real file. Required CI, lint leg, no build. |
| §3.5 kai's pack guard | `0cdbe22c` (+ `9667de46`) | `packages/kai/scripts/verify-pack-weight.mjs`: the CLI tarball's shape, ceilings and floors, required outputs, no `node_modules`. Required CI (construct leg) and `prepublishOnly`. |
| the two CI discoveries | `c89c687c`, `499e4235` | See §3 below. Both were found by CI on this PR, in the first run of the new gate. |

`packages/ui/mcp/mcp/kai-version.d.ts` is the new declared global; `docs/coupling-map.md` §3 has
the two couplings it creates (the kai-define row, and the corrected `serverInfo` row, whose old
text described a hand-typed version string that had stopped being hand-typed before it was read).

## 2. The release is still the unblocker, and it is the owner's call

Not touched here. The state as measured, because it is easy to misread:

- PR #379 (`release-please--branches--main`) is MERGEABLE and BLOCKED with **"no checks reported"**.
  That is not a queued run: release-please opens its PR with `GITHUB_TOKEN`, so its runs sit in
  `action_required` and the ruleset's `test`/`storybook-gate` never report. The workflow documents
  it at `release-please.yml:100`, and `gh run list --branch release-please--branches--main` shows
  `completed / action_required / 0s` for every event.
- Its diff already carries kai `0.2.0` and `@kitn.ai/ui: ^0.33.0`, so `node-workspace` did its job
  and `verify:kit-range` will not fire on it.
- Merging it publishes three packages. Nothing is published yet.

**Item 3 of that checklist is now verified offline**, and by the new guard's own hook:
`cd packages/kai && npm publish --dry-run` runs `prepublishOnly` -> `npm run build` ->
`verify-pack-weight.mjs` -> packs 12 files, 367.6 kB packed / 1.3 MB unpacked, exit 0.

## 3. The two things CI caught that the local ladder could not

### 3.1 A colon in a workflow `name:` made the whole file unparseable

`- name: Pack-weight guard (kai's tarball: required outputs in, ...)` is a YAML plain scalar
containing `: `, which libyaml rejects:

    mapping values are not allowed here
      in ".github/workflows/test.yml", line 586, column 47

GitHub then refuses the file and every event fails at 0s with "This run likely failed because of a
workflow file issue". **The tell is the misleading part: `gh pr checks` prints "no checks reported
on the branch", which reads like checks that have not started.** Two pushes were lost to it. The
`lint:gate-parity` gate does read these files, but with a narrow line parser by design (its own
header argues against a YAML parser here), so it counted 68 gates from an unparseable file.

No guard added: this is the one instance in the repo's history, the failure is loud (a 0s failed
run on every event) rather than silent, and the repo's rule is not to generalise from the case you
just fixed. Before pushing a workflow edit, PARSE the file, do not read it:

    python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/test.yml'))"

### 3.2 A fresh checkout has no build products, so the new guard was green locally and red in CI

The first CI run of `lint:dangling-imports` reported six findings that all resolve on a machine
someone has built on:

| specifier | target | ignored by |
|---|---|---|
| `apps/docs/src/lib/blocks-source.ts:13` `'../generated/blocks-preview'` | docs' generated blocks preview | `apps/docs/.gitignore:15` `src/generated/` |
| `examples/demos/vesper/server.js:13` `'./dist/server/server.js'` | the demo's build | that demo's `.gitignore:2` `dist` |
| `examples/starters/tanstack-start/src/router.tsx:2` `'./routeTree.gen'` | TanStack Router codegen | the starter's `.gitignore:8` `src/routeTree.gen.ts` |
| `packages/ui/.storybook/preview.ts:17` `'../dist/kai.es.js'` | the kit build | root `.gitignore:2` `dist/` |
| `packages/ui/src/web-components/define/css.ts:3`, `tests/components/editable-text-align.test.tsx:41` | `build:css` output | root `.gitignore:7`, by name |

The fix is derived, not six waivers: one `git check-ignore --stdin` per run, and a target git
ignores is a build product whose absence on a fresh checkout is by construction. A target git does
not ignore is still a finding, so the react-host `./block` stays on its line waiver. Two details
cost a round each and are worth keeping:

- **Ask git about every candidate spelling**, not just the literal path. The tanstack starter's
  ignore entry names `src/routeTree.gen.ts` while the import writes `./routeTree.gen`, so the
  literal path answered "not ignored". Resolution and the git question now share `candidatesFor()`.
- **Outside a git checkout there is no answer**, and the run says so and reports every unresolved
  specifier: "could not ask" and "nothing is ignored" are different facts. The wiring fixtures are
  temp trees and exercise that path.

**The general lesson, which is bigger than this guard: a guard that walks the SOURCE TREE is
measuring a tree that a fresh checkout does not have.** Anything generated into the tree and
gitignored (`src/web-components/compiled.css`, `mcp/catalog/derived.json`,
`scripts/block-driver/pages/generated/`, every `dist/`) is present locally and absent in CI. Ask
git, or the guard is green where it matters and red where it does not.

## 4. §3.2 needs a decision before it is built: which way the edge points

The start doc's price note says moving the scaffolding into kai makes `create-kai` depend on it
(`create-kai -> kai -> ui`). Measured, that direction has a cost the note does not price: **every
`npm create kai` would install the MCP SDK tree (5.9 MB, 17 direct deps) to run a scaffolder.**
`packages/create-kai/package.json` has `dependencies: NONE` today, and `files: ["dist"]`, so the
scaffolder a stranger runs is one package with no install tree. The peel exists to keep that SDK
out of a browser consumer's install; pointing the edge the other way is what keeps it out of the
scaffolder's too.

The reverse edge achieves the same verb surface with none of that price:

- `kai` depends on `create-kai`, so `create`/`add`/`doctor` are reachable from the `kai` binary as
  well as from `npm create kai`.
- `create-kai` stays a thin, dependency-free package (plus a `create` verb that delegates to the
  same implementation, not a copy).
- The publish order the loop already enforces is `ui -> create-kai -> kai`, which is exactly the
  order the reverse edge needs, so nothing about the release plumbing changes.
- The intra-workspace range is still a second literal with its own guard (kai's existing
  `verify-kit-range.mjs` is the shape to copy).

Not decided, and not mine to decide: whether `create`/`add` genuinely belong on the `kai` binary at
all, and what `doctor` reports first. §6 of the packaging doc has the rest of that thread.

## 5. Verification state on this branch

The whole ladder green, in this order, on the final tree: `pnpm install`, `nx build ui
--skip-nx-cache`, `nx build kai`, unit **424 files / 6051 tests**, emitted 5/36, kai 10, tsc
`tsconfig.json` + `.mcp.json` + `.tests.json` + kai's own typecheck, `verify:generated` 19
artifacts, `verify:fresh`, `verify:construct` (113 cells), `verify:scaffold`, `verify:pack` 2.05
MiB, `verify:bundle-shape` (12 probes), `verify:pack-weight` (10 probes), kai's `verify:versions`,
`lint:cli-invocations`, `lint:pack-parse` (8 scripts, all through the shared helper),
`lint:gate-parity` (68 gates), and the rest of the lint battery. `npm publish --dry-run` in
`packages/kai` exits 0 through the build and the pack guard.

CI on #383: `build`, `construct`, `dist-guards`, `storybook` 1-4, `storybook-gate` and
`spike-conformance` all PASS, which is the first run of the new lint step and the new construct-leg
step on a fresh checkout.

Not run locally, so CI is the only check: the `browser` leg, `test:e2e`, create-kai's `verify:add`
and `verify-starters` (network).

## 6. Traps this session added to the list

1. **A colon inside a workflow `name:`/`run:` plain scalar breaks the file**, and the symptom is
   "no checks reported" rather than a red step. Parse, do not read (see §3.1).
2. **`npm pack` does NOT run `prepublishOnly`** (it is publish-only, npm 10.9.8 measured), so
   `prepublishOnly` is the only place a pack-time guard runs, and `npm pack` is the only way to see
   the tarball offline. `npm publish --dry-run` DOES run the hook.
3. **A nested `npm pack` inherits `npm_config_dry_run`** from the `npm publish --dry-run` that
   invoked it through `prepublishOnly`: it then reports `files`/`size` and writes NO tarball. Pass
   `--no-dry-run` explicitly (`9667de46`), and do not try to detect the env var: `=true` matches
   and `=1` does not.
4. **`npm pack --json --pack-destination <dir>` fails with ENOENT if `<dir>` does not exist**, and
   reports it as a JSON error object rather than a listing.
5. **A guard green locally and red in CI** is the property to check for when a guard reads the
   working tree: the local tree has build products a fresh checkout does not (§3.2).
6. **A self-test that plants a shape is not enough for a rule derived from an external tool**: the
   git rule needed a fixture that runs `git init` and holds a nested `.gitignore`, because a stub
   would have proved the wiring and not the rule.
7. The start doc's traps still apply, in particular `cmd | tail` reporting the pipe's status, and
   `__dirname` depth in `packages/kai/config/vite/` or `packages/ui/scripts/` (three levels below
   the repo root).
8. **A lint leg runs its steps in sequence, so each red hides the next.** The release below was
   unblocked twice in a row, and each fix was discovered by CI rather than before the push. Before
   pushing a change that touches anything a pre-build leg reads, run THAT LEG's no-build scripts
   locally as a sweep (the list is in §7.3); they cost seconds and they do not need a build.

---

## 7. The release, and what it actually took (in flight at the time of writing)

### 7.1 What happened

PR #379 merged with `--admin` on 2026-09-21 (the merge state was BLOCKED because release-please's
runs sit in `action_required`, so the ruleset's checks can never report on that PR). Merge commit
`01ecae1e`; the release-please action created the tags and GitHub releases `@kitn.ai/ui-v0.33.0`
and `@kitn.ai/kai-v0.2.0` (`create-kai-v0.6.0` was not tagged). The publish then failed, and it
failed for reasons that had nothing to do with the code being released:

**Blocker 1, the lockfile (PR #385).** `node-workspace` rewrote `packages/kai`'s dependency to
`@kitn.ai/ui: ^0.33.0`, and nothing regenerates `pnpm-lock.yaml`, whose `packages/kai` importer
still read `specifier: ^0.32.0 / version: 0.32.0(...)`. Every leg installs with
`--frozen-lockfile`, so `build` died at `Install dependencies` and four legs skipped behind it.

The fix has a shape worth understanding, because a plain regeneration CANNOT work. `pnpm install
--lockfile-only` fails with `ERR_PNPM_NO_MATCHING_VERSION` for `@kitn.ai/ui@^0.33.0`: that version
does not exist on the registry until this very release publishes it. The one-file answer is the
kai importer's entry becoming `specifier: ^0.33.0` / `version: link:../ui`, which is FORCED rather
than chosen: the release commit necessarily carries an asymmetric pair (a published range in the
manifest, a workspace link in the lockfile) because `workspace:*` packs verbatim and would ship an
uninstallable kai. The durable alternatives are the owner's call:

- `link-workspace-packages=true` in the root `.npmrc`. Measured blast radius today: **`packages/kai`
  is the only workspace package left with a plain range to a workspace package** (every other
  importer uses `workspace:*`; `examples/starters/nextjs` and `tanstack-start` use
  `file:../../../packages/ui`). So it is a smaller change than it sounds, and it is still a
  workspace-wide semantic change that deserves its own verification.
- or the manual link edit per release, with a guard: fail whenever the kai importer's range is
ahead of the registry and its entry is not a link.

**Blocker 2, `lint:layer-names` on a generated changelog.** With the install fixed, the next step
of the same leg went red on `packages/create-kai/CHANGELOG.md:9`, quoting a commit subject
verbatim: `* src/elements -> src/web-components, and \`@kitn.ai/ui/elements\` ->
\`@kitn.ai/ui/web-components\``. release-please writes changelogs out of commit subjects, so the
BREAKING-CHANGES bullet of any release that renders the rename commit carries the retired
spellings BY CONSTRUCTION. The guard exempted exactly one changelog, `packages/ui/CHANGELOG.md`,
which is inconsistent rather than wrong-headed: the same generator produces all three. The fix is
the derived rule (any file named `CHANGELOG.md` is a record), not a second literal, and it is
exactly what the guard's own documented principle asks for. Two sibling guards carry the same
latent gap and were measured clean today: `lint:cli-invocations` hard-codes
`packages/ui/CHANGELOG.md` in its `DATED` list, and `lint:cdn-pins` exempts no changelog at all
(0 hits for a retired invocation and 0 for a `@kitn.ai/ui@<version>` pin across all three files).

**Why the gate refuses, and what the recovery path is.** `require-green-checks.mjs` is
scoped to `github.sha` and deny-by-default, so a red check on the release commit cannot be talked
around by re-running the workflow. `skip_required_checks` does not help either, and the line
numbers are the proof: the gate is `release-please.yml:145` and `pnpm install --frozen-lockfile`
is `:159`, so the hatch skips the gate and dies one step later on the same install error, having
published nothing. The recovery is a fix landed on main (so its SHA is green) followed by
`gh workflow run release-please.yml --ref main`; a later push does NOT re-publish on its own,
because release-please reports `release_created: false` once the release commit is on main.

### 7.2 Two findings from this that outlive the release

1. **`packages/kai/node_modules/@kitn.ai/ui` was a REGISTRY COPY, not the workspace.** pnpm's
   `link-workspace-packages` is off by default and kai's dependency is a plain caret, so local and
   CI kai builds were resolving the kit from a published artefact rather than from the tree under
   test. The link fixes it. Nothing asserted it, and it only surfaced because the range moved.
2. **The publish loop has an ordering dependency it does not assert.** kai's build resolves
   `@kitn.ai/ui/schemas` through packages/ui's own self-reference into `packages/ui/dist`, so the
   loop only works while ui is published in the same run (ui's `prepublishOnly` is what builds
   `dist`). That is exactly what failed in run 35611305071, where ui was skipped as
   already-published and kai's rollup then failed to resolve the import. It needs a guard or an
   explicit build step; it holds for THIS release only because ui@0.33.0 is genuinely new.

### 7.3 The no-build sweep, for the next push that touches a lint leg

`pnpm --filter @kitn.ai/ui run` for: `lint:silent-drops`, `lint:catalog-drift`,
`lint:attachment-object-urls`, `lint:layer-names`, `lint:layer-direction`, `lint:cdn-pins`,
`lint:release-wiring`, `lint:llms-size`, `lint:pack-parse`, `lint:story-conventions`,
`lint:gate-parity`, `lint:thresholds`; and `pnpm --filter @kitn.ai/kai run` for `verify:versions`
and `lint:cli-invocations`. All of them are seconds, none needs a build, and running them as one
sweep is what turns N CI round-trips into one.

---

## 8. The CLI's install model, and the one verb that is missing (for the §3.2 decision)

Nothing is installed. Every documented invocation is `npx`:

| invocation | what resolves | what is downloaded |
|---|---|---|
| `npx @kitn.ai/kai <verb>` (every MCP config: `npx -y @kitn.ai/kai mcp`) | the registry, cached | kai + its deps |
| `npm i -D @kitn.ai/kai` then `npx kai <verb>` | the LOCAL bin, npx prefers it | same, pinned per project |
| `npm i -g @kitn.ai/kai` then `kai <verb>` | PATH, one version for every project | same (the footgun) |
| `npm create kai` | npm sugar for `npx create-kai` | create-kai only, which has ZERO dependencies |

`npx kai <verb>` does not work before an install: the unscoped npm name `kai` is taken by a 0.0.2
placeholder (checked 2026-09-21). The bins inside `@kitn.ai/kai` are `kai` and `kai-mcp`.

**`npm create kai` cannot fold into `kai`.** `npm create <name>` is sugar for `npx create-<name>`;
the package NAME is the mechanism, so a package literally named `create-kai` must exist. It is
266 KB packed / 202 files (the templates) / zero dependencies, and it is npm's front door for one
verb, not a competing CLI. Dropping it would lose the conventional from-scratch idiom and the 17
documented uses, in exchange for `npx @kitn.ai/kai create`.

**No `install`, `uninstall` or self-update verb.** `npx` and the package managers own installing,
and a self-installing CLI is the global-install hazard the packaging thread already rejected for
`update`. What is genuinely missing is the PROJECT-level counterpart: `create` writes a new project
and `add` writes a block into a detected existing one (it needs no `kai.json`; detection reads the
project), but a hand-written Vite app cannot be given the wiring `create` emits. That verb is
`kai init`, and `kai doctor` is its read-only twin. Both are project-scoped; neither touches the
machine.
