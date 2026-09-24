# The verbosity sweep: every component, four surfaces

**Status:** in progress. Rules and the batch list live here; each batch is checked off when its four
surfaces are measured clean, not when it is edited.

## The rules, per component

1. **Prop docs** (Solid prop comment and the web-component facade's): one sentence, cap 160 chars.
   Says what the prop does plus only what the name and type cannot: the default, the unit, a real
   trap. No type enumeration, no restating the prop name, no rationale. The rationale moves to a `//`
   comment beside the prop, which no generator reads.
   **A description does not TEACH.** No consequence ("or it announces as an unnamed control"), no
   preference ("prefer `aria-labelledby`"), no rationale, no cross-reference to a story. A developer may
   not know the consequence yet, and that is not this surface's job: the example below shows a labelled
   box next to an unlabelled one, and the concept page says the why once
   (`apps/docs/src/content/docs/guides/accessibility.mdx` owns accessible names). Rejected/approved from
   the owner reading Checkbox:
   "Accessible name. A checkbox with no visible label needs one, or it announces as an unnamed control.
   A wrapping `<label>` is the better answer when there is text to wrap" -> "Accessible name, for a box
   with no visible label."
   This is the wording half of the prop rule and NO mechanical gate covers it: the length cap passed all
   six of those descriptions, and a "does it teach" regex only finds 4 of 620 argType descriptions, so it
   is the copy reviewer's job, not CI's.
2. **Slots, parts, events, methods**: one clause each. They feed the docs tables and llms-full.txt.
3. **The component description** (what Storybook renders above the props table): ONE statement of what
   the component is (rule 7 below is the authority; this line used to say "1-3 sentences" and the two
   disagreed, which the copy reviewer caught on its first run). A second short sentence is allowed ONLY
   when a sibling is genuinely near-identical and the reader needs the disambiguation, never for props,
   events, mechanics or inventory. Never about the documentation: no "this story", no Storybook, no
   Labs, no sidebar, no "see the X story", no "lives in Y", no audience talk. No em dashes anywhere in
   rendered copy (apps/docs/STYLE.md bans the flourish; the copy reviewer flags them).
4. **The docs page top**: frontmatter description <= 100 chars, lede <= 140 and it must not restate the
   description, "When to use" <= 200 (one sentence plus the use-something-else pointer). Page body:
   component pages stay terse, concept pages (guides, patterns, examples) keep their prose with no
   paragraph over ~4 lines.
5. **Comments in the component source**: no plans, task/round/finding IDs, dated rulings or section
   refs; a comment block over 20 lines needs a reason. Navigation to code (a test file, a symbol)
   stays.
6. **A comment is about the component or about THIS site.** A fact true of every story or every
   component is neither, and repeating it per file is duplication: if it can be guarded, it becomes a
   rule (the guard's message is then the only copy), and if it cannot, it lives in ONE place (the
   story-conventions lint's header owns the story rules). This is the class the owner caught as "A JSX
   child can never ride in `args`" in four files.
7. **THE TOP DESCRIPTION IS A PLAIN STATEMENT OF WHAT THE COMPONENT IS OR DOES.** One sentence. No
   property names, no event names, no mechanics, no feature inventory, no "the kit's", and never a
   fact its own name already carries. The reader is deciding whether to open the page, not learning the
   API. This applies to the story/component description, the docs page frontmatter `description`, the
   `kai-lede` (which may add ONE sentence of what it does for you, still with no prop names), and the
   element docstring. Verbatim calibration from shadcn/ui, the bar to hit:
   - Avatar: "An image element with a fallback for representing the user."
   - Tooltip: "A popup that displays information related to an element when the element receives
     keyboard focus or the mouse hovers over it."
   - Button: "Displays a button or a component that looks like a button."
   - Accordion: "A vertically stacked set of interactive headings that each reveal a section of content."
   - Alert: "Displays a callout for user attention."
   A description DESCRIBES. It never instructs: no "Use X for Y", no "Set `variant` to ...", no
   "see the example", no method names, no prop names at all. Anything the reader has to be TOLD to do
   belongs in the example or the props table, and even there it stays short.
   Rejected and approved pairs from our own tree, so the failure mode is visible:
   - "The kit's button: `variant` sets the surface, `size` the height" -> "A button that triggers an
     action." (obvious + prop inventory).
   - "A compact pill for status text, counts, or source citations. Set variant: default (label),
     count (numeric pill), or citation (clickable source marker)." -> "A compact pill for status text,
     counts, or source citations." The first sentence is the description; the second is an instruction
     the props table already carries.
   - The Agent Card paragraph that described its own dot colours, pill and trailing button -> gone: the
     preview shows it.
   Do not COPY shadcn/ui's sentences. They are the tone calibration (short, plain, describes the
   thing); the wording has to be ours and about our component.
8. **The element docstring is the agent's one line.** Every facade writes a doc comment above its
   `defineWebComponent` call and the generator was throwing it away, so `llms-full.txt` and the MCP
   catalog carried props, events, methods and parts but not one sentence saying what the element IS.
   That docstring becomes the element's `description` in the meta, printed per element in
   `llms-full.txt` and carried into the MCP catalog rows: one source, both audiences, and it is the
   sentence an agent needs to CHOOSE the component. Rule for its text: what it is, plus when to choose
   it over its siblings, in one sentence, with nothing the preview or the props table already shows.

## Progress, measured by the scripts rather than asserted

| surface | now | target |
|---|---|---|
| web-component prop docs over 160 chars | 11 of 666, and those 11 come from shared Solid types | 0 |
| Solid prop docs over 160 chars | **0 of 913** (was 200 of 823; 41 docs went 16,220 -> 5,043 chars, mean 396 -> 123) | done |
| the widened gate | 227 files, 1,586 props, 0 over cap, self-test 10/10 | done |
| facade prop-doc text | 94,098 -> 54,354 chars, mean 139 -> 80, 0 waivers | done |
| rendered component descriptions with docs-system talk | 0 of 88 | done |
| rendered component descriptions (the story blurb above the props table), judged on WORDING | **95 judged in three reviewer batches (69 PASS, 20 WEAK, 6 FAIL); every FAIL and WEAK rewritten, 6,194 chars total, longest 108, 0 em dash, 0 over three paragraphs** | done |
| story `argTypes` descriptions (a FIFTH surface: not the component's prop docs, and they WIN in Storybook's props table) | **515 values read, 0 over 160, 0 em dash** (26 findings across 14 files, all rewritten, 0 waived, rule (m) of `lint-story-conventions`) | done |
| element docstrings | 100 of 100 present, 75,917 -> ~7.8 KB, mean 808 -> 69, longest 161 | done |
| component page tops (description <= 100, lede <= 140, aside <= 200, no em dash, no instruction, lede not restating) | 0 offenders across 63 pages, 88 docs tests green, verify:docs exit 0 | done |
| concept pages over cap (guides, patterns, examples) | **0** paragraphs over ~4 lines (was 41 across 24 pages), guarded by `docs-copy-concepts.test.ts` | done |
| per-STORY descriptions (`docs.description.story`) | **21 judged: 13 FAIL rewritten, 6 WEAK decided; rule (l) now reads both description fields** | done |
| comment blocks over 20 lines | **0** (was 181), guarded by `lint:comment-references` | done |
| comments citing plans / IDs / dates / sections | **0** (was 156), guarded | done |
| DOC COMMENTS in `src/**/*.{ts,tsx}`, four rules: member cap, em dash in a doc comment, em dash in a rendered string, type restatement | **2,026 members + 1,166 declaration docs across 351 sources; 0 over the 160 cap, 0 em dash, 0 type restatement, 0 waivers** (`lint-prop-docs`, now the doc-and-copy guard) | done |

The copy guard `apps/docs/test/docs-copy.test.ts` now measures the page tops on every run (caps, em dashes,
instructive shapes, a lede that restates its description, anti-vacuity floors on pages, ledes, asides AND
the extracted text length). It runs inside the docs vitest step, so no workflow edit was needed.

**A fifth surface, found by the owner reading Checkbox**: a story's hand-written `argTypes`
`description` values. They are not the component's prop docs and they win in Storybook, which is why props
still read verbose after the component-side trim. `components/checkbox/checkbox.stories.tsx` is the worked
example: a three-paragraph component description became one statement, six argType descriptions became one
sentence each, and the deleted rationale is a `//` comment above the meta. **Swept and guarded now**: 26
findings across 14 files, all rewritten, and rule (m) of `lint-story-conventions` holds the 160 cap and
bans the em dash.

**The counter is the GUARD's counter, and the guard's surface is narrower than a grep's.** This paragraph
said 620 one-line values, 18 over the cap and 16 em dashes; that was a text scan that counted fixture
objects carrying a `description` (a choice list's `'N. Virginia — closest.'`) and story-level blurbs. Rule
(m) reads the `argTypes` ENTRIES, the surface that renders in the props table: **515** of them on today's
tree. When a number here and a number in a dated handoff disagree, re-run the guard's derivation.

**Every hand-written list the parent produced for this sweep was WRONG**, four times: a floating-things
list that omitted composer, a `component:` grep that matched a description field, a docs page list that
was stale by the time it was used, and a Solid prop tranche list pasted from the TAIL of a measurement
(which is how `chat-thread.tsx`, 27 props and the worst in the kit, went unassigned). The fix is not
care. Derive the list in the same command that does the work, print it, and judge the result by the
derivation: the lanes that did that found the real offenders and found that 5 of 6 files in one handed
list were already clean.

Two blind spots the passes found, both worth keeping:

- **The last 11 over-cap web-component prop descriptions are not in a facade.** They arrive in the meta
  from a SHARED Solid type: `kai-chat.reasoningOpen` (420 chars) is `ChatThreadProps.reasoningOpen`, so
  the facade-side gate could not see it. The Solid pass fixes them and the widened gate closes the hole.
  A prop's doc has one source, and for a facade that inherits its props it is the Solid one.
- **The element-description pipe inflates `llms-full.txt` by 75,917 bytes before any docstring is
  trimmed**, which puts it 29 KB over its ceiling. That is the first honest measurement of the
  docstrings' cost, and it is paid down by the trims rather than by raising the ceiling again.

## Follow-ups this sweep must not lose

- **A story description and its docs page lede are two files, one fact.** 9 of the 95 component
  descriptions are near-identical to their page's `description`/`kai-lede`; two (`kai-lightbox`,
  `kai-prompt-input`) are byte-identical to the element docstring BY DESIGN (rule 8: one source, two
  audiences). Decide in PASS D whether a page-top and a story blurb may be the same sentence, or the
  page should add the one fact the story cannot carry.
- **The wording half needs the reviewer, and always will.** `lint-story-conventions` rule (l) can only
  count paragraphs and catch docs-talk; it cannot tell whether a description TEACHES or INVENTORIES. All
  95 rendered component descriptions have now been judged once (3 batches), so the counter starts from a
  judged floor: any later edit to one of them needs a reviewer pass, not just a green lint.
- **The reviewer's three worst patterns, for the next component that lands:** the top description as the
  props table in prose, a feature inventory where the preview is the copy, and a mechanic kept in prose
  after its prop name was removed ("driven by a plain boolean in JSX").
- **`verify:docs` has a hole for HISTORICAL `kai-` names in prose.** Its `knownTokens` set is built from
  quoted `kai-…` literals and JSX tags in `packages/ui/src`, so it can only recognise a token the kit
  still names. Trimming `chat-workspace.tsx`'s docstring removed the last mention of
  `kai-sidebar-toggle`, and the guide's rename note (`guides/use-a-workspace.mdx:62`,
  "kai-sidebar-toggle is now kai-aside-toggle with a side") became an `unknown-kai-token` high finding on
  a page nobody had touched. The docs text is right and the kit simply stopped naming the old name, so
  the rule needs an exception for a rename note: either a declared per-line waiver in the checker
  (`scripts/docs-alignment/prose.mjs`, which today has NO waiver path and no prose self-test, so the
  waiver needs a prose probe first) or the rename fact kept as a `//` comment in the kit source, which
  the checker already reads. Do not "fix" it by un-backticking the old name: that dodges the guard
  silently instead of declaring the exception.
