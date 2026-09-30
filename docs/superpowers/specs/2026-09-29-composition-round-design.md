# The composition round — umbrella design (2026-09-29)

**Status:** approved in session by the owner ("Yeah you can write the specs and start. I feel
comfortable with you moving forward on everything… Go for it."). Five sub-project specs sit
beside this one:

| id | spec | one line |
|---|---|---|
| A | [`2026-09-29-A-composition-contract-design.md`](2026-09-29-A-composition-contract-design.md) | tiers, the three mechanisms, the preset rule and its guard, root theme inheritance, the `ChatThread` → `ChatApp` rename |
| B | [`2026-09-29-B-thread-message-activity-design.md`](2026-09-29-B-thread-message-activity-design.md) | composable thread + message, the part-renderer registry, `kai-activity`, `kai-plan` |
| C | [`2026-09-29-C-questions-design.md`](2026-09-29-C-questions-design.md) | the Claude-Desktop-style question panel above the prompt; confirm/choice/form/tasks cards removed |
| D | [`2026-09-29-D-conversation-rail-design.md`](2026-09-29-D-conversation-rail-design.md) | the rail keyboard mechanism for web-component authors, the rail pattern, the command-trigger pattern |
| E | [`2026-09-29-E-removals-design.md`](2026-09-29-E-removals-design.md) | `kai-agent-card` → a pattern; `kai-artifact` toolbar → slots; ViewStack documented as navigation |
| P | [`2026-09-30-P-prompt-attachments-design.md`](2026-09-30-P-prompt-attachments-design.md) | added after the checkpoint: content grows into the prompt input's card; `PromptDock` retired |

## 1. Why this round exists

The 2026-09-29 audit of `feat/blocks-exemplar-and-wiring` found the `assistant` block had
become a sealed demo app (a 2,391-line controller, a 3,158-line CDN form) delivered through a
bespoke template DSL compiled to seven framework forms. The owner agreed, the kit work was split
out verbatim to PR #420, and the block branch was parked (tag `backup/blocks-exemplar-2026-09-29`).

The owner then named what is wrong with the kit itself, in his words:

> one problem i have with components like this, is they are config instead of composed. I would
> rather the items be composed so if there is something the developer doesnt like or want they
> can modify it. when we have a component like this that is just configuration, we either have
> to provide every option, or they choose not to use it altogether.

This is not a new direction. It was ruled twice before and not finished: the 2026-07-01
composition-first RFC (`docs/superpowers/specs/2026-07-01-composition-first-architecture-proposal.md`)
and the 2026-08-20 "construction over configuration" ruling (the workspace re-cast, #302). Only
`kai-conversation-item` + item mode shipped. This round finishes the thread, message, cards,
tool display, rail, agent card and artifact toolbar.

## 2. Decisions of record

Every owner answer from the 2026-09-29 session, verbatim where it was typed.

| # | question | owner answer |
|---|---|---|
| 1 | Split the kit work out of the block branch? | "yes agree, yes split. the work we have done on the compoents themselves should not be lost… what we have for the compoennts should remain in tack, for the split." |
| 2 | Pre-existing reds on the split | "yeah component failures should be fixed because those are bugs regardless" |
| 3 | Delivery forms | "I like your idea of just focusing on the "web components" maybe we dont need to have the React implementation" |
| 4 | Composition over configuration | "I thik that is where patterns really works in design systems. showing users how to compose complex UI structures." |
| 5 | Search/filter/collapse | "those can dispatch events and then it is up to the applciation to provide the different states… a command with a "trigger" component such as a button… common pattern in other react components like radix ui/shadcn ui." |
| 6 | AgentCard | "the dev or AI agent constructing with our components would create a native wrapper component like Agent Card and construct it using these different parts. We would just provide patterns" |
| 7 | Artifact | "exceptions are things like Artifact where it is complex and providing a "mini" app-like solution is okay… possibly we should be using slots instead of configuration" |
| 8 | Review gates | **One visual checkpoint** — Storybook mockups of the question panel and the activity line first, then run to the end |
| 9 | Compatibility | **Break now** — remove outgrown API in this round; pre-1.0, a `feat!` minor bump |
| 10 | Generated React wrappers | **Keep** — no React patterns or templates authored |
| 11 | Where patterns live | **Docs + `kai add`** — story + docs page + `kai add <pattern>`; `/blocks` becomes `/patterns` |
| 12 | Question panel placement | **Above the composer**, with the note: "I really like how Labs/Apps/Claude Code and Labs/Apps/Codex work there is this section that appears above the composer. I can see it sliding up and having a nice look to it and it feels natural. I think the user should always have hte option to type in their own answer if they want… the questions hsould be placed near the prompt, because they are responses." |
| 12b | Clarification | "I'm not suggesting that you make it work like those examples with the Claude code or the Codex examples. You know how that works in Claude Desktop, and that's what I want. I was just using that as an example so you can see the information that shows up above and sometimes below the prompt" |
| 13 | After submit | ~~**Compact receipt**~~ — superseded by 21 |
| 14 | Which cards become question types | **Confirm, Choice, Form, Tasks** |
| 15 | Activity line | **Summary, expand to steps** — collapsed one line, expand to a step timeline, a step expands to args/result |
| 16 | Typing while the panel is open | ~~**Answers the active question**~~ — superseded by 22 (the panel replaces the composer; custom answers are an "Other" option) |
| 17 | Tasks | **Both** — Tasks is a checklist question type AND a new agent plan/progress display |
| 18 | Presets | **Keep presets, rebuilt** on the public composed parts |
| 19 | `kai-chat` | **Only what flows through**; a full recast is a later round |

**Checkpoint rulings (2026-09-30, two rounds).**

| # | question | owner answer |
|---|---|---|
| 20 | How content attaches to the prompt | **Variant B, "grows into the input"**: "the first one adds a border when there isn't one, so I think that may look weird", and "always having a wrapper around the prompt input feels wrong". The input card owns surface, shadow and ring; attached content sits inside its top area over a hairline divider; nothing attached is pixel-identical to today. `kai-prompt-dock`/`PromptDock` are **retired** (break now). Spec P. |
| 21 | How the submitted answers look | **Variant (a), the user bubble**: a normal user bubble of `Label: answer` lines, labels bold, long and multi-line answers wrapping. The data stays one tool result (spec C §4). |
| 22 | The question panel | **v2 with composer variant A**: the panel **replaces** the composer while open; segmented tabs (clickable to go back); Back beside Next; a small outline "Let's chat" button (`dismissLabel` prop or `dismiss` slot) hands the composer back, then a quiet "N questions waiting · Reopen" line; custom answers are an **"Other"** last numbered option with an inline auto-growing textarea (its number key selects and focuses it; Enter advances, Shift+Enter newline). The composer-as-answer path is removed. |
| 22a | One-click approval | **Not answered by the owner. SUPERVISOR DEFAULT, reversible:** a panel whose only question is a confirm submits on one click; multi-question panels keep Submit. Likewise "Dismissed with some answers shows a bubble plus a muted 'Skipped: …' line" is a supervisor default. |
| 23 | Activity line and plan display | **Approved in round 1** as mocked. The plan attaches through decision 20, not a dock. |

## 3. The tier model

| tier | what it is | where it lives | size |
|---|---|---|---|
| **Component** | one `kai-*` element: behaviour, accessibility, and the look of one thing | `packages/ui` | — |
| **Pattern** | a small composition of components you copy and own (an agent card, a conversation rail, a message with activity) | a Storybook story + an `apps/docs` page under `/patterns/` + `kai add <pattern>` | 50–200 lines, plain HTML/TS web components |
| **Template** | a whole app | a `create-kai` starter | unbounded |

"Block" is retired as a word. The existing `packages/blocks` package keeps its three items for
now; converting or retiring them is out of scope for this round (see §8).

## 4. The three composition mechanisms

| need | mechanism | example |
|---|---|---|
| fixed regions | **named slots** | `kai-artifact` `slot="toolbar"`, `kai-prompt-input` `above`/`below` |
| repeated items | **app-rendered children**; the container adds scroll, focus and ARIA over them | `<kai-thread>` holding `<kai-message>`s; `<kai-conversations>` holding `<kai-conversation-item>`s (already shipped) |
| "draw this data my way" inside a list a preset renders | a **tag registry**: data type → custom-element tag; the kit creates the tag and sets `.part` | `el.renderers = { 'tool:web_search': 'my-search-step' }` |

Slots cannot repeat a template per data row, so they are never the answer for lists; looping over
data is the framework's job. Spec A defines the registry shape once for the whole kit.

## 5. The preset rule

**A preset may render only public parts.** Every preset (`kai-thread` with `messages`,
`kai-conversations` with `conversations`, `kai-question-panel` with `questions`, `kai-activity`
with `steps`, `kai-chat`) must build its output from components that a consumer can also reach:
a Solid component re-exported from `src/solid.ts`, or a registered `kai-*` tag.

Enforced by a new required lint, `lint:preset-parts` (spec A §5): it reads a checked-in list of
preset facade modules, resolves every `components/**` import they make, and fails if an imported
symbol is not exported from `src/solid.ts`. Plus, per preset, a **parity test**: the preset's
rendered DOM equals the composed form's DOM for a shared fixture.

## 6. Root theme inheritance

Today every element resolves its own `theme` (`'light' | 'dark' | 'auto'`, `define.tsx:29-43`)
and toggles a `.dark` class inside its own shadow root, so a page has to set `theme` on every
element (the assistant block carried `:theme="themeMode"` on ~40 elements). Spec A replaces the
mechanism with one inherited custom property, `--kai-color-scheme`, and `light-dark()` tokens:
set it once on `:root` and every element follows. The per-element `theme` prop stays as a local
override. Details, the migration of the `.dark` token block, and the JS-side resolver are in
spec A §6.

## 7. Sequencing, branches, and the checkpoint

**Branches.** Integration branch `feat/composition` (off `feat/kit-components`, PR #420). Each
work unit runs on its own branch off `feat/composition` in its own worktree
(`.claude/worktrees/comp-<unit>`), and lands on `feat/composition` by squash-merge after
independent verification. When #420 merges to `main`, `feat/composition` is merged with `main`
and one final PR `feat/composition` → `main` carries the round, titled `feat!:`.

**Order.**

1. **A0** (the `ChatApp` rename) lands first, alone, because it touches files B and C edit.
2. **Checkpoint mockups B0 + C0** run in parallel with the rest of A. They are Storybook stories
   with static stub data and no wiring. **The owner looks once.** Nothing in B or C past the
   mockups starts before the owner's reply.
3. **A** (registry, theme, preset lint, docs tier) runs to completion.
4. **B** and **C** after the checkpoint and after A's registry lands. B owns `MessageBody` and the
   registry wiring; C plugs its receipt into that registry, so C's receipt task follows B's
   registry task.
5. **D** and **E** run in parallel with B and C. Their files are disjoint (conversation, artifact,
   agent-card). E's card removals live in C, not E, because the question panel replaces them.

**The checkpoint deliverable:** Storybook stories under `Checkpoint/…`, light and dark, of the
question panel (single-select, multi-select, with previews, several questions with the review
step, the receipt collapsed and expanded), the activity line (collapsed, streaming, expanded, one
step expanded) and the plan display (pending, running, done). Built from real kit primitives
where they exist. **Done 2026-09-30** over two rounds (branches `feat/comp-b0`, `feat/comp-c0`;
rulings 20-23 above). The mockup stories stay on those branches as references and are not merged.

**Status and remaining order (2026-09-30).** Merged on `feat/composition`: all of A, D and E, the
extra rounds K1-K3 and DA, and B1. Remaining, in the order the plans give:

```
P1 attachment regions ── P2 retire PromptDock
B2 activity ── B3 MessageBody + renderers ── B6 scaffolder/docs
B4 thread rows + item mode (after B3)
B5 kai-plan (after B1 + P1)
C1 kai_ask helpers + threadRows ── C2 panel v2 ── C4 kai-chat (after P1, B5, C2, C3)
                                └ C3 answers bubble (after B4)
C4 ── C5a / C5b / C5c removals ── C6 docs
```

## 8. Non-goals

- A full `kai-chat` recast (decision 19).
- Converting the three `packages/blocks` items to patterns; the pattern tier gets its first
  members here (agent card, conversation rail, command trigger, composed thread) and the old
  blocks are dealt with in a later round.
- Authoring React patterns or templates (decision 10 keeps only the generated wrappers).
- The `/patterns` page redesign beyond renaming the section and listing the new patterns.

## 9. What every sub-project must honour

From the repo `CLAUDE.md`, restated because each one has bitten this repo before:

- `kai-` prefix; arrays and objects are JS properties; events are non-bubbling `kai-*`
  CustomEvents read from `event.detail`.
- The reactivity contract: a new array reference AND a new object per changed item
  (`src/components/reactivity-contract.test.tsx`).
- **Model output is untrusted.** Question text, option labels, descriptions, previews, plan item
  labels and tool arguments shown in the activity line all come from the model: rendered as text
  (`textContent`/Solid text nodes), never `innerHTML`; any URL goes through `isSafeUrl`
  (`src/primitives/url-scheme-policy.ts`). Each new sink gets a hostile-output test in the style
  of `tests/components/markdown-xss.test.tsx`, asserting the source text stays visible and inert.
- **Decide loudly.** Every drop, clamp or refusal (too many questions, an unknown question kind,
  an unanswered required question) is surfaced: a `console.warn` at minimum, a visible state
  where a user is waiting.
- `lint:silent-drops` stays green; this round adds **no** `MessagePart` variant (spec C §4
  explains why the receipt lives in the tool part).
- Generated artifacts are regenerated by `npm run build:api` inside `packages/ui` and committed,
  never hand-edited; never run `gen-llms.mjs` standalone.
