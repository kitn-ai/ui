# Handoff -- the queued release shipped, and the skip path that had to be fixed first

**Date:** 2026-09-22 · **Branch:** landed on `main` · **Status:** the release the previous session
queued is PUBLISHED. One release-plumbing defect was found by the release itself, fixed, guarded and
re-released in the same session.

Read this after
[`2026-09-22-release-automation-and-cli-verbs.md`](2026-09-22-release-automation-and-cli-verbs.md),
which is the session record for the eleven PRs that led here and whose §10 item 1 was this release.

---

## 1. What happened, in order

| step | what |
|---|---|
| merged **#395** with `--admin` | the queued release PR: `create-kai` 0.7.1 -> 0.8.0, `@kitn.ai/cli` 0.3.0 -> 0.4.0, cli's `create-kai` range -> `^0.8.0`. The sync job had already landed the lockfile commit (`be9d883`) on the release branch, so the merge was a one-click merge exactly as designed. Merge commit `bd802b80` |
| Release run **35725375171** FAILED | the publish gate passed, `pnpm install --frozen-lockfile` passed, and the **publish step** died on `create-kai@0.8.0` (see §3) |
| **#400** landed the fix | `ci(release): build the kit before the publish loop, and assert it`. Merge commit `5f170ba5`, all checks green first (`test`, `storybook-gate`, `browser`, `construct`, `dist-guards`, `unit`, `build`, `spike-conformance`) |
| Release run **35728269572** SUCCEEDED | the plain push of that merge re-ran the publish step, which published `create-kai@0.8.0` and `@kitn.ai/cli@0.4.0` and skipped the two already on the registry. **No manual `workflow_dispatch` was needed** |

The push-triggered run is the one that published, and that is worth writing down because the
previous handoff's §7.1 says the opposite ("a later push does NOT re-publish on its own"). Measured
today: a push to `main` that carries no release of its own still runs the publish loop, which is the
behaviour `release-please.yml`'s own comment on the idempotent skip guard describes. So the recovery
for a failed publish may need no dispatch at all -- but see trap 5 before deciding either way.

## 2. The published state -- the registry is the truth, not this file

| package | published | note |
|---|---|---|
| `@kitn.ai/ui` | 0.35.0 | unchanged by this release; skipped |
| `create-kai` | **0.8.0** | `init`, `upgrade`, the `kai.json` baseline |
| `@kitn.ai/mcp` | 0.2.1 | unchanged; skipped |
| `@kitn.ai/cli` | **0.4.0** | the four doors; forwards `create`/`add`/`init`/`upgrade` to `create-kai` |

Verified from the artefacts rather than from this table: `@kitn.ai/cli@0.4.0` was installed from its
published tarball into a throwaway app, `node_modules/.bin/kai` exists and runs `kai --help`, and its
`create-kai` dependency resolved to 0.8.0. The published `create-kai@0.8.0` bundle carries the pin
`^0.35.0`, i.e. the live kit. The docs deploy that rode the same push is green, so the site did not
need a re-run: the KIT version did not move, and the pin the docs preview gate checks is the kit's.

