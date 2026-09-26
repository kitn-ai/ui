# Handoff -- the release train, the automation that makes it routine, and the CLI's four doors

**Date:** 2026-09-22 · **Branch:** landed on `main` · **Status:** everything the owner approved is
merged, published or queued. Read this first; it points at the docs that hold the reasoning.

The previous session's doc is
[`2026-09-21-serverinfo-instructions-and-two-guards.md`](2026-09-21-serverinfo-instructions-and-two-guards.md)
(its §3.1 to §3.5 are all DONE). This one covers what came after: two releases, the lockfile
automation, five new guards, and the CLI growing from a rename into a four-door command line.

---

## 1. What shipped, by PR

| PR | what |
|---|---|
| #383 | The CLI consolidation and rename: `@kitn.ai/kai` (never published) split into `@kitn.ai/cli` + `@kitn.ai/mcp`, `npm create kai` kept working, `link-workspace-packages=true` adopted |
| #385 | The stale lockfile on the release commit (the `ERR_PNPM_OUTDATED_LOCKFILE` wall, first occurrence) |
| #386 | The package-metadata guard, and the kit's two missing fields (`repository.directory`, `engines.node`) |
| #387 | The lockfile regenerated for the 0.34.0 release's range bumps |
| #388 | The lockfile wall's two halves: `sync-release-lockfile.yml` and `lint-lockfile-specifiers.mjs` |
| #390 | A generated `CHANGELOG.md` is a record in BOTH prose guards, not one of them |
| #392 | `kai doctor` runs the MCP `debug` tool's rule set over the project's sources |
| #393 | The sync job's trigger fix (see §4, the measured discovery) |
| #394 | `kai init`, for the project that already exists |
| #396 | `kai upgrade` and the `kai.json` baseline that makes it safe |
| #398 | `doctor` reads the same baseline, and the docs explain `upgrade` |

Two releases went out over OIDC in this stretch: **0.34.0** (ui + create-kai published; `@kitn.ai/kai`
could not be, which is what triggered the rename) and **0.35.0** (all four, with NO manual lockfile
step, because the sync job had fixed the release branch first). The docs deploy was re-run after each
and is green.

## 2. The published state -- the registry is the truth, not this file

| package | published | notes |
|---|---|---|
| `@kitn.ai/ui` | 0.35.0 | carries the corrected migration stub and the metadata fields |
| `create-kai` | 0.7.1 | zero dependencies |
| `@kitn.ai/mcp` | 0.2.1 | bin `kai-mcp`, `npx -y @kitn.ai/mcp` |
| `@kitn.ai/cli` | 0.3.0 | bin `kai`; NO MCP SDK (the split's whole point) |

**QUEUED, not yet published:** release PR **#395** carries `@kitn.ai/cli@0.4.0` and
`create-kai@0.8.0`, i.e. `init`, `upgrade`, the baseline and the doctor reporting. Merging it
publishes them; the release branch's lockfile is kept mergeable by the sync job, so it is a one-click
merge followed by the usual watch (publish, then re-run the docs deploy once the CDN serves the new
kit version).

Also done, one-time: trusted publishers configured for all four names (owner `kitn-ai`, repository
**`ui`**, workflow `release-please.yml`, environment empty, action `npm publish`), so no package
needs a hand-run bootstrap any more; and git tags created for the three bootstrap versions
(`@kitn.ai/cli-v0.1.0`, `@kitn.ai/mcp-v0.1.0`, `create-kai-v0.6.0`) so the tags match the registry.
`@kitn.ai/kai` will never exist, which is the intended end state: nothing references it, and the
stub in `@kitn.ai/ui` names the two packages it moved to.

## 3. The CLI, as it now exists

```
kai create [dir]        the scaffolder wizard (the same code npm create kai runs)
kai add <block>         write a block from the registry into a detected project
kai init [--form <id>]  make an EXISTING project kai-aware
kai upgrade [--write]   bring a SCAFFOLDED project up to this CLI's template
kai doctor [--strict]   diagnose the project's wiring, versions and scaffold drift
kai mcp                 run the MCP server (forwards to @knit.ai/mcp)
kai dev|compile|eject|validate   the construct tooling
```

`create`/`add`/`init`/`upgrade` are implemented in `create-kai` and FORWARDED by the CLI, so there is
one implementation and `npm create kai` cannot drift from `kai create`. `mcp` forwards to
`@knit.ai/mcp` by resolving that package's bin and spawning it with this process's stdio; when the
package is absent the verb says so and names `npx -y @kitn.ai/mcp`, which is the form every harness
config in the docs uses.

Nothing needs installing: `npx -y @knit.ai/cli <verb>` works, `npm i -g` puts `kai` on PATH, and
`npm i -D` pins it per project. `npm i @kitn.ai/ui` alone is still the whole library with no CLI.

## 4. The lockfile wall, and the two halves that close it

**The failure:** release-please's `node-workspace` plugin rewrites the internal dependency ranges in
the release PR (pre-1.0 a caret cannot cross a minor, so `mcp -> @kitn.ai/ui` and `cli -> create-kai`
move on every minor release) and does NOT regenerate `pnpm-lock.yaml`. Every leg of the release
commit then dies at `pnpm install --frozen-lockfile`:

    ERR_PNPM_OUTDATED_LOCKFILE ... - @kitn.ai/ui (lockfile: ^0.33.0, manifest: ^0.34.0)

so the required checks are terminally red on the SHA being published and the publish gate (correctly)
refuses. **0.33.0 and 0.34.0 both needed a hand-made lockfile-only commit plus a fresh dispatch.**

- `scripts/lint-lockfile-specifiers.mjs` (required CI) names it in one line with the fix, and **runs
  BEFORE `pnpm install`** -- that placement is load-bearing, because every other lint runs after the
  install and would therefore never execute on this failure. It reads the lockfile rather than
  running pnpm. Two measured corrections to its own first rule: a root `pnpm.overrides` entry
  REPLACES the recorded specifier, and an auto-installed peer is recorded as its RESOLVED range.
- `.github/workflows/sync-release-lockfile.yml` regenerates the lockfile ON the release branch, so
  the PR arrives mergeable. It cannot loop: it commits only when the file differs, and a
  `GITHUB_TOKEN` push triggers no workflows.

**THE TRIGGER WAS WRONG FIRST, AND THE FAILURE IS INVISIBLE.** The job was wired to
`on: push: branches: [release-please--branches--main]`, which can NEVER fire: release-please pushes
that branch with `GITHUB_TOKEN`, and GitHub starts no workflow run for an event caused by
`GITHUB_TOKEN` -- the same mechanism that leaves the release PR's own checks in `action_required`.
Measured: the branch sat stale with a bumped range while the job had never run once, and its only two
runs were my manual end-to-end tests, which passed for the wrong reason (a human push). It now hangs
off the RELEASE WORKFLOW's completion, names the release branch explicitly (a `workflow_run` event
checks out the default branch) and treats a missing branch as a clean no-op. **The 0.35.0 release is
the proof it works: its release branch was fixed before I merged, and the gate simply passed.**

