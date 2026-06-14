# `kc-card` + `kc-form` — design (2026-06-13)

The base **card primitive** (`kc-card`) and the **JSON-Schema form renderer**
(`kc-form`), the first two cards built against the **frozen Card Contract**
(`docs/superpowers/specs/2026-06-13-card-contract-design.md`). `kc-card` provides
the chrome every native card composes from; `kc-form` turns an agent's JSON Schema
"shape" into a themed, accessible, validated form whose valid submission is emitted
up the contract as `submit-data`.

> This spec builds **against the interfaces frozen in the Card Contract** — it does
> not change them. Where the contract leaves an implementation choice open (e.g.
> the boundary validator), this spec defers to the contract's flagged decision and
> only consumes the requirement.

Prior context: the Card Contract (the frozen spine) and the handoff
`docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md` (provider-owned
iframe direction + the two-transport model). The repo's two-layer pattern is
exemplified by `src/components/artifact.tsx` + `src/elements/artifact.tsx`, the
`defineKitnElement` factory (`src/elements/define.tsx`), and `FileTree`
(`src/components/file-tree.tsx`).

---

## Problem / Goal

An agent (or any backend, in any language) needs to ask the chat to render an
**interactive form** and get back a **validated, structured object** — without the
client pre-knowing the form. The contract already fixes *how* a card receives data
down (`CardEnvelope`) and emits up (`submit-data` / `action` / `error`). What's
missing is:

1. **A base card primitive** (`kc-card`) so every native card (`kc-form`,
   `kc-confirm`, `kc-task-list`, `kc-link-card`, `kc-embed`) shares one consistent,
   themed, accessible chrome (optional media / title / body / actions footer) and a
   uniform inline **error state** for the contract's "never a broken/partial card"
   rule. Without it, each card reinvents the frame and they drift.

2. **A form renderer** (`kc-form`) that maps a **JSON Schema** (the agent's down
   payload) to native, themed `<kc-*>`-styled widgets, validates input against that
   same schema, and produces a single validated JSON object emitted via the
   contract's `submit-data` verb.

**Goal:** an agent emits a `CardEnvelope` of `type: 'form'` whose `data` is a JSON
Schema + a few `x-kitn-*` UI hints; the host renders a fully accessible form inside
`kc-card` chrome; on submit the host receives a `submit-data` event carrying an
object that is **guaranteed to validate** against the form's *result* schema.

### Goals (concrete)

- `kc-card`: a generic, slotted/prop-driven card frame (media · title · body ·
  actions footer) + a standard inline **error** rendering, theme-aware (`--kitn-*`),
  a11y-clean. Other cards compose it; it is also publishable standalone.
- `kc-form`: a deterministic **JSON-Schema → widget** mapping (the table below),
  `x-kitn-*` hints for ambiguous cases, full client-side validation (required,
  min/max/length, pattern, enum), and a `submit-data` emission of the collected,
  coerced, validated object.
- Both consume the **frozen contract only** — read `CardContext`, emit `CardEvent`
  via the `CardHost` (native context) or the bubbling `kc-card` `CustomEvent`.
- Ship `.d.ts` **and** `.schema.json` artifacts for the down payload and the
  submit result, per the schema-first tenet.

## Non-goals

- **Not** the contract itself, the iframe/remote transport, or the AG-UI wire
  mapping (separate specs). `kc-form`'s remote variant rides the same shapes for
  free; this spec defines the *native* card.
- **Not** the other cards (`kc-confirm`, `kc-task-list`, `kc-link-card`,
  `kc-embed`) — they are sibling specs that also compose `kc-card`. This spec only
  defines `kc-card` (which they consume) and `kc-form`.
- **Not** a general-purpose JSON-Schema form library competitor (RJSF / JSON Forms).
  `kc-form` supports the **subset the contract's validator covers** (type, enum,
  required, min/max, length, pattern, array items, object properties, `x-kitn-*`),
  matching the contract's "lean validator first" decision. `$ref`, `allOf`/`anyOf`,
  conditional `if/then`, and `oneOf` schema composition are **out of v1** (see Open
  questions).
- **Not** a new event vocabulary — only the contract's verbs.

---

## Architecture (the exact files)

Two cards, the repo's two-layer pattern, plus the JSON-Schema artifacts. New files:

### `kc-card` (base primitive)

```
src/components/card.tsx        Solid <Card> — the chrome (media/title/body/actions/error)
src/elements/card.tsx          <kc-card> wrapper via defineKitnElement
src/components/card.stories.tsx       Solid stories
src/elements/card.stories.tsx         <kc-card> web-component stories (source-visible)
tests/components/card.test.tsx        unit + a11y
```

