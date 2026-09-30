# C — Questions above the prompt (2026-09-29)

Part of the [composition round](2026-09-29-composition-round-design.md); builds on
[A](2026-09-29-A-composition-contract-design.md) (registry, preset rule),
[P](2026-09-30-P-prompt-attachments-design.md) (content grows into the prompt input) and
[B](2026-09-29-B-thread-message-activity-design.md)'s thread rendering.
Owner decisions: 12 and 12b (near the prompt, Claude Desktop behaviour), 14 (confirm, choice, form,
tasks all become question types), 17 (tasks is a question type; the plan display is B's), and the
checkpoint rulings **21** (the answers are a user bubble) and **22** (question panel v2: the panel
replaces the composer while open, tabs, Back/Next, "Let's chat", an "Other" option). Rulings 21 and
22 supersede decisions 13 (compact receipt) and 16 (typing in the composer answers the question).

**Amended 2026-09-30 after the visual checkpoint.** References: branch `feat/comp-c0`,
`packages/ui/src/stories/checkpoint/question-panel-v2.stories.tsx` (the `questions-v2` stories) and
`answer-receipt-v2.stories.tsx` (the `Bubble: …` stories).

> Decision 12b, verbatim: "You know how that works in Claude Desktop, and that's what I want. I was just
> using that as an example so you can see the information that shows up above and sometimes
> below the prompt"

## 1. What is true today

- Four interactive cards render **inside the thread**: `kai-confirm`, `kai-choice`, `kai-form`,
  `kai-tasks`, registered as card types in `BUILTIN_CARD_TAGS` (`primitives/card-tags.ts`, 7 types:
  form, confirm, tasks, choice, link, embed, artifact).
- The model reaches them through card tools: `cardTools({ provider })` (`schemas/tool-defs.ts:628`)
  emits one `kai_<type>` tool per card; `cardFromToolCall` (`schemas/from-tool-call.ts`) turns the
  call into a `CardEnvelope` whose `id` is the provider `tool_call_id`.
- The documented loop closes the call at once with `applyToolOutput(stream, call.id, { status:
  'awaiting_user' })` (`guides/schemas-as-tools.mdx:18-22`), then the user's answer comes back as a
  `CardEvent` (`action` / `submit`, `primitives/card-contract.ts`) that the **app** must turn into
  "the tool result for the matching id, or a new user turn" (`guides/generative-ui.mdx:145`). The
  kit gives no helper for that step, and the model has already been told `awaiting_user`.
- Resolved cards stay in the thread as a read-only chromed card (`CardResolution`,
  `primitives/card-resolution.ts`).
- The wire encoders emit a tool call only once it is **settled** (has `output` or `errorText`):
  `toAnthropicMessages` emits `tool_use` + a `tool_result` in the following user message, and
  drops an unsettled call (`wire/encode.ts:780-800`); `toOpenAIMessages` does the same with a
  `role: 'tool'` message (`encode.ts:364`).
- `kai-prompt-dock` had `top` and `bottom` band slots (A5 animated them); spec P retires it in
  favour of attachment regions inside the prompt input's own card.
- `kai-form` (2,174 lines across `components/form/*`, with the field-format/masking work of #311)
  is also a general-purpose form element, not only a card.

## 2. The model: a question is a tool call that waits

One tool, `kai_ask`, modelled on how Claude Desktop asks: 1–4 questions, each with a short header
chip, options with descriptions, optional previews, and a free-text answer always available.

**The call is not closed early.** The host's tool loop leaves `kai_ask` **unanswered**: the turn
ends with the tool part at `input-available`. When the user submits, the answers become that
call's **real tool result**. This is the native protocol for both providers, it is what the
encoder already does for a settled call, and it means the model receives the answers as the
result of the question it asked, not as an out-of-band user message. It replaces the
`awaiting_user` pattern for questions.

```
assistant: …text…, tool_use kai_ask {questions}         ← turn ends; panel opens
(user answers in the panel, submits)
answerQuestions(messages, toolCallId, result)            ← patches the tool part: output = result
next request: … assistant(tool_use) → user(tool_result {answers})   ← model continues
```

### 2.1 The tool's input schema

`primitives/question-schemas/ask.schema.json` (new; the schema IS the tool's input schema, the
same identity rule as `cardFromToolCall`):

```ts
type QuestionKind = 'choice' | 'confirm' | 'tasks' | 'text' | 'form';
interface QuestionOption { label: string; description?: string; preview?: string }
interface Question {
  id?: string;               // defaulted to `q<index>` by questionsFromToolCall
  header: string;            // chip label; schema maxLength 12
  question: string;
  kind: QuestionKind;
  multiSelect?: boolean;     // choice only
  options?: QuestionOption[];// choice: 2–6; tasks: 1–12; confirm: optional pair overriding Approve/Deny
  placeholder?: string;      // text
  fields?: FormFieldSchema;  // form: the existing kai-form JSON-schema subset, reused
  required?: boolean;        // default true
}
interface AskInput { questions: Question[] }   // schema: minItems 1, maxItems 4
```

`maxItems`/`maxLength` guide the model; the **panel renders whatever arrives** (chips scroll,
long headers ellipsize with the full text in a tooltip) and warns once in the console when the
input exceeds the schema, because what a model may send is not the kit's to refuse silently.

### 2.2 The result the model receives

```ts
interface Answer {
  questionId: string; header: string; question: string; kind: QuestionKind;
  selected?: string[];              // option labels (choice, tasks, confirm)
  text?: string;                    // the user's own words (always possible) or the text kind
  values?: Record<string, unknown>; // form
}
type AskResult =
  | { status: 'answered'; answers: Answer[] }
  | { status: 'dismissed'; answers: Answer[] };   // partial answers kept
```

Question text is echoed in each `Answer` so the tool result reads on its own in the transcript.

### 2.3 Server and state helpers

| helper | entry | does |
|---|---|---|
| `askTool({ provider })` | `@kitn.ai/ui/schemas` | the `kai_ask` tool definition, beside `cardTools` |
| `isAskTool(name)` | `@kitn.ai/ui/schemas` | the loop's check: `if (isAskTool(call.name)) continue;` |
| `questionsFromToolCall(name, input, { id })` | `@kitn.ai/ui/schemas` | validates and normalises to `{ id, questions }`, or `{ error }` (never throws); the host sends `error` back with `applyToolFailure` so the model retries |
| `pendingQuestions(messages)` | `@kitn.ai/ui/state` | the open `kai_ask` of the last assistant message, or `undefined` |
| `answerQuestions(messages, toolCallId, result)` | `@kitn.ai/ui/state` | returns a new array with that tool part at `output-available`, `output = result` (new array, new message object, new part object: the reactivity rule). Idempotent: the same result on an already-answered call returns the input array unchanged; a DIFFERENT result on an answered call is refused, returns the input unchanged and warns once (a double submit must not rewrite history) |
| `settlePendingQuestions(messages)` | `@kitn.ai/ui/state` | settles an open `kai_ask` as `{ status: 'dismissed', answers: <the partial answers passed, or []> }`; the host calls it before appending a normal user message while questions are waiting, so the next request never carries a dangling call (the encoder would silently drop it and the model would forget it asked) |
| `threadRows(messages)` | `@kitn.ai/ui/state` | the display rows of a thread: `{ kind: 'message', message }` for each message, plus `{ kind: 'answers', key, toolCallId, result }` right after the assistant message holding an answered or dismissed-with-answers `kai_ask` (§4). Pure; the thread renders from it |
| `approvalQuestion(toolPart, opts?)` | `@kitn.ai/ui/state` | builds a `confirm` question for a tool call the APP wants approved before it runs; the app decides what to do with the answer |

## 3. The panel (v2)

**While questions are open the panel REPLACES the composer** (decision 22, "composer variant A").
It takes the prompt input's place and its card look (the composer's rounded surface and shadow), so
the thread's bottom edge does not jump. Mockup: `Composer A: Panel Replaces It`.

```
┌ [ Scope ✓ | Tone ● | Due | Review ]                                   ( Let's chat ) ┐
│ How formal should the reply be?                                                        │
│  1  Casual        Contractions, short sentences          │ ┌ preview ─────────────┐ │
│  2  Neutral       Plain and direct                       │ │ Hey, quick one…      │ │
│  3  Formal        Full sentences, no contractions        │ └──────────────────────┘ │
│  4  Other         [ auto-growing textarea               ]                           │
│                                                              [ Back ]  [ Next → ]   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Behaviour.**

- **Header: segmented tabs**, one per question plus **Review** when there are two or more questions.
  The active tab is selected; an answered one shows a check. Tabs are clickable, including to go
  back. Semantics: `role="tablist"`, arrow keys between tabs, the panel body is the `tabpanel`.
- **Back beside Next.** Back is disabled on the first question. Next becomes **Submit** on the last
  step (Review, or the only question).
- **Options** are numbered rows (number, label, one-line description). Number keys pick while focus
  is inside the panel. Single-select behaves as a radio group and picking advances; multi-select and
  tasks behave as checkbox groups and Next advances. Real radio/checkbox roles labelled by the
  question text.
- **"Other" is the last numbered option** on choice, confirm and tasks questions. Its number key
  selects it **and** focuses an inline textarea that grows with its content. Enter advances;
  Shift+Enter inserts a newline. For single-select, Other replaces the selection; for multi-select
  and tasks it is added beside the ticked options (`selected` plus `text`). The `text` kind is the
  textarea alone; the `form` kind is the existing form widgets plus an optional Other note.
  Mockup: `Other Selected`.
- **The composer-as-answer path is removed** (decision 16 is superseded). There is no
  `answerActive`; a custom answer is the Other textarea.
- **Previews.** When any option of the active question has `preview`, the body becomes list +
  preview side by side (the focused option's preview, monospace, rendered as text); narrow
  containers stack them (the panel's own container query).
- **Review.** Each question → answer row links back to its tab. **Submit** is enabled when every
  `required` question has an answer; otherwise disabled with the reason visible ("1 question still
  needs an answer").
- **One-click approval (SUPERVISOR DEFAULT, reversible).** A panel whose only question is a
  `confirm` submits on the click of Approve or Deny, with no separate Submit. Every multi-question
  panel keeps Submit. The owner was asked and did not answer; this default is recorded in the
  umbrella's decisions table as reversible, and it is one branch in the panel
  (`isOneClick(questions)`), so reversing it is a one-line change plus its test.
- **"Let's chat".** A small outline button in the header dismisses the panel and hands the composer
  back. Its text is the `dismissLabel` prop (default "Let's chat"), following the kit's
  `submitLabel`/`stopLabel` precedent, or the whole control is replaced through a `dismiss` slot.
  It fires `kai-questions-dismiss` with the partial answers; it does **not** settle the call.
- **Waiting, then Reopen.** After "Let's chat", the composer is back and a quiet line attached to it
  (the prompt input's `above` region, spec P) reads "2 of 3 questions waiting · Reopen" (the count
  is of unanswered questions). Reopen brings the panel back with the answers kept. Mockup:
  `Composer A: After Let's Chat`. If the user sends a normal message instead, the host calls
  `settlePendingQuestions(messages)` first: the call is settled as `dismissed` with the partial
  answers, the waiting line goes, and the model receives both the dismissed result and the message.
- **Focus.** On open, focus goes to the first option of the first question. After "Let's chat"
  focus goes to the composer (the host or `kai-chat` moves it on `kai-questions-dismiss`). Reopen
  returns focus to the panel's active option.

**Security.** Every string in a question is model output: header, question, labels, descriptions,
previews, placeholders. All render as Solid text nodes; previews in a `<pre>` via text; no
`innerHTML`; nothing navigable. `question-panel-hostile-output.test.tsx` feeds HTML, `javascript:`
strings and a 100k-char preview and asserts inert, visible text (confirmed in Chromium first), and a
visible clamp marker on the long preview. The user's own Other text is rendered the same way.

## 4. The answers: a user bubble, one tool result

**The look (decision 21, variant (a)).** The submitted answers appear as the **user's turn**: an
ordinary user bubble whose lines are `Label: answer`, the label bold, long and multi-line answers
wrapping naturally (`white-space: pre-line`). Mockups: `Bubble: Short Answers`,
`Bubble: Long Answers`, `Bubble: Long Answers Narrow`.

```
                                            ┌───────────────────────────────┐
                                            │ **Scope:** Just this repo     │
                                            │ **Tone:** Casual              │
                                            │ **Due:** Friday, but Monday   │
                                            │ is fine if the review slips.  │
                                            └───────────────────────────────┘
```

**The data (unchanged from the first spec).** The answers are stored once, as the `kai_ask` tool
part's `output`. The wire sends exactly one `tool_result` for the call and **no** extra user text
turn, so Anthropic never sees two user turns in a row and nothing is duplicated.

**How the look and the data meet.** The bubble is a **display row**, not a message.
`threadRows(messages)` (§2.3) yields an `answers` row right after the assistant message that holds
the answered `kai_ask`. `Thread`/`kai-thread` (preset mode) and `ChatApp`/`kai-chat` render their list
from `threadRows`, and render an `answers` row as a user-aligned `Message` row (`role="user"`) whose
body is the new `kai-answers` content. The next assistant reply is a new message, so the order on
screen is: question text → your answers → reply. The row has no action bar (no edit, regenerate or
feedback, since it is not a message). Composed-mode apps (B's item mode) render the same row
themselves: `<kai-message role="user"><kai-answers></kai-answers></kai-message>` with
`answers.result = row.result`, which is what the `ask-before-acting` pattern shows.

- **Pending** questions add no row; the only sign in the thread is the assistant's own text. The
  panel is where the pending state lives.
- **Dismissed with no answers** adds no row. **Dismissed with some** adds the bubble with the
  answered lines and one muted line, "Skipped: Tone, Due" (supervisor default; reversible).
- The `tool:kai_ask` key in B's part registry renders **nothing** inside the assistant message (the
  bubble is the row above), and an app can still override it.
- **Other text** in a bubble line is the user's own words: rendered as text, never markdown.

## 5. Elements and API

| element | props (JS properties unless scalar) | slots | events | methods |
|---|---|---|---|---|
| `kai-question-panel` | `questions: Question[]` (preset), `toolCallId`, `value: Answer[]` / `defaultValue`, `activeIndex` / `defaultActiveIndex`, `dismissLabel` (default "Let's chat"), `submitLabel` (default "Submit"), `renderers` (keys `question:<kind>`; element gets `el.question`), `label` | default: composed `<kai-question>` children; `dismiss`: replaces the Let's chat control | `kai-answer-change {answers}`, `kai-active-change {index, questionId}`, `kai-questions-submit {toolCallId, result}`, `kai-questions-dismiss {toolCallId, answers}` | `next()`, `back()`, `select(index)`, `submit()`, `focus()` |
| `kai-question` | `questionId`, `header`, `question`, `kind`, `multiSelect`, `placeholder`, `required`, `allowOther` (default true for choice/confirm/tasks) | default: `<kai-question-option>` children; `fields` slot for a composed form | — | — |
| `kai-question-option` | `label`, `description`, `preview` (text) | `preview`: app-authored rich preview (trusted: the app wrote it) | — | — |
| `kai-questions-waiting` | `count`, `total`, `reopenLabel` (default "Reopen") | — | `kai-reopen` | — |
| `kai-answers` | `result: AskResult` | — | — | — |

`kai-answers` is only the bubble's content (the lines); the bubble is the `kai-message` row around
it, so it looks like every other user turn by construction.

The `form` kind renders the existing `Form` component's field widgets (`components/form/form-widgets.tsx`)
inside the question, so masking and field formats are reused, not rebuilt.

**`kai-chat` flow-through.** `kai-chat` derives `pendingQuestions(messages)`. While the panel is
open it renders `QuestionPanel` **in place of** the composer; after "Let's chat" it shows the
composer with `kai-questions-waiting` in the prompt input's `above` region (collapsing B's plan to
its one line there if both are present); it renders the thread from `threadRows`. It re-emits
`kai-questions-submit` and `kai-questions-dismiss`, and its `kai-submit` detail gains
`pendingQuestions?: string` (the open call's id) so the host knows to call
`settlePendingQuestions` first. The host calls `answerQuestions` / `settlePendingQuestions` and sends
the next request. No other `kai-chat` changes.

## 6. Removals (decision 9, break now)

Removed, with every reference found by a scoped grep over `packages/ui/{src,mcp,frameworks,scripts,tests,apps}`,
`packages/{create-kai,blocks,cli,mcp}`, `apps/docs/src`, `examples` (132 files match the card
names; the implementer re-runs the grep and accounts for every hit):

- Elements `kai-confirm`, `kai-choice`, `kai-tasks` and their Solid components `ConfirmCard`,
  `ChoiceCard`, `TasksCard` (`components/{confirm-card,choice-card,tasks}/`,
  `web-components/{confirm-card,choice,tasks}/`), with their stories and tests.
- Card types `confirm`, `choice`, `tasks`, `form` from `BUILTIN_CARD_TAGS` and
  `BUILTIN_CARD_COMPONENTS`; their schemas (`primitives/card-schemas/{confirm,choice,tasks,form}.schema.json`,
  `tasks.result.schema.json`, `form.result.schema.json`) and data types (`card-data-types.ts`);
  their tool definitions in `cardTools` and entries in `provider-subsets.ts`, `registry.ts`, the
  generated validation schemas (`scripts/gen-card-validation-schemas.mjs`), `copy-card-schemas.mjs`,
  `verify-schemas-exported.mjs`, `verify-tool-schemas.mjs`.
- **`kai-form` stays** as a general form element; only its card registration goes. (The approved
  wording was "removed … as thread cards"; the element carries #311's masking work and is used
  outside cards.)
- The remaining card types are `link`, `embed`, `artifact`. `CARD_CONTRACT_VERSION` does not bump:
  no contract shape changes, only the built-in set.
- MCP: the card catalog and `component_reference` entries, `debug-rules.ts`, the scaffolder's
  card path (`mcp/mcp/tools/scaffold.ts`, `mcp/tests/emitted-card-path.live.test.ts` → an ask path),
  `mcp/construct/{codegen,schema}.ts`, `mcp/catalog/derived.json` (regenerated).
- `state/mock.ts`: the mock responder's card-tool examples become a `kai_ask` example.
- Docs: `components/{confirm,choice,tasks}.mdx` removed with redirects to `/components/question-panel/`;
  `guides/generative-ui.mdx` and `patterns/generative-ui-cards.mdx` rewritten (cards are display,
  questions ask); `guides/schemas-as-tools.mdx` gains the `askTool` loop; `CardsDemo.tsx` and the
  docs/theme-studio samples (`kai-{choice,confirm,tasks}.ts`) removed or replaced.
- Examples: `examples/apps/ops-console` and `examples/apps/builder` move to `kai_ask`;
  `examples/internal/openrouter-spike` scenarios `s07-confirm-card`, `s08-choice-card`,
  `s10-tasks-card` are replaced by one `kai_ask` scenario, because the `spike-conformance`
  workflows run on changes to that directory.
- Generated artifacts, React wrappers, `llms-full.txt`, `docs/web-components.md`, manifest,
  autoloader map: regenerated by `build:api`.

## 7. Testing

- Red first: `answerQuestions` + `toAnthropicMessages` produce `tool_use` then a user
  `tool_result` whose content is the `AskResult` JSON (and the OpenAI `role: 'tool'` equivalent),
  and **no** additional user text block; an unanswered `kai_ask` is dropped exactly as today;
  `settlePendingQuestions` then a user message encodes as one `tool_result` plus the user's text in
  the same (merged) user turn on Anthropic.
- `questionsFromToolCall`: valid, missing ids, unknown kind (error, not a throw), over-limit (warns,
  keeps), malformed options.
- `threadRows`: an answered ask yields one `answers` row after its message; pending yields none;
  dismissed-empty none; dismissed-partial a row with the skipped headers; keys are stable across
  re-derivation (no remount on an unrelated message change).
- Panel unit + browser: tabs (click and arrows, including going back), Back/Next, single, multi,
  tasks, confirm (one-click when alone, Submit when with others), text, form; number keys only with
  focus inside the panel; Other (its number key focuses the textarea, Enter advances, Shift+Enter
  newline, the textarea grows); review gating with a visible reason; Let's chat with a custom
  `dismissLabel` and with a `dismiss` slot; the waiting line and Reopen keeping answers; focus
  moves; previews side by side and stacked; the hostile-output test; axe on every story; light/dark.
- Bubble: `Label: answer` lines with bold labels, long and multi-line answers wrap at a narrow width
  (Chromium screenshot against the `Bubble: Long Answers Narrow` mockup), hostile Other text inert.
- `kai-chat` IVP (Playwright over the mock responder with a scripted `kai_ask`): the panel replaces
  the composer; answering by keys and by Other; Let's chat hands the composer back with the waiting
  line; Reopen; Submit patches the thread; the bubble appears between the question and the reply;
  the next request carries exactly one tool result; sending a normal message while questions wait
  settles them as dismissed first.
- Parity: `questions` preset vs composed `<kai-question>` children.
- Consumer gates: `verify:scaffold` (the ask path compiles in every framework), `verify:consumer`,
  `verify:generated`, `verify:schemas`, `verify:tool-schemas` (updated), `lint:silent-drops`,
  `lint:preset-parts`, and the spike conformance run for the replaced scenario.

## 8. Acceptance

1. A model's `kai_ask` replaces the composer with the question panel; nothing is added to the thread
   while it is pending.
2. Every question kind works by mouse and keyboard (tabs, Back/Next, number keys, Other with
   Enter/Shift+Enter); Let's chat hands the composer back with a Reopen line.
3. Submit sends the answers as the call's single tool result; the model continues; the answers show
   as a user bubble of `Label: answer` lines between the question and the reply.
4. `kai-confirm`, `kai-choice`, `kai-tasks` and the four card types are gone with no dangling
   reference; `kai-form` still works standalone.
5. The one-click approval default is recorded as reversible in the umbrella's decisions table.

## 9. Risks

- **Providers that require an immediate tool result.** Both Anthropic and OpenAI accept a turn
  that ends on a tool call and a later request that supplies the result. A host that runs a
  strict server-side agent loop (LangGraph, Mastra) may need its own pause; the integration docs
  for those gateways say how, and `verify:scaffold` compiles each route's ask path.
- **Persisted threads with old cards.** A stored thread containing a `confirm`/`choice`/`tasks`/
  `form` card envelope now hits the card dispatcher's unknown-type fallback (it renders the
  existing "unknown card" fallback and warns), which is the loud path. Stated in the release notes.
- **A display row that is not a message.** Anything that indexes the thread by message (scroll
  anchoring, "jump to message", persistence) must key on messages, not rows; `threadRows` keys are
  derived from the tool call id so they are stable. The `kai-chat` IVP covers stick-to-bottom across
  the inserted row.
- While the panel replaces the composer, B's plan is not visible (it attaches to the composer); it
  returns with the composer after Let's chat or submit. Accepted: the panel is the focus while open.
