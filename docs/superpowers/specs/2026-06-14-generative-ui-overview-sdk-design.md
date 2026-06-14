# Design — Generative-UI Overview + SDK (card dispatcher) (2026-06-14)

Spec for the "SDK" section of the generative-UI work: the **card dispatcher**
(`renderCard` / `<kc-cards>`) that turns a `CardEnvelope` (or a stream of them) into
rendered `kc-*` cards, plus a **`Generative UI/Overview`** docs page explaining the data
flow. Builds directly on the Card Contract foundation
(`docs/superpowers/specs/2026-06-13-card-contract-design.md`). All code lives in
`@kitnai/chat` (no new package — see `docs/decisions/2026-06-14-monorepo-deferral.md`).

## Goal

Make cards turnkey. Today a host hand-instantiates each `kc-*` element and wires events
per card. The dispatcher is the missing host glue: **data in → the right card out**, with
**one** place to wire behavior (`CardPolicy`). It is also the extension seam the future
remote/iframe (AG-UI wire) transport plugs into.

## Scope

**In:** the Solid single-envelope dispatcher (`CardRenderer` + `renderCard`), the
`CardFallback` unknown-type card, the `<kc-cards>` list web component, a shared
`card-registry`, and the `Generative UI/Overview` MDX. **Out (deferred to an immediate
follow-up):** reshaping the 6 existing card stories to "data-in → render-out" and
promoting `kc-confirm` as the headline. **Not in this work at all:** new card types, a
global registry, the remote/iframe transport (see Future).

## Architecture

Three small additions to `@kitnai/chat`, all thin layers over the existing foundation
(`card-contract.ts`, `card-host.tsx` `CardProvider`/`useCardHost`, `card-routing.ts`
`emitCardEvent`/`routeCardEvent`). No new plumbing, no new dependencies.

- **`src/primitives/card-registry.ts`** — the built-in `type → card` maps + merge logic.
  One source of truth for both layers.
- **`src/components/card-renderer.tsx`** — Solid `CardRenderer` (+ `renderCard()` sugar)
  and `CardFallback` (themed unknown-type error card).
- **`src/elements/cards.tsx`** — the `<kc-cards>` web component (list dispatcher),
  registered in `register.ts`. Element count 38 → 39.

## Components & API surface

### `card-registry.ts`

```ts
import type { Component } from 'solid-js';
import type { CardEnvelope } from './card-contract';

/** Solid: type → a renderer that maps an envelope onto that card's props.
 *  Receives the resolved `host` so each wrapper can bridge the card's emit
 *  convention: form/confirm/task-list take `host`; link/embed take `onEmit`. */
export type CardComponent = Component<{ envelope: CardEnvelope; host?: CardHost }>;
export type CardComponentMap = Record<string, CardComponent>;

/** Web component: type → kc-* tag name. All card elements take `data` + `cardId`;
 *  form/confirm/task-list also take `heading` (from envelope.title), while
 *  link/embed derive their title from `data` and have no `heading`. */
export type CardTagMap = Record<string, string>;

export const BUILTIN_CARD_TAGS: CardTagMap = {
  form: 'kc-form',
  confirm: 'kc-confirm',
  'task-list': 'kc-task-list',
  link: 'kc-link-card',
  embed: 'kc-embed',
};
```

Built-in Solid entries are thin wrappers so per-card prop quirks stay contained, e.g.
`confirm: (p) => <ConfirmCard data={p.envelope.data} cardId={p.envelope.id} heading={p.envelope.title} />`.
A consumer-supplied `types` map is merged **over** the built-ins (override or add).

### Solid layer — `card-renderer.tsx`

```ts
export interface CardRendererProps {
  envelope: CardEnvelope;
  /** Add/override type→component entries (merged over built-ins). */
  types?: CardComponentMap;
}
export function CardRenderer(props: CardRendererProps): JSX.Element;

/** Ergonomic sugar — renderCard(env) ≡ <CardRenderer envelope={env} />. */
export function renderCard(
  envelope: CardEnvelope,
  opts?: { types?: CardComponentMap },
): JSX.Element;
```

- Resolves `envelope.type` in the merged map and renders the matching card with the
  envelope spread onto its props.
- Routing uses the **ambient `useCardHost()`** (the existing `CardProvider`), exactly like
  today's cards — the dispatcher adds no event plumbing of its own.
- **Unknown `type`** → renders `CardFallback` **and** calls
  `host?.emit({ kind: 'error', cardId: envelope.id, message })`. Never throws.
- Does **not** re-validate `data` for known types — each card already self-validates and
  renders its own inline error.

### Web-component layer — `<kc-cards>`

```ts
// properties (JS):
el.cards  = CardEnvelope[]        // the stream to render (keyed by envelope.id)
el.types  = { mytype: 'my-tag' }  // optional tag overrides/additions (CardTagMap)
el.policy = CardPolicy            // optional structured handlers
// attributes:
theme="light|dark|auto"           // drives shadow content (see preview theme note)
locale="en"
```

