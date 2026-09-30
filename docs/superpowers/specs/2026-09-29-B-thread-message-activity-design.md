# B — Thread, message, activity and plan (2026-09-29)

Part of the [composition round](2026-09-29-composition-round-design.md); builds on
[A](2026-09-29-A-composition-contract-design.md) (the registry, the preset rule, root theme).
Owner decisions: 15 (activity: summary → steps → args), 17 (plan display), 18 (presets stay,
rebuilt), 19 (`kai-chat` flow-through only), 20 (content attaches by growing into the prompt input),
23 (activity line and plan display approved at the checkpoint).

**Amended 2026-09-30 after the visual checkpoint.** The activity line and plan display were
approved as mocked (round 1, branch `feat/comp-b0`, `stories/checkpoint/{activity,plan}.stories.tsx`).
The plan now attaches to the prompt input's `above` region (spec
[P](2026-09-30-P-prompt-attachments-design.md)), not a dock band. The thread's list renders from
C's `threadRows(messages)` so C's answers bubble can sit between messages (§2). B1 is merged.

## 1. What is true today

- `<kai-thread>` (`web-components/thread/thread.tsx`) takes `messages: ChatMessage[]` and has one
  slot, `empty`. `<kai-message>` takes a `message` object, plus `before-body` / `after-body` /
  `avatar` slots. Neither accepts app-rendered children for content.
- `MessageBody` (`components/message/message.tsx:344-770`) renders parts in one closed
  `<Switch>`: `text` → markdown, `reasoning` → `<Reasoning>` (with `reasoningMode`
  `'full' | 'compact' | 'off'`), `tool` → `<Tool>` (the bold panel the owner dislikes, line 761),
  `card` → `CardRenderer` (the only swappable part, via `cardTypes`), `source` and `file` runs
  grouped by `groupMessageParts` (line 431).
- `MessagePart` is a closed union (`web-components/chat/chat-types.ts:65-93`); `ToolPart`
  (`components/tool/tool-types.ts`) has a lifecycle `state` and no timing. Parts carry no
  timestamps, so "Thought for 6s" has no data today.
- `kai-chain-of-thought` exists (`steps`, `type`, `value`), and `ChainOfThoughtAccordion` is public.
- `createAssistantStream` (`state/stream.ts:93`) is the sink every adapter writes into; the folds
  in `state/parts.ts` are pure (`TOOL_KEYS`/`TOOL_COMPARATORS`, line 222, gate `ToolPart` fields).

## 2. The composable thread and message

**`<kai-thread>` item mode.** When the element has light-DOM `<kai-message>` children, it renders
them (a default slot inside its scroll viewport) and ignores `messages`; with no children it is
the preset and renders `messages`. The switch follows the `kai-conversations` precedent
(`web-components/conversation/conversation-list.tsx`: children decide the mode, and setting both
warns once, deciding loudly). In either mode the element owns: the scroll viewport,
stick-to-bottom (`primitives/use-stick-to-bottom.ts`, observing the slot's content box so
app-rendered children still stick), `role="log"` with `aria-live="polite"`, the scroll-to-bottom
button, the `loading` pending indicator after the last child, the `empty` slot, `density`, and the
`scrollToBottom()` method.

**`<kai-message>` composed mode.** When it has light-DOM children in the default slot, those
children are the body and the `message` prop is ignored (warned once if both are set). It keeps
the row chrome: alignment by `role` (`user` right bubble, `assistant` full width), the action bar
(`actions`, `actionsReveal`, `kai-message-action`), and the existing `before-body`, `after-body`
and `avatar` slots. The body children are ordinary kit elements: `<kai-markdown>` for text,
`<kai-activity>`, card elements, `<kai-sources>`, `<kai-attachments>`, or the app's own element.
Mode detection uses `readSlots` over a `MutationObserver`, the same as `kai-thread`'s `empty`.

