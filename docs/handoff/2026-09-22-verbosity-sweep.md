# Handoff -- the verbosity sweep: one rule, four surfaces, every component

**Date:** 2026-09-22 · **Branch:** `feat/attachment-lightbox` (PR #409, which also carries the Lightbox
and the `Image`/`ImageArtifact` split) · **Status:** the trims for web-component props, element
docstrings, component descriptions and component page tops are DONE and guarded; the Solid prop docs, the
concept pages, the comment references and the comment-block trim are the remaining slices.

The rules live in [`../verbosity-sweep.md`](../verbosity-sweep.md), which is a LIVING document: the
counters, the batch table and the follow-ups are there, and the copy-reviewer agent reads it as its
criteria. Read that file first; this one is the session record.

---

## 1. What the owner asked for, and how the rule sharpened

Their words, in order, because the sequence IS the spec:

1. "many of the props we have for our components in the stories being displayed are very verbose and tbh
   even a human dev isnt going to read all that ... this is docs for dev, not a lay person."
2. "look at messages/docs -> role i mean wow, its practically a blog article."
3. "i think a developer would understand user|assistant|system" (do NOT restate the type).
4. "we overexplain things that dont need explaining ... we don't need to reference plans, decisions made
   long before, comments in code need to be concise."
5. "A JSX child can never ride in args ... does this help the developer to use this component or
   property, if not, why are we including it?"
6. "why are we mentioning Playground Story? ... it's word salad."
7. "the desc at the top should be a simple wording, not getting into any details such as property names,
   events and other things. A simple description of what it is/does."
8. Badge: cut "Set variant: default (label), count (numeric pill) or citation" because the description
   DESCRIBES rather than instructs.
9. "you need to work on the wording ... use shadcn UI as a sample for the verbiage they use" and "I don't
   want you to just copy the text from Shadcn."
10. "I think you need to create an agent that is an expert copy reviewer."
11. On `aria-label`: "there is aria-label on prop which over explained imo. think developer, they may or
    may not know this but is that really the purpose of the description? or is clarification in the
    stories below enough?" -> a description does not TEACH: no consequence, no preference, no rationale,
    no cross-reference. The example shows it; the concept page says the why once."

The distilled rule, now rule 7 in the living doc: **the top description is ONE plain statement of what
the component IS or DOES.** No property names, no events, no mechanics, no inventory, no instructions,
no "the kit's", nothing its own name already says, no em dashes, and it does not restate its own lede.

## 2. The surfaces, and what each one became

| surface | where it lands | before | after |
|---|---|---|---|
| web-component prop docs | element meta, llms-full, MCP catalog, docs prop table, Storybook | 94,098 chars, mean 139, 166 over the 160 cap | 54,354 chars, mean 80, **0 over**, 0 waivers |
| element docstrings | now the element's `description` in the meta, llms-full and the MCP | 94 of 100 present, 75,917 chars, mean 808, longest 3,268 | **100 of 100**, ~7.8 KB, mean 69, longest 161 |
| component descriptions (stories) | Storybook docs page, above the props table | 18 FAIL / 7 WEAK of 36 judged; four talked about the documentation itself | reviewer's verdicts applied; docs-system talk 0 of 88 |
| component page tops | ui.kitn.ai: frontmatter description, lede, "When to use" | 62 of 63 pages over a cap, 21 pages with an em dash in a top | **0 offenders**, 63 pages |
| Solid prop docs | Storybook props tables | 200 of 823 over the cap | in the last lanes at the time of writing |
| code comments | the next engineer | 181 blocks over 20 lines, 156 citing plans/IDs/dates/sections | not started |

The single biggest win is the docstrings: they were written for every facade and thrown away by the
generator, so they cost nothing and reached nobody. Now they are the element's one-liner for agents.

## 3. The guards, so none of this can regrow

- **`lint:prop-docs`** (`scripts/lint-prop-docs.mjs` + `tests/scripts/prop-docs-length.test.ts`, its own
  CI step): a prop doc over 160 chars fails, with a parsed `// lint-prop-docs: long -- <reason>` waiver
  and a count of props read. Scope is `src/web-components/**` today; widening it to `src/components/**`
  is the Solid slice's last step.