Internally `<kc-cards>` builds a `CardContext` from the attributes, wraps the list in
`CardProvider(context, policy)`, and renders `<For each={cards}><CardRenderer envelope=…/></For>`,
keyed by `envelope.id`. The per-type built-in wrappers set the right props for each card —
`data` + `cardId` universally, `heading` (from `envelope.title`) for form/confirm/task-list;
link/embed carry their title inside `data`, so a top-level `envelope.title` is not used for
them. **Two ways to consume events**, both already in the contract:

1. `el.policy = { onAction, onSubmitData, onSendPrompt, … }` — structured handlers
   (recommended for apps), or
2. `el.addEventListener('kc-card', e => …)` — the raw bubbling/composed `CardEvent`
   stream (child cards already emit this; it passes straight through `<kc-cards>`).

## Data flow (the loop the Overview documents)

```
agent/server ──CardEnvelope(s)──▶ host sets el.cards (or Solid <CardRenderer envelope>)
     ▲                                          │
     │                                  dispatcher renders kc-* by type
     │                                          │
     └──result/next envelopes── host ◀─CardPolicy◀─ kc-card event ◀─ user interacts
```

The dispatcher is the **render** half; the **event** half already exists. `<kc-cards>` is
the one place a host wires both: data in via `.cards`, behavior out via `.policy`.

## Error handling

- **Unknown `type`** → `CardFallback` ("Unsupported card type: `x`") + emit `error`. Never throws.
- **Known type, bad `data`** → unchanged; each card renders its own inline error.
- **Unsafe URL / send-prompt cap** → unchanged; `routeCardEvent` enforces these.
- **Empty/absent `cards`** → renders nothing (no error).

## Testing

- **Unit (`card-renderer`)**: each built-in `type` → correct component; unknown →
  `CardFallback` + exactly one `error` emission (spy on the host); `types` override merges
  over built-ins; `renderCard()` ≡ `<CardRenderer>`.
- **Element (`kc-cards`)**: `.cards` renders N children keyed by id; `.policy` handlers
  fire on a child action; raw `kc-card` events bubble through; `theme` attr reaches
  children; `.types` adds a custom tag.
- **Story + a11y**: a `Generative UI/SDK` story feeds `<kc-cards>` one envelope of each
  type with a live event log; must pass the now-gated a11y suite (`a11y.test:'error'`).

## Overview MDX (`Generative UI/Overview`)

A docs page (no new component), pinned first under the section via `storySort` so the
sidebar reads **Overview → Cards → SDK**. Covers: the loop diagram above; the
`CardEnvelope` shape (`type/id/data/title`) and that `data` follows each type's JSON
Schema; **where the data comes from** (the agent emits envelopes; the schemas in
`dist/schemas` let the agent/server validate before sending); the **turnkey path** (drop
`<kc-cards>`, set `.cards` + `.policy`); and the **streaming pattern** — the SolidJS
`<CardRenderer>` re-renders reactively as its envelope's `data` changes (live streaming
into a single card); swapping the `<kc-cards>` array adds/replaces/removes cards.
(Keyed-by-`id` in-place updates within a `<kc-cards>` list are a planned refinement.)
Links to the Cards stories and the SDK story.

## Future — card types & patterns NOT covered (backlog, out of scope)

The dispatcher is designed so all of these are **purely additive**: register a `kc-*`
element and add one `type → tag` entry (and a Solid map entry). None require the dispatcher
to change, and all fit the existing `CardEvent` verbs (`action`/`submit-data`/`state`/
`open`/`dismiss`) — no new verbs needed.

- **`kc-choice` (options-select)** — "pick one of N" rich options (plans, flights,
  products). The most common generative-UI interaction we lack; distinct from form
  (free input), confirm (fixed buttons), and task-list (multi-select). **Top candidate.**
- **`kc-table` (data grid)** — tabular results (DB queries, comparisons); optional
  per-row `action`.
- **`kc-status` (progress)** — a live, long-running agent task; driven by the existing
  `state` verb (agent patches the card as work progresses). Validates the contract.
- **`kc-detail` (fields)** — a read-only key-value "record" view; the counterpart to
  `kc-form`.
- **Heavier / better as remote (iframe) cards:** `kc-chart` (viz lib), `kc-scheduler`
  (date/slot picker), map/location, payment/checkout (sensitive → the contract's
  `authToken` remote path).
- **Pattern-level:** streaming/in-place updates (documented in the Overview) and card
  replacement/follow-up (host updates the `cards` array) — both already supported, no code.

## YAGNI guardrails (explicitly excluded now)

No global registry, no remote/iframe transport, no envelope re-validation in the
dispatcher, no new card types, no story reshape.