## 5. `kai upgrade` and the baseline (the design worth reading before touching it)

`kai.json` records an optional `files` map: project-relative path to the sha256 of the bytes the
scaffolder WROTE (not the template source), covering every emitted file except `kai.json` itself.
Every write in the generator goes through one recorder, and `kai.json` is written LAST so the map
covers the README. The field is optional and read as "this project predates the baseline":
`KAI_JSON_VERSION` was deliberately NOT bumped, because the field is purely additive.

`kai upgrade` re-renders the project's own recorded options into a temp directory with the SAME
`generate()` the wizard calls -- one render path, reused by the write phase -- and classifies:

| | verdict | `--write` |
|---|---|---|
| `^` | outdated: untouched since scaffolding, so the template moved | replaces |
| `+` | missing: the template emits it and the project has not got it | adds |
| `!` | edited: the user changed it | **never touches** |
| `?` | unknown: differs, and there is no baseline to say whose change | nothing |
| `=` | same | nothing |

Without a baseline it reports and refuses to write. It **deletes nothing** (a file the template no
longer emits is reported as dropped, because something the user wrote may import it). `--strict`
exits non-zero on drift for CI; `--json` for an agent.

`doctor` reads the SAME recorded hashes against the files on disk -- no template, no render, so it
stays instant -- and reports drift as INFORMATION, not a warning (editing your own app is normal
case; `upgrade --strict` is where somebody decides it should fail a build). **doctor is the fact,
upgrade is the diff**, and they cannot disagree because they read one set of hashes.

## 6. Guards added in this stretch (each with a self-test and a mutation proof)

- `lint-lockfile-specifiers.mjs` -- manifests vs the lockfile, before the install step (§4).
- `verify-workspace-ranges.mjs` (repo root, DERIVED from `pnpm-workspace.yaml`) -- every shipped
  internal range must be a publishable literal whose lower bound matches the workspace. Its first run
  found the rule it was missing: PRIVATE members (the docs site, the examples) are exempt, because
  `workspace:` is correct there.
- `lint-package-metadata.mjs` -- the published manifests must agree on the shared npm metadata, and
  `repository.directory` must equal the package's own directory. It exists because `@kitn.ai/ui` was
  missing `repository.directory` AND `engines.node` while the three packages beside it had both, and
  npm prints neither a warning nor an error for absent metadata.
- `lint-workflow-scalars.mjs` -- a `: ` inside an unquoted `name:`/`run:` scalar makes libyaml reject
  the WHOLE workflow file, after which every event fails at 0 s while `gh pr checks` says "no checks
  reported". It happened TWICE in this session (the second time to a `run:` line I wrote in the very
  change that adds the guard), so the rule is grammar-exact and both instances are its self-test
  fixtures.
- `lint:layer-names`' changelog rule generalised, and the same rule applied to `lint:cli-invocations`
  and `lint:cdn-pins`: a file named `CHANGELOG.md` is a release-please RECORD, whose lines quote
  commit subjects verbatim, so a retired name or an old version pin lands there by construction and
  the line-level waiver cannot apply (the line is generated).

