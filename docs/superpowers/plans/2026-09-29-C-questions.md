# C — Questions Above the Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confirm/choice/form/tasks thread cards with a Claude-Desktop-style question panel that slides up above the composer, returns the answers as the `kai_ask` tool call's real result, and leaves a compact receipt on the user's side of the thread.

**Architecture:** One tool (`kai_ask`) whose schema is the question input; server-safe helpers in `@kitn.ai/ui/schemas`; pure thread helpers in `@kitn.ai/ui/state`; Solid `QuestionPanel`/`AnswerReceipt` with facades; the receipt is B's built-in renderer for `tool:kai_ask`; `kai-chat` wires the panel into its dock. No new `MessagePart` variant: the answers live in the tool part's `output`.

**Tech Stack:** SolidJS, `defineWebComponent`, JSON Schema, vitest (unit, storybook), Playwright IVP over `createMockResponder`.

**Spec:** `docs/superpowers/specs/2026-09-29-C-questions-design.md`

## Global Constraints

- Everything in plan A's Global Constraints applies.
- **C0 comes first; nothing else in C starts until the supervisor relays the owner's checkpoint reply.**
- C1 needs A0; C2 needs A1 + A5; C3 needs B3; C4 needs C2, C3, B5; C5a–c need C1–C4 merged (they delete what C replaces).
- Every string in a question is model output: Solid text nodes only, previews via text in `<pre>`, no `innerHTML`, no navigable URL.
- `kai-form` the element stays; only the `form` card type goes.
- `CARD_CONTRACT_VERSION` does not change.

## Shared files (supervisor serializes)

`src/solid.ts`, `src/index.ts`, `src/state/index.ts`, `src/schemas/index.ts`, `register-impl.ts`, autoloader map, `scripts/preset-facades.json`, `primitives/card-tags.ts` (C5a only), `schemas/tool-defs.ts` (C1 and C5b — C1 adds `askTool`, C5b removes card tools; sequential), generated artifacts, `pnpm-lock.yaml`.

## Task graph

```
C0 checkpoint mockups (parallel with plan A) ── OWNER LOOK ──┐
C1 schema + helpers + encoder fixtures ── C2 panel ── C4 kai-chat flow-through + IVP ── C5a/C5b/C5c removals (parallel, disjoint) ── C6 docs
                                     └──── C3 receipt (after B3) ┘
```

## Review Focus

1. The user submits, the network request fails, and they submit again: the thread must not end up with the answers applied twice or the tool part in a half state — pinned in C1 Step 1 (`answerQuestions` is idempotent for the same result and refuses a second different result for an already-answered call, loudly).
2. The model sends a `kai_ask` with zero questions, an unknown `kind`, or a 13-character header: nothing throws; the host gets an `{ error }` for the first two and a warning for the third — pinned in C1 Step 1.
3. A page reload while the panel is open: `pendingQuestions(messages)` must re-open the same panel from the persisted thread — pinned in C1 Step 1 and C4 Step 1.
4. The user types in the composer while focus is inside the panel's option list: the number keys must pick options only when focus is in the panel, never while typing in the composer — pinned in C2 Step 1.
5. A thread persisted before this round containing a `confirm` card envelope: it must render the loud unknown-card fallback, not a blank — pinned in C5a Step 1.

---

### Task C0: Checkpoint mockups — the question panel and the receipt (stories only)

**Files:**
- Create: `packages/ui/src/stories/checkpoint/question-panel.stories.tsx`, `packages/ui/src/stories/checkpoint/answer-receipt.stories.tsx`

**Constraints:** static stub data; no new public API; no edits outside these files. Built on real primitives: `PromptDock` (top band), `DefaultPromptInput` (the composer below, placeholder "Or type your own answer…"), `Button`, `Kbd`, `Icon`, `RadioGroup`/`Checkbox` looks where they fit, `CodeBlock`-style monospace for previews. Behaviour may be faked locally in the story (a signal for the active chip) so the owner can click through; nothing reusable is built. Title prefix `Checkpoint/`. Light and dark for every story.