- **`verify:docs` is racy against a concurrent generator write.** A run during generation read a
  half-written `dist/web-components.d.ts` and reported 91 elements with 69 high findings; the same tree
  settled reported 1. Run the docs checks after the generators, never alongside them.

- `docs.description.story` (the per-story description, rendered on the story's own docs page) is OUT of
  scope for the current rule, which reads the component description only. Decide later whether a story
  description may mention its own story; the tree has no offender today either way.
- The JSX-in-`args` trap becomes a rule in `lint-story-conventions` (a JSX element in a story's `args`
  cannot cross the manager/preview boundary, so the fix is `render`). It is queued behind the lane that
  currently owns that file. Until it lands, the trap lives only in this paragraph and in the handoff,
  which is exactly the duplication this sweep is removing.
- `lint:prop-docs` covers BOTH roots now (`src/web-components/**` and `src/components/**`): 227 facades,
  1,586 props, 0 over the cap, 0 waived. The two blind spots below are closed.

## Done so far, kept here so it is not re-litigated

- **PASS D, the concept tier and the story blurbs.** A concept page (`guides/`, `patterns/`, `examples/`)
  keeps its prose, so the rule is about SHAPE, not size: no paragraph over ~4 rendered lines, measured as
  characters (`4 x 95 = 380`) so an author cannot pass by never wrapping. 41 paragraphs across 24 pages
  were split at sentence boundaries, and **not one word moved**: every file is proved against HEAD on two
  axes, the flattened prose AND every fenced block, because a split that merges code lines keeps the
  flattened text identical while destroying a snippet. The guard is
  `apps/docs/test/docs-copy-concepts.test.ts`, with floors on the pages (40) and paragraphs (400) read, the
  page-level `copyReview: waived -- <reason>` waiver, and extractor cases (rendered width, not source
  wrapping; fences, lists, headings, tables and the code-bearing JSX blocks skipped).
- **Rule (l) now reads the per-STORY description too** (`docs.description.story`), out of scope by decision
  until PASS D. Same bar and same reason: the reader is on that story's own page, so naming the story, the
  Labs tier or the harness tells them about the documentation rather than about what they are looking at.
  It carries the em dash ban as well, which no rule read on those 21 sites. The reviewer judged all 21:
  **13 FAIL, 6 WEAK, 2 PASS**, every FAIL and WEAK applied (worst was a 1,043-char tutorial in the Custom
  story; the class was the props table in prose, imperatives, and tag names).

- **PASS C, the comments: 162 plan/ID/date/section citations and 121 blocks over 20 lines, all swept, 9 waivers
  (each with a parsed reason).** The guard `lint:comment-references` is new: it walks every hand-written
  `src/**/*.{ts,tsx}` with the TS scanner (so `//` inside a URL is not a comment), flags a task/round/finding
  ID, an issue or PR number, a dated ruling, a section ref or a path into the DATED archive, and caps one
  comment block at 20 lines. Navigation to code and to a LIVING doc stays. Self-test 17 cases; a vitest file
  runs the script against fixture trees that must go red; its own CI step is wired and `lint:gate-parity`
  accepts it. Four reviewers read the sweep: **14 FAIL, ~50 WEAK**; every FAIL and every lost-fact WEAK is
  fixed, including one that no gate could see, a deleted `*/` in `state/stream.ts` that silently swallowed
  the next doc block.
- **Three guard defects the SWEEP lanes found, each a class the guard could not see:** a `long-block`
  waiver was unreachable on a `/** */` block (`commentsIn` coalesces a `//` line above the block into it,
  and the lookup skipped the block's own first line); `task-id` cannot tell a mask SAMPLE (`V-123`) from
  an ID, answered by a waiver; and `round 2` (the second round of a stream) is not a citation while
  `Round A3` is, so the pattern now requires the capital. A date-shaped identifier suffix
  (`gpt-4o-2024-08-06`) is excluded by the prefix rule.
- **The fixture persona is no longer a person's name.** `Ada` / `Ada Lovelace` / `Ada Reyes` across 17
  files (tests, showcase stories, the scaffolder templates and their fixture JSONs) is now `Demo User`,
  with the derived initials moved with it (`DE` in the app-header avatar, `DU` in the avatar fixture). One
  reader asked "what is Ada" of a review, which is the whole reason: a placeholder must read as one.
- **PASS B, the doc comments: 249 member sites + 220 declaration/variable-doc em dashes + 50 rendered-string
  em dashes, all rewritten, 0 waivers.** Six sweep lanes derived their own slices from the guard and ran in
  parallel on disjoint files; the guard then went green tree-wide. Four copy reviewers read the result:
  **28 FAIL, 45 WEAK, the rest PASS**. Three fix lanes applied every FAIL and (43 of 45) WEAK, and a
  re-check confirmed **28/28 FAIL resolved, 43/45 WEAK addressed, 2 accepted as judgement calls**
  (`define.tsx:172`, `conversation-store.ts:5`).
- **Two fact errors the reviewers caught, both real:** `toast-store.duration` had carried `2000`/`4000`
  as the default and the action floor while the constants are `5000`/`7000`, and `kbd.platform` had lost
  the Solid `'other'` / facade `'auto'` split. Both now state the value the code has.
- **Three runtime strings changed with the sweep, so their twins moved too:** the account-menu accessible
  name (`app-header.tsx` + its 4 test assertions + `mcp/construct/codegen.ts` + its test) and the
  dismissed-stub label (`dismissed-stub.tsx` + `card-dismiss.test.tsx`). Kit and emitted app announce one
  string each, and the unit suite is green.
- **The guard grew from one rule to four** (`lint-prop-docs`): the member cap, the em dash in ANY doc
  comment (member, declaration, `const`), the em dash in a rendered STRING, and type restatement. Scope is
  every hand-written `src/**/*.{ts,tsx}`; generated, test, story, testlib, `src/test-utils/**` and
  `src/stories/**` are out. Self-test 23 -> 24 cases; the two new branches and the em-dash branch are
  mutation-proven on the tree (a mutant in a clean file turns the run red; reverting turns it green).
- **Boundary, deliberate:** em dashes in `//` and JSX comments are NOT swept. Nothing renders them, so the
  flourish ban does not apply; the // comments that hold a ROUND ID, a date or a section ref belong to
  PASS C's `lint:comment-references`, and the reviewers routed them there.
- **The component descriptions, judged line by line** (95 of them, the string Storybook renders above the
  props table). Three copy-reviewer batches: 69 PASS, 20 WEAK, 6 FAIL, counted from the verdict ROWS in
  its three reports (each summary's own tally is off by one in batch A, which is why the rows are the
  count). Every FAIL and every WEAK rewritten; the reviewer's fact notes fixed (`voice-input` records and
  hands back the transcription, it does not transcribe; `voice-output` reads text, not a message).
  Surface total 6,194 chars, longest 108, 0 em dash, 0 over three paragraphs. Rule (l) cannot see wording,
  which is why this pass needed the reviewer and not a gate.
- **The story `argTypes` surface, all of it** (14 files, 25 sites). Rationale moved to `//` comments. The
  copy reviewer read every rewrite (17 PASS, 7 WEAK, 1 FAIL) and its FAIL plus five WEAK were applied too.
  The guard is rule (m), mutation-proven on the tree both ways (an em dash and a 168-char description each
  turn the run red).
- **The six worst Solid prop-doc files** (`chat-thread`, `builder-panel`, `input`, `nav`, `form`,
  `overlay`): 118 documented props, all 46 reviewer verdicts (11 FAIL, 35 WEAK) judged and applied, 9 of
  them deliberately different from the reviewer's suggested text. `llms-full.txt` 352,800 -> 320,495 bytes.
- The two `audio-visualizer` facts that were wrong: only aurora reads the theme colour pipeline, so the
  source comment and the story description both said something `wave.glsl.ts` never does.
- The four rendered descriptions that talked about the documentation: `lightbox` (the owner's example),
  `audio-visualizer` (five paragraphs, including which stories exist and which are sidebar-only),
  `chat-thread` (what the story pins), `scroll-button` (see the other story), `settings-group` (lives in
  `Labs/Settings`). Measured count after: 0 of 88.
- The Agent Card description: 403 -> 215 chars, and it now carries the selection fact an agent needs.
- The four copies of the JSX-in-`args` note (tooltip, hover-card, lightbox, attachments), one of which
  had leaked into the rendered props table.
- `Message.role`: 1198 -> 134, the calibration sample for "do not restate the type".
- The `lightbox` page top: description 84 -> 79, lede 155 -> 64, "When to use" 478 -> 178.

## Batches

Each row is one component. A batch is done when every surface above is clean for every component in
it, and the counters have been re-measured.

### Batch 1

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-agent-card` | — | — | — | 1 |
| `kai-artifact` | yes | — | components/artifact | 3 |
| `kai-attachments` | — | — | components/attachments | 2 |
| `kai-audio-visualizer` | yes | — | components/audio-visualizer | 6 |
| `kai-avatar` | yes | — | components/avatar | 0 |
| `kai-badge` | yes | — | components/badge | 0 |
| `kai-button` | yes | — | components/button | 2 |
| `kai-card` | — | — | components/card | 1 |
| `kai-cards` | — | — | components/cards | 3 |
| `kai-chain-of-thought` | yes | — | components/chain-of-thought | 2 |

### Batch 2

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-chat` | — | — | components/chat | 19 |
| `kai-checkbox` | yes | — | — | 1 |
| `kai-checkbox-group` | yes | — | — | 2 |
| `kai-checkpoint` | yes | — | components/checkpoint | 0 |
| `kai-choice` | — | — | components/choice | 1 |
| `kai-coachmark` | yes | yes | — | 1 |
| `kai-code-block` | yes | — | components/code-block | 0 |
| `kai-command` | yes | — | components/command | 0 |
| `kai-compare` | — | — | components/compare | 2 |
| `kai-composer` | yes | — | components/composer | 0 |

### Batch 3

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-confirm` | — | — | components/confirm | 1 |
| `kai-context` | yes | — | components/context | 0 |
| `kai-conversation-item` | — | — | — | 4 |
| `kai-conversations` | — | — | components/conversations | 5 |
| `kai-dialog` | — | — | — | 2 |
| `kai-dock` | yes | — | — | 2 |
| `kai-dropdown` | yes | — | — | 3 |
| `kai-editable-label` | yes | yes | — | 1 |
| `kai-embed` | — | — | components/embed | 0 |
| `kai-empty` | yes | — | components/empty | 0 |

### Batch 4

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-feedback-bar` | yes | — | components/feedback-bar | 0 |
| `kai-file-tree` | yes | — | components/file-tree | 0 |
| `kai-file-upload` | yes | — | components/file-upload | 0 |
| `kai-form` | — | — | components/form | 1 |
| `kai-hover-card` | yes | — | components/hover-card | 1 |
| `kai-icon` | yes | — | components/icon | 0 |
| `kai-image` | yes | — | components/image | 1 |
| `kai-image-artifact` | — | — | components/image-artifact | 2 |
| `kai-input` | yes | yes | — | 4 |
| `kai-kbd` | yes | yes | components/kbd | 0 |

### Batch 5

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-kbd-group` | — | — | — | 0 |
| `kai-lightbox` | yes | yes | components/lightbox | 5 |
| `kai-link-preview` | — | — | components/link-preview | 0 |
| `kai-loader` | yes | — | components/loader | 1 |
| `kai-markdown` | yes | — | components/markdown | 0 |
| `kai-menu` | — | — | components/menu | 5 |
| `kai-message` | yes | — | components/message | 4 |
| `kai-model-switcher` | yes | — | components/model-switcher | 2 |
| `kai-nav` | yes | yes | — | 0 |
| `kai-notice` | yes | — | components/notice | 0 |

### Batch 6

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-pane` | yes | — | — | 1 |
| `kai-pane-grid` | — | — | — | 1 |
| `kai-pane-group` | — | — | — | 1 |
| `kai-panel` | yes | — | — | 1 |
| `kai-panel-header` | — | — | — | 0 |
| `kai-popover` | yes | — | components/popover | 1 |
| `kai-progress-bar` | yes | — | — | 0 |
| `kai-prompt-dock` | — | — | — | 2 |
| `kai-prompt-input` | yes | — | components/prompt-input | 5 |
| `kai-radio-group` | — | — | — | 2 |

### Batch 7

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-reasoning` | yes | — | components/reasoning | 1 |
| `kai-remote` | — | — | components/remote | 0 |
| `kai-resizable` | yes | — | components/resizable | 1 |
| `kai-resizable-item` | — | — | components/resizable-item | 1 |
| `kai-response-stream` | — | — | components/response-stream | 0 |
| `kai-row` | yes | — | — | 1 |
| `kai-row-group` | yes | — | — | 0 |
| `kai-scope-picker` | — | — | components/scope-picker | 1 |
| `kai-screen` | yes | yes | — | 1 |
| `kai-scroll-area` | yes | — | components/scroll-area | 0 |

### Batch 8

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-scroll-button` | yes | yes | components/scroll-button | 2 |
| `kai-search` | — | yes | — | 0 |
| `kai-segmented` | — | — | — | 1 |
| `kai-select` | yes | — | — | 2 |
| `kai-separator` | yes | — | components/separator | 0 |
| `kai-setting-item` | — | — | — | 0 |
| `kai-settings-group` | — | — | — | 0 |
| `kai-skeleton` | yes | — | components/skeleton | 0 |
| `kai-skills` | — | — | components/skills | 1 |
| `kai-slider` | yes | — | — | 2 |

### Batch 9

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-source` | yes | — | components/source | 0 |
| `kai-sources` | — | — | components/sources | 2 |
| `kai-status` | yes | yes | — | 0 |
| `kai-suggestions` | — | — | components/suggestions | 2 |
| `kai-switch` | yes | — | components/switch | 1 |
| `kai-tab-bar` | yes | — | — | 1 |
| `kai-tab-bar-item` | — | — | — | 1 |
| `kai-tabs` | yes | yes | — | 0 |
| `kai-tasks` | — | — | components/tasks | 1 |
| `kai-text-shimmer` | yes | — | components/text-shimmer | 0 |

### Batch 10

| component | solid story | element story | docs page | props over cap |
|---|---|---|---|---|
| `kai-thinking-bar` | yes | — | components/thinking-bar | 0 |
| `kai-thread` | yes | — | — | 4 |
| `kai-toast-region` | — | — | — | 2 |
| `kai-tool` | — | — | components/tool | 1 |
| `kai-tooltip` | yes | — | components/tooltip | 1 |
| `kai-view` | — | — | — | 1 |
| `kai-view-stack` | yes | — | — | 2 |
| `kai-voice-input` | yes | — | components/voice-input | 2 |
| `kai-voice-output` | yes | — | — | 1 |
| `kai-workspace` | — | — | components/workspace | 5 |