**The preset.** `messages` on `kai-thread` and `message` on `kai-message` keep working, rebuilt on
the same parts: the preset's `MessageBody` renders each part group through public components
(`Markdown`, `Activity`, `CardRenderer`, `Sources`, `Attachments`), and `lint:preset-parts` (A §5)
enforces it. A parity test per preset (A's helper) compares preset vs composed DOM for a fixture
containing every part variant.

**Display rows.** `Thread` (preset mode) and `ChatApp` render their list from C's
`threadRows(messages)` rather than from `messages` directly, so a non-message row (C's answers
bubble) can sit between two messages. C1 lands `threadRows` first; B4 introduces the row loop and
renders only `message` rows; C3 renders the `answers` rows.

**The part registry.** Both elements (and `kai-chat`, flow-through) gain
`renderers?: Record<string, string>` (A's `RendererMap`), as a JS property. Keys, most specific
first:

| key | receives (`el.part`) |
|---|---|
| `tool:<toolName>` (e.g. `tool:web_search`) | the `{ type: 'tool', tool }` part, rendered as a custom activity step |
| `tool` | any tool part, as an activity step |
| `reasoning` | a reasoning part, as an activity step |
| `text` | a text part (replaces markdown for that part) |
| `source`, `file` | the run of parts, as `el.parts` |

`card:*` keys are **not** accepted: cards keep `cardTypes`, the card layer's own documented
registry that the remote-card contract relies on. A `card:` key warns once and is ignored.

## 3. `kai-activity`

**One quiet line** in the reasoning style for every consecutive run of `reasoning` and `tool`
parts. Text between runs splits them, so an interleaved turn gets several lines, matching the
`Labs/.../interleaved` thread.

```
◦ Thought for 6s · Searched the web · Read 3 files ›          (collapsed; the default)
◦ Searching the web…                                          (streaming: live step, shimmer)
▾ Thought for 6s · Searched the web · Read 3 files            (expanded: the timeline)
    ✓ Thought                    6s
    ✓ Searched the web         1.2s  ›   (a tool step expands to its arguments and result)
    ✗ Read src/app.ts          0.1s  ›   (an error step shows its error text)
```

**Element: `<kai-activity>`.**

| surface | name | notes |
|---|---|---|
| prop | `steps: ActivityStep[]` | data mode (JS property) |
| prop | `streaming: boolean` | shows the live step + `kai-text-shimmer` on the summary |
| prop | `open` / `defaultOpen` | the timeline disclosure (controlled / uncontrolled) |
| prop | `detail: 'full' \| 'summary'` | `summary` = the line only, no disclosure; maps from `reasoning: 'compact'` |
| prop | `renderers` | keys `tool:<name>`, `tool`, `reasoning`; the element gets `el.step` |
| slot | default | composed mode: `<kai-activity-step>` children |
| event | `kai-open-change` | `{ open }` |
| event | `kai-step-toggle` | `{ id, open }` |
| methods | `show()`, `hide()`, `toggle()` | |

**Element: `<kai-activity-step>`** (the composed child): props `label`, `status`
(`running | done | error`), `kind` (`reasoning | tool`), `duration` (ms, optional); default slot =
the step's detail content (shown when the step is expanded). The container stamps roving focus
over steps with `createRovingTabList` (`primitives/roving-tab-list.ts`, already public).

**Data.**

```ts
export interface ActivityStep {
  id: string;
  kind: 'reasoning' | 'tool';
  status: 'running' | 'done' | 'error';
  /** Overrides the derived label. */
  label?: string;
  toolName?: string;
  toolKind?: ToolKind;          // from classifyTool (primitives/tool-classify.ts)
  text?: string;                // reasoning text, rendered as safe markdown
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  startedAt?: number;           // epoch ms
  endedAt?: number;
}
export function activityStepsFromParts(parts: MessagePart[]): ActivityStep[];
export function summarizeActivity(steps: ActivityStep[], opts?: { streaming?: boolean }): string;
```

Both in `src/primitives/activity.ts` (no Solid, no DOM; exported from `@kitn.ai/ui` and
`@kitn.ai/ui/state`). `summarizeActivity` labels: reasoning → "Thought" (+ " for Ns" when timed);
tool by `ToolKind`: `search` → "Searched", `fetch` → "Read N pages", `file-change` → "Edited N
files", `command` → "Ran N commands", `image` → "Generated an image", `mcp` and `generic` → "Used
<toolName>"; consecutive steps of one kind collapse into a count; the streaming form is the live
step's present participle ("Searching…"). The label table is one exported constant so the MCP
reference can quote it.

**Timing (new optional data).** `ToolPart` and the `reasoning` part gain
`timing?: { startedAt: number; endedAt?: number }`. `createAssistantStream` stamps it through an
injectable clock (`createAssistantStream(setMessages, { now })`, default `Date.now`); the pure
folds only merge the field, so `state/` stays deterministic in tests. `TOOL_KEYS` and
`TOOL_COMPARATORS` gain `timing` (the compile-time guard at `state/parts.ts:218` forces this). The
wire encoders ignore it (it is a field on existing variants, not a new variant, so
`lint:silent-drops` is unaffected). Without timing the summary omits durations; nothing breaks.

**Security.** Tool names, arguments, results and reasoning text are model output. Arguments and
results render as text inside `<kai-code-block>` (JSON, no HTML); reasoning renders through the
kit's existing markdown sink, which is already hardened (`markdown-xss.test.tsx`). A new
`activity-hostile-output.test.tsx` feeds `<img onerror>`, `javascript:` links and a 50k-char
argument, asserting inert, visible text and a clamp **with** a visible "truncated" marker (decide
loudly).

**What goes.** `MessageBody` stops rendering `<Tool>` for tool parts. `kai-tool` the element and
the `Tool` component stay (standalone use); whether to delete them is raised to the owner in the
report. `reasoningMode`/`kai-chat`'s `reasoning` prop now drives the activity: `full` = expandable
(default), `compact` = `detail="summary"`, `off` = reasoning steps hidden (tool steps still show).

## 4. `kai-plan` — the agent's plan

The Claude-Code-todo-style list of what the agent is doing, pinned above the composer while it
runs.

**Where it comes from.** A new card-free tool, `kai_plan`, whose input is the full list every time:

```ts
{ items: { id: string; label: string; status: 'pending' | 'in_progress' | 'completed' }[] }
```

`planTool({ provider })` (in `@kitn.ai/ui/schemas`, beside `cardTools`) emits the definition;
`isPlanTool(name)` recognises it. The host answers it immediately with
`applyToolOutput(stream, id, { ok: true })` — it is display, not a question. `planFromMessages(messages)`
(`primitives/plan.ts`) returns the latest `kai_plan` input, or `undefined`.

**Element: `<kai-plan>`.** Props `items: PlanItem[]` (data mode), `open`/`defaultOpen`
(collapsed shows "3 of 7 done · <current in_progress label>"), `label` (default "Plan"); composed
mode takes `<kai-plan-item status>` children; event `kai-open-change`. It is designed to sit in
the prompt input's `above` region (spec P), where it grows into the input's card over a hairline
divider. It carries no surface of its own. In the thread, a `kai_plan` tool part shows as one
activity step, "Updated the plan".

**`kai-chat` flow-through.** `kai-chat` derives `planFromMessages(messages)` and shows `kai-plan`
in the prompt input's `above` region when present; new prop `plan: 'auto' | 'off'` (default
`auto`). While C's question panel replaces the composer the plan is not shown; after "Let's chat" it
shares the `above` region with C's waiting line, collapsed to its one line.

## 5. Everything that moves

- **Solid:** new `components/activity/activity.tsx` (`Activity`, `ActivityStep` component),
  `components/plan/plan.tsx`; `MessageBody` groups `reasoning`/`tool` runs (extend
  `groupMessageParts` with an `activity` group) and renders `<Activity>`; `Thread` and `Message`
  gain the children/composed paths; all new symbols exported from `src/solid.ts`.
- **Web components:** `kai-activity`, `kai-activity-step`, `kai-plan`, `kai-plan-item` registered
  (`register-impl.ts`, the manifest, the autoloader map); `kai-thread`, `kai-message`, `kai-chat`
  gain `renderers`; `kai-chat` gains `plan`.
- **Generated:** `web-component-meta.json`, `web-component-types.d.ts`, `web-component-manifest.json`,
  `web-component-nonscalar.json`, React wrappers, `docs/web-components.md`, `llms-full.txt`,
  `custom-elements.json` — via `npm run build:api`, committed.
- **MCP:** `component_reference` picks the new tags up from meta; the scaffolder's emitted Solid
  `renderPart` (`mcp/mcp/tools/scaffold.ts`) renders reasoning/tool runs through `Activity`
  (grouped with the exported `groupMessageParts`); `verify:scaffold`'s solid structural check keeps
  asserting every `MessagePart` variant has a branch; the construct catalog
  (`mcp/catalog`, `mcp/construct`) learns the new tags from meta.
- **Docs:** component pages for `activity` and `plan`; `thread.mdx` and `message.mdx` rewritten
  composition-first (the composed form shown first, `messages` as the preset); a
  `/patterns/composed-thread` pattern; `guides/tool-calls` (or the page covering tool display)
  updated.
- **Starters:** `examples/starters/*` that render tool parts pick up the activity automatically
  through `kai-chat`/`kai-thread`; the Solid starter's own `renderPart` is updated like the
  scaffolder's.

## 6. Testing

- Red first: a test that a tool part in a thread renders `kai-activity` (not `<Tool>`'s panel) is
  written and watched fail before `MessageBody` changes.
- Unit: `activityStepsFromParts` over every combination (reasoning only, tools only, interleaved
  with text, error, streaming), `summarizeActivity` label table, timing stamping with a fake clock,
  `TOOL_KEYS` compile guard, `planFromMessages`.
- Parity: `kai-thread` preset vs composed; `kai-message` preset vs composed; `kai-activity` steps vs
  composed steps.
- In-browser (storybook project + a Playwright IVP): a streamed turn in `kai-chat` shows the live
  step with shimmer and settles to the summary; expand and step-expand by mouse and keyboard;
  composed `kai-thread` with app children sticks to bottom while a child grows; `kai-plan` in the
  prompt input's `above` region updates as `kai_plan` calls arrive; light and dark; axe on every new story.
- Consumer gates: `verify:consumer`, `verify:scaffold`, `verify:generated`, `verify:solid-coverage`,
  `lint:preset-parts`, `lint:silent-drops`.

## 7. Acceptance

1. A turn with reasoning and tool calls renders as one quiet activity line per run, expandable to
   steps, each tool step expandable to arguments and result; no bold tool panel in any thread.
2. `<kai-thread>` and `<kai-message>` accept app-rendered children, with scroll, stick-to-bottom,
   live region and action bar intact; `messages`/`message` presets unchanged in output.
3. `renderers` swaps how a specific tool, all tools, reasoning or text render.
4. `kai-plan` shows the agent's latest plan above the composer in `kai-chat`.
5. The checkpoint mockups (B0) were shown to the owner before any of the above was wired.

## 8. Risks

- Stick-to-bottom over slotted children: the observer must watch the slot's assigned content; a
  spike in the first wiring task proves it.
- Duration display depends on the new timing field; persisted threads from before this change
  show no durations (acceptable, stated in docs).
- Grouping changes the visual order only within a run; the part ORDER in `parts` is untouched, so
  the wire round-trip is unaffected (`round-trip.test.ts` must stay green).