- [ ] **Step 1: Stories**:
  - `Single Select` — one question, three options with descriptions, number badges 1–3, Submit on the question.
  - `Multi Select` — checkboxes, Next.
  - `With Previews` — list on the left, monospace preview of the focused option on the right; a `Narrow` variant stacks them.
  - `Several Questions` — chips `Scope ✓`, `Tone ●`, `Due`, `Review`; clicking chips switches; "Dismiss & just chat" in the header.
  - `Review Step` — Q → A list with edit links, Submit enabled; a `Review Step Incomplete` variant with Submit disabled and "1 question still needs an answer".
  - `Own Answer` — a question showing "Your answer: …" recorded from the composer.
  - `Confirm` — Approve / Deny.
  - `Tasks` — a checklist question.
  - `Form` — two fields using the existing `Form` widgets.
  - `Receipt Collapsed` / `Receipt Expanded` / `Receipt Dismissed` — right-aligned, muted, inside a thread between an assistant question line and the next assistant reply; the pending "Waiting for your answers" line.
- [ ] **Step 2: Verify** storybook project over `src/stories/checkpoint` (axe), `lint:story-conventions`, typecheck; screenshots of every story in light and dark to the supervisor's scratch dir.
- [ ] **Step 3: Commit** — `docs(stories): checkpoint mockups for the question panel and the answer receipt`.

**Verification type:** in-browser IVP (screenshots read back) + axe. **Then STOP for the owner.**

---

### Task C1: The `kai_ask` schema, server helpers, state helpers, encoder fixtures

**Files:**
- Create: `packages/ui/src/primitives/question-schemas/ask.schema.json`, `packages/ui/src/primitives/questions.ts` (types), `packages/ui/src/schemas/ask.ts` + `ask.test.ts`, `packages/ui/src/state/questions.ts` + `questions.test.ts`, `packages/ui/src/wire/ask-round-trip.test.ts`
- Modify: `packages/ui/src/schemas/tool-defs.ts` (`askTool`), `src/schemas/index.ts`, `src/state/index.ts`, `src/index.ts`, `scripts/verify-tool-schemas.mjs` (include `kai_ask`)

**Interfaces:**
- Produces (exact):
  ```ts
  export type QuestionKind = 'choice' | 'confirm' | 'tasks' | 'text' | 'form';
  export interface QuestionOption { label: string; description?: string; preview?: string }
  export interface Question { id: string; header: string; question: string; kind: QuestionKind; multiSelect?: boolean; options?: QuestionOption[]; placeholder?: string; fields?: Record<string, unknown>; required: boolean }
  export interface QuestionSet { id: string; questions: Question[] }          // id = toolCallId
  export interface Answer { questionId: string; header: string; question: string; kind: QuestionKind; selected?: string[]; text?: string; values?: Record<string, unknown> }
  export type AskResult = { status: 'answered'; answers: Answer[] } | { status: 'dismissed'; answers: Answer[] };
  export const ASK_TOOL_NAME = 'kai_ask';
  export function isAskTool(name: string): boolean;
  export function askTool<P extends ToolProvider>(opts: { provider: P }): ToolDefFor<P>;
  export function questionsFromToolCall(name: string, input: unknown, opts: { id: string }): QuestionSet | { error: string } | null; // null = not kai_ask
  export function pendingQuestions(messages: ChatMessage[]): QuestionSet | undefined;
  export function answerQuestions(messages: ChatMessage[], toolCallId: string, result: AskResult): ChatMessage[];
  export function approvalQuestion(tool: ToolPart, opts?: { header?: string; question?: string }): Question;
  ```

- [ ] **Step 1: Failing tests**

