# Handoff — rule (l) reaches the story doc comment, plus two sweep follow-ups

**Date:** 2026-09-25 (second session) · **Branch:** `main` at `30f6cb64`, tree clean, CI green ·
**Status:** PR [#418](https://github.com/kitn-ai/ui/pull/418) merged as `30f6cb64`. The last surface the
sweep had listed as sized-now-swept is done, and the two follow-ups beside it are closed. Nothing is
published; [#415](https://github.com/kitn-ai/ui/pull/415) is still the publish switch.

Read [`2026-09-25-sweep-lands-release-and-two-story-bugs.md`](2026-09-25-sweep-lands-release-and-two-story-bugs.md)
for the session before this one (the merge order, the release, the two story bugs). This file records what
came after: the three queued items, the numbers, the guard changes, and the traps.

---

## 1. Where the tree is

| item | state |
|---|---|
| `main` | `30f6cb64`, clean, CI green (test · Release · docs deploy · spike · lockfile sync) |
| #418 | merged: rule (l) reads the story doc comment; the `verify:docs` historical-name waiver; the page-top decision |
| published | unchanged: `@kitn.ai/ui 0.37.0`, `@kitn.ai/cli 0.5.1`, `@kitn.ai/mcp 0.2.3`, `create-kai 0.9.1` |
| **#415 open** | release-please's patch release (`ui 0.37.1`, `cli 0.5.2`, `mcp 0.2.4`, `create-kai 0.9.2`). Merging it PUBLISHES. Runs sit at `action_required` until approved. |
| #280 open | `@kitn.ai/devtools`, opened 18 Aug, not part of this work |

## 2. Item 1 — the story DOC COMMENT is now a rule-(l) surface

Storybook renders the doc comment above a story export as that story's description above the canvas, so it
is the third rendered description surface and rule (l) judges it with the same three checks as the other
two: docs talk, the 3-paragraph cap, the em dash. Rule (o) already read it for the markdown hazard.

- **It fired on 81 findings across 42 files** (the sizing note guessed 86 comments; the tree had moved).
  447 doc-comment paragraphs were read.
- Five lanes each derived their own slice from the guard in the same command that did the work, then
  rewrote only the doc comments. The parent read every lane's diff.
- The copy reviewer judged all **66 comments** those findings lived in, in five batches:
  **4 FAIL, 32 WEAK, 30 PASS**. A fix pass applied every FAIL and every WEAK; three further re-check WEAKs
  were applied and **four accepted as judgement calls** (coachmark `CustomColor`, pane `Maximized`, input
  `MaskedFormats`, tab-bar `DarkPreview`, each with the reviewer's own "keeping is defensible" note).
- Re-check: **0 FAIL, 7 WEAK, 30 PASS**.
- Counter re-measured from the guard: **425 doc-comment paragraphs read, 0 offenders**.

**Rationale that had to survive moved to a `//` above the comment**, and that is safe on purpose:
Storybook's `extractDescription` (`storybook/dist/_node-chunks/chunk-GD4AVVJ6.js:1351`) maps each leading
comment to `null` when it is a `CommentLine` or a block whose value does not start with `*`, so a `//`
never joins the rendered description. Do not remove that line from the guard's world model without
re-reading that function.

**Two guard defects fixed while extending it**, both found by lanes and provable:

1. **The line anchor.** `storyDocComment` used to return the VariableStatement's line for every paragraph,
   so a finding in the second or later paragraph was reported at the first paragraph's line plus whatever
   newlines sat inside it. It now returns `anchor` (the `/**` line, where a waiver above the comment is
   found) and `bodyLine` (the line the comment text begins on, walked from the raw source because TS
   strips `/**`, the `*` prefixes and leading blank lines).
2. **Counters.** The doc-comment paragraphs count into their own `docComments` counter, not
   `descriptions`, so the two story surfaces stay countable apart; the run adds a vacuity entry when the
   doc-comment counter reads 0.

Header of the guard updated, 7 self-test cases added (docs talk, em dash, 4 paragraphs, clean, a waiver on
the line above, a second-paragraph line assertion, and the two counters staying apart), self-test
**136/136**, mutation-proved on the tree: docs-talk, em-dash and four-paragraph mutants each turn the run
red naming the file and the rule, and reverting turns it green.

## 3. Item 2 — a declared waiver for a HISTORICAL `kai-` name in prose

`knownTokens` is built from quoted `kai-…` literals and JSX tags in `packages/ui/src`, so it can only
recognise a name the kit still writes down. A rename note naming `kai-sidebar-toggle` was an
`unknown-kai-token` high finding on a page nobody had edited, and the tree stayed green only because
`chat-workspace.tsx` still mentions the old name in a `//` comment. Delete that comment and a correct page
goes red.

The evidence that `//` comments cannot be the answer: remove the comment and the finding returns (proved
below), so the page now owns its exception.

- **The declaration** is an MDX comment (renders nothing) on the note line or the line above:
  `{/* docs-alignment: historical-kai-token -- <why the old name is here, 15+ chars> */}`.
  Parsed, not text-matched; the reason is REQUIRED (a reason-less directive is not a waiver); it covers the
  line it sits on and the line below, nothing further; and it silences that one finding kind only.
- **`coverage.mjs`'s stale-token scan is the same fact from the other direction**, so it honours the same
  declaration through one shared `isHistoricalKaiWaived` helper. One declaration, both reports.
- **The probe came first**, as the sizing note required: `apps/docs/test/docs-prose.test.ts` is the prose
  checker's first self-test. It was red 3/7 before the fix (the two waiver cases plus the coverage case)
  and is 7/7 after. It asserts MUST-FAIL (no waiver, reason-less waiver, waiver parked two lines away) and
  MUST-PASS (waiver on the line above, on the note line, a name the kit still declares, coverage's list).
- **Mutation-proved on the tree**: with the kit's mention stripped, waiver present = exit 0 and 0 stale
  tokens; waiver removed = exit 1 with `unknown-kai-token`. Restored after.
- The marker is applied to the real rename note, `guides/use-a-workspace.mdx` (the `kai-sidebar-toggle`
  sentence).

## 4. Item 3 — the page-top / story-blurb decision

Decided and written into `docs/verbosity-sweep.md` rule 7: **a page top and its story blurb MAY be the
same sentence.** They are one rule applied to two surfaces a reader meets in different places, and a
reader rarely sees both, so a repeated one-liner is not duplication the reader pays for. Sameness is
allowed, not a target, and a page is not reworded just to differ. Two constraints survive, and both were
already guarded or stated: the `kai-lede` must not restate its OWN frontmatter `description` (guarded by
`apps/docs/test/docs-copy.test.ts`), and when the page has a fact the story cannot carry (the element tag,
the one clause saying when to reach for this component over a sibling) the lede should carry that. The two
pairs that are byte-identical to the element docstring stay, by design (rule 8: one source, two
audiences). The cost is drift, not sameness, so `docs/coupling-map.md` registers the pair: unenforced item
**51** in the Docs group.

## 5. Verification the session actually ran

Serial, after `nx build ui --skip-nx-cache`:

- the guard and its self-test, `lint-prop-docs`, `lint-comment-references`, `lint-silent-drops`,
  `lint-cdn-pins`; all **15** `lint:*` gates.
- `nx build ui --skip-nx-cache`, `nx build cli`, `nx build mcp`, `nx build create-kai`; `nx typecheck ui
  --skip-nx-cache` plus the cli/mcp/create-kai typechecks.
- `vitest run --project=unit` **6,194 passed**, `--project=emitted` **36 passed**.
- `verify:generated`, `verify:solid-coverage`, `verify:construct`, `verify:pack`, `verify:fresh`,
  `verify:consumer`, `verify:schemas`, `verify:tool-schemas`, `verify:web-components-bundle`,
  `verify:scaffold`.
- `apps/docs`: `npm test` **100 passed** (10 files, up from 93 in 9 files), `verify:docs` exit 0 with
  **0 high findings and 0 stale `kai-*` tokens**.
- `packages/ui test:storybook:ci` **20/20 sub-shards passed**.
- The structural invariant that makes the sweep reviewable: `0` non-comment lines changed across all 42
  story files.

## 6. Traps this session added

1. **`apps/docs/tsconfig.blocks.json` typechecks `test/**`, and no local step in the documented ladder
   does.** The new test imported untyped `.mjs` and five parameters were implicitly `any`; every local
   check passed and CI's `dist-guards` leg caught it (`TS7006` x5). Fixed with explicit annotations, then
   `pnpm --filter @kitn.ai/docs run typecheck:blocks` run locally. **Add that command to the pre-push
   ladder for any `apps/docs/test/` addition.**
2. **A heredoc inside `--body "$(cat <<'EOF' …)"` still got its backticks command-substituted** while
   creating the PR, so the shell ran `nx`, `vitest` and friends from the body text and `gh` ended with
   `Argument list too long`. Nothing in the tree changed, and no PR was created. Write the body to a file
   and pass `--body-file`.
3. **The sizing number in a living doc can be stale in the safe direction too.** The note said 86 doc
   comments; the guard, run at the start, found 81 findings across 42 files. Derive first, then size.
4. `verify:docs` is racy against a concurrent generator write, and the docs deploy 404s on the CDN when it
   races a publish. Both were green on re-run; check before treating either as a finding.

## 7. Queued work

1. **#415 is the publish switch** (`ui 0.37.1`, `cli 0.5.2`, `mcp 0.2.4`, `create-kai 0.9.2`). Publishing
   is the owner's call. Mechanics: approve the `action_required` runs (release-please pushes with
   `GITHUB_TOKEN`, so they never ran), wait for green, merge, then verify the PUBLISHED tarballs rather
   than the tree, and re-run the docs deploy because it races npm propagation.
2. **The 7 re-check WEAKs left as judgement calls.** They are defensible as written; a future pass that
   wants them changed has the verdicts in the lane reports (see §8) and the text in the tree.
3. **The remaining `verify:docs` waiver surface.** `prose.mjs` now has a waiver path and a self-test, but
   only for the `unknown-kai-token` kind. If another class needs an exception, extend
   `isHistoricalKaiWaived`'s pattern rather than adding a second mechanism, and add a case to
   `docs-prose.test.ts`.
4. #280, the devtools panel, still open.
5. The reviewer's three worst patterns are unchanged and worth repeating to the next component that lands:
   the top description as the props table in prose, a feature inventory where the preview is the copy, and
   a mechanic kept in prose after its prop name was removed.

## 8. Lane working papers

All under `/tmp/kai-lanes/` and **ephemeral** (gone on reboot). The numbers they carry are recorded above;
these are the raw papers.

- `story-doc-{a1,a2,b,c,d}.md` — each lane's derivation (verbatim guard output) plus every row's original
  and new text and where moved facts went.
- `story-doc-review-{a1,a2,b,c,d}.md` — the first reviewer pass, 66 comments judged.
- `story-doc-recheck-{1,2}.md` — the re-check after the fix pass.
- `story-doc-wording.diff`, `guard-final*.txt`, `selftest-*.txt`, `verify-docs-*.txt`, `docs-test*.txt`,
  `build-*.txt`, `unit.txt`, `emitted.txt`, `storybook-ci.txt`, `pr-body-story-doc.md`, `batch-*.txt`,
  `fix-*.md`, `recheck-*.txt`.

## 9. How to resume

1. `git checkout main && git pull --ff-only`; confirm `git log --oneline -1` and that CI on that commit is
   green.
2. Derive any counter with the guard that owns it, never by hand:
   `node packages/ui/scripts/lint-story-conventions.mjs` (rule (l) reads all three description surfaces
   plus the doc comment), `--self-test`, `lint-prop-docs`, `lint-comment-references`,
   `cd apps/docs && npx vitest run test/docs-prose.test.ts && node scripts/docs-alignment/index.mjs`.
3. Run the storybook browser legs for ANY story change: the CI job is the gate, the local equivalent is
   `pnpm --filter @kitn.ai/ui test:storybook:ci` (20 sub-shards, ~15 min).
4. To publish #415: approve the `action_required` runs, wait for green, merge, verify the published
   tarballs, re-run the docs deploy.
