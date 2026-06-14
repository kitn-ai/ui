# `<kc-confirm>` + `<kc-task-list>` — interactive approval cards (design)

> Brainstormed 2026-06-13. Two **native** cards built against the frozen **Card
> Contract** (`docs/superpowers/specs/2026-06-13-card-contract-design.md`). Prefix
> scheme: `kc-*`. Prior context: handoff
> `docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md`.

This spec covers two of the five fan-out card specs written against the frozen
contract. Both are **interactive approval** cards — the agent asks the user to
authorize an action (or pick from a small set) and the host routes the result back
to the agent. They share the same contract plumbing, so they're specced together;
their data + result shapes and interactions differ.

- **`<kc-confirm>`** — an action/approval card. Title + body + a set of
  **actions** (Approve / Reject, or a small choice set). Each action emits the
  contract's **`action`** verb with `{ action: <id>, payload? }`. Decision card,
  not a data-collection form.
- **`<kc-task-list>`** — a **selectable** task/plan list (checkbox rows + optional
  select-all + a confirm button). The user picks a subset, confirms, and the card
  emits the contract's **`submit-data`** verb with a validated
  `{ selected: string[] }`. **v1 = select/approve mode ONLY** (a future AG-UI
  spec adds live-progress mode — see Non-goals).

Both are the **native** transport (themed `<kc-*>`, in-process). The remote
(iframe) transport carries the *same* shapes; it is a separate spec.

---

## Problem / Goal

When an agent proposes to do something consequential (run a migration, delete
files, send an email) or proposes a multi-step plan, it needs the user to
**authorize** before proceeding — and it needs the answer back as a **typed,
validated** payload it can act on, not as free-text it has to re-parse.

The Card Contract already gives us the envelope (data down), the context, the
event verbs (up), and the host routing/policy. These two cards are the first
**decision** cards built on it:

- `kc-confirm` answers "**should I do this?**" → a named choice (`action`).
- `kc-task-list` answers "**which of these should I do?**" → a validated subset
  (`submit-data` → `{ selected }`).

Goal: ship both as themed, fully accessible native cards that consume the contract
verbatim (no invented events), with published JSON Schemas for their `data` down
and (for task-list) result up, and source-visible Storybook stories showing the
exact `CardEnvelope` JSON.

## Non-goals

- **No new events / no contract changes.** These cards consume the **frozen**
  `CardEvent` union and `CardHost`/`CardContext`. If something here seemed to need
  a new verb, it goes in "Open questions for review" — it is **not** decided here.
- **No remote/iframe transport.** Same shapes flow over `postMessage`, but that's
  the iframe-transport spec. Here the cards just emit `CardEvent`s; whether the
  host that routes them is native or a bridge is invisible to the card.
- **`kc-task-list` live progress is OUT of v1.** v1 is **select/approve only**.
  A later AG-UI spec adds a `mode: 'progress'` that renders per-task running /
  done / error state driven by `state` deltas (the contract already reserves the
  `state` verb for exactly this). v1 ships only `mode: 'select'`; the schema is
  shaped so `mode` can be added later without a breaking change (see schema).
- **No multi-step wizard / branching flows** (that's a flow-orchestration
  concern above the card layer).
- **No free-text input** — that's `kc-form` (a sibling fan-out spec). `kc-confirm`
  is choices only; `kc-task-list` is selection only.

## Architecture (exact two-layer files)

Matches the codebase's two-layer pattern (Solid component + `defineKitnElement`
facade) and the contract's "conventions every card spec MUST follow".

```
src/components/confirm-card.tsx        ConfirmCard  (Solid)
src/elements/confirm-card.tsx          <kc-confirm> (facade via defineKitnElement)
src/components/task-list-card.tsx      TaskListCard (Solid)
src/elements/task-list-card.tsx        <kc-task-list> (facade)

src/primitives/card-contract.ts        (frozen; consumed, not edited)
src/primitives/card-schemas/confirm.schema.json          confirm `data` (down)
src/primitives/card-schemas/task-list.schema.json        task-list `data` (down)
src/primitives/card-schemas/task-list.result.schema.json task-list result (up)
   (confirm emits `action` (a named intent), not `submit-data`, so it has NO
    result.schema.json — see "How each consumes the contract".)

src/components/card-card.tsx (or src/components/card-host.tsx) — CardCard chrome.
   A shared internal "card shell": renders `title`, body slot, an inline error
   state, ARIA group wiring. Both cards (and the future kc-form/kc-link/kc-embed)
   reuse it so chrome + error rendering stay consistent. (Confirmed shared, not
   per-card.) If a shared shell already lands with kc-form, reuse it; otherwise
   this spec introduces it.

src/elements/confirm-card.stories.tsx     Web Components/kc-confirm
src/elements/task-list-card.stories.tsx   Web Components/kc-task-list
src/components/confirm-card.stories.tsx    Components/ConfirmCard (Solid)
src/components/task-list-card.stories.tsx  Components/TaskListCard (Solid)
```