### `kc-form` (form renderer)

```
src/components/form.tsx        Solid <Form> — schema → widgets, validation, submit
src/components/form-widgets.tsx       the per-type widget components (text/select/…)
src/elements/form.tsx          <kc-form> wrapper via defineKitnElement
src/components/form.stories.tsx       Solid stories
src/elements/form.stories.tsx         <kc-form> web-component stories (CardEnvelope JSON shown)
tests/components/form.test.tsx        unit (mapping + validation) + a11y
```

### Shared card-emit helper (the contract's native transport mechanism)

```
src/components/card-emit.ts    emitCardEvent(host, event) — the bubbling `kc-card` CustomEvent
```

### Schema artifacts (schema-first tenet)

```
src/primitives/card-schemas/form.schema.json          down payload (the form definition)
src/primitives/card-schemas/form.result.schema.json   the submit-data shape
```

### Registration

`src/elements/register.ts` gains `import './card';` and `import './form';` (after
the existing leaf imports). Card host-routing wiring (the `kc-card` listener +
policy) is defined by the contract; this spec only *emits* through it.

### Reuse (do not rebuild)

- `src/ui/button.tsx` (`Button`, `buttonVariants`) for actions footer + submit.
- `src/ui/textarea.tsx` (`Textarea`, with `useAutoResize`) for the `textarea` widget.
- `src/utils/cn.ts` for class merging (every component uses it).
- `lucide-solid` icons (`Star` for rating, `AlertTriangle` for error, `Plus`/`X`
  for repeater rows), matching `file-tree.tsx` / `artifact.tsx` icon usage.
- `defineKitnElement` (`src/elements/define.tsx`) for both wrappers.
- `src/primitives/card-contract.ts` types (`CardEnvelope`, `CardContext`,
  `CardEvent`, `CardHost`) — imported, never re-declared.

---

## `kc-card` — the base primitive

### What it provides

A generic card frame with four regions, all optional, plus a built-in error state:

```
┌─────────────────────────────┐
│ [media]   (optional, top)   │   image/icon/visual slot
├─────────────────────────────┤
│ Heading                     │   `heading` prop (= CardEnvelope.title) — <h3>
│ description (optional)       │
│ ─────────────────────────── │
│ body / default slot         │   the card's content (kc-form puts the form here)
│                             │
├─────────────────────────────┤
│        [actions footer]     │   action buttons slot (footer)
└─────────────────────────────┘
```

It is intentionally **presentational** — it does NOT emit contract events itself
(it has no inputs). It renders chrome and, when asked, an **error** state. Cards
that compose it (like `kc-form`) own the contract interaction.

### Solid component — `src/components/card.tsx`

```ts
import { type JSX, Show, splitProps, mergeProps } from 'solid-js';
import { cn } from '../utils/cn';
import { AlertTriangle } from 'lucide-solid';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Heading rendered in the card chrome (the contract's CardEnvelope.title).
   *  NB: NOT `title` — `title` is a reserved IDL attr (see define.tsx RESERVED). */
  heading?: string;
  /** Optional supporting text under the heading. */
  description?: string;
  /** Media region (image/icon) rendered above the heading. */
  media?: JSX.Element;
  /** Footer action region (buttons). */
  actions?: JSX.Element;
  /** When set, the card renders its standard inline error state INSTEAD of body. */
  errorMessage?: string;
  /** Compact spacing for dense lists of cards. */
  dense?: boolean;
}

export function Card(props: CardProps): JSX.Element {
  const merged = mergeProps({ dense: false }, props);
  const [local, rest] = splitProps(merged, [
    'heading', 'description', 'media', 'actions', 'errorMessage', 'dense', 'class', 'children',
  ]);
  // …renders the bordered surface; see "Chrome" below. Never destructures props.
}
```