- **`lint-story-conventions` rule (l)**: a rendered component description may not mention
  Storybook/story/Labs/this page/the demo/docs page, and may not exceed three paragraphs. Bare `story`
  and bare `Labs`, because no enumeration of phrasings was complete: the first cut missed "its own
  story". 114 probes, mutations proven.
- **`apps/docs/test/docs-copy.test.ts`**: the page tops on every docs run: caps (100/140/200), no em
  dash, instructive shapes, a lede that restates its description, and anti-vacuity floors on pages,
  ledes, asides AND the extracted text length.
- **The element-description pipe** (`gen-web-component-api.mjs` + `gen-catalog.mjs` + `gen-llms.mjs`):
  the facade docstring becomes `meta.description`, a per-element paragraph in `llms-full.txt` (printed
  under the heading), and a field on the MCP catalog row. The CEM declaration `description` is filled
  too, because `component_reference` reads THAT, not `derived.json`.
- **`lint:rendered-description-style`** already covered the doc-comment case from the previous session.
- **The copy-reviewer agent** (`.pi/agents/copy-reviewer.md`, project scope, read-only, criteria read
  from the living doc). Its first run was a calibration and it matched the owner's verdicts 8 of 8.

## 4. Traps this session added

1. **A regex over "the doc comment above X" must be anchored to THAT statement, not to the file.** A
   patch of mine matched the FIRST `/**` in a facade and replaced everything up to
   `defineWebComponent`, deleting the interface members of NINE elements. What caught it was the
   generated element count dropping 100 -> 91: a derived number, not a code read. Rebuild the header,
   re-run the generator, and check the count.
2. **`verify:docs` has no exception for a HISTORICAL `kai-` name.** Its known-token set is built from
   quoted `kai-…` literals in the kit's source, so trimming `chat-workspace.tsx`'s docstring made the
   guide's rename note (`kai-sidebar-toggle` -> `kai-aside-toggle`) an `unknown-kai-token` HIGH finding
   on a page nobody had touched. Fixed by keeping the old name in a `//` comment in the kit source,
   where the checker already looks. The general fix (a declared waiver) needs a prose self-test first,
   because that checker has none; do not un-backtick the old name, which dodges the guard silently.
3. **`verify:docs` is racy against a concurrent generator write.** A run mid-generation read a
   half-written `dist/web-components.d.ts` and reported 91 elements / 69 high findings; the same tree
   settled reported 1. Docs checks run after the generators.
4. **A story's own name is a binding.** `export const Lightbox: Story` beside `import { Lightbox }` is a
   duplicate declaration, and even aliased, rule (i) reads the story as the component it demonstrates.
   Compare also: `kai-*` JSX tags declared in more than one story file must match byte for byte.
5. **Two Solid components render `MessageBody`** (`components/thread` and `components/chat`), and the
   two facades render different ones, so a prop added to one is invisible to the other. It shows up as a
   TS2322 on the facade, not at runtime.
6. **A prop's doc has ONE source.** The last 11 over-cap web-component prop descriptions were not in a
   facade at all: `kai-chat.reasoningOpen` arrives from `ChatThreadProps`, so a facade-side gate cannot
   see it. Widen the gate to where the text is written.
7. **A backtick OR a `${}` inside a subagent workflow template literal breaks the script.** Observed
   both ways in one session (`SyntaxError: Unexpected token`, then `ReferenceError: mediaType is not
   defined`). Build the task text with a placeholder and substitute after.
8. **`git mv` does not work on a file that was never committed**, and a mechanical `sed` rename reaches
   generated artifacts too.
9. **`.pi/` was gitignored, so an agent definition would have lived on one checkout.** `.gitignore` now
   negates `.pi/agents/**` only: local settings stay out, shared specialists travel with the repo, the
   same way `.claude/` does.

## 5. Verification state

- `nx build ui --skip-nx-cache` green; `verify:generated` in sync (100 web components).
- unit **428 files / 6124 tests** at the last full run (the tree has grown since: the prop-doc gate, the
  docs copy guard, the element-description tests).
- docs: **8 files / 88 tests** green, including the 26-test copy guard; `verify:docs` exit 0.
- `lint:prop-docs` green (676 props, longest 160, 0 waived); `lint:story-conventions` 114 probes green;
  the other 12 lint gates green; the four UI tsc passes green.
