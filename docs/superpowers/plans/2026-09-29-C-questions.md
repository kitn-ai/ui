# C — Questions Above the Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confirm/choice/form/tasks thread cards with a Claude-Desktop-style question panel that replaces the composer while questions are open, returns the answers as the `kai_ask` tool call's single real result, and shows them as a user bubble of `Label: answer` lines.

**Architecture:** One tool (`kai_ask`) whose schema is the question input; server-safe helpers in `@kitn.ai/ui/schemas`; pure thread helpers in `@kitn.ai/ui/state` including `threadRows` (display rows) and `settlePendingQuestions`; Solid `QuestionPanel`/`Answers`/`QuestionsWaiting` with facades; the answers bubble is a display row between messages, while the data stays in the tool part's `output`; `kai-chat` swaps the panel in for the composer. No new `MessagePart` variant. Amended 2026-09-30 for checkpoint rulings 20-22.

**Tech Stack:** SolidJS, `defineWebComponent`, JSON Schema, vitest (unit, storybook), Playwright IVP over `createMockResponder`.

**Spec:** `docs/superpowers/specs/2026-09-29-C-questions-design.md`

## Global Constraints

- Everything in plan A's Global Constraints applies.
- **Status 2026-09-30:** C0 is DONE (two checkpoint rounds; rulings 20-22 in the umbrella). The mockups stay on `feat/comp-c0` as the visual reference, and are not merged: `stories/checkpoint/question-panel-v2.stories.tsx` (panel v2, `Composer A: …`, `Custom Dismiss`, `Other Selected`), `answer-receipt-v2.stories.tsx` (`Bubble: …`), `prompt-attachments.stories.tsx` (`B. Grows into the input`).
- C1 needs A (merged). C2 needs A1 (merged). C3 needs B3 and B4 (the thread's row loop). C4 needs P1, B5, C2, C3. C5a-c need C1-C4 merged (they delete what C replaces). C6 last.
- **No composer-as-answer path.** There is no `answerActive`; custom answers are the "Other" option.
- **One-click approval is a SUPERVISOR DEFAULT, reversible**: a panel whose only question is a confirm submits on one click. Keep it in one function, `isOneClick(questions)`, with its own test, so reversing it is one line.
- Every string in a question is model output: Solid text nodes only, previews via text in `<pre>`, no `innerHTML`, no navigable URL. The user's Other text is rendered the same way, never as markdown.
- `kai-form` the element stays; only the `form` card type goes.
- `CARD_CONTRACT_VERSION` does not change.

## Shared files (supervisor serializes)

`src/solid.ts`, `src/index.ts`, `src/state/index.ts`, `src/schemas/index.ts`, `register-impl.ts`, autoloader map, `scripts/preset-facades.json`, `primitives/card-tags.ts` (C5a only), `schemas/tool-defs.ts` (C1 then C5b), `components/message/message.tsx` and `components/thread/thread.tsx` (B3, B4, then C3), `components/chat/chat-app.tsx` (B3, B4, B5, C3, C4 in that order), generated artifacts, `pnpm-lock.yaml`.

## Task graph

```
C0 DONE (checkpoint)
C1 kai_ask + helpers + threadRows (now; parallel with B2, P1) ── C2 panel v2 (parallel with B3) ──┐
                                   B3 ── B4 row loop ── C3 answers bubble ────────────────────────┤
                                   P1 ── B5 plan ──────────────────────────────────────────────────┴── C4 kai-chat + IVP ── C5a ∥ C5b ∥ C5c ── C6 docs
```

## Review Focus

1. The user submits, the network request fails, and they submit again: the thread must not end up with the answers applied twice or the tool part in a half state — pinned in C1 Step 1 (`answerQuestions` is idempotent for the same result and refuses a different second result, loudly).
2. The model sends a `kai_ask` with zero questions, an unknown `kind`, or an over-long header: nothing throws; the host gets an `{ error }` for the first two and a warning for the third — pinned in C1 Step 1.
3. A page reload while the panel is open, or after "Let's chat": `pendingQuestions(messages)` must re-open the same panel (or the same waiting line) from the persisted thread — pinned in C1 Step 1 and C4 Step 1.
4. The user sends a normal message while questions are waiting: the next request must carry the questions as a settled `dismissed` result plus the message, never a dangling call the encoder drops — pinned in C1 Step 1 and C4 Step 1.
5. A thread persisted before this round containing a `confirm` card envelope: it must render the loud unknown-card fallback, not a blank — pinned in C5a Step 1.

---

### Task C0: Checkpoint mockups — the question panel and the receipt (stories only) — DONE 2026-09-30 (two rounds)

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
  export function settlePendingQuestions(messages: ChatMessage[], answers?: Answer[]): ChatMessage[];
  export type ThreadRow =
    | { kind: 'message'; key: string; message: ChatMessage }
    | { kind: 'answers'; key: string; toolCallId: string; result: AskResult };
  export function threadRows(messages: ChatMessage[]): ThreadRow[];
  ```
  `threadRows` keys: a message row's key is `message.id`; an answers row's key is `answers:<toolCallId>`. An answers row follows the assistant message holding an answered `kai_ask`, or a dismissed one with at least one answer; none for pending or dismissed-empty.

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
import { pendingQuestions, answerQuestions, settlePendingQuestions, threadRows } from './questions';
import type { ChatMessage } from '../web-components/chat/chat-types';
const ask = { questions: [{ header: 'Tone', question: 'How formal?', kind: 'choice', options: [{ label: 'Casual' }, { label: 'Formal' }] }] };
const thread = (): ChatMessage[] => [
  { id: 'u', role: 'user', parts: [{ type: 'text', text: 'draft it' }] },
  { id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'One question.' }, { type: 'tool', tool: { type: 'kai_ask', state: 'input-available', toolCallId: 'call_1', input: ask } }] },
];
const result = { status: 'answered' as const, answers: [{ questionId: 'q0', header: 'Tone', question: 'How formal?', kind: 'choice' as const, selected: ['Casual'] }] };
describe('settle and rows', () => {
  it('settlePendingQuestions settles an open ask as dismissed, keeping partial answers', () => {
    const partial = [result.answers[0]];
    const after = settlePendingQuestions(thread(), partial);
    const tool = (after[1].parts[1] as { tool: { state: string; output: unknown } }).tool;
    expect(tool.state).toBe('output-available');
    expect(tool.output).toEqual({ status: 'dismissed', answers: partial });
    expect(settlePendingQuestions(after)).toBe(after); // nothing pending: same array
  });
  it('threadRows inserts one answers row after an answered ask, none while pending', () => {
    expect(threadRows(thread()).map((r) => r.kind)).toEqual(['message', 'message']);
    const rows = threadRows(answerQuestions(thread(), 'call_1', result));
    expect(rows.map((r) => r.kind)).toEqual(['message', 'message', 'answers']);
    expect(rows[2].key).toBe('answers:call_1');
  });
  it('threadRows: dismissed with no answers adds no row; with some adds one', () => {
    expect(threadRows(settlePendingQuestions(thread())).map((r) => r.kind)).toEqual(['message', 'message']);
    expect(threadRows(settlePendingQuestions(thread(), [result.answers[0]])).at(-1)?.kind).toBe('answers');
  });
});
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
import { answerQuestions, settlePendingQuestions } from '../state/questions';
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
it('settling then a user message is ONE merged user turn on Anthropic: the tool_result, then the text', () => {
  const settled = settlePendingQuestions(thread());
  const next = [...settled, { id: 'u2', role: 'user' as const, parts: [{ type: 'text' as const, text: 'actually, just chat' }] }];
  const wire = toAnthropicMessages(next);
  const last = wire[wire.length - 1];
  expect(last.role).toBe('user');
  expect((last.content as { type: string }[]).map((b) => b.type)).toEqual(['tool_result', 'text']);
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

### Task C2: The panel v2 — `QuestionPanel`, `kai-question-panel`, `kai-question`, `kai-question-option`, `kai-questions-waiting`

**Files:**
- Create: `packages/ui/src/components/question/question-panel.tsx`, `question.tsx`, `question-option.tsx`, `other-answer.tsx` (the auto-growing textarea), `questions-waiting.tsx`, `question-panel.test.tsx`, `question-panel.stories.tsx`, `packages/ui/src/web-components/question/{question-panel,question,question-option,questions-waiting}.tsx`, `question-panel.declarative.test.tsx`, `packages/ui/tests/components/question-panel-hostile-output.test.tsx`, `packages/ui/tests/presets/question-panel-parity.test.tsx`, `packages/ui/tests/e2e/question-panel.browser.test.ts`
- Modify (shared): `solid.ts`, `register-impl.ts`, autoloader map, `preset-facades.json` (+ `kai-question-panel`)

**Interfaces:**
- Consumes: C1 types; A1 registry; `createRovingTabList`; the kit's segmented control (`components/segmented/`) for the tabs if its semantics fit a tablist, else a `role="tablist"` of kit buttons; `Form` widgets from `components/form/form-widgets.tsx`.
- Produces: element API exactly as spec C §5: `kai-question-panel` props `questions`, `toolCallId`, `value`/`defaultValue`, `activeIndex`/`defaultActiveIndex`, `dismissLabel` (default "Let's chat"), `submitLabel` (default "Submit"), `renderers` (`question:<kind>`, `el.question`), `label`; slots default and `dismiss`; events `kai-answer-change {answers}`, `kai-active-change {index, questionId}`, `kai-questions-submit {toolCallId, result}`, `kai-questions-dismiss {toolCallId, answers}`; methods `next()`, `back()`, `select(index)`, `submit()`, `focus()`. `kai-question` adds `allowOther` (default true for choice, confirm, tasks). `kai-questions-waiting` props `count`, `total`, `reopenLabel` (default "Reopen"), event `kai-reopen`. Exported helper `isOneClick(questions: Question[]): boolean`.
- Visual reference: `feat/comp-c0` `question-panel-v2.stories.tsx`. The panel uses the composer card's surface (`rounded-composer`, surface, shadow) because it stands in the composer's place.

- [ ] **Step 1: Failing tests** (jsdom for logic; `question-panel.browser.test.ts` in Chromium for keys, focus, growth):
  - Tabs: N questions give N tabs plus `Review` when there are two or more; clicking an earlier tab goes back; arrow keys move between tabs; `role="tablist"` / `tab` / `tabpanel` wired with `aria-controls`/`aria-labelledby`.
  - Back/Next: Back disabled on the first question; Next becomes Submit (text = `submitLabel`) on the last step.
  - Choice single: pressing `2` with focus inside the panel selects option 2 and advances; with focus in an `<input>` outside the panel, `2` does nothing.
  - Multi and tasks: checkboxes; Next advances; `selected` holds labels in option order.
  - Other: it is the last numbered option; its number key selects it AND focuses the textarea; typing grows the textarea (its height increases across three lines); Enter advances; Shift+Enter inserts a newline; single-select Other replaces the selection (`text` set, `selected` empty); multi-select Other adds `text` beside `selected`.
  - Confirm: default Approve/Deny (model pair overrides); `isOneClick([confirm])` is true and clicking Approve fires `kai-questions-submit` immediately with no Submit button rendered; `isOneClick([confirm, choice])` is false and Submit is required.
  - Text and form kinds: textarea / form widgets record `text` / `values`.
  - Previews: list + preview when any option has `preview`; focusing option 2 shows its preview; a 360px container stacks them.
  - Review: rows link back; Submit disabled with visible "1 question still needs an answer" when a required one is missing.
  - Let's chat: the default label; `dismissLabel="Skip for now"` changes it; a `slot="dismiss"` button replaces the control and still dismisses (the panel listens for `click` on the slotted node); `kai-questions-dismiss` carries the partial answers.
  - `kai-questions-waiting`: "2 of 3 questions waiting" with a Reopen control firing `kai-reopen`.
  - Focus: on open, the first option of the first question.
  - Hostile output (Chromium): header, question, labels, descriptions, previews, placeholder and the user's Other text containing `<img src=x onerror=…>`, `<script>`, `javascript:` render as visible inert text; a 100k preview is clamped with a visible marker.
  - Parity: `questions` preset vs composed `<kai-question>`/`<kai-question-option>` children.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** (Solid first; facades via `defineWebComponent`; option groups use real `radiogroup`/`group` roles with radio/checkbox semantics labelled by the question text; `isOneClick` is the only place the one-click rule lives).
- [ ] **Step 4: Run** unit, the browser test, storybook project for `components/question web-components/question`, axe light and dark, `lint:preset-parts`, typecheck, `build:api`. Compare screenshots with the v2 mockups.
- [ ] **Step 5: Commit** — `feat(ui): kai-question-panel v2, tabs, Back and Next, Other, and Let's chat`.

**Verification type:** unit + in-browser keyboard, focus and growth + hostile output in Chromium + parity + screenshot compare with the mockups.

---

### Task C3: The answers bubble — `kai-answers` and the `answers` display row

**Files:**
- Create: `packages/ui/src/components/question/answers.tsx`, `answers.test.tsx`, `answers.stories.tsx`, `packages/ui/src/web-components/question/answers.tsx`
- Modify: `components/thread/thread.tsx` and `components/chat/chat-app.tsx` (B4's row loop renders `kind: 'answers'` rows as a `Message` row with `role="user"`, no action bar, body `<Answers result={row.result} />`), `components/message/message.tsx` (B3's reserved `tool:kai_ask` renders nothing inside the assistant message; still overridable through `renderers`)

**Interfaces:**
- Consumes: C1 `threadRows`, `AskResult`; B4's row loop; B3's reserved registry key.
- Produces: `kai-answers` (`result: AskResult`), Solid `Answers`. Lines are `Label: answer`: the question's `header` bold, then the answer (`selected` joined with ", ", then the Other `text`, then form `values` as `key: value` sub-lines), with `white-space: pre-line`. A dismissed result with some answers adds a muted "Skipped: <headers>" line (supervisor default).
- Visual reference: `feat/comp-c0` `answer-receipt-v2.stories.tsx`, `Bubble: Short Answers`, `Bubble: Long Answers`, `Bubble: Long Answers Narrow`.

- [ ] **Step 1: Failing tests**: a thread with an answered ask renders, after the assistant message, a user-aligned row whose text contains `Tone: Casual` with `Tone` in a `strong`; no action bar on that row; a 300-char multi-line Other answer wraps inside the bubble at a 360px width (Chromium: the bubble's width does not exceed the row's max width, and the line count is greater than one); a pending ask adds no row; dismissed-empty adds none; dismissed-partial adds the bubble plus "Skipped: Due"; hostile Other text is inert and visible; `renderers['tool:kai_ask']` still renders inside the assistant message when set; the wire for the thread has exactly one `tool_result` for the call and no extra user text (reuse C1's fixture).
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit, storybook, axe, `build:api`; compare with the `Bubble: …` mockups. **Step 5: Commit** — `feat(ui): answers appear as the user's turn, one tool result underneath`.

**Verification type:** unit + in-browser wrap check + screenshot compare.

---

### Task C4: `kai-chat` flow-through, and the end-to-end IVP

**Files:**
- Modify: `packages/ui/src/components/chat/chat-app.tsx` (derive `pendingQuestions(messages)`; while open and not dismissed, render `QuestionPanel` IN PLACE OF `DefaultPromptInput`; after `kai-questions-dismiss`, render the composer with `QuestionsWaiting` in its `above` region beside B5's collapsed plan, and move focus to the composer; `kai-reopen` restores the panel with its answers; `kai-submit` detail gains `pendingQuestions?: string`), `web-components/chat/chat.tsx` (re-emit `kai-questions-submit`, `kai-questions-dismiss`), `packages/ui/src/state/mock.ts` (a scripted `kai_ask` turn in `createMockResponder`)
- Test: `components/chat/chat-app-questions.test.tsx`, `packages/ui/tests/e2e/questions.ivp.spec.ts` (Playwright over a story wiring `kai-chat` + the mock responder + `answerQuestions`/`settlePendingQuestions` + re-send)

- [ ] **Step 1: Failing tests**: with a pending ask the composer is absent and the panel is present in its place; Let's chat brings the composer back with "N of M questions waiting · Reopen" in its `above` region and focus in the composer; Reopen restores the panel with earlier answers intact; Submit fires `kai-questions-submit` once; sending a normal message while questions wait fires `kai-submit` with `pendingQuestions` set to the call id; reloading the story with persisted messages re-opens the panel (or the waiting line after a dismiss).
  IVP (Chromium): the panel replaces the composer without the thread's bottom edge jumping (the panel's top is within the composer's former box ± the card's padding); answering by number keys and by Other works; Submit applies `answerQuestions`; the mock's recorded request ends with exactly one tool result for the call; the answers bubble sits between the question and the reply; the continuation renders; sending a message while waiting records a request whose last user turn is `[tool_result (dismissed), text]`; light and dark screenshots.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit, emitted, the IVP, storybook, `build:api`. **Step 5: Commit** — `feat(ui): kai-chat asks in place of the composer`.

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

**Files:** `apps/docs/src/content/docs/components/question-panel.mdx`, `components/answers.mdx` (the bubble, the display row, `threadRows`, `settlePendingQuestions`), `guides/generative-ui.mdx` (cards are display; asking is `kai_ask`), `guides/schemas-as-tools.mdx` (the loop with `askTool`/`isAskTool`/`questionsFromToolCall`/`answerQuestions`), `patterns/generative-ui-cards.mdx`, a `/patterns/ask-before-acting` pattern using `approvalQuestion` (`packages/blocks/patterns/ask-before-acting/`), integration pages whose server loop must pause on `kai_ask` (LangGraph, Mastra: find with `grep -rl "awaiting_user\|tool loop" apps/docs/src/content/docs/integrations`).

- [ ] **Step 1**: write pages; each code sample is copied from a test that runs (`guide fences` style: link the test path in a comment).
- [ ] **Step 2: Run** docs build, `verify:docs`, `kai add ask-before-acting` into a scratch app. **Step 3: Commit** — `docs: asking the user, the question panel and the receipt`.

**Verification type:** docs build + pattern install.