The component renders a bordered, rounded surface using existing tokens (matching
the `Frame` look used across stories: `border`, `bg-card`/`bg-background`,
`rounded-xl`, `text-foreground`). The heading is an `<h3>` with a stable `id` so
composing cards (and `kc-form`'s `<form>`) can `aria-labelledby` it. When
`errorMessage` is set, the body/actions are replaced by an `AlertTriangle` + message
in a `role="alert"` region — this is the single, consistent realization of the
contract's *"Invalid envelope data → card renders an inline error state"* rule, so
every card errors identically. Props are never destructured (`splitProps` +
`mergeProps`, per the SolidJS norm and the contract convention).

### Web-component wrapper — `src/elements/card.tsx`

```ts
import { defineKitnElement } from './define';
import { Card } from '../components/card';

interface Props extends Record<string, unknown> {
  heading?: string;
  description?: string;
  errorMessage?: string;   // attribute: error-message
  dense?: boolean;
}

defineKitnElement<Props>('kc-card', {
  heading: undefined,
  description: undefined,
  errorMessage: undefined,
  dense: false,
}, (props) => (
  <Card
    heading={props.heading}
    description={props.description}
    errorMessage={props.errorMessage}
    dense={props.dense}
    // Light-DOM slots project into the Solid regions (see "Slots" below).
    media={<slot name="media" />}
    actions={<slot name="actions" />}
  >
    <slot />
  </Card>
));
```

### Slots (web-component) vs props (Solid)

- **`<kc-card>` (custom element):** uses **named `<slot>`s** so HTML authors drop
  arbitrary markup in:
  - default slot → **body**,
  - `slot="media"` → media region,
  - `slot="actions"` → footer.
  Plus attributes `heading`, `description`, `error-message`, `dense`.
- **`<Card>` (Solid):** uses **props** (`media`, `actions`, `children`,
  `errorMessage`) — the SolidJS-idiomatic equivalent. The two stay in sync because
  the wrapper passes `<slot>` elements into the Solid props.

This mirrors how `<kc-artifact>` projects its Solid component while exposing a flat
attribute/property API to HTML authors.

### Chrome ownership

`kc-card` owns **only chrome**. It reads no `CardContext` and emits no `CardEvent`.
This keeps it reusable as a plain UI primitive (a non-card surface can use `<Card>`
too) while the *cards that compose it* (`kc-form`) own the contract wiring. The
contract's `CardEnvelope.title` maps to `heading`.

---

## `kc-form` — the JSON-Schema form renderer

### How it consumes the Card contract

- **Data down:** `kc-form`'s `data` prop is the **form definition** — a JSON Schema
  (`type: 'object'`) describing the fields, plus `x-kitn-*` hints. This is the
  `CardEnvelope.data` for `type: 'form'` (`form.schema.json`). The wrapper exposes
  it as a JS **property** (`el.data = {...}`), like `<kc-file-tree>.files`.
- **Context down:** reads `CardContext` for `theme.mode`/`tokens` (already applied
  via `defineKitnElement`'s `.dark` scope + adopted stylesheet) and `locale` (for
  the `date`/`number` widgets). Native cards inherit theme automatically through the
  shared stylesheet; `kc-form` additionally honors `context().locale` for the
  `date`/`number` specialized widgets.
- **Events up — exactly these contract verbs (from `CardEvent`):**
  - `ready` — on mount: `{ kind: 'ready', cardId }` ("Card finished mounting; host
    may push initial context").
  - `submit-data` — on a valid submit: `{ kind: 'submit-data', cardId, data }`
    where `data` is the collected, coerced object validated against the schema.
    **This is the form's whole purpose.**
  - `error` — on invalid envelope schema or render failure:
    `{ kind: 'error', cardId, message }`. The card shows `kc-card`'s inline error.
  - `action` — for **secondary** buttons declared via `x-kitn-actions` (e.g. a
    "Skip"/"Cancel") → `{ kind: 'action', cardId, action: '<id>' }`.
  - `dismiss` — if `x-kitn-dismissible`, a close affordance emits
    `{ kind: 'dismiss', cardId }`.
  - `resize` — content height for the remote/iframe auto-height (the remote runtime
    emits it; native skips — see Open question 4).
  `kc-form` **never invents events** — only the verbs above, all frozen in the
  contract's `CardEvent` union.

### Native emission mechanism (the contract's `kc-card` CustomEvent)

The contract requires native cards to dispatch a **bubbling, composed**
`CustomEvent<CardEvent>` named **`kc-card`** so a host-level listener can route it
through policy *and* so a bare `<kc-form>` works without a Solid host.

`defineKitnElement`'s default `dispatch` fires **non-bubbling, non-composed**
per-name events (`src/elements/define.tsx`, lines 131–134) — deliberately, for the
existing leaf elements. That is **not** what the contract's `kc-card` event needs.
So cards do **not** use the default `dispatch` for contract events. Instead they emit
via a small shared helper:

```ts
// src/components/card-emit.ts
import type { CardEvent } from '../primitives/card-contract';
export function emitCardEvent(host: HTMLElement, event: CardEvent): void {
  host.dispatchEvent(
    new CustomEvent<CardEvent>('kc-card', { detail: event, bubbles: true, composed: true }),
  );
}
```

The wrapper passes `ctx.element` (the host node, available in
`KitnElementContext.element`) into the Solid component so it can call
`emitCardEvent(element, …)`. When a Solid `CardProvider` is present (the contract's
native transport), the component prefers `host.emit(event)` from context; otherwise
it falls back to the bubbling `kc-card` `CustomEvent`. Both reach the same policy
router. This is the one place this spec extends *mechanism* (not contract) — and it
is exactly what the contract's native-transport section prescribes.

### The type → widget mapping (concrete, deterministic)

Given a JSON Schema `type: 'object'`, each property is rendered by this table.
Resolution order: an explicit `x-kitn-widget` always wins; otherwise the
`type`/`format`/`enum`/constraint combination selects the widget.

| Schema shape | Widget | Notes |
|---|---|---|
| `string` | **text input** | single-line |
| `string` + `enum` (≤ `x-kitn-inlineMax`, default 4) | **radio group** | `role="radiogroup"` |
| `string` + `enum` (> threshold) | **select** | native `<select>` (a11y + mobile-friendly) |
| `string` + `format: "email"` | **email input** | `type="email"` + pattern validation |
| `string` + `format: "uri"`/`"url"` | **url input** | `type="url"` |
| `string` + `format: "date"` | **date input** | `type="date"`, locale-aware display |
| `string` + `format: "date-time"` | **datetime input** | `type="datetime-local"` |
| `string` + `format: "time"` | **time input** | `type="time"` |
| `string` + `maxLength` > 120 **or** `x-kitn-widget: "textarea"` | **textarea** | reuses `src/ui/textarea.tsx` (auto-resize) |
| `string` + `x-kitn-widget: "password"` | **password input** | `type="password"` |
| `number` / `integer` | **number input** | `type="number"`, `step` = 1 for integer |
| `number`/`integer` + `minimum` & `maximum` + `x-kitn-widget: "slider"` | **slider** | `type="range"` with live value label |
| `integer` + `x-kitn-widget: "rating"` | **rating** | star buttons 1..`maximum` (lucide `Star`) |
| `boolean` | **toggle** | accessible switch (`role="switch"`) |
| `boolean` + `x-kitn-widget: "checkbox"` | **checkbox** | single checkbox |
| `array` + `items.enum` | **multi-select / checkbox group** | checkboxes (≤ threshold) else multi-`<select>` |
| `array` + `items.type: "object"` | **repeater** | add/remove rows; each row a nested fieldset |
| `array` + `items.type: "string"` (no enum) | **tag/string list** | add/remove free-text chips |
| `object` (nested) | **fieldset** | `<fieldset><legend>` grouping its properties |

**Field metadata** comes from standard JSON Schema keywords:
- `title` → field label (falls back to a humanized property key).
- `description` → help text (`aria-describedby`).
- `default` → initial value.
- `readOnly` → disabled control.
- `placeholder` is **not** standard JSON Schema; use `x-kitn-placeholder`.

**Field order:** `x-kitn-order` (array of property keys) if present, else
`required` fields first then schema property declaration order.

### The `x-kitn-*` UI hints

All optional; the form renders sensibly without any of them. Defined here for
`kc-form` (the contract names `x-kitn-*` as the hint namespace):

| Hint | Scope | Type | Effect |
|---|---|---|---|
| `x-kitn-widget` | property | `"textarea" \| "slider" \| "rating" \| "radio" \| "select" \| "checkbox" \| "password" \| "switch"` | Force a widget, overriding the default mapping. **Minimum required set per the brief: `"rating"`, `"slider"`, `"textarea"`.** |
| `x-kitn-placeholder` | property | string | Input placeholder (JSON Schema has none). |
| `x-kitn-order` | root | string[] | Explicit field order. |
| `x-kitn-inlineMax` | root | integer (default 4) | enum-count threshold for radio-vs-select / checkboxes-vs-multiselect. |
| `x-kitn-submitLabel` | root | string (default `"Submit"`) | Primary button label. |
| `x-kitn-actions` | root | `{ id: string; label: string; variant?: "default"\|"ghost"\|"outline" }[]` | Secondary footer buttons → emit `action` with that `id`. |
| `x-kitn-dismissible` | root | boolean | Show a close affordance → emit `dismiss`. |
| `x-kitn-step` | property (number) | number | Numeric `step` (overrides the integer/float default). |

These hints live **inside** the JSON Schema (`x-` keywords are valid and ignored by
standard validators), so the same schema validates the submission *and* drives the
UI — one source of truth, no parallel layout config.

### Validation

Client-side validation runs on blur (per field) and on submit (all fields). It
covers the contract validator's subset:

- **`required`** — listed root-level keys must be present and non-empty.
- **`minimum` / `maximum` / `exclusiveMinimum` / `exclusiveMaximum`** — numbers.
- **`minLength` / `maxLength`** — strings.
- **`pattern`** — string regex (and `format: email|uri` via built-in patterns).
- **`enum`** — value must be one of the allowed set.
- **`minItems` / `maxItems`** — arrays.
- **type coercion** — number/integer inputs coerce the string control value to a
  number; `integer` rejects non-integers; boolean toggles produce real booleans;
  empty optional strings are **omitted** (not sent as `""`) so the result object is
  clean.

Invalid fields show an inline message (`role="alert"`, `aria-invalid="true"`,
`aria-describedby` to the message) and focus moves to the **first** invalid field on
a failed submit. The submit button stays enabled (so screen-reader users can
trigger validation) but a failed submit does **not** emit `submit-data`.

The same validation logic is the contract's **boundary validator** applied at two
points: (1) on the incoming `data` (envelope schema) to decide render-vs-error, and
(2) on the outgoing collected object before emitting `submit-data`. Per the
contract's flagged decision, this spec uses the **lean internal validator** (the
subset above); it does NOT introduce `ajv`. If the contract's implementation plan
adopts a shared validator module, `kc-form` consumes that instead — the *behavior*
specified here is the contract (see Open question 3).

### How a valid submission produces the emitted object

1. Each widget writes its coerced value into a reactive `values` store keyed by
   property name (nested objects/arrays nest accordingly).
2. On submit, the form runs full validation over `values` against the schema.
3. If valid: it builds the **result object** = `values` with optional empties
   omitted, then emits `{ kind: 'submit-data', cardId, data: result }` via the
   `CardHost`/`kc-card` event. The host **re-validates** at the boundary (contract
   rule) before routing — defense in depth; a mismatch there emits `error` and is
   not routed.
4. After a successful emit the form enters a non-blocking "submitted" state
   (controls disabled, a subtle confirmation) until the host updates/replaces the
   card. (No new state verb — the host owns lifecycle.)

---

## The schemas (frozen-contract-aligned)

### Down payload — `CardEnvelope.data` for `type: 'form'`

The `data` is itself a JSON Schema (the form definition). `form.schema.json` is the
**meta-schema** describing what a valid form-definition looks like — it constrains
the JSON Schema subset `kc-form` accepts plus the `x-kitn-*` hints.

`src/primitives/card-schemas/form.schema.json` (load-bearing parts):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/form.schema.json",
  "title": "kc-form data (a form definition)",
  "type": "object",
  "required": ["type", "properties"],
  "properties": {
    "type": { "const": "object" },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "required": { "type": "array", "items": { "type": "string" } },
    "properties": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/field" }
    },
    "x-kitn-order": { "type": "array", "items": { "type": "string" } },
    "x-kitn-inlineMax": { "type": "integer", "minimum": 1, "default": 4 },
    "x-kitn-submitLabel": { "type": "string", "default": "Submit" },
    "x-kitn-dismissible": { "type": "boolean" },
    "x-kitn-actions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "variant": { "enum": ["default", "ghost", "outline"] }
        }
      }
    }
  },
  "$defs": {
    "field": {
      "type": "object",
      "properties": {
        "type": { "enum": ["string", "number", "integer", "boolean", "array", "object"] },
        "title": { "type": "string" },
        "description": { "type": "string" },
        "default": {},
        "enum": { "type": "array" },
        "format": { "enum": ["email", "uri", "url", "date", "date-time", "time"] },
        "minimum": { "type": "number" },
        "maximum": { "type": "number" },
        "minLength": { "type": "integer" },
        "maxLength": { "type": "integer" },
        "pattern": { "type": "string" },
        "minItems": { "type": "integer" },
        "maxItems": { "type": "integer" },
        "items": {},
        "properties": { "type": "object" },
        "readOnly": { "type": "boolean" },
        "x-kitn-widget": {
          "enum": ["textarea", "slider", "rating", "radio", "select", "checkbox", "password", "switch"]
        },
        "x-kitn-placeholder": { "type": "string" },
        "x-kitn-step": { "type": "number" }
      }
    }
  }
}
```

### Result shape — what `submit-data` carries

The submitted object is **an instance of the form-definition schema itself** (the
agent already has it — it sent it down). `form.result.schema.json` documents this
indirection so backends in any language know what arrives:

`src/primitives/card-schemas/form.result.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/form.result.schema.json",
  "title": "kc-form submit-data payload",
  "description": "The CardEvent {kind:'submit-data'} `data` for a form card: an object that validates against the form-definition schema that was sent down in CardEnvelope.data. Standard JSON Schema validation (type/enum/required/min-max/length/pattern) holds. Optional empty strings are omitted.",
  "type": "object"
}
```

### TS types — `src/components/form.tsx` exports

```ts
import type { CardEnvelope } from '../primitives/card-contract';