Register both tags in `src/elements/register.ts` and add entries to
`src/elements/element-meta.json` (the 32→34 element roster).

**Reuses:** `src/ui/button.tsx` (`Button`) for actions/confirm; `src/utils/cn`;
`lucide-solid` icons (e.g. `Check`, `AlertTriangle`). See "Open questions" re: a
`destructive` Button variant (not present today).

### How the facade meets the contract's `kc-card` event requirement

The contract requires custom-element cards to dispatch a **bubbling, composed**
`CustomEvent<CardEvent>` named **`kc-card`** so a host-level listener can route it
(and so a bare `<kc-confirm>` works with no Solid host).

`defineKitnElement`'s built-in `dispatch` is **non-bubbling, non-composed** (by
design, for element-local events like `select`). It is therefore **NOT** used for
the contract event. Instead each facade dispatches the contract event itself off
the host element:

```ts
// inside the facade, given `element: HTMLElement` from ctx and a CardEvent `ev`:
element.dispatchEvent(
  new CustomEvent<CardEvent>('kc-card', { detail: ev, bubbles: true, composed: true }),
);
```

The facade still receives the `KitnElementContext` (for `element`, `theme`,
`flag`); it just uses `element` directly for the `kc-card` event to satisfy the
bubbling/composed requirement the contract mandates. (We keep the element-local
`dispatch` available for any *non-contract* convenience event, but v1 emits only
`kc-card`.) Native Solid hosts that wrap the card in `CardProvider` instead pass a
`host: CardHost` prop and the component calls `host.emit(ev)` directly — see next
section.

## How each consumes the Card contract

Both components accept an **optional** `host?: CardHost` prop (Solid layer) **and**
a stable `cardId: string`. Emission is unified through one helper:

```ts
// Pseudocode shared by both Solid components. NEVER destructure props (Solid norm).
function emit(props: { host?: CardHost; cardId: string }, element: HTMLElement | undefined, ev: CardEvent) {
  if (props.host) props.host.emit(ev);                 // native Solid host path
  else element?.dispatchEvent(                           // bare-element path
    new CustomEvent<CardEvent>('kc-card', { detail: ev, bubbles: true, composed: true }),
  );
}
```

- **Native Solid host:** wrap in `CardProvider`; pass `host`. The component reads
  `host.context()` for `theme`/`locale` (reactive) and calls `host.emit(...)`.
- **Bare element:** no host → the facade dispatches the bubbling/composed
  `kc-card` CustomEvent; a host-level listener routes it through `CardPolicy`.

Either way the **host** (not the card) validates against the schema and routes per
policy. The card's only contract job is to emit well-formed `CardEvent`s carrying
its `cardId`.

### `<kc-confirm>` → uses the `action` verb

A confirm card is a **named-intent** card. Each action button emits:

```ts
{ kind: 'action', cardId, action: <action.id>, payload?: <action.payload> }
```

The host routes via `CardPolicy.onAction(cardId, action, payload)`. Confirm does
**not** use `submit-data` (it isn't collecting a structured object — it's signalling
a choice), so it ships **no** `*.result.schema.json`. This matches the contract's
verb descriptions: `action` = "named intent + optional payload, e.g.
`action:'approve'`".

