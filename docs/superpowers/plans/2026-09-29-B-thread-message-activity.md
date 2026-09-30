# B — Thread, Message, Activity and Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the thread and message composable, replace the bold tool panel with a quiet `kai-activity` line (summary → steps → args), and add the agent's plan display, all with the presets rebuilt on public parts.

**Architecture:** Pure mapping in `src/primitives/activity.ts` and `plan.ts`; timing stamped by `createAssistantStream` through an injectable clock; Solid `Activity`/`Plan` components; facades `kai-activity`, `kai-activity-step`, `kai-plan`, `kai-plan-item`; `MessageBody` groups reasoning/tool runs and renders them through `Activity`, with A's registry for overrides.

**Tech Stack:** SolidJS, `defineWebComponent`, vitest (unit, storybook), Playwright IVP.

**Spec:** `docs/superpowers/specs/2026-09-29-B-thread-message-activity-design.md`

## Global Constraints

- Everything in plan A's Global Constraints applies (worktree setup, untouchable paths/ports, `kai-` contract, untrusted model output, decide loudly, `build:api`, commit trailer, no push).
- **B0 comes first and nothing else in B starts until the supervisor relays the owner's checkpoint reply.**
- B1–B6 depend on A0 (rename) and A1 (registry); B5 depends on A5 (dock bands).
- No new `MessagePart` variant. `lint:silent-drops` must stay green untouched.
- The reactivity rule: new array + new object for every changed item.

## Shared files (supervisor serializes)

`src/solid.ts`, `src/index.ts`, `src/state/index.ts`, `src/schemas/index.ts`, `src/web-components/register-impl.ts`, the autoloader map, `scripts/preset-facades.json`, `components/message/message.tsx` (B3 only), every generated artifact.

## Task graph

```
B0 checkpoint mockups (parallel with plan A) ── OWNER LOOK ──┐
B1 primitives + timing ──┬── B2 Activity component/elements ──┬── B3 MessageBody + registry ── B6 MCP/docs/starters
                         └── B5 kai-plan (+ A5) ───────────────┘
B4 thread item mode + message composed mode (parallel with B2; disjoint files; after B1)
```

## Review Focus

1. A turn whose ONLY content is tool calls (no text at all) must still render the activity line and the pending indicator, not an empty bubble — pinned in B3 Step 1.
2. A tool that errors mid-stream: the live summary must switch to the error step and the settled summary must still read correctly — pinned in B1 Step 1 and B2 Step 1.
3. A 50,000-character tool argument or result: the step must stay responsive and show a visible "truncated" marker — pinned in B2 Step 1.
4. Composed `kai-thread` whose last child grows (streaming markdown inside an app-rendered `kai-message`): it must keep sticking to the bottom — pinned in B4 Step 1.
5. A persisted thread from before this change (no `timing`): summaries render without durations and nothing throws — pinned in B1 Step 1.

---

### Task B0: Checkpoint mockups — activity line and plan display (stories only)

**Files:**
- Create: `packages/ui/src/stories/checkpoint/activity.stories.tsx`, `packages/ui/src/stories/checkpoint/plan.stories.tsx`

**Constraints:** static stub data, no new public API, no wiring, no edits outside these two files. Build from real primitives where they exist: `Reasoning`'s disclosure look, `TextShimmer` (`kai-text-shimmer`), `CodeBlock`, `Icon`, `ChainOfThoughtAccordion` for the timeline if it fits; plain Solid markup + the kit's Tailwind tokens where it does not. Title prefix `Checkpoint/`.