/** A field definition (the JSON Schema subset kc-form renders). */
export interface FormField {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  format?: 'email' | 'uri' | 'url' | 'date' | 'date-time' | 'time';
  minimum?: number; maximum?: number;
  minLength?: number; maxLength?: number; pattern?: string;
  minItems?: number; maxItems?: number;
  items?: FormField | { enum: unknown[] };
  properties?: Record<string, FormField>;
  readOnly?: boolean;
  'x-kitn-widget'?: 'textarea' | 'slider' | 'rating' | 'radio' | 'select' | 'checkbox' | 'password' | 'switch';
  'x-kitn-placeholder'?: string;
  'x-kitn-step'?: number;
}

/** The form definition = CardEnvelope.data for type:'form'. */
export interface FormDefinition {
  type: 'object';
  title?: string;
  description?: string;
  required?: string[];
  properties: Record<string, FormField>;
  'x-kitn-order'?: string[];
  'x-kitn-inlineMax'?: number;
  'x-kitn-submitLabel'?: string;
  'x-kitn-dismissible'?: boolean;
  'x-kitn-actions'?: { id: string; label: string; variant?: 'default' | 'ghost' | 'outline' }[];
}

export type FormCardEnvelope = CardEnvelope<'form', FormDefinition>;
```

---

## Concrete example (down → rendered → up)

### CardEnvelope sent down

```json
{
  "type": "form",
  "id": "card-feedback-7f3",
  "title": "Share your feedback",
  "data": {
    "type": "object",
    "title": "How did we do?",
    "description": "Two quick questions.",
    "required": ["rating", "contactOk"],
    "x-kitn-order": ["rating", "comments", "plan", "contactOk"],
    "x-kitn-submitLabel": "Send feedback",
    "x-kitn-actions": [{ "id": "skip", "label": "Skip", "variant": "ghost" }],
    "properties": {
      "rating": {
        "type": "integer", "title": "Overall rating",
        "minimum": 1, "maximum": 5, "x-kitn-widget": "rating"
      },
      "comments": {
        "type": "string", "title": "Comments",
        "maxLength": 500, "x-kitn-widget": "textarea",
        "x-kitn-placeholder": "What worked, what didn't…"
      },
      "plan": {
        "type": "string", "title": "Your plan",
        "enum": ["free", "pro", "team"], "default": "free"
      },
      "contactOk": {
        "type": "boolean", "title": "OK to contact me about this", "default": false
      }
    }
  }
}
```

### Rendered form (inside `kc-card` chrome)

- **Card chrome** (`kc-card`): heading "Share your feedback" (the envelope
  `title`), then the form body.
- **Form** legend "How did we do?" + description "Two quick questions.".
- **rating** → a **rating** widget: 5 star buttons (lucide `Star`), keyboard-
  operable (arrow keys move, Enter selects), `role="radiogroup"` labeled "Overall
  rating", required (marked with `*` + `aria-required`).
- **comments** → a **textarea** (auto-resizing, via `src/ui/textarea.tsx`),
  placeholder text, 500-char `maxLength` enforced + counter.
- **plan** → an **enum string** with 3 options ≤ `inlineMax` (4) → a **radio group**
  (free/pro/team), default "free" selected.
- **contactOk** → a **boolean** → a **toggle** (`role="switch"`).
- **Footer:** primary "Send feedback" button (`Button` default) + "Skip" (`ghost`).

### Event emitted up on valid submit

```json
{
  "kind": "submit-data",
  "cardId": "card-feedback-7f3",
  "data": {
    "rating": 4,
    "comments": "Loved the speed.",
    "plan": "pro",
    "contactOk": true
  }
}
```

Clicking "Skip" instead emits `{ "kind": "action", "cardId": "card-feedback-7f3", "action": "skip" }`.

---

## Error handling (per the contract's rules)

- **Invalid envelope `data`** (not an object schema, malformed field, unknown
  `type` keyword value) → `kc-form` validates the *definition* against
  `form.schema.json` on receipt; on failure it renders `kc-card`'s inline error
  state ("This form couldn't be displayed.") **and** emits `{ kind: 'error',
  cardId, message }`. Never a half-rendered form. (Contract: "Invalid envelope data
  → inline error + host receives `error`.")
- **Render error** (a widget throws) → caught at the form root → same inline error +
  `error` event.
- **Unknown `x-kitn-widget`** value not in the enum → ignored, falls back to the
  default mapping (forward-compatible; never breaks).
- **Unknown field `type`** → that field renders a read-only "unsupported field"
  notice; the rest of the form still works (graceful degradation, mirroring the
  contract's "unsupported card" placeholder philosophy at field granularity).
- **Invalid submission** (client validation fails) → no `submit-data`; inline field
  errors + focus first invalid. Even if a buggy submit slipped through, the host
  **re-validates** at the boundary and drops it with an `error` (contract rule).
- **Missing host/policy handler** → the bubbling `kc-card` event simply isn't
  routed; the form has done its job (no throw), matching the contract's
  "missing handler → no-op + warn".

---

## Accessibility

Project gate: **0 axe violations, light + dark**. Specifics:

- Every control has a programmatic label (`<label for>` or `aria-labelledby`); help
  text via `aria-describedby`; required via `aria-required` + a visible `*`.
- Errors: `aria-invalid="true"` + the error text is the control's
  `aria-describedby`, in a `role="alert"` live region; a failed submit moves focus
  to the first invalid control.
- **Radio group** / **rating**: `role="radiogroup"` with roving tabindex + arrow-key
  navigation (the pattern already used in `FileTree`'s keyboard nav,
  `src/components/file-tree.tsx`).
- **Toggle**: `role="switch"` with `aria-checked`, space/enter operable.
- **Slider**: native `<input type="range">` (free a11y) with `aria-valuetext`
  showing the current value and a visible value label.
- **Repeater**: each add/remove button is labeled ("Add item", "Remove row 2");
  added rows receive focus.
- **Fieldset / nested object**: real `<fieldset><legend>`.
- **Card chrome** (`kc-card`): heading is an `<h3>`; the form's `<form>` is
  `aria-labelledby` the heading; the error state is `role="alert"`.
- Color is never the sole error signal (icon + text).
- Shadow-DOM isolation (`defineKitnElement`) keeps host-page CSS from breaking
  contrast; dark mode via the factory's `.dark` scope.

---

## Testing

Unit (`tests/components/form.test.tsx`, `tests/components/card.test.tsx`) +
empirical (Playwright/axe per the project gate). What's verified:

**`kc-card`:**
- Renders heading/description/media/actions/body regions; omitted regions absent.
- `errorMessage` replaces body with a `role="alert"` error.
- Slots project (`<kc-card>`: default/media/actions slots land in the right region).
- a11y: 0 axe violations light + dark.

**`kc-form` — mapping (table-driven, the load-bearing matrix):**
- string→text; string+enum(≤4)→radio; string+enum(>4)→select; email/url/date
  formats→typed inputs; maxLength>120 or hint→textarea; number/integer→number;
  slider hint→range; rating hint→stars; boolean→switch; checkbox hint→checkbox;
  array+items.enum→checkbox group; array+items.object→repeater; array+items.string
  →tag list; nested object→fieldset. One assertion per row.
- `x-kitn-widget` overrides the default; unknown widget falls back.
- `x-kitn-order` reorders; default falls back to required-first then declaration.

**`kc-form` — validation:**
- required missing → blocks submit, marks field, focuses it, no `submit-data`.
- min/max, minLength/maxLength, pattern, enum each reject + accept boundary cases.
- integer rejects floats; number coerces string→number; empty optional string is
  omitted from the result object.

**`kc-form` — contract integration (empirically verified):**
- mount emits `ready` (bubbling `kc-card` CustomEvent reaches a document listener).
- valid submit emits `submit-data` with the exact coerced object (the example
  above asserted byte-for-byte).
- secondary action button emits `action` with its id; dismiss emits `dismiss`.
- invalid envelope (`data` fails `form.schema.json`) → inline error + `error`
  event; no form rendered.
- the `kc-card` event is `bubbles:true, composed:true` (escapes shadow DOM) — a
  document-level listener receives it (this is the contract requirement that the
  default `defineKitnElement` dispatch does NOT satisfy, so it's explicitly tested).

**Schema artifacts:**
- `form.schema.json` and `form.result.schema.json` parse; the example envelope's
  `data` validates against `form.schema.json` (known-good) and a malformed one fails
  (known-bad) — matching the contract's schema-artifact test requirement.

**Gate:** `npm run build` + `npm run typecheck` (3 tsconfigs) + `npm test`
(baseline = 3 pre-existing Shiki failures) + `npm run test:react` + a11y. New
Storybook stories require a full restart (custom elements don't re-register on HMR).

---

## Storybook stories (source-visible; show the CardEnvelope JSON)

Per the contract convention #6 + the Examples norm, every story exposes its source
and shows the `CardEnvelope`. Title groups: **`Web Components/kc-form`** and
**`Web Components/kc-card`** (matching the existing `kc-file-tree` story layout in
`src/elements/file-tree.stories.tsx`).

**`kc-card` stories:**
- *Playground* — heading + description + body + two footer buttons.
- *WithMedia* — image media region.
- *ErrorState* — the inline error rendering.
- Each `parameters.docs.source.code` = a copy-pasteable HTML snippet (the
  `HTML_SNIPPET` pattern from `file-tree.stories.tsx`).

**`kc-form` stories** (each renders `<kc-form>`, sets `.data` as a JS property, and
listens for `kc-card`, logging the emitted `CardEvent`):
- *Feedback* — the worked example above; the Docs "Code" panel shows the full
  `CardEnvelope` JSON **and** the HTML wiring (`el.data = …; el.addEventListener('kc-card', …)`).
- *AllWidgets* — one form exercising every row of the mapping table (text, enum
  radio, enum select, email, url, date, textarea, number, slider, rating, switch,
  checkbox, multi-select, repeater, nested fieldset).
- *Validation* — a form with required + min/max + pattern; the story shows a failed
  submit (inline errors) then a passing one (`submit-data` logged).
- *InvalidEnvelope* — a malformed `data` to demonstrate the inline error state +
  the `error` event.
- *Remote-shape note* — a Docs note that the *same* `CardEnvelope`/`CardEvent`
  shapes flow over the iframe transport unchanged (forward pointer; no code).

Source snippet shape (mirrors `file-tree.stories.tsx`'s `HTML_SNIPPET`):

```html
<kc-form></kc-form>
<script type="module">
  import '@kitnai/chat/elements';
  const form = document.querySelector('kc-form');
  form.data = { /* the FormDefinition from the CardEnvelope above */ };
  // Cards bubble a single `kc-card` CustomEvent carrying a typed CardEvent.
  form.addEventListener('kc-card', (e) => {
    const ev = e.detail; // { kind:'submit-data', cardId, data } | { kind:'action', ... } | ...
    if (ev.kind === 'submit-data') console.log('submission', ev.data);
  });