## 3. The defect the release found: the loop's SKIP path runs no `prepublishOnly`

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/home/runner/work/ui/ui/packages/create-kai/node_modules/@kitn.ai/ui/dist/construct.js'
imported from /home/runner/work/ui/ui/packages/create-kai/scripts/build.mjs
```

`@kitn.ai/ui@0.35.0` was already on the registry, so the publish loop's `npm view` guard skipped it.
A skipped publish runs NO `prepublishOnly`, and `prepublishOnly` is the only thing that builds a
gitignored `dist/`. `packages/ui/dist` therefore never existed in that job -- and
`create-kai`, `mcp` and `cli` all resolve `@kitn.ai/ui/<subpath>` through the `workspace:` link into
it while they build. **Every release that does not bump the kit hits this**, which is the common case
for the tooling packages.

Two instances of one class, which is why the rule is scoped the way it is rather than to the case
that was fixed:

- run **35611305071** (the mcp predecessor, resolving `@kitn.ai/ui/schemas`) -- recorded in
  [`2026-09-21-serverinfo-instructions-and-two-guards.md`](2026-09-21-serverinfo-instructions-and-two-guards.md)
  §7.2 finding 2 as "needs a guard or an explicit build step", and not done then;
- run **35725375171** today (`create-kai`, `@kitn.ai/ui/construct`).

Both halves of the shape that finding asked for are now in place:

1. `release-please.yml` builds the kit before the loop, with the same invocation as test.yml's build
   leg (`pnpm exec nx build ui`), so `dist/` exists however the skip check resolves.
2. `lint:release-wiring` fails if that step is ever missing. It DERIVES the packages that need it: a
   published package another published package names in `devDependencies`. `dependencies` is
   deliberately not a signal, with the live counter-example named in the code: `@kitn.ai/cli` depends
   on `create-kai` by resolving its bin and spawning it, and nothing under `packages/cli/config` or
   `packages/cli/src` imports it, so cli's build never reads create-kai's `dist/`. Counting runtime
   edges would demand a build nothing needs -- which is exactly what the guard's first cut did, and
   the second instance is what corrected it.

## 4. Verification

- `lint:release-wiring --self-test`: 19 probes, including the runtime-edge exclusion and the
  accepted-spelling probe.
- Real run green, and it prints what it derived: `Build inputs built before the loop: packages/ui`.
  Anti-vacuity is visible rather than assumed.
- **Mutation-proved:** deleting the workflow step turns it red naming `packages/ui` and quoting the
  accepted spellings; restoring it goes green.
- The whole `packages/ui` lint battery (13 `lint:*` scripts), the root `lint-workflow-scalars`,
  `verify-workspace-ranges`, `lint-lockfile-specifiers` and `lint-package-metadata`: green.
- `tests/scripts/{main-module-guards,publish-gate-wiring,gate-parity-guard-wiring}.test.ts`: 34
  passed. `release-please.yml` parses under PyYAML and passes `lint-workflow-scalars`.
- The published artefacts were driven, not just read: the cli tarball installed and ran, and
  create-kai's baked pin was read out of its shipped bundle.

## 5. Traps this session added or sharpened

1. **The publish loop's skip path builds nothing.** Covered by §3. The general shape: any step whose
   correctness depends on a package being PUBLISHED also depends on it being BUILT, and the loop
   makes those two different questions.
2. **`npm view <pkg>@<version>` 404s for minutes after a successful publish.** Confirmed again: the
   tarball for `@kitn.ai/cli@0.4.0` was not servable until roughly six minutes after the publish step
   printed `+ @kitn.ai/cli@0.4.0`. Read the PUBLISH STEP's log for the truth.
3. **`npm publish` can print a scary `bin` normalization warning that is benign.** The cli publish
   logged `npm warn publish "bin[kai]" script name bin/kai.js was invalid and removed`. The published
   tarball's `package.json` still carries `"bin": {"kai": "./bin/kai.js"}`, `.bin/kai` links, and the
   command runs. `@kitn.ai/cli@0.3.0`'s registry record shows npm's normalized form (`bin/kai.js`).
   Do not "fix" the manifest on the strength of that warning; check the tarball.
4. **A `ci:` commit on a change under `packages/*` triggers no release.** release-please only bumps on
   `feat` / `fix` (and breaking), so this fix did not open an unintended `@kitn.ai/ui` patch release
   PR. Worth knowing when the change is plumbing that lives inside a published package's directory.
5. **Do not dispatch a Release run while a push-triggered one is in flight.** Unchanged from the
   previous session, and it now has a second reason: a plain push can publish by itself (§1).
6. **A rule derived from the case you just fixed will over-fire.** The first cut of the pre-loop-build
   rule counted `dependencies` and immediately demanded a pre-loop build of `create-kai` that nothing
   needs. The live tree carried the counter-example; checking it is what scoped the rule.

## 6. Open work, ranked

1. **Nothing is outstanding from the previous ranked lists.** §10 items 1 and 2 of the 2026-09-22
   handoff are done; §3.1 to §3.5 of the 2026-09-21 handoff were already done.
2. **Watch the next KIT release for the inverse of today's defect.** The pre-loop build makes the skip
   path safe, but it means a kit release now builds `packages/ui/dist` twice (once in the new step,
   once in ui's own `prepublishOnly`). That is deliberate -- one build is unconditional and the
   `prepublishOnly` is what actually ships -- but it is the obvious place a future "optimization"
   would reintroduce the bug, and `lint:release-wiring` is what stops that.
3. **Ideas deliberately NOT done**, unchanged reasoning from the previous handoff: a three-way merge
   for user-EDITED files in `upgrade`; `upgrade` re-diffing hand-written kit API usage (a codemod
   package, not a verb); a docs page per verb (the sidebar is a hand-listed
   `apps/docs/src/topics.mjs`, so a new page needs an entry there).
4. **Small things noticed, none urgent:**
   - the acceptance pack's `DELIVERY.md` lists the 21 exports keys but no CLI verbs;
   - `examples/demos` are still not workspace members;
   - the cli's `bin` normalization warning (§5.3) means the published METADATA and the tarball
     disagree in form (`bin/kai.js` vs `./bin/kai.js`). Harmless today, and nothing asserts the
     equivalence if npm ever changes the normalization.