- [ ] **Step 1: Activity stories**, each rendered in a light and a dark frame side by side (use the existing story decorator pattern for light/dark if one exists — find: `grep -rln "dark" packages/ui/.storybook | head`; otherwise two wrappers with `theme="light"` / `theme="dark"` on the kit elements, since B0 runs before A3's inherited scheme lands):
  - `Collapsed` — "◦ Thought for 6s · Searched the web · Read 3 files ›" in the muted reasoning style, inline above answer text.
  - `Streaming` — "Searching the web…" with the shimmer.
  - `Expanded` — the timeline: ✓ Thought 6s / ✓ Searched the web 1.2s › / ✗ Read src/app.ts 0.1s ›.
  - `Step Expanded` — one tool step open showing its JSON arguments and result in a code block.
  - `Interleaved` — text, activity line, text, activity line, text (one assistant turn).
- [ ] **Step 2: Plan stories**: `Pending`, `Running` (one item in progress, spinner/shimmer), `Done`, `Collapsed` ("3 of 7 done · Writing tests"), and `In The Dock` (inside `PromptDock`'s top band above a `DefaultPromptInput`).
- [ ] **Step 3: Verify** `pnpm --filter @kitn.ai/ui exec vitest run --project=storybook src/stories/checkpoint` (axe passes), `lint:story-conventions`, typecheck. Take screenshots of every story in light and dark into the supervisor-provided scratch dir.
- [ ] **Step 4: Commit** — `docs(stories): checkpoint mockups for the activity line and the plan display`.

**Verification type:** in-browser IVP (screenshots read back by the verifier) + axe. **Then STOP: the supervisor shows the owner.**

---

### Task B1: Primitives, timing, and the plan tool

**Files:**
- Create: `packages/ui/src/primitives/activity.ts`, `activity.test.ts`, `packages/ui/src/primitives/plan.ts`, `plan.test.ts`, `packages/ui/src/primitives/question-schemas/plan.schema.json` (the `kai_plan` input schema; C adds `ask.schema.json` beside it)
- Modify: `packages/ui/src/components/tool/tool-types.ts` (`timing?`), `packages/ui/src/web-components/chat/chat-types.ts:67-89` (reasoning `timing?`), `packages/ui/src/state/parts.ts:218-240` (`TOOL_KEYS`, `TOOL_COMPARATORS`, reasoning merge), `packages/ui/src/state/stream.ts:93` (`now` option; stamp `startedAt` on first delta/announce, `endedAt` when the next part opens, the tool settles, or the stream ends), `packages/ui/src/schemas/tool-defs.ts` (`planTool`), `packages/ui/src/schemas/index.ts`, `src/index.ts`, `src/state/index.ts`

**Interfaces:**
- Produces (exact):
  ```ts
  export interface PartTiming { startedAt: number; endedAt?: number }
  export interface ActivityStep { id: string; kind: 'reasoning' | 'tool'; status: 'running' | 'done' | 'error'; label?: string; toolName?: string; toolKind?: ToolKind; text?: string; input?: Record<string, unknown>; output?: Record<string, unknown>; errorText?: string; startedAt?: number; endedAt?: number }
  export function activityStepsFromParts(parts: MessagePart[], opts?: { streaming?: boolean }): ActivityStep[];
  export function summarizeActivity(steps: ActivityStep[], opts?: { streaming?: boolean }): string;
  export const ACTIVITY_LABELS: Record<ToolKind | 'reasoning', { done: (n: number, name?: string) => string; live: (name?: string) => string }>;
  export interface PlanItem { id: string; label: string; status: 'pending' | 'in_progress' | 'completed' }
  export const PLAN_TOOL_NAME = 'kai_plan';
  export function isPlanTool(name: string): boolean;
  export function planFromMessages(messages: ChatMessage[]): PlanItem[] | undefined;
  export function planTool<P extends ToolProvider>(opts: { provider: P }): ToolDefFor<P>;
  ```
  `createAssistantStream(setMessages, { now?: () => number })`.

- [ ] **Step 1: Failing tests**

```ts
// activity.test.ts
import { describe, it, expect } from 'vitest';
import { activityStepsFromParts, summarizeActivity } from './activity';
import type { MessagePart } from '../web-components/chat/chat-types';

const R = (text: string, t?: [number, number?]): MessagePart => ({ type: 'reasoning', text, ...(t ? { timing: { startedAt: t[0], endedAt: t[1] } } : {}) });
const T = (type: string, state: 'input-available' | 'output-available' | 'output-error', extra: object = {}): MessagePart =>
  ({ type: 'tool', tool: { type, state, toolCallId: type + state, ...extra } } as MessagePart);

describe('activityStepsFromParts', () => {
  it('maps reasoning and tool parts to steps in order, skipping text', () => {
    const steps = activityStepsFromParts([R('hm'), { type: 'text', text: 'x' }, T('web_search', 'output-available')]);
    expect(steps.map((s) => [s.kind, s.status])).toEqual([['reasoning', 'done'], ['tool', 'done']]);
  });
  it('marks an unsettled tool running while streaming and an errored one error', () => {
    const steps = activityStepsFromParts([T('web_search', 'input-available'), T('read_file', 'output-error', { errorText: 'ENOENT' })], { streaming: true });
    expect(steps.map((s) => s.status)).toEqual(['running', 'error']);
    expect(steps[1].errorText).toBe('ENOENT');
  });
  it('tolerates parts with no timing (persisted threads)', () => {
    expect(() => summarizeActivity(activityStepsFromParts([R('a'), T('web_search', 'output-available')]))).not.toThrow();
  });
});
describe('summarizeActivity', () => {
  it('collapses same-kind runs into counts and adds durations when timed', () => {
    const s = activityStepsFromParts([R('a', [0, 6000]), T('web_search', 'output-available'), T('read_file', 'output-available'), T('read_file', 'output-available')]);
    expect(summarizeActivity(s)).toMatch(/^Thought for 6s · Searched( the web)? · .*2/);
  });
  it('omits durations without timing', () => {
    expect(summarizeActivity(activityStepsFromParts([R('a')]))).toBe('Thought');
  });
  it('streaming form names the live step', () => {
    expect(summarizeActivity(activityStepsFromParts([T('web_search', 'input-available')], { streaming: true }), { streaming: true })).toMatch(/…$/);
  });
});
```

Also: a `state/stream.test.ts` case with `now` stubbed (`let t = 0; now: () => t`) asserting a reasoning part gets `timing.startedAt = 0` on its first delta and `endedAt = 5` when text starts at `t = 5`; a tool gets `endedAt` when `upsertTool` settles it. A `plan.test.ts` asserting `planFromMessages` returns the LAST `kai_plan` input's items and `undefined` with none, and `isPlanTool('kai_plan')`. Exact label wording for each `ToolKind` goes in `ACTIVITY_LABELS` and one test asserts the whole table so a wording change is deliberate.
- [ ] **Step 2: FAIL. Step 3: Implement**; the `TOOL_KEYS` compile guard forces `timing` into both lists (`timing` compared by `startedAt`/`endedAt` value). `planTool` mirrors `cardTools`'s provider projection for one schema (read `schemas/tool-defs.ts` and reuse its per-provider shaping function; do not write a second).
- [ ] **Step 4: Run** unit (`src/primitives src/state src/schemas`), `round-trip.test.ts` in `wire/` (unchanged green), `lint:silent-drops`, typecheck, `verify:tool-schemas`. **Step 5: Commit** — `feat(ui): activity steps, their summary, part timing, and the kai_plan tool`.

**Verification type:** unit + typecheck + `verify:tool-schemas`.

---

### Task B2: `Activity` component, `kai-activity`, `kai-activity-step`

**Files:**
- Create: `packages/ui/src/components/activity/activity.tsx`, `activity.test.tsx`, `activity.stories.tsx`, `packages/ui/src/web-components/activity/activity.tsx`, `activity-step.tsx`, `activity.declarative.test.tsx`, `packages/ui/tests/components/activity-hostile-output.test.tsx`
- Modify (shared, supervisor-serialized): `src/solid.ts`, `register-impl.ts`, autoloader map, `scripts/preset-facades.json` (+ `kai-activity`)

**Interfaces:**
- Consumes: B1's `ActivityStep`, `summarizeActivity`; A1's `TagRenderer`, `resolveRenderer`.
- Produces: Solid `Activity(props: { steps: ActivityStep[]; streaming?: boolean; open?: boolean; defaultOpen?: boolean; detail?: 'full' | 'summary'; renderers?: RendererMap; onOpenChange?: (open: boolean) => void; onStepToggle?: (id: string, open: boolean) => void; children?: JSX.Element })`; elements per spec B §3 (props `steps`, `streaming`, `open`, `defaultOpen`, `detail`, `renderers`; events `kai-open-change {open}`, `kai-step-toggle {id, open}`; methods `show/hide/toggle`); `kai-activity-step` props `label`, `status`, `kind`, `duration`.

- [ ] **Step 1: Failing tests**
  - Collapsed by default: one button with `aria-expanded="false"` whose text equals `summarizeActivity(steps)`; clicking sets `aria-expanded="true"` and renders one row per step; a tool step row is itself a disclosure; expanding shows its input and output as JSON text inside a code block.
  - `streaming` shows the live summary with the shimmer element present.
  - `detail="summary"` renders the line with no disclosure button.
  - Keyboard: Enter/Space toggle; arrows move between step rows (roving, via `createRovingTabList`).
  - `renderers={{ 'tool:web_search': 'my-search-step' }}` renders `<my-search-step>` with `.step` set for that step and the built-in row for the others.
  - Composed: `<kai-activity>` with two `<kai-activity-step>` children renders the same summary line shape and toggles.
  - Hostile output (`activity-hostile-output.test.tsx`): reasoning `'<img src=x onerror=alert(1)>'`, tool input `{ q: '<script>x</script>' }`, a result with `javascript:alert(1)` string, and a 50,000-char argument — assert no `img`/`script` element exists, the literal text is visible, and the long value is clamped with a visible `truncated` marker and a "show all" control. Confirm the vectors in the storybook (Chromium) project, not only jsdom.
- [ ] **Step 2: FAIL. Step 3: Implement** (Solid first, facade over it with `defineWebComponent`; the disclosure style matches `Reasoning`; the summary uses `TextShimmer` while streaming; JSON via `CodeBlock` with `JSON.stringify(v, null, 2)`; clamp at 20,000 chars per value with the marker).
- [ ] **Step 4: Run** unit, `vitest run --project=storybook src/components/activity src/web-components/activity`, axe, typecheck, `lint:preset-parts`, `build:api` (commit artifacts). **Step 5: Commit** — `feat(ui): kai-activity, reasoning and tool calls as one quiet line`.

**Verification type:** unit + in-browser (storybook) + hostile-output in Chromium.

---

### Task B3: `MessageBody` renders activity; `renderers` on message, thread, chat

**Files:**
- Modify: `packages/ui/src/components/message/message.tsx:426-770` (`groupMessageParts` gains `{ kind: 'activity'; parts: (reasoning|tool)[] }`, excluding tool parts named `kai_ask`; render `<Activity>`; drop `<Tool>`), `components/thread/thread.tsx`, `components/chat/chat-app.tsx` (`reasoning` prop → activity `detail`/filter), `web-components/{message,thread,chat}/*.tsx` (`renderers` JS property), `scripts/preset-facades.json` unchanged (already lists them)
- Test: `components/message/message-activity.test.tsx`, updates to `chat-app-parts.test.tsx` and any test asserting the old tool panel (find: `grep -rln "tool-panel\|<Tool\|data-tool" packages/ui/src packages/ui/tests`)

**Interfaces:**
- Consumes: B2 `Activity`; A1 `RendererMap`, `resolveRenderer`, `TagRenderer`.
- Produces: `renderers?: RendererMap` on `MessageBody`, `Thread`, `ChatApp`, `kai-message`, `kai-thread`, `kai-chat`; keys per spec B §2 (`tool:<name>`, `tool`, `reasoning`, `text`, `source`, `file`); a `card:` key warns once and is ignored. Built-in registry entry `tool:kai_ask` is RESERVED for C (B3 excludes `kai_ask` from activity groups and renders nothing for it; C3 fills it).

- [ ] **Step 1: Failing tests** (`message-activity.test.tsx`): parts `[reasoning, tool(web_search), text, tool(read_file)]` render two activity lines around the text and **no** element matching the old tool panel's root selector; a message with only tool parts renders an activity line (not an empty body); `reasoningMode="off"` hides reasoning steps and keeps tool steps; `"compact"` renders `detail="summary"`; `renderers={{ text: 'my-text' }}` renders `<my-text>` with `.part`; a `card:x` key warns once; part order in `message.parts` is untouched (compare arrays).
- [ ] **Step 2: FAIL. Step 3: Implement**; export `groupMessageParts` from `solid.ts` if not already public (B6 needs it for the scaffolder).
- [ ] **Step 4: Run** unit, emitted, storybook project for `components/message components/chat components/thread web-components/chat web-components/thread`, `lint:preset-parts`, `lint:silent-drops`, `wire/round-trip.test.ts`, `build:api`. **Step 5: Commit** — `feat(ui)!: tool calls render as the activity line; renderers swap any part`.

**Verification type:** unit + storybook + a Playwright IVP of `kai-chat` streaming a mock tool turn (live step → settled summary).

---

### Task B4: `kai-thread` item mode and `kai-message` composed mode

**Files:**
- Modify: `packages/ui/src/web-components/thread/thread.tsx`, `components/thread/thread.tsx`, `web-components/message/message.tsx`, `components/message/message.tsx` (only the `Message` row wrapper, not `MessageBody`; coordinate: B3 owns `MessageBody`), `web-components/slots/slots.ts` (default slot docs)
- Test: `web-components/thread/thread-children.declarative.test.tsx`, `web-components/message/message-children.declarative.test.tsx`, `tests/presets/thread-parity.test.tsx`, `tests/presets/message-parity.test.tsx`

**Interfaces:**
- Produces: `<kai-thread>` renders light-DOM `<kai-message>` children when present (default slot inside the scroll viewport) and ignores `messages` (warn once if both); `<kai-message>` renders default-slot children as the body when present (warn once if `message` is also set) with `role`, `actions`, `actionsReveal`, `before-body`, `after-body`, `avatar` intact.

- [ ] **Step 1: Failing tests**
  - Thread item mode: two `kai-message` children render inside the scroll viewport; `messages` set alongside warns once and is ignored; `loading` shows the pending indicator after the last child; `empty` slot shows when there are no children and no messages; `scrollToBottom()` works.
  - Stick-to-bottom (storybook/Chromium, not jsdom): a composed thread scrolled to bottom; append 40 lines of text into the last child's `kai-markdown` over 20 frames; assert `scrollTop + clientHeight >= scrollHeight - 2` after each frame. Scrolled up by the user → it does NOT yank down.
  - Message composed mode: `<kai-message role="user">` with a `<kai-markdown>` child renders right-aligned with the action bar; `kai-message-action` fires from the host.
  - Parity (A2 helper): `kai-thread` with `messages=[fixture]` vs composed `kai-message` children built from the same fixture (text + reasoning + tool + source + file) → equal normalised DOM; same for `kai-message`.
- [ ] **Step 2: FAIL. Step 3: Implement**: mode by `readSlots` + `MutationObserver` (the `THREAD_SLOTS` pattern already in `thread.tsx`); stick-to-bottom observes the slot's assigned elements with the existing `ResizeObserver` path in `primitives/use-stick-to-bottom.ts` (extend it to observe assigned nodes; do not fork it).
- [ ] **Step 4: Run** unit, storybook project for thread/message, axe, `lint:preset-parts`, `build:api`. **Step 5: Commit** — `feat(ui): kai-thread and kai-message accept the app's own children`.

**Verification type:** unit + in-browser stick-to-bottom + parity.

---

### Task B5: `kai-plan` and `kai-chat`'s plan

**Files:**
- Create: `packages/ui/src/components/plan/plan.tsx`, `plan.test.tsx`, `plan.stories.tsx`, `packages/ui/src/web-components/plan/plan.tsx`, `plan-item.tsx`, `plan.declarative.test.tsx`, `packages/ui/tests/components/plan-hostile-output.test.tsx`
- Modify: `components/chat/chat-app.tsx` (render `Plan` in the dock's top band from `planFromMessages(messages)`; `plan: 'auto' | 'off'`), `web-components/chat/chat.tsx` (`plan` prop), shared registration files

**Interfaces:**
- Consumes: B1 `PlanItem`, `planFromMessages`; A5 dock bands.
- Produces: `kai-plan` (`items`, `open`/`defaultOpen`, `label`; default slot for `<kai-plan-item status>` children; `kai-open-change`), Solid `Plan`.

- [ ] **Step 1: Failing tests**: renders items with status icons and `aria-label`s ("completed", "in progress", "pending"); collapsed text is "N of M done · <in_progress label>"; composed children equal data mode (parity); `kai-chat` with a message containing a `kai_plan` tool part shows `kai-plan` in the dock's top band, updates when a later `kai_plan` arrives (new messages array), hides with `plan="off"`; hostile labels render as inert visible text.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: Run** unit, storybook project, axe, `build:api`. **Step 5: Commit** — `feat(ui): kai-plan, the agent's plan above the composer`.

**Verification type:** unit + in-browser IVP of `kai-chat` with a scripted mock `kai_plan` sequence.

---

### Task B6: Scaffolder, docs, starters

**Files:**
- Modify: `packages/ui/mcp/mcp/tools/scaffold.ts` (emitted Solid `renderPart`: group with `groupMessageParts`, render `Activity` for activity groups; keep a branch per `MessagePart` variant so the structural check passes), `packages/ui/mcp/mcp/scaffold.test.ts`, `mcp/catalog` (regenerate), `examples/starters/solid` (its own `renderPart`, find with `grep -rln "renderPart" examples/starters`), `apps/docs/src/content/docs/components/{thread,message}.mdx` (composition-first rewrite), new `components/activity.mdx`, `components/plan.mdx`, `packages/blocks/patterns/composed-thread/` (+ story `Patterns/Composed Thread`), the tool-display guide (find: `grep -rl "kai-tool\|<Tool" apps/docs/src/content/docs`)

- [ ] **Step 1: Failing test** in `scaffold.test.ts`: the emitted Solid code imports `Activity` and renders it for reasoning/tool; `pnpm --filter @kitn.ai/ui run verify:scaffold` fails before the change on that assertion.
- [ ] **Step 2: Implement; Step 3: Run** `nx build ui --skip-nx-cache`, `verify:scaffold` (read the printed cell counts), emitted project, MCP tests, docs build, `verify:docs`, `kai add composed-thread` into a scratch app. **Step 4: Commit** — `docs: composition-first thread and message pages, activity and plan, the composed-thread pattern`.

**Verification type:** consumer gates (`verify:scaffold`, `verify:consumer`, emitted) + docs build.