</script>
```

---

## Open questions for review

1. **Required-boolean semantics.** JSON Schema `required` only asserts *presence*,
   not truthiness. A required boolean with a `default` is always "present" → always
   valid, which is rarely what an author means (they usually want "must be checked",
   e.g. consent). Options: (a) treat required boolean as "must be `true`" (useful
   convention but a deviation from strict JSON Schema), (b) require an explicit
   `const: true` / `enum: [true]` to force checked, (c) add `x-kitn-mustAccept`.
   Strict-spec correctness vs author ergonomics — needs a call. (v1 draft assumes
   strict presence; flagged.)
2. **Schema composition (`$ref`, `allOf`/`anyOf`/`oneOf`, `if/then`).** Out of v1 to
   match the contract's lean-validator subset. Confirm that's acceptable for the
   first cards, or scope a follow-up. (`oneOf` is the natural way to express
   discriminated sub-forms; deferring it limits dynamic forms.)
3. **Validator sharing.** The contract flags "lean internal validator vs `ajv`
   opt-in" as an *implementation-plan* decision. `kc-form` needs the validator now.
   Should this spec assume a shared `card-validate` module the contract's
   implementation provides, or carry its own subset validator until that lands?
   (Draft: own it, then migrate — but if the contract impl ships first, consume it.)
4. **`resize` for native cards.** The contract's `resize` verb is iframe
   auto-height. For *native* `kc-form` it's redundant (the host lays it out). Emit
   it anyway for transport uniformity, or skip natively and only emit from the
   remote runtime? (Draft: skip natively; the remote runtime adds it. Confirm.)
5. **`kc-card` as a public primitive vs internal-only.** It's reusable as a plain
   surface, but publishing it as a general card invites use *outside* the contract.
   Ship it public (like `kc-file-tree`) or keep it an internal compositional base?
   (Draft: public — it's genuinely reusable and the `kc-*` roster is flat/single-tier
   per the handoff.)
