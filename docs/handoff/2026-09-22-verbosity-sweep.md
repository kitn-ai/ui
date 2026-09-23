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

## 6. Open work, ranked

1. **Solid prop docs** (200 over cap, the last two lanes), then widen `lint:prop-docs` to
   `src/components/**`.
2. **The copy reviewer's second pass**, over prop docs and the new docstrings. It judged page tops and
   story descriptions so far; prop docs are next, and the length gate is not a wording gate.
3. **Concept pages** (guides, patterns, examples): 60 are over a cap, and they are allowed more prose,
   so the rule there is "no paragraph over ~4 lines", not a cap.
4. **Code comments**: `lint:comment-references` (a plan path, task/round/finding ID, dated ruling or
   section ref) plus the 156 sites, then the comment-block trim (181 blocks over 20 lines, 36 over 40,
   starting with the 109-line module header in `aurora.glsl.ts`).
5. **JSX in `args`**: the note repeated in four stories becomes a rule in `lint-story-conventions`.
6. **Lower `MAX_LLMS_FULL_BYTES` back.** It was raised 344 -> 355 KiB to measure the docstring cost; the
   trims pay it down, so the raise must be reverted with a note rather than left as drift.
7. **`docs.description.story`** (40+ sites) is out of scope for rule (l), which reads the component
   description only. Decide later whether a story description may mention its own story.