After a choice is made the card enters a **resolved** state (disables the other
actions, marks the chosen one) so the same approval can't be double-fired; the
chosen `action.id` is surfaced as a `data-kc-resolved` attribute for host styling.
(Re-enabling/replacing is the host's job by re-rendering with new `data`.)

### `<kc-task-list>` → uses the `submit-data` verb

A task list collects a **structured result** (the selected ids), so on confirm it
emits:

```ts
{ kind: 'submit-data', cardId, data: { selected: string[] } }
```

The host validates `data` against `task-list.result.schema.json` before routing
via `CardPolicy.onSubmitData(cardId, data)`. Row toggling and select-all are local
UI state; **only the final confirm emits** (no event per toggle) — keeps the wire
quiet and the result atomic. The confirm button is disabled while the selection is
empty unless `allowEmpty` is set (see schema), in which case confirming with none
selected emits `{ selected: [] }` (a valid "approve nothing / skip all" answer).

### Context usage

Both cards read `CardContext` only for **theme** (mode + optional token overrides)
and **locale** (button/aria label direction; numeric/plural formatting of any "N
selected" affordance). They do **not** use `authToken` (native cards; the contract
omits it for native) or `conversationId` (the host correlates via `cardId`). On the
bare-element path, theme comes from the facade's existing `theme` attribute
(`defineKitnElement` already wires `light|dark|auto`), so a host-pushed context is
not required for a bare card to render correctly.

### `ready` / `error` / `dismiss`

- On mount each card emits `{ kind: 'ready', cardId }` (lets a host push initial
  context; harmless for bare elements).
- If `data` fails validation (host-side) **or** the component receives structurally
  unusable `data` (e.g. `tasks` not an array), the card renders the shared inline
  **error state** and emits `{ kind: 'error', cardId, message }` — never a broken
  card (contract error-handling requirement).
- Optional `dismissible` (kc-confirm) renders a close affordance emitting
  `{ kind: 'dismiss', cardId }`.

---

## JSON Schemas

All under `src/primitives/card-schemas/`. Draft 2020-12. `x-kitn-*` keywords are
UI hints (ignored by generic validators, honored by the cards). Each ships with a
matching TS type (shown after the schema). The host validates these at the
boundary (contract requirement); the cards assume already-valid data but still
guard structurally.

### `confirm.schema.json` — `<kc-confirm>` data (down)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/confirm.schema.json",
  "title": "ConfirmCardData",
  "description": "Data payload for a `confirm` card (CardEnvelope.data when type='confirm').",
  "type": "object",
  "additionalProperties": false,
  "required": ["actions"],
  "properties": {
    "heading": {
      "type": "string",
      "description": "Optional in-body heading. Distinct from CardEnvelope.title (the card chrome title)."
    },
    "body": {
      "type": "string",
      "description": "Body text. Plain text in v1 (rendered safely; no HTML injection)."
    },
    "tone": {
      "type": "string",
      "enum": ["default", "warning", "danger"],
      "default": "default",
      "description": "Overall card tone; 'danger' adds a warning icon + accent for destructive approvals.",
      "x-kitn-control": "tone"
    },
    "actions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 4,
      "description": "The choice set. Rendered as buttons in order; max 4 keeps it a decision, not a menu.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "description": "Emitted as CardEvent.action. Must be unique within `actions`.",
            "x-kitn-unique": true
          },
          "label": { "type": "string", "minLength": 1, "description": "Visible button label." },
          "style": {
            "type": "string",
            "enum": ["primary", "default", "destructive"],
            "default": "default",
            "description": "Button emphasis. 'destructive' = red/danger; 'primary' = filled accent.",
            "x-kitn-control": "button-style"
          },
          "payload": {
            "description": "Optional opaque payload echoed back in CardEvent.payload (any JSON)."
          },
          "default": {
            "type": "boolean",
            "default": false,
            "description": "If true, this action is the keyboard default (Enter) and gets initial focus. At most one should be true; the card uses the first if several are.",
            "x-kitn-default-action": true
          }
        }
      }
    },
    "dismissible": {
      "type": "boolean",
      "default": false,
      "description": "Show a close affordance that emits the `dismiss` verb."
    }
  }
}
```

```ts
// src/primitives/card-contract types extension (co-located TS for confirm)
export interface ConfirmAction {
  id: string;
  label: string;
  style?: 'primary' | 'default' | 'destructive';
  payload?: unknown;
  default?: boolean;
}
export interface ConfirmCardData {
  heading?: string;
  body?: string;
  tone?: 'default' | 'warning' | 'danger';
  actions: ConfirmAction[]; // 1..4
  dismissible?: boolean;
}
export type ConfirmCardEnvelope = CardEnvelope<'confirm', ConfirmCardData>;
```

Confirm has **no result schema** — it emits the `action` verb (a discriminator +
optional opaque `payload`), which the contract already types. The set of valid
`action` ids is the set of `actions[].id` the card was given; the host can
cross-check the emitted `action` against that set when routing (recommended,
documented for hosts).

### `task-list.schema.json` — `<kc-task-list>` data (down)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/task-list.schema.json",
  "title": "TaskListCardData",
  "description": "Data payload for a `task-list` card (CardEnvelope.data when type='task-list').",
  "type": "object",
  "additionalProperties": false,
  "required": ["tasks"],
  "properties": {
    "mode": {
      "type": "string",
      "enum": ["select"],
      "default": "select",
      "description": "v1 supports only 'select' (toggle + confirm). 'progress' (live AG-UI status) is a future enum value; restricting it now keeps the wire forward-compatible.",
      "x-kitn-mode": true
    },
    "heading": {
      "type": "string",
      "description": "Optional in-body heading; distinct from CardEnvelope.title."
    },
    "tasks": {
      "type": "array",
      "minItems": 1,
      "description": "The selectable rows, rendered in order.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label"],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "description": "Stable id; the selected ids are returned in the result. Unique within `tasks`.",
            "x-kitn-unique": true
          },
          "label": { "type": "string", "minLength": 1, "description": "Row label." },
          "description": { "type": "string", "description": "Optional secondary line under the label." },
          "checked": {
            "type": "boolean",
            "default": false,
            "description": "Initial checked state of the row."
          },
          "disabled": {
            "type": "boolean",
            "default": false,
            "description": "Row is shown but not toggleable (and excluded from select-all)."
          }
        }
      }
    },
    "selectAll": {
      "type": "boolean",
      "default": false,
      "description": "Render a master select-all checkbox above the list.",
      "x-kitn-control": "select-all"
    },
    "confirmLabel": {
      "type": "string",
      "default": "Confirm",
      "description": "Label for the confirm button."
    },
    "allowEmpty": {
      "type": "boolean",
      "default": false,
      "description": "If true, confirm is enabled with zero selected (emits { selected: [] }). If false, confirm is disabled until >=1 selected."
    },
    "min": {
      "type": "integer",
      "minimum": 0,
      "description": "Optional minimum number that must be selected to confirm.",
      "x-kitn-select-min": true
    },
    "max": {
      "type": "integer",
      "minimum": 1,
      "description": "Optional maximum selectable; further toggles are blocked once reached.",
      "x-kitn-select-max": true
    }
  }
}
```

