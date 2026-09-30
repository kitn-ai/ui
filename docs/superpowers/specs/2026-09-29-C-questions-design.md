# C — Questions above the prompt (2026-09-29)

Part of the [composition round](2026-09-29-composition-round-design.md); builds on
[A](2026-09-29-A-composition-contract-design.md) (registry, preset rule, dock band animation) and
plugs its receipt into [B](2026-09-29-B-thread-message-activity-design.md)'s part registry.
Owner decisions: 12 and 12b (above the composer, Claude Desktop behaviour), 13 (compact receipt),
14 (confirm, choice, form, tasks all become question types), 16 (typing answers the active
question), 17 (tasks is a question type; the plan display is B's).

> 12b, verbatim: "You know how that works in Claude Desktop, and that's what I want. I was just
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
- `kai-prompt-dock` has `top` and `bottom` band slots; A animates them.
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
| `answerQuestions(messages, toolCallId, result)` | `@kitn.ai/ui/state` | returns a new array with that tool part at `output-available`, `output = result` (new array, new message object, new part object: the reactivity rule) |
| `approvalQuestion(toolPart, opts?)` | `@kitn.ai/ui/state` | builds a `confirm` question for a tool call the APP wants approved before it runs; the app decides what to do with the answer |

## 3. The panel

Sits in `kai-prompt-dock`'s `top` band and slides up (A §7a). The composer stays below it.

```
┌ [✓ Scope] [● Tone] [ Due ] [ Review ]                       Dismiss & just chat ┐
│ How formal should the reply be?                                                  │
│  1  Casual        Contractions, short sentences          │ ┌ preview ─────────┐ │
│  2  Neutral       Plain and direct                       │ │ Hey — quick one… │ │
│  3  Formal        Full sentences, no contractions        │ └──────────────────┘ │
│  Or type your own answer below ↓                                    [ Next → ] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Or type your own answer…                                                   [↑]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Behaviour.**

- **Chips** across the top, one per question plus **Review** when there are two or more
  questions. The active chip is marked; an answered one shows a check. Click or ←/→ (while focus is
  in the panel) moves between them. The panel's own roving focus uses `createRovingTabList`.
- **Options** are rows: number, label, one-line description. Keys 1–9 pick (focus in the panel);
  choice single-select behaves as a radio group (picking advances to the next question), choice
  multi-select and tasks as checkbox groups (Enter or **Next** advances), confirm as two options
  (Approve / Deny unless the model supplied the pair). Semantics: `role="radiogroup"`/`"group"`
  with real radio/checkbox roles, labelled by the question text.
- **Previews.** When any option of the active question has `preview`, the layout becomes list +
  preview side by side; the preview pane shows the focused option's preview in a monospace block
  rendered as **text**. At narrow widths (the panel's own container query) the preview stacks
  under the list.
- **Your own answer.** The composer is always the free-text route. While the panel is open its
  placeholder reads "Or type your own answer…"; Enter records the text as the active question's
  `text` answer (replacing a selection for choice/confirm/tasks; beside `values` for form) and
  advances. The panel shows "Your answer: …" on that question with an edit affordance. This is
  wired through the panel's `answerActive(text)` method so any composer, not only the kit's, can
  do it; `kai-chat` wires its own.
- **Review.** Lists each question → answer, each row a link back to its question. **Submit** is
  enabled when every `required` question has an answer; otherwise it is disabled and the reason is
  visible ("2 questions still need an answer"). With exactly one question there is no Review tab:
  the question carries **Submit** itself.
- **Dismiss & just chat.** Always visible in the panel header. It fires `kai-questions-dismiss`
  with the partial answers; the host records `status: 'dismissed'` as the tool result and sends the
  composer text as an ordinary user message. The panel slides away.
- **Focus.** The panel takes focus when it opens (first option of the first question). Esc returns
  focus to the composer without dismissing. Tab order: chips → options → Next/Submit → Dismiss →
  composer.

**Security.** Every string in a question is model output: header, question, labels,
descriptions, previews, placeholders. All render as Solid text nodes; previews in a `<pre>` via
text; no `innerHTML` anywhere in the panel; no URL is made navigable. A
`question-panel-hostile-output.test.tsx` feeds HTML, `javascript:` strings and 100k-char previews
and asserts inert, visible text (confirmed in real Chromium first, per the repo rule), plus a
visible clamp marker on the long preview.

## 4. The receipt, and why it lives in the tool part

After submit, the thread shows a compact receipt on the user's side:

```
                                           You · Answered 3 questions ›
                                               Scope → Just this repo
                                               Tone  → Casual
                                               Due   → Friday
```

**Where the data lives.** The answers are the `kai_ask` tool part's `output` (§2.2). The receipt is
how that part renders: B's registry gets a built-in renderer for key `tool:kai_ask` that is
excluded from activity grouping. Pending → a quiet line in the activity style, "Waiting for your
answers"; answered → `<kai-answer-receipt>` aligned to the user side; dismissed → "Skipped ·
answered 1 of 3 ›". Apps override it through `renderers['tool:kai_ask']`.

**Why not a user message with a new part type.** The owner's picture was "a compact receipt in the
user's turn". Putting the data in a new `MessagePart` variant on a user message would (a) duplicate
the answers the tool result already carries, (b) add a variant every encoder must handle or waive
under `lint:silent-drops`, and (c) put two user turns in a row on the Anthropic wire (the encoder
merges them, `encode.ts` `pushUser`). Rendering the answered tool part on the user side gives the
same picture with one source of truth and **no new `MessagePart` variant**. The next assistant
turn is a new message, so the receipt sits visually between the question and the reply. This is a
deliberate interpretation and is listed in the round's report.

## 5. Elements and API

| element | props (JS properties unless scalar) | slots | events | methods |
|---|---|---|---|---|
| `kai-question-panel` | `questions: Question[]` (preset), `toolCallId`, `value: Answer[]` / `defaultValue`, `activeIndex` / `defaultActiveIndex`, `renderers` (keys `question:<kind>`; element gets `el.question`), `label` | default: composed `<kai-question>` children | `kai-answer-change {answers}`, `kai-active-change {index, questionId}`, `kai-questions-submit {toolCallId, result}`, `kai-questions-dismiss {toolCallId, result}` | `next()`, `prev()`, `select(index)`, `answerActive(text)`, `submit()`, `focus()` |
| `kai-question` | `questionId`, `header`, `question`, `kind`, `multiSelect`, `placeholder`, `required` | default: `<kai-question-option>` children; `fields` slot for a composed form | — | — |
| `kai-question-option` | `label`, `description`, `preview` (text) | `preview`: app-authored rich preview (trusted: the app wrote it) | — | — |
| `kai-answer-receipt` | `answers: Answer[]`, `status`, `open` / `defaultOpen` | — | `kai-open-change {open}` | `show()`, `hide()`, `toggle()` |

The `form` kind renders the existing `Form` component's field widgets (`components/form/form-widgets.tsx`)
inside the question, so masking and field formats are reused, not rebuilt.

**`kai-chat` flow-through.** `kai-chat` derives `pendingQuestions(messages)` and shows the panel in
its dock's top band (collapsing B's plan to one line while it is open), routes composer Enter to
`answerActive` while it is open, and re-emits `kai-questions-submit` / `kai-questions-dismiss`.
The host calls `answerQuestions` and sends the next request. No other `kai-chat` changes.

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
  `tool_result` whose content is the `AskResult` JSON (and the OpenAI `role: 'tool'` equivalent);
  an unanswered `kai_ask` is dropped exactly as today (fixture test on both encoders).
- `questionsFromToolCall`: valid, missing ids, unknown kind (error, not a throw), over-limit (warns,
  keeps), malformed options.
- Panel unit + browser: single, multi, tasks, confirm, text, form; number keys; own answer via
  `answerActive`; review gating with a visible reason; dismiss; focus on open; Esc to composer;
  previews side by side and stacked; the hostile-output test; axe on every story; light/dark.
- `kai-chat` IVP (Playwright over the mock responder with a scripted `kai_ask`): the panel slides
  up, typing in the composer answers the active question, submit patches the thread, the receipt
  shows on the user side, the next request carries the tool result, the model's continuation
  renders.
- Parity: `questions` preset vs composed `<kai-question>` children.
- Consumer gates: `verify:scaffold` (the ask path compiles in every framework), `verify:consumer`,
  `verify:generated`, `verify:schemas`, `verify:tool-schemas` (updated), `lint:silent-drops`,
  `lint:preset-parts`, and the spike conformance run for the replaced scenario.

## 8. Acceptance

1. A model's `kai_ask` opens the panel above the composer; nothing is added inside the thread
   until it is answered, except the quiet "Waiting for your answers" line.
2. Every question kind works by mouse, keyboard (arrows, 1–9, Enter, Esc) and the composer.
3. Submit sends the answers as the call's tool result; the model continues; the receipt shows on
   the user side and expands to Q → A.
4. `kai-confirm`, `kai-choice`, `kai-tasks` and the four card types are gone with no dangling
   reference; `kai-form` still works standalone.
5. The checkpoint mockups (C0) were shown to the owner before any wiring.

## 9. Risks

- **Providers that require an immediate tool result.** Both Anthropic and OpenAI accept a turn
  that ends on a tool call and a later request that supplies the result. A host that runs a
  strict server-side agent loop (LangGraph, Mastra) may need its own pause; the integration docs
  for those gateways say how, and `verify:scaffold` compiles each route's ask path.
- **Persisted threads with old cards.** A stored thread containing a `confirm`/`choice`/`tasks`/
  `form` card envelope now hits the card dispatcher's unknown-type fallback (it renders the
  existing "unknown card" fallback and warns), which is the loud path. Stated in the release notes.
- The panel shares the dock's top band with B's plan; the stacking rule (plan collapses while the
  panel is open) is tested in the `kai-chat` IVP.