```ts
// schemas/ask.test.ts
import { describe, it, expect, vi } from 'vitest';
import { questionsFromToolCall, isAskTool } from './ask';
describe('questionsFromToolCall', () => {
  it('returns null for other tools', () => { expect(questionsFromToolCall('get_weather', {}, { id: 'c' })).toBeNull(); });
  it('normalises ids and required', () => {
    const r = questionsFromToolCall('kai_ask', { questions: [{ header: 'Tone', question: 'How formal?', kind: 'choice', options: [{ label: 'Casual' }, { label: 'Formal' }] }] }, { id: 'call_1' });
    expect(r).toEqual({ id: 'call_1', questions: [expect.objectContaining({ id: 'q0', required: true, kind: 'choice' })] });
  });
  it('errors (never throws) on zero questions and on an unknown kind', () => {
    expect(questionsFromToolCall('kai_ask', { questions: [] }, { id: 'c' })).toEqual({ error: expect.stringMatching(/at least one question/) });
    expect(questionsFromToolCall('kai_ask', { questions: [{ header: 'x', question: 'y', kind: 'poll' }] }, { id: 'c' })).toEqual({ error: expect.stringMatching(/unknown kind "poll"/) });
    expect(() => questionsFromToolCall('kai_ask', 'garbage', { id: 'c' })).not.toThrow();
  });
  it('keeps an over-long header but warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = questionsFromToolCall('kai_ask', { questions: [{ header: 'A very long header', question: 'q', kind: 'text' }] }, { id: 'c' });
    expect((r as { questions: { header: string }[] }).questions[0].header).toBe('A very long header');
    expect(warn).toHaveBeenCalledTimes(1); warn.mockRestore();
  });
  it('isAskTool', () => { expect(isAskTool('kai_ask')).toBe(true); expect(isAskTool('kai_confirm')).toBe(false); });
});
```

```ts
// state/questions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { pendingQuestions, answerQuestions } from './questions';
import type { ChatMessage } from '../web-components/chat/chat-types';
const ask = { questions: [{ header: 'Tone', question: 'How formal?', kind: 'choice', options: [{ label: 'Casual' }, { label: 'Formal' }] }] };
const thread = (): ChatMessage[] => [
  { id: 'u', role: 'user', parts: [{ type: 'text', text: 'draft it' }] },
  { id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'One question.' }, { type: 'tool', tool: { type: 'kai_ask', state: 'input-available', toolCallId: 'call_1', input: ask } }] },
];
const result = { status: 'answered' as const, answers: [{ questionId: 'q0', header: 'Tone', question: 'How formal?', kind: 'choice' as const, selected: ['Casual'] }] };
describe('questions state', () => {
  it('finds the open ask on the last assistant message (and after a reload)', () => {
    expect(pendingQuestions(JSON.parse(JSON.stringify(thread())))?.id).toBe('call_1');
  });
  it('answerQuestions settles the tool part with new array, message and part objects', () => {
    const before = thread(); const after = answerQuestions(before, 'call_1', result);
    expect(after).not.toBe(before); expect(after[1]).not.toBe(before[1]); expect(after[0]).toBe(before[0]);
    const tool = (after[1].parts[1] as { tool: { state: string; output: unknown } }).tool;
    expect(tool.state).toBe('output-available'); expect(tool.output).toEqual(result);
    expect(pendingQuestions(after)).toBeUndefined();
  });
  it('is idempotent for the same result and refuses a different second result loudly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const once = answerQuestions(thread(), 'call_1', result);
    expect(answerQuestions(once, 'call_1', result)).toBe(once);
    const other = { ...result, answers: [{ ...result.answers[0], selected: ['Formal'] }] };
    expect(answerQuestions(once, 'call_1', other)).toBe(once);
    expect(warn).toHaveBeenCalledTimes(1); warn.mockRestore();
  });
});
```