```ts
export interface TaskListTask {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
}
export interface TaskListCardData {
  mode?: 'select'; // future: 'select' | 'progress'
  heading?: string;
  tasks: TaskListTask[]; // >=1
  selectAll?: boolean;
  confirmLabel?: string;
  allowEmpty?: boolean;
  min?: number;
  max?: number;
}
export type TaskListCardEnvelope = CardEnvelope<'task-list', TaskListCardData>;
```

### `task-list.result.schema.json` — `<kc-task-list>` result (up, via `submit-data`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/task-list.result.schema.json",
  "title": "TaskListCardResult",
  "description": "Payload of CardEvent { kind: 'submit-data' } from a task-list card.",
  "type": "object",
  "additionalProperties": false,
  "required": ["selected"],
  "properties": {
    "selected": {
      "type": "array",
      "description": "Ids of the checked tasks, in the order they appear in `tasks`. Subset of the input task ids.",
      "items": { "type": "string", "minLength": 1 },
      "uniqueItems": true
    }
  }
}
```

```ts
export interface TaskListCardResult { selected: string[]; }
```

The host validates the outgoing payload against this before routing (contract
requirement: outbound payloads are schema-validated; failures emit `error` and are
NOT routed). `selected` is always a subset of the input `tasks[].id` set and
preserves input order.

### `x-kitn-*` hint summary

| hint | where | meaning |
|---|---|---|
| `x-kitn-control` | confirm.tone, action.style, task.selectAll | which control/styling the card renders |
| `x-kitn-unique` | action.id, task.id | ids must be unique within their array (card de-dupes + warns) |
| `x-kitn-default-action` | confirm action.default | Enter-key default + initial focus |
| `x-kitn-mode` | task-list.mode | reserved mode discriminator (future `progress`) |
| `x-kitn-select-min` / `-max` | task-list.min/max | selection-count bounds for confirm enablement |

These follow the contract's "JSON-Schema-first with `x-kitn-*` UI hints" tenet;
generic JSON Schema validators ignore them, the cards honor them.

---

## Interaction & keyboard model

### `<kc-confirm>`

- Actions render as a horizontal button row (wraps on narrow widths). `primary`
  uses Button `default` (filled); `destructive` uses the new `destructive` variant
  (see Open questions); plain uses `outline`.
- The `default: true` action gets initial focus and is invoked by **Enter** when
  focus is on the card body (not stealing Enter from a focused non-default
  button). **Tab/Shift-Tab** cycles the buttons (native button order). **Escape**
  → if `dismissible`, emits `dismiss`; otherwise no-op.
- Activating any action emits `action`, then **resolves** the card (other buttons
  `disabled`, chosen button shows a check + `aria-pressed`/visual selected state).
- `tone: 'danger'` and any `destructive` action render a warning icon and a danger
  accent.

### `<kc-task-list>`

- The list is a group of checkbox rows. Each row is a real checkbox
  (`<input type="checkbox">` or a `role="checkbox"` element) with its `label`
  associated (label `for`/wrapping) and `description` linked via
  `aria-describedby`. Clicking the row or its checkbox toggles it.
- **Keyboard:**
  - **Tab** moves into the group; rows participate in normal tab order **or** use
    a roving-tabindex listbox-style model. **Decision:** use **native checkbox tab
    order** (each checkbox is individually tabbable) for v1 — it's the simplest
    fully-accessible model and matches a real checkbox group; arrow-key roving is a
    nicety we can add later. (Flagged in Open questions if reviewers prefer roving.)
  - **Space** toggles the focused checkbox (native).
  - **Enter** anywhere in the card (when confirm is enabled) triggers **confirm**.
  - Select-all checkbox: **Space** toggles all toggleable (non-`disabled`) rows.
- **Select-all semantics:**
  - Checked when **all** toggleable rows are checked; **unchecked** when none are;
    **indeterminate** (`indeterminate = true`, `aria-checked="mixed"`) when some
    but not all are checked.
  - Toggling it ON checks all toggleable rows (respecting `max`: if `max` is set
    and the toggleable count exceeds it, select-all is **hidden/disabled**, since
    "all" would violate `max` — documented). Toggling OFF unchecks all.
  - `disabled` rows are never affected by select-all and never counted toward
    "all".
- **Confirm enablement:** enabled when `selectedCount >= (min ?? (allowEmpty ? 0 : 1))`
  and `selectedCount <= (max ?? Infinity)`. While disabled, the button shows the
  reason via `aria-describedby` (e.g. "Select at least 1 task").
- **`max` reached:** unchecked rows become non-toggleable (disabled affordance +
  `aria-disabled`) with a small "Up to N" hint; checked rows remain uncheckable to
  free a slot.
- On confirm: emit `submit-data` with `{ selected }`, then enter a resolved state
  (rows + confirm disabled, a "Submitted" affordance). Re-rendering with new `data`
  resets it.

A small **"N selected"** live affordance updates as rows toggle (locale-formatted),
announced politely (see a11y).

---

## Error handling (per contract)

- **Invalid `data` (host validation fails):** the host emits `error` and the card
  renders the shared inline error state ("This card couldn't be displayed"); never
  a partial/broken card.
- **Structurally unusable `data` reaching the component** (defensive — e.g. empty
  `actions`/`tasks` despite `minItems`, or duplicate ids): render the inline error
  state + emit `{ kind: 'error', cardId, message }`. Duplicate ids are de-duped
  (first wins) with a `console.warn`; if de-duping empties the list, that's an
  error state.
- **No host / no handler:** bare element with no `kc-card` listener → events are
  simply not heard (the contract's "missing handler = no-op + warn" applies at the
  host; the card always emits correctly regardless).
- **Unknown enum values** (e.g. an unrecognized `action.style`): fall back to the
  default style + `console.warn`; never throw.
- Cards **never throw** during render in response to data shape; worst case is the
  error state.

## Accessibility

Target: **0 axe violations, light + dark** (project gate). Native, fully keyboard +
screen-reader operable.

- **Card shell:** the `CardCard` shell is a labeled region. Use
  `role="group"` with `aria-labelledby` pointing at the title/heading when a title
  exists. The error state uses `role="alert"`.
- **`kc-confirm`:** action buttons are real `<button>`s with text labels; icon-only
  affordances (close) get `aria-label`. The danger tone's warning icon is
  `aria-hidden` (decorative; the tone is conveyed by text). The default action is
  programmatically focused on mount only if the card is the user's current focus
  context (avoid focus-stealing in a scrolling transcript — focus on mount is gated
  by an `autofocus` prop, default **off**, so cards appearing mid-stream don't grab
  focus; documented).
- **`kc-task-list`:** a real checkbox group — each checkbox labeled; `description`
  via `aria-describedby`; select-all uses `aria-checked="mixed"` for the
  indeterminate state. The confirm button's disabled reason is exposed via
  `aria-describedby`. The "N selected" counter is an `aria-live="polite"` region so
  SR users hear the running count. `max`-reached disabled rows expose
  `aria-disabled="true"` + the hint via `aria-describedby`.
- **Color independence:** destructive/danger never rely on color alone — they carry
  an icon + label. Focus rings come from the shared `focus-visible:ring-*` Button
  styles.
- **RTL/locale:** layout uses logical properties; counts are locale-formatted via
  `context().locale`.

## Testing

Gate (unchanged): `npm run build` + `npm run typecheck` (3 tsconfigs) + `npm test`
(baseline 3 pre-existing Shiki failures) + `npm run test:react` + a11y (0
violations light + dark). Per the handoff norm, **verify empirically with
Playwright + measurements**, not just "it compiles" / static screenshots; new
Storybook stories require a full restart (custom elements don't re-register on
HMR).

### Unit / logic (jsdom)

- **Registration:** both tags register; idempotent re-define is a no-op.
- **Schema artifacts:** `confirm.schema.json`, `task-list.schema.json`,
  `task-list.result.schema.json` each parse and validate a known-good and a
  known-bad example (mirrors the contract's schema-artifact test requirement).
- **kc-confirm:** clicking an action dispatches a **bubbling, composed** `kc-card`
  CustomEvent with `{ kind:'action', cardId, action: <id>, payload }`; `payload`
  is echoed; resolved state disables other actions; `dismissible` emits `dismiss`;
  empty `actions` → error state + `error` event; duplicate ids de-duped + warn.
- **kc-task-list:** toggling rows updates local state with **no** event; confirm
  emits `{ kind:'submit-data', cardId, data:{ selected } }` with ids in input
  order; `allowEmpty` gates confirm with zero; `min`/`max` gate confirm; select-all
  checks/unchecks toggleable rows and computes indeterminate; `disabled` rows
  excluded; resolved state after submit.
- **Native host path:** with a `CardProvider` + `host` prop, `host.emit` is called
  (not the CustomEvent); `host.context()` theme is consumed.
- **Contract conformance:** emitted events typecheck as `CardEvent`; emitted
  payloads validate against the result schema (task-list).

### Empirical (Playwright)

- Real `<kc-confirm>` in a page with a host listener: keyboard (Tab to a button,
  Enter on default action, Escape→dismiss), measured focus order, resolved visual
  state.
- Real `<kc-task-list>`: keyboard select (Space toggles, select-all → indeterminate
  → all), confirm via Enter, measured "N selected" live updates, `max`-reached row
  disabling.
- a11y scans (axe) + screenshots for both, **light + dark**, including the error
  state and the resolved state.

## Storybook stories (source-visible, show the CardEnvelope JSON)

Per the contract convention and the Examples norm, **every** story sets
`parameters.docs.source.code` to a hand-authored, copy-pasteable snippet, and the
description shows the **exact `CardEnvelope` JSON** the agent would emit. Each story
attaches a `kc-card` listener that logs/echoes the routed event so the Docs tab
demonstrates the full round-trip.

`Web Components/kc-confirm` stories:

- **Approve / Reject** (the canonical two-action approval).
- **Destructive** (`tone:'danger'`, a `destructive` "Delete" action) — shows the
  danger styling + that destructive needs no color-only cue.
- **Choice set** (3–4 actions, one `default:true`).
- **Dismissible**.
- **Error state** (deliberately bad `data`).

Example `CardEnvelope` shown in the Approve/Reject story source:

```json
{
  "type": "confirm",
  "id": "card_approve_migration",
  "title": "Run database migration?",
  "data": {
    "body": "This will apply 3 pending migrations to production. This cannot be undone.",
    "tone": "warning",
    "actions": [
      { "id": "approve", "label": "Run migration", "style": "primary", "default": true },
      { "id": "reject", "label": "Cancel", "style": "default" }
    ]
  }
}
```

```html
<!-- bare-element usage shown in the story source -->
<kc-confirm id="card_approve_migration"></kc-confirm>
<script type="module">
  const el = document.querySelector('kc-confirm');
  el.cardId = 'card_approve_migration';
  el.title = 'Run database migration?';
  el.data = {
    body: 'This will apply 3 pending migrations to production. This cannot be undone.',
    tone: 'warning',
    actions: [
      { id: 'approve', label: 'Run migration', style: 'primary', default: true },
      { id: 'reject', label: 'Cancel' },
    ],
  };
  // Contract event: bubbling + composed, name 'kc-card'.
  el.addEventListener('kc-card', (e) => console.log('routed', e.detail));
  // → { kind: 'action', cardId: 'card_approve_migration', action: 'approve' }
