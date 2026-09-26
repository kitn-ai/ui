# Handoff — the sweep lands, the release publishes, and two story bugs

**Date:** 2026-09-25 · **Branch:** `main` at `0a7146d0`, tree clean · **Status:** the verbosity sweep's
stack is merged, `@kitn.ai/ui 0.37.0` is published and verified, two reported storybook bugs are fixed and
merged, and one patch release (#415) waits on the owner's publishing call.

Read [`2026-09-24-verbosity-sweep-passes.md`](2026-09-24-verbosity-sweep-passes.md) for the sweep itself
(passes A to E, the five guards). This file records what happened AFTER it: the merge order, the release,
the two story bugs, and the traps.

---

## 1. Where the tree is

| item | state |
|---|---|
| `main` | `0a7146d0`, clean, CI green (test · Release · docs deploy · spike · lockfile sync) |
| the sweep | merged: #410 (PASS B) → #411 (C) → #412 (D) → #413 (E), each retargeted to `main` and green before merge |
| published | `@kitn.ai/ui 0.37.0`, `@kitn.ai/cli 0.5.1`, `@kitn.ai/mcp 0.2.3`, `create-kai 0.9.1` — the release PR #407 merged as `c6179995` |
| #408 Kbd weld | merged (`94517ef7`) after resolving 7 conflicts against the sweep |
| #414 autodocs modal | merged (`e41ebdfc`) |
| #416 Message story + rule (o) | merged (`0a7146d0`) |
| **#415 open** | release-please's refreshed PR: `@knit.ai/ui 0.37.1`, `cli 0.5.2`, `mcp 0.2.4`, `create-kai 0.9.2`. Merging it PUBLISHES. Its runs sit at `action_required` (see §5). |
| #280 open | `@kitn.ai/devtools` panel, opened 18 Aug, not part of this work |

## 2. What this stretch did, and why each thing was done that way

1. **The four stacked PRs, in order.** After #410 merged, each next PR was retargeted to `main` AND the
   branch was synced with `main` (`git merge origin/main`), because **retargeting alone does not trigger
   CI** (`test.yml` filters `pull_request: branches: [main]`, and a base change is not a run trigger). A
   synced branch push is what starts the ladder.
2. **The release PR #407 needed its runs approved.** release-please pushes its branch with
   `GITHUB_TOKEN`, so its `pull_request` runs sat at `action_required` and had never executed. Approving
   them (`gh api -X POST repos/kitn-ai/ui/actions/runs/<id>/approve`) is what made the publish gate
   satisfiable: the gate asks the API for the required checks' conclusion ON THAT SHA and refuses without
   one, so merging an un-run release PR would have cut tags and then failed to publish.
3. **`spike-conformance` failed once on the release commit and was green on re-run.** The signature is the
   harness's own stall report: `waiting for html[data-kai-phase="running"]`, phase already `done`, and the
   report says in as many words that the signature has four unrelated causes and to re-run against a
   settled tree before treating it as a finding. `gh run rerun <id> --failed`.
4. **The docs deploy FAILED on the release merge and was green on re-run.** It races the publish: its
   `verify:preview --require-published` looks for `state.js`, `stores.js`, `wire.js` and
   `web-components/autoloader.js` on the jsDelivr CDN for the version just bumped, and they 404 until npm
   propagates. Its own message says "release the kit, or deploy once it is published". Re-run after the
   publish succeeded.
5. **Verifying the PUBLISHED artifacts, not the tree** (the repo's rule). A throwaway app installs
   `@kitn.ai/ui@0.37.0` and checks: all five public entries import (`@kitn.ai/ui` 233 exports, `/state`
   28, `/wire` 21, `/schemas` 23, `/solid` 312); `dist/kai.es.js` carries `kai-lightbox`,
   `kai-image-artifact`, `kai-kbd-group`, `kai-tooltip`; the README's CDN pins equal the published
   version; `dist/state/index.d.ts` ships. `@kitn.ai/cli --version` and `create-kai --version` match. A
   bounded MCP handshake over stdio: `serverInfo` is `{name: "@kitn.ai/ui", version: "0.37.0"}` — BY
   DESIGN, it names the API the tools describe (`mcp/mcp/mcp-version.d.ts` explains it), and the MCP
   package's own version is reported in `instructions` ("running from @kitn.ai/mcp 0.2.3 and describing
   @kitn.ai/ui 0.37.0") — so a `--version` expectation against the MCP bin is the wrong test; it rejects
   the flag outright.
6. **The Kbd-weld merge (#408 vs the sweep) conflicted in 7 files.** Resolution rule: the sweep's WORDING
   wins, #408's FUNCTIONAL code comes through untouched. Two claims had to be corrected rather than picked:
   `web-components/tooltip/tooltip.tsx`'s swept line said "kai-hover-card is the markup-carrying popup
   instead", which #408 made false, so it now says "as plain text or as markup"; and
   `components/tooltip.mdx`'s "When to use" said "carries plain text only" and now allows markup through
   `content`. Regenerate the artifacts after any such merge (`nx build ui --skip-nx-cache`).
7. **#414 — a seeded-open modal covered its own docs page.** `OpenAtMount` / `LightboxOpenAtMount` opened
   the modal on the Autodocs page, so a reader had to dismiss it to read the docs. Both renders now read
   the story context: `context.viewMode === 'story'` for the canvas, `'docs'` for the docs page. Typed
   structurally (`{ viewMode?: 'story' | 'docs' }`, a supertype of `StoryContext`, so the render signature
   accepts it) to avoid importing a Storybook internal path.
8. **#416 — one story, and a new guard.**
   - `Components/Message/Narrow Panel` was a nested subtree of four unrelated surfaces (four versions of
     one wrapping demo, an avatar measurement, and two app layouts that the showcase tier already covers).
     Now ONE story, `Components/Message :: Narrow Panel`, last in the file so `Playground` is first.
     Verified against the live Storybook `index.json`: the story is there and no `Components/Message/*`
     title exists.
   - **Rule (o) of `lint-story-conventions`: a rendered description may not contain an angle-bracket tag
     or a code fence.** A story's doc comment IS its rendered docs description and is MARKDOWN, so
     `<ChatContainer>` was parsed as raw HTML; an unclosed tag nests every following block inside the
     description, which is why the story's own Source panel (with its Copy button) rendered INSIDE its
     blurb. It found **28 sites across 17 files** (component descriptions and story doc comments), all
     reworded to prose ("the checkbox element"). Four self-test cases; the rule reads the doc comment above
     a story, which nothing read before.
9. **The counter/question surfaces.** Rule (l)'s wording checks still read only the explicit
   `docs.description.story` field. Applying them to the story doc comment too fires on **86 comments across
   42 files** — the surface is about five times what PASS D measured, because most per-story descriptions
   live in doc comments rather than the field. Sized in the living doc, not swept.

## 3. Traps this stretch added

1. **A raw triple-backtick in a regex desynchronised ANOTHER guard.** Rule (o)'s fence pattern was written
   `/```/`; `lint-dangling-imports` tracks template-literal state by counting backticks, so it read a
   self-test fixture's `import` as real code and reported a dangling `./types` **in the script that defines
   the fixture**. Fixed as `/\u0060{3}/`, with the self-test case using `\u0060` escapes. A guard that
   lexes with a counter can be broken by an unrelated file's source, and the finding lands on a fixture.
2. **A JSDoc comment cannot contain `*/`.** My rule (o) header said "in a `/** */` above a story", which
   terminated the comment early and crashed the script with a SyntaxError at the next token.
3. **`iframe.html?id=…&viewMode=docs` is NOT docs mode.** It reports `viewMode: story` and keeps the
   dialog open. Only the manager URL (`/?path=/docs/<id>--docs`) renders the docs view; measure through
   `#storybook-preview-iframe` (or `p.frames()`), not the top-level document.
4. **`git stash pop` can pop somebody else's stash.** A `git stash push -u` on a clean tree created
   nothing, and the following `pop` took the pre-existing `stash@{0}: WIP on feat/state-helpers`, leaving a
   conflict in `docs/notes.md`. Resolved with `git checkout HEAD -- docs/notes.md`; **the stash is still
   there and is not ours** — check `git stash list` before popping, and never drop that entry.
5. **`cmd | tail` reports the pipe's status** (a smoke script exited 1 and printed EXIT=0). Capture `$?`
   from the command, not from the pipeline.
6. **A ruleset-required context means a stacked PR gets no CI until it is retargeted**, and a release PR's
   CI never ran until someone approved it — so "no checks reported" is not "checks passed".

## 4. Queued work, with sizes

1. **The 86 story-doc-comment wording sites** (rule (l) on the doc comment above a story): docs-talk,
   paragraph cap and em dash, across 42 files. Needs lanes plus the copy reviewer, like the earlier passes.
   Rule (o) already reads those comments for the hazard class, so this is purely wording.
2. **`verify:docs` has no exception for a HISTORICAL `kai-` name in prose.** A rename note
   (`kai-sidebar-toggle` → `kai-aside-toggle`) trips `unknown-kai-token` because `knownTokens` is built
   from names the kit still uses. The fix is a declared per-line waiver in
   `scripts/docs-alignment/prose.mjs` — which has no waiver path AND no prose self-test, so the probe comes
   first.
3. **Undecided in the living doc:** whether a page top and its story blurb may be the same sentence (9
   pairs are near-identical today, 2 identical on purpose).
4. **#415 is the publish switch** (`ui 0.37.1`, `cli 0.5.2`, `mcp 0.2.4`, `create-kai 0.9.2`). Publishing
   is the owner's call; the mechanics are §2.2 and §2.5.

## 5. How to resume

1. `git checkout main && git pull --ff-only`; confirm `git log --oneline -1` and that CI on that commit is
   green.
2. Read [`../verbosity-sweep.md`](../verbosity-sweep.md) for the live counters and the follow-up list, and
   [`2026-09-24-verbosity-sweep-passes.md`](2026-09-24-verbosity-sweep-passes.md) for the guards.
3. Derive any work list with the guard that owns the surface, never by hand:
   - `node packages/ui/scripts/lint-story-conventions.mjs` (rules (a)-(o), self-test `--self-test`)
   - `node packages/ui/scripts/lint-prop-docs.mjs`, `lint-comment-references.mjs`
   - `cd apps/docs && npx vitest run test/docs-copy-concepts.test.ts test/docs-copy.test.ts`
4. Run the storybook browser legs for ANY story change: the CI job is the gate, and the local equivalent
   is `pnpm --filter @kitn.ai/ui test:storybook:ci` (20 sub-shards, ~15 min).
5. To publish #415: approve the `action_required` runs, wait for green, merge, then verify the PUBLISHED
   tarballs (§2.5) and re-run the docs deploy (§2.4).