- Re-measure before quoting any of it: this file is a snapshot, the living doc carries the counters.

## 6. The plan, pass by pass, with the derived work list each pass needs

Everything below is measured on the tree as of this handoff. Every list is a MEASUREMENT, not a
memory: re-derive it in the same command that does the work, because four hand-written lists in this
session were wrong, including one pasted from the tail of a measurement.

**Pass A -- the story surfaces (next, and the owner is looking at these right now).**
- story `argTypes` descriptions: 620 one-line values, **33 with a problem** (18 over 160 chars, 16 with
  an em dash, 0 instructing). This is the fifth surface; they override the component's own prop docs in
  Storybook. `components/checkbox/checkbox.stories.tsx` is the worked example.
- story component descriptions: the mechanical rule passes everywhere (<= 3 paragraphs, no docs-system
  talk), but only 24 components have been judged on WORDING (10 by the copy reviewer, plus the docs-talk
  fixes). The other ~37 Solid stories and the 11 element stories have never been judged: expect em
  dashes, rationale and inventories there.
- the reviewer's prop-doc findings on the six worst Solid files: 11 FAIL, 35 WEAK (instructions,
  rationale, inventories, em dashes -- all under the length cap, so no gate sees them).
- guard to add: extend the `lint-story-conventions` em-dash + length checks to argType `description`
  values (mechanical, ~33 sites).

**Pass B -- the prose classes no length gate can see.** 43 hand-written docs name 2+ of their own union's
literals (41 name all of them), 14 instruct, 291 doc blocks contain an em dash, 23 method or callback
docs are over 160 (rule 2 has no cap there; worst 591), 17 member docs over 160 in shared `.ts` files
(worst 652, `tool-part.state`).
Guards: a type-restatement checker (doc + the union it names, from the AST), an em-dash rule over DOC
COMMENTS rather than only the meta, and a cap for method docs.

**Pass C -- the comment slice.** 156 sites cite a plan path, task/round/finding ID, dated ruling or a
section ref; 181 comment blocks are over 20 lines (36 over 40, the worst a 109-line module header in
`aurora.glsl.ts`). Write `lint:comment-references` first (parsed waiver with a reason, self-test, its own
CI step), then sweep, then the block cap.

**Pass D -- the concept tier and the story blurbs.** 60 guide/pattern/example pages are over a cap; those
pages are allowed prose, so the rule there is "no paragraph over ~4 lines". And
`docs.description.story` (40+ sites) is out of rule (l)'s scope by decision.

**Pass E -- JSX in `args`.** The note is repeated in four stories (one of them inside a rendered prop
table) because it is a Storybook rule, not a component fact. Make it a rule in `lint-story-conventions`
and delete the notes.

**Then: publish.** Merge #409 and release; the smaller `llms-full.txt`, MCP catalog and Storybook only
reach anyone on the next published package. Until then nothing the owner can open reflects this work.

## 7. How to resume without re-learning the rules

1. Read `docs/verbosity-sweep.md` (the rules, the counters, the batch table, the follow-ups) and this
   file. Those two ARE the memory; do not re-derive the criteria from the commit log.
2. Run the four gates to see the real state: `lint:prop-docs`, `lint:story-conventions`,
   `pnpm --filter @kitn.ai/docs test` (it carries the copy guard), `lint:llms-size`.
3. Derive the work list for the pass you are on, in the same command that does the work.
4. Batches of ~10 components per lane, one writer per file, then the `copy-reviewer` agent judges the
   batch (read-only; it reads the criteria file, so it cannot drift from the owner's rules). A batch is
   done only when the reviewer passes and the parent has re-measured the counter.
5. The owner reviews components; tell them what "done" means so they do not report untouched work:
   - done and gated for all 100: element one-liner, prop docs (length), and the page top for the 62 with
     a docs page
   - done for 24 components only: story wording
   - not started for any component: code comments, and every Pass B class
   - not judged yet: the ~37 components whose stories have never been through the reviewer. Em dashes,
     rationale and inventories there are expected, not regressions.
6. The reviewer is NOT CI. Nothing mechanical covers "does this teach" or "is this well written", so the
   guard against regrowth on the wording half is running it per batch. Do not claim a component is done
   on a green `lint:prop-docs`.