</script>
```

`Web Components/kc-task-list` stories:

- **Select a plan** (default, select-all on, a few pre-`checked`).
- **Require at least one** (`allowEmpty:false`, default).
- **Bounded** (`min`/`max`) — shows confirm gating + max-reached disabling.
- **With descriptions**.
- **Resolved / submitted** state.

Example `CardEnvelope` shown in the task-list story source:

```json
{
  "type": "task-list",
  "id": "card_plan_42",
  "title": "Approve the plan steps",
  "data": {
    "mode": "select",
    "selectAll": true,
    "confirmLabel": "Run selected",
    "tasks": [
      { "id": "lint",  "label": "Run linter",            "checked": true },
      { "id": "test",  "label": "Run unit tests",        "checked": true },
      { "id": "build", "label": "Build production bundle" },
      { "id": "deploy","label": "Deploy to staging", "description": "Reversible; staging only" }
    ]
  }
}
```

```js
// Result emitted on confirm (after checking lint + test + deploy):
// { kind: 'submit-data', cardId: 'card_plan_42', data: { selected: ['lint', 'test', 'deploy'] } }
```

Solid-layer stories (`Components/ConfirmCard`, `Components/TaskListCard`) render the
Solid components with a `host` that captures emitted events, also source-visible.

---

## Open questions for review

1. **`destructive` Button variant.** `src/ui/button.tsx` today has only
   `default | ghost | outline`. Destructive actions (kc-confirm `style:'destructive'`,
   `tone:'danger'`) need a danger variant. **Recommendation:** add a `destructive`
   variant to `buttonVariants` (red accent using existing danger tokens) as a tiny
   shared change. This touches a shared primitive, so flagging rather than deciding.
   (Alternative: cards apply a local danger class via `cn` without touching Button —
   uglier, less reusable.)

2. **task-list keyboard model: native checkbox tab order vs roving-tabindex
   listbox.** This spec picks **native checkbox tab order** for v1 (simplest fully
   a11y model; matches a real checkbox group). `FileTree` uses roving-tabindex for
   its `tree`, so there's a house precedent for roving if reviewers prefer a single
   arrow-navigable widget (fewer tab stops in a long list). Easy to switch; calling
   it out so it's an explicit decision.

3. **Shared card shell location/name.** I propose a shared internal `CardCard`
   shell (`src/components/card-card.tsx`) reused by all card types for chrome +
   error state. If `kc-form` (a sibling fan-out spec) is landing first and already
   introduces such a shell, these cards should consume **that** one instead. Needs
   coordination across the parallel card specs so we don't create two shells.

4. **Confirm "default action" focus-on-mount.** Default is `autofocus` **off** (no
   focus-stealing for cards appearing mid-transcript). Confirm reviewers agree
   off-by-default is right, or whether an approval card is important enough to grab
   focus when it appears.

5. **Re-arming after resolve.** v1 makes both cards single-shot (resolve after the
   first action/submit; the host re-renders with fresh `data` to re-arm). Confirm
   this is the desired model vs. allowing repeated submissions (would need a
   contract-level notion of card lifecycle/acknowledgement, which is out of scope
   here).