```ts
// wire/ask-round-trip.test.ts
import { it, expect } from 'vitest';
import { toAnthropicMessages, toOpenAIMessages } from './encode';
import { answerQuestions } from '../state/questions';
import { thread, result } from '../../tests/fixtures/ask-thread';

const hasToolUse = (wire: unknown[]) => JSON.stringify(wire).includes('call_1');

it('an unanswered kai_ask is dropped on both wires (as today)', () => {
  expect(hasToolUse(toAnthropicMessages(thread()))).toBe(false);
  expect(hasToolUse(toOpenAIMessages(thread()))).toBe(false);
});
it('an answered kai_ask encodes as tool_use then a user tool_result carrying the AskResult JSON (Anthropic)', () => {
  const wire = toAnthropicMessages(answerQuestions(thread(), 'call_1', result));
  const last = wire[wire.length - 1];
  expect(last.role).toBe('user');
  expect(last.content).toEqual([expect.objectContaining({ type: 'tool_result', tool_use_id: 'call_1', content: JSON.stringify(result) })]);
  expect(JSON.stringify(wire[wire.length - 2])).toContain('"tool_use"');
});
it('and as a role:"tool" message on OpenAI', () => {
  const wire = toOpenAIMessages(answerQuestions(thread(), 'call_1', result));
  const last = wire[wire.length - 1] as { role: string; tool_call_id?: string; content?: unknown };
  expect(last.role).toBe('tool');
  expect(last.tool_call_id).toBe('call_1');
  expect(last.content).toBe(JSON.stringify(result));
});
```
(Move `thread()`/`result` into `packages/ui/tests/fixtures/ask-thread.ts` and import them from all three tests. Before asserting OpenAI's `content`, read `encode.ts:364` for how it serialises tool output and match it exactly.)
- [ ] **Step 2: FAIL. Step 3: Implement**: `ask.schema.json` per spec C §2.1 (`maxItems: 4` questions, `header.maxLength: 12`, choice options `minItems 2 maxItems 6`, tasks `1..12`); `questionsFromToolCall` validates structurally by hand (no validator dependency, like `from-tool-call.ts`); `askTool` reuses `tool-defs.ts`'s provider shaping; `answerQuestions` finds the part by `toolCallId`, compares by `fingerprint` (from `state/parts.ts`) for idempotence; `approvalQuestion` builds `{ kind: 'confirm', header: 'Approve', question: \`Run ${tool.type}?\`, options: [{label:'Approve'},{label:'Deny'}] }` with overrides.
- [ ] **Step 4: Run** unit over `src/schemas src/state src/wire`, `lint:silent-drops`, `verify:tool-schemas`, `verify:schemas`, typecheck. **Step 5: Commit** — `feat(ui): kai_ask — questions as a tool call that waits for its answer`.

**Verification type:** unit + typecheck + schema gates.

---

### Task C2: The panel — `QuestionPanel`, `kai-question-panel`, `kai-question`, `kai-question-option`

**Files:**
- Create: `packages/ui/src/components/question/question-panel.tsx`, `question.tsx`, `question-option.tsx`, `question-panel.test.tsx`, `question-panel.stories.tsx`, `packages/ui/src/web-components/question/{question-panel,question,question-option}.tsx`, `question-panel.declarative.test.tsx`, `packages/ui/tests/components/question-panel-hostile-output.test.tsx`, `packages/ui/tests/presets/question-panel-parity.test.tsx`
- Modify (shared): `solid.ts`, `register-impl.ts`, autoloader map, `preset-facades.json` (+ `kai-question-panel`)

**Interfaces:**
- Consumes: C1 types; A1 registry; `createRovingTabList`; `Form` widgets from `components/form/form-widgets.tsx`.
- Produces: element API exactly as spec C §5 table (props `questions`, `toolCallId`, `value`/`defaultValue`, `activeIndex`/`defaultActiveIndex`, `renderers` keyed `question:<kind>` with `el.question`, `label`; events `kai-answer-change {answers}`, `kai-active-change {index, questionId}`, `kai-questions-submit {toolCallId, result}`, `kai-questions-dismiss {toolCallId, result}`; methods `next()`, `prev()`, `select(index)`, `answerActive(text)`, `submit()`, `focus()`).

- [ ] **Step 1: Failing tests** (jsdom for logic, storybook/Chromium for keyboard and focus):
  - Chips: N questions → N chips + `Review` when N ≥ 2; one question → no Review, Submit on the question.
  - Choice single: pressing `2` with focus in the panel selects option 2 and advances; with focus in an `<input>` outside the panel, pressing `2` does nothing to the panel.
  - Multi/tasks: checkboxes; Enter/Next advances; `selected` holds labels in option order.
  - Confirm: default Approve/Deny; model-supplied pair overrides.
  - Text: `answerActive('Friday')` records `text` and advances; for choice it replaces `selected` with `text`; the question shows "Your answer: Friday" with an edit control that clears it.
  - Form: fields render via the form widgets; `values` recorded.
  - Previews: a question with any `preview` renders list + preview; focusing option 2 shows option 2's preview; a narrow container (set width 360px in the browser test) stacks them.
  - Review: rows link back to their question; Submit disabled with visible text "1 question still needs an answer" when a required one is missing; enabled and firing `kai-questions-submit` with `{ toolCallId, result: { status: 'answered', answers } }` when complete.
  - Dismiss: "Dismiss & just chat" fires `kai-questions-dismiss` with `status: 'dismissed'` and the partial answers.
  - Focus: on open the first option of the first question is focused; Esc moves focus to the element passed as the panel's return-focus target (a `returnFocus` JS property; `kai-chat` sets it to its composer) without dismissing.
  - Hostile output (Chromium): header/question/labels/descriptions/previews/placeholder containing `<img src=x onerror=…>`, `<script>`, `javascript:` render as visible inert text; a 100k preview is clamped with a visible marker.
  - Parity: `questions` preset vs composed `<kai-question>`/`<kai-question-option>` children.
- [ ] **Step 2: FAIL. Step 3: Implement** (Solid first; facade via `defineWebComponent`; option groups use real `role="radiogroup"`/`"group"` with radio/checkbox semantics labelled by the question text; the panel's height changes flow through A5's band animation automatically).
- [ ] **Step 4: Run** unit, storybook project for `components/question web-components/question`, axe, `lint:preset-parts`, typecheck, `build:api`. **Step 5: Commit** — `feat(ui): kai-question-panel, questions answered above the prompt`.

**Verification type:** unit + in-browser keyboard/focus + hostile output in Chromium + parity.

---

### Task C3: `kai-answer-receipt` and the `tool:kai_ask` built-in renderer

**Files:**
- Create: `packages/ui/src/components/question/answer-receipt.tsx`, `answer-receipt.test.tsx`, `packages/ui/src/web-components/question/answer-receipt.tsx`
- Modify: `packages/ui/src/components/message/message.tsx` (the reserved `tool:kai_ask` slot from B3 renders: pending → quiet "Waiting for your answers" line in the activity style; answered/dismissed → `AnswerReceipt` aligned to the user side)

**Interfaces:**
- Consumes: C1 `AskResult`; B3's reserved key.
- Produces: `kai-answer-receipt` (`answers`, `status`, `open`/`defaultOpen`; `kai-open-change`; `show/hide/toggle`).

- [ ] **Step 1: Failing tests**: an assistant message whose last part is an unanswered `kai_ask` renders "Waiting for your answers" and no panel inside the thread; after `answerQuestions` the same message renders a receipt whose button reads "Answered 1 question ›" (pluralised: "Answered 3 questions"), right-aligned (`data-align="user"`), expanding to `Tone → Casual`; dismissed renders "Skipped · answered 1 of 3 ›"; `renderers['tool:kai_ask']` overrides it; answers text is inert (hostile strings).
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit, storybook, axe, `build:api`. **Step 5: Commit** — `feat(ui): the answer receipt, on the user's side of the thread`.

**Verification type:** unit + storybook.

---

### Task C4: `kai-chat` flow-through, and the end-to-end IVP

**Files:**
- Modify: `packages/ui/src/components/chat/chat-app.tsx` (derive `pendingQuestions(messages)`; render `QuestionPanel` in the dock's top band; collapse B5's plan while open; route composer submit to `answerActive` while open; set `returnFocus` to the composer), `web-components/chat/chat.tsx` (events `kai-questions-submit`, `kai-questions-dismiss`), `packages/ui/src/state/mock.ts` (a scripted `kai_ask` turn in `createMockResponder`)
- Test: `components/chat/chat-app-questions.test.tsx`, `packages/ui/tests/e2e/questions.ivp.spec.ts` (Playwright over a story that wires `kai-chat` + the mock responder + `answerQuestions` + re-send)

- [ ] **Step 1: Failing tests**: with a pending ask the panel is in the dock's top band and the composer placeholder reads "Or type your own answer…"; composer Enter records the answer (no `kai-submit` fires); after the last required answer + Submit, `kai-questions-submit` fires once; with `plan` present the plan collapses to its one line while the panel is open; reloading the story with the persisted messages re-opens the same panel.
  IVP (Chromium): the panel slides up (height animates from 0), answering by keys 1–3 and by typing works, Submit applies `answerQuestions`, the mock receives a request whose last wire message is the tool result (inspect the mock's recorded request), the continuation renders, the receipt sits between the question and the reply; light and dark screenshots.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit, emitted, the IVP, storybook, `build:api`. **Step 5: Commit** — `feat(ui): kai-chat asks above the prompt`.

**Verification type:** Playwright IVP end to end + unit.

---

### Task C5a: Remove the card elements and card types from the kit source

**Files (delete):** `components/{confirm-card,choice-card,tasks}/**`, `web-components/{confirm-card,choice,tasks}/**`, `primitives/card-schemas/{confirm,choice,tasks,form}.schema.json`, `tasks.result.schema.json`, `form.result.schema.json`, their tests under `packages/ui/tests/{components,web-components,primitives,schemas}` (list: `choice-card*.test.tsx`, `confirm-card*.test.tsx`, `tasks-*.test.ts(x)`, `choice.test.tsx`, `confirm-card.test.tsx`, `tasks.test.tsx`, `choice-schema.test.ts`, `confirm-tasks-schemas.test.ts`, `form-schemas.test.ts`).
**Files (modify):** `primitives/card-tags.ts` (built-ins become `link`, `embed`, `artifact`), `components/card/card-registry.tsx`, `primitives/card-data-types.ts`, `web-components/card/cards.tsx`, `web-components/define/define.tsx` (any card tag list), `src/index.ts`/`solid.ts` exports, tests that enumerate built-ins (`card-renderer.test.tsx`, `card-registry.test.ts`, `card-validate-*.test.ts`, `cards*.test.tsx`, `thread-cards.declarative.test.tsx` — its override test switches from `confirm` to `link`), showcase stories using the cards (`claude-code`, `codex`, `lovable`: replace with a `kai-question-panel` or remove the card usage).

- [ ] **Step 1: Failing test** `tests/components/removed-card-types.test.tsx`: a thread with a `confirm` envelope renders `[data-card-fallback]` and emits one `error`; `BUILTIN_CARD_TAGS` has exactly `link`, `embed`, `artifact`; `customElements.get('kai-confirm')` is undefined after importing the register-all bundle.
- [ ] **Step 2: FAIL. Step 3: Delete and edit**; re-run `grep -rlE "kai-confirm|ConfirmCard|kai-choice|ChoiceCard|kai-tasks|TasksCard|confirm\.schema|choice\.schema|tasks\.schema|form\.schema" packages/ui/src packages/ui/tests` until only the new test and history comments remain. `kai-form` and `components/form/**` stay.
- [ ] **Step 4: Run** unit, emitted, storybook project, typecheck, `lint:preset-parts`, `build:api`. **Step 5: Commit** — `feat(ui)!: remove the confirm, choice, tasks and form card types; questions replace them`.

### Task C5b: Remove them from schemas, scripts and the MCP

**Files:** `schemas/{tool-defs,provider-subsets,registry,index}.ts` and tests (`tool-defs.test.ts`, `provider-subsets.test.ts`, `registry.test.ts`, `card-type-parity.test.ts`, `from-tool-call.test.ts`), `scripts/{gen-card-validation-schemas,copy-card-schemas,verify-schemas-exported,verify-tool-schemas,gen-web-component-react,gen-web-component-types,verify-scaffold-compiles,probe-upgrade-attribute-loss}.mjs` (only the card-type lists), `tests/scripts/schemas-exported-guard-wiring.test.ts`, `mcp/mcp/{manifest.ts,tools/reference.ts,tools/debug-rules.ts,tools/scaffold.ts}`, `mcp/mcp/{reference,scaffold}.test.ts`, `mcp/tests/emitted-card-path.live.test.ts` → `emitted-ask-path.live.test.ts` (the scaffolder's tool loop uses `isAskTool` + `questionsFromToolCall`), `mcp/construct/{codegen,schema}.ts`, `mcp/catalog/derived.json` (regenerated).

- [ ] **Step 1: Failing test**: `scaffold.test.ts` asserts the emitted loop contains `isAskTool(` and not `kai_confirm`; `tool-defs.test.ts` asserts `cardTools({provider:'openai'}).map(t=>t.function.name)` equals `['kai_link','kai_embed','kai_artifact']` (read the current test for the exact accessor per provider).
- [ ] **Step 2: FAIL. Step 3: Edit. Step 4: Run** `nx build ui --skip-nx-cache`, MCP tests, `verify:scaffold`, `verify:schemas`, `verify:tool-schemas`, `verify:construct` (after `nx build cli`), emitted. **Step 5: Commit** — `feat(mcp)!: the scaffolder and catalog ask with kai_ask`.

### Task C5c: Remove them from docs, samples and examples

**Files:** `apps/docs/src/content/docs/components/{confirm,choice,tasks}.mdx` (delete + redirects to `/components/question-panel/`), `apps/docs/src/components/CardsDemo.tsx`, `apps/docs/src/data/samples/kai-{choice,confirm,tasks}.ts`, `packages/ui/apps/theme-studio/samples/kai-{choice,confirm,tasks}.ts` + `ThemeStudio.tsx`, `apps/docs/src/content/docs/{components/card.mdx,guides/installation.mdx,guides/loading.mdx,guides/field-formats.mdx,integrations/harnesses.mdx}` (card-type mentions), `examples/apps/ops-console/**` and `examples/apps/builder/**` (switch to `kai_ask`), `examples/internal/openrouter-spike/src/scenarios/{s07-confirm-card,s08-choice-card,s10-tasks-card}.ts` → one `sNN-ask.ts` scenario + `scenarios/index.ts`, `cards.ts`, `card-schema.ts`, `cards.seam.test.ts`, `FINDINGS.md`/`HARNESS.md` notes.

- [ ] **Step 1: Failing check**: `pnpm --filter docs build` (or the docs package build script) fails on the dead links once the pages are deleted — delete first, watch it fail, then fix every link.
- [ ] **Step 2: Edit. Step 3: Run** docs build, `verify:docs`, the spike's own test command (`examples/internal/openrouter-spike/package.json`), the examples' typecheck/build scripts if they have them. **Step 4: Commit** — `docs!: questions replace the confirm, choice and tasks cards`.

**Verification type (C5a–c):** unit + consumer gates + docs build + the scoped grep returning only history.

---

### Task C6: Docs for the new surface

**Files:** `apps/docs/src/content/docs/components/question-panel.mdx`, `components/answer-receipt.mdx`, `guides/generative-ui.mdx` (cards are display; asking is `kai_ask`), `guides/schemas-as-tools.mdx` (the loop with `askTool`/`isAskTool`/`questionsFromToolCall`/`answerQuestions`), `patterns/generative-ui-cards.mdx`, a `/patterns/ask-before-acting` pattern using `approvalQuestion` (`packages/blocks/patterns/ask-before-acting/`), integration pages whose server loop must pause on `kai_ask` (LangGraph, Mastra: find with `grep -rl "awaiting_user\|tool loop" apps/docs/src/content/docs/integrations`).

- [ ] **Step 1**: write pages; each code sample is copied from a test that runs (`guide fences` style: link the test path in a comment).
- [ ] **Step 2: Run** docs build, `verify:docs`, `kai add ask-before-acting` into a scratch app. **Step 3: Commit** — `docs: asking the user, the question panel and the receipt`.

**Verification type:** docs build + pattern install.