## 7. Traps this stretch added (the older lists still apply)

1. **`GITHUB_TOKEN` pushes trigger NO workflows.** A trigger that looks right and can never fire, and
   the only symptom is a job that never runs. Applies to anything watching release-please's branch.
2. **A `: ` inside an unquoted workflow scalar breaks the whole file**, and `gh pr checks` then says
   "no checks reported", which reads like checks that have not started. Parse the file, do not read
   it (`python3 -c "import yaml; yaml.safe_load(open(...))"`).
3. **`npm view <pkg>@<version>` 404s for minutes after a successful publish.** Read the publish STEP's
   output for the truth; the registry lags.
4. **Two Release runs can race.** A plain push to main makes release-please re-emit `releases_created`,
   so it publishes on its own; dispatching alongside it means the loser dies with `E409 Cannot publish
   over previously staged version`, which reads like a failure and is not. Check for an in-flight
   Release run before dispatching.
5. **`packages/create-kai/dist/index.js` freezes the pin at build time**, so `pin-guards.test.ts`
   fails on a stale bundle after a release with `expected '^0.32.0' to be '^0.34.0'`. Rebuild
   (`nx build create-kai --skip-nx-cache`), do not "fix" the test.
6. **Do not land new work on an already-merged branch.** I did, which produced a PR that would have
   merged twice under one branch name; it was closed and re-cut from a branch named for the work.
7. **`cmd | tail` reports the PIPE's exit code.** It made a red guard read as green twice this
   session. Capture `$?` directly.
8. **Subagent lanes: state the interface, own one file each, and integrate yourself.** The split that
   worked: a lane took the `kai.json` baseline (its files) while the parent built `upgrade.ts` against
   the stated shape; a lane's own test then caught a design flaw in the parent's first cut (see §8).
   Do not let a lane run a build while you are building the same package.

## 8. Design corrections worth keeping (each was found by a test, not by review)

- **`init` must key off the FRAMEWORK, not the block registry's landing form.** `detectForm` maps a
  Solid project onto the framework-neutral `html` form (Solid's own tree is not emitted yet), which is
  right for a BLOCK and wrong for WIRING: the first cut would have told a Solid app to register web
  components. `init` emits no block, so it reads `FRAMEWORK_SIGNALS` instead.
- **`doctor` is not "the MCP `debug` tool with a CLI face"**, which the packaging doc says. Measured:
  `debug` matches a pasted SNIPPET against a rule set; `doctor` reads a PROJECT off disk. What they
  share is the rule set, which now lives in a dependency-free `debug-rules.ts` that imports nothing
  (no zod, no SDK) so the CLI can bundle it. `doctor.es.js` went 7 KB -> 34 KB, still under its band.
- **The `dropped` fixture must inject a baseline entry**, not delete a file from the template copy:
  patch targets are template files, so a missing one makes the emitter fail with ENOENT long before
  the comparison, which would test the renderer rather than the classification.

## 9. Verification state

Green locally and in CI on every PR in this stretch: unit 424 files / 6051 tests, emitted 5/36,
create-kai 935, CLI 39, tsc on both new packages plus ui's four projects, `verify:construct` (113
cells through the real CLI), `verify:scaffold`, `verify:pack` (ui 2.05 MiB, create-kai 202 files),
`verify:fresh`, `verify:generated`, `verify:solid-coverage`, the whole lint battery (75 gates), and
each new guard's self-test. The docs suite and `verify:docs` are green (0 stale entry points). The
browser legs and the network-bound guards (`verify:starters`, create-kai's `verify:add`) are CI-only,
and CI is green on `main`.

## 10. Open work, ranked

1. **Merge release PR #395** when the two verbs should be published (cli 0.4.0, create-kai 0.8.0),
   then watch the publish and re-run the docs deploy once the CDN serves the new kit version. Nothing
   manual is needed for the lockfile: the sync job keeps that branch mergeable.
2. **Nothing is outstanding from the previous docs' ranked list** -- §3.1 to §3.5 of the 2026-09-21
   doc are all done, as are the CLI consolidation and the rename.
3. **Ideas deliberately NOT done**, each with the reason so they are not re-litigated from scratch:
   - a three-way merge for user-EDITED files in `upgrade` (a much larger piece; the current shape
     reports them and never writes, which is the trustworthy half);
   - `upgrade` re-diffing hand-written kit API usage (that is a codemod package, the
     `@carbon/upgrade` shape, not a verb);
   - a docs page per verb (the installation guide's section plus the READMEs cover the surface, and
     the sidebar is a hand-listed `src/topics.mjs`, so a new page needs an entry there).
4. **Small things noticed and recorded, none urgent:** the acceptance pack's `DELIVERY.md` lists the
   21 exports keys but no verbs; `examples/demos` are not workspace members. (`@kitn.ai/ui`'s
   `repository.directory` and `engines.node` ARE on the registry: verified from the 0.34.0 tarball,
   and `lint:package-metadata` keeps them there.)
