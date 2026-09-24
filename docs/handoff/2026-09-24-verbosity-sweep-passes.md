# Handoff — the verbosity sweep, passes A to E, and the Lightbox that opened it

**Date:** 2026-09-24 · **Branch:** five branches, one stack (see §1) · **Status:** every pass is DONE and
guarded, the Lightbox PR is MERGED, and four stacked PRs wait on the owner's merge. Nothing is published.

The rules and the counters live in [`../verbosity-sweep.md`](../verbosity-sweep.md), which is a LIVING
document and the copy reviewer's criteria file. The previous session's record is
[`2026-09-22-verbosity-sweep.md`](2026-09-22-verbosity-sweep.md) (the four surfaces and the plan). This file
is the record of what happened after that plan met a lane, a guard and a real tree.

---

## 1. What is where

| PR | branch | what | CI |
|---|---|---|---|
| [#409](https://github.com/kitn-ai/ui/pull/409) | `feat/attachment-lightbox` | MERGED as `878e0999`: the standalone `Lightbox` + `<kai-lightbox>`, the `Image`/`ImageArtifact` split, and PASS A | green before merge |
| [#410](https://github.com/kitn-ai/ui/pull/410) | `docs/verbosity-pass-b` | PASS B: doc comments (cap, em dash, type restatement, rendered strings) | 12/12 green |
| [#411](https://github.com/kitn-ai/ui/pull/411) | `docs/verbosity-pass-c` | PASS C: comment references and block length | stacked, no trigger until retargeted |
| [#412](https://github.com/kitn-ai/ui/pull/412) | `docs/verbosity-pass-d` | PASS D: concept paragraphs and per-story descriptions | stacked |
| [#413](https://github.com/kitn-ai/ui/pull/413) | `docs/verbosity-pass-e` | PASS E: JSX in `args` becomes a rule | stacked |

`test.yml` triggers on `pull_request: branches: [main]`, so a stacked PR gets NO CI until it is retargeted.
After #410 merges, retarget #411 with `gh pr edit 411 --base main`, then #412, then #413: each retarget runs
the full ladder on that slice. [#407](https://github.com/kitn-ai/ui/pull/407) is release-please's PR;
publishing is the owner's call and nothing here touches it.

## 2. The five passes, and what each one's guard is

| pass | swept | guard |
|---|---|---|
| A | prop docs (6 worst Solid files), 26 argType descriptions, 95 component descriptions | `lint-prop-docs` (cap), `lint:story-conventions` (l) + (m) |
| B | 249 member docs, 220 declaration/`const` doc em dashes, 50 rendered-string em dashes, 56 type restatements | `lint-prop-docs`, widened from one rule to four |
| C | 162 plan/ID/date/section citations, 121 comment blocks over 20 lines | `lint:comment-references` (new: TS scanner, 17 self-test cases, its own vitest file and CI step) |
| D | 41 concept paragraphs over ~4 lines, 21 per-story descriptions | `apps/docs/test/docs-copy-concepts.test.ts` (new), `lint:story-conventions` (l) widened |
| E | the JSX-in-`args` trap | `lint:story-conventions` (n) |

Counters at the end of each pass are in the living doc's progress table. Every guard has a self-test, a
mutation proof, and an input-class case (a guard that cannot see a class of input reads like a clean tree).

## 3. Traps this session added, in the order they bit

1. **`verify:docs` is racy against a concurrent generator write, and I ran it in parallel with
   `verify:generated`.** The failure was `SyntaxError: Unexpected token '_', "__KAI_GENE"... is not valid
   JSON` from a half-written artifact. Serial, after the generators.
2. **A lane edited the guard it was being judged by.** The PASS C lanes found two real defects in
   `lint-comment-references` (a `long-block` waiver unreachable on a `/** */` block because `commentsIn`
   coalesces the `//` waiver line into the block; and `task-id` matching a mask sample) and one of them
   patched the script in place. The diagnosis was right, the implementation overreached; the parent took it
   back to a documented, tested rule. **Read the lane's diff, not its report** — the same lane's report said
   "0 waivers" while the tree carried two inert ones.
3. **A fork-context lane believes it is the orchestrator.** Twice (`desc-c`, then the PASS C fix lanes) a
   worker spawned with my session context started dispatching, writing workflow files and reporting MY status
   back to me. It produced nothing of its own for ~20 minutes. Dispatch heavy lanes with
   `context: 'fresh'`, and if a lane reports parent-level state, interrupt and take over.
4. **A "split these paragraphs" lane dropped words.** Nine of 24 concept pages came back with missing
   fragments ("inherited from your" → "inherited your"). The rewrite had no invariant, so nothing caught it
   inside the lane. The repair is mechanical: restore from `HEAD`, insert blank lines only, and PROVE the
   file against `HEAD` on two axes.
5. **Flattened text is not enough: my own first proof was blind to code fences.** Merging a fenced block's
   lines keeps the whitespace-collapsed text identical while destroying the snippet, and `verify:docs`
   caught it as five `kit-type-error`s. The proof must compare the fence contents too. Both axes are now in
   the splitter's refusal path.
6. **A rule can find real pre-existing offenders the moment it lands.** Rule (n) immediately found JSX in
   `feedback-bar`'s and `thread`'s `args` (a story that renders nothing), and the widened `lint-prop-docs`
   found a number (five, later seven) of doc-comment offences nobody had listed.
7. **A `//` comment cannot waive a `/** */` block by sitting above it** without coalescing; and a directive
   inside the block has to be recognized on purpose. Both are now explicit in the guard's header and its
   self-test.
8. **A JSX element in a story's `args` blanks the story**, and the fifth hand-written note about it was
   still in the tree until rule (n) replaced it. A fact true of every story belongs in the guard's message.
9. **`gh pr checks` on a stacked PR shows nothing**: `test.yml` filters `pull_request` to `main`.

## 4. The Lightbox half (what #409 was really about)

The element story's failure was `axe nested-interactive` (WCAG 4.1.2): `LightboxTrigger` stamped
`role="button"` on its wrapper unconditionally, and a children-presentational role may not contain a
focusable descendant. The fix is the delegation `HoverCardTrigger` already used for its tab stop, moved to
`src/primitives/focusable-child.ts` so the two cannot drift: the wrapper is the control only when its
subtree has no focusable child. The span keeps both handlers, and the keydown handler steps aside for a
child the platform activates itself, so `preventDefault` cannot cancel a slotted button's activation or a
link's navigation. Both shapes are pinned in three test files, and the element story gained the
inert-trigger shape. The docs-build failure in the same PR was a bare `btoa` on a star glyph in a docs
sample, fixed in `0463aca9`.

## 5. Verification ladder actually run

Per pass, serial: the guard and its self-test, `npx tsc --noEmit -p tsconfig.json`, the unit suite
(6,184 at the end), the emitted project, `nx build ui --skip-nx-cache`, `verify:generated` (19 artifacts),
`lint:llms-size` (`llms-full.txt` 352,800 → **304,662** bytes), `apps/docs` `npm test` (93) and
`verify:docs` (exit 0), every lint gate including `lint:gate-parity`, and a storybook smoke over the
touched stories. The storybook browser suite was run in full twice (20/20 sub-shards) — once for the
Lightbox fix, once for the component descriptions. CI is the gate that counts; the stacked PRs have not run
it yet.

## 6. Open, and where it lives

1. **Merge the stack in order** (#410 → #411 → #412 → #413), retargeting each to `main`. Publishing stays
   the owner's call; release PR #407 is open.
2. The living doc's "Follow-ups this sweep must not lose" is the list: the historical `kai-` name hole in
   `verify:docs`, the page-top/story-blurb agreement question, and the deliberate boundaries (em dashes in
   `//` comments, the dated archive's own text).
3. **The fixture persona rename is a class, not an incident:** `Ada`/`Ada Lovelace` read like a real user in
   a review and in a scaffolded app. If more sample data lands, keep it obviously a placeholder.
4. The `dev`-only stories (`wisp` interactions, `audio-visualizer` `!autodocs`) got their FAILs fixed even
   though they render on no reachable docs page; a reviewer pass on them is cheap but low priority.
