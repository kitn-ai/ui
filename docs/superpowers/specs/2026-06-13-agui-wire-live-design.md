# AG-UI wire mapping + live/state/progress layer — design (2026-06-13)

> Brainstormed 2026-06-13. Builds on the **frozen Card Contract**
> (`docs/superpowers/specs/2026-06-13-card-contract-design.md`) — specifically the
> `CardEnvelope` / `CardContext` / `CardEvent` shapes and the `state` CardEvent
> verb the contract **reserved for this layer**. Prior context: handoff
> `docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md` (the AG-UI / A2UI
> direction). Prefix scheme: `kc-*`.

This is the layer that makes kitn-chat the **open, framework-agnostic AG-UI front
end**: it consumes an AG-UI event stream (SSE) from an agent/provider, maps those
open events to/from the Card Contract, and applies live `STATE_SNAPSHOT` /
`STATE_DELTA` updates to a card's `data` so the UI streams (e.g. `kc-task-list`
PROGRESS, streaming form prefill). It composes with **both** transports — native
`<kc-*>` cards (state via the host) and remote iframe cards (state forwarded over
`postMessage`).

## Problem

The Card Contract froze *what crosses the boundary* (typed envelopes/events) but
explicitly left three things to this spec (Card Contract → "Out of scope"):

1. **The wire.** Agents/providers don't speak the Card Contract — they speak
   **AG-UI** (open SSE event protocol). We need an explicit, typed mapping between
   AG-UI events and `CardEvent`/`CardEnvelope`, in **both** directions, so we stay
   interoperable instead of inventing a proprietary protocol.
2. **Live updates.** Cards today are render-once. Agents stream progress
   (`STATE_DELTA`), tool activity (`TOOL_CALL_*`), and text. A card's `data` must
   be able to **change after mount** — pending→running→done for a task list, token
   counts ticking, a form prefilling as the agent extracts fields.
3. **Distribution to both transports.** A live update must reach a **native** card
   (in-process, via the host) and a **remote** card (cross-origin iframe, forwarded
   over `postMessage`) through the *same* model.

Without this, the contract is a static request/response; cards can't reflect a
running agent.

## Goal

A small, typed **AG-UI ↔ Card Contract bridge** with three parts:

- **`AguiStreamConsumer`** — a client-side SSE consumer. POSTs an AG-UI
  `RunAgentInput`, reads the `text/event-stream`, parses each `BaseEvent`, and
  dispatches it to the mapping layer. Handles reconnect, out-of-order, malformed.
- **`aguiToCard` / `cardToAgui`** — pure mapping functions (the table below).
  AG-UI events → contract effects (render a card, apply a state patch, surface
  text); contract `CardEvent`s → AG-UI input events (continue the run).
- **`CardStateStore`** — applies `STATE_SNAPSHOT` (replace) and `STATE_DELTA`
  (RFC 6902 JSON Patch) to a per-card live `data`, keyed by `cardId`, and notifies
  the right transport (native host push / iframe `postMessage`).

All wire shapes are the **open AG-UI shapes** (not invented here). The value-add is
the renderer + the bridge.

## Non-goals (v1 — deferred, noted as future)

- **A server / agent runtime.** This is the *client* consumer + mapping. We don't
  ship an AG-UI server (the agent/provider does). A reference echo-server may exist
  in stories only.
- **The remote iframe wire itself.** Defined by the **iframe-transport spec**
  (sibling fan-out, not yet written). This spec says *what* live data crosses and
  *that* it's forwarded over `postMessage`; the envelope/handshake/origin-checks
  live there. We reference it, we don't redesign it.
- **A full A2UI renderer.** We note A2UI as an **optional input format** (declarative
  widget JSON rendered via our native catalog) and define the seam, but the complete
  A2UI widget-tree renderer is its own spec (see "A2UI" below).
- **The binary AG-UI transport.** AG-UI also defines a binary HTTP transport; v1
  targets **SSE** only (the common, debuggable default). Binary is a future swap
  behind the same consumer interface.
- **Reasoning/activity event rendering.** `REASONING_*` and `ACTIVITY_*` events
  exist in AG-UI; mapping them to `<kc-reasoning>` / `<kc-chain-of-thought>` is
  noted as future, not specified here (this layer focuses on cards + state).

## Architecture

```
 provider / agent server
        │  POST RunAgentInput   ──────────────►
        │  ◄────── SSE  text/event-stream (BaseEvent[])
        ▼
 ┌─────────────────────────────────────────────┐
 │ AguiStreamConsumer  (src/primitives/agui/…)  │
 │  • fetch + ReadableStream SSE parse          │
 │  • per-event: JSON.parse → validate type     │
 │  • reconnect / Last-Event-ID / backoff       │
 └───────────────┬─────────────────────────────┘
                 │ BaseEvent
                 ▼
 ┌─────────────────────────────────────────────┐
 │ aguiToCard()  (pure mapping — the TABLE)     │
 │  classifies each event into an "effect":     │
 │   render-card | state-snapshot | state-delta │
 │   | text | tool-activity | run-error | noop  │
 └───────────────┬─────────────────────────────┘
                 │ effect
                 ▼
 ┌─────────────────────────────────────────────┐
 │ CardStateStore   (keyed by cardId)           │
 │  • snapshot → replace live data              │
 │  • delta    → apply RFC 6902 patch           │
 │  • emits "card data changed (cardId)"        │
 └──────┬───────────────────────┬───────────────┘
        │ native                │ remote
        ▼                       ▼
 host pushes new data      host forwards over postMessage
 to the <kc-*> card        to the provider iframe (it re-renders)
 (Solid signal / attr)     [wire = iframe-transport spec]

   user interacts with a card → CardEvent (`submit-data`/`action`/
   `send-prompt`/`state`) → cardToAgui() → AG-UI input → next
   RunAgentInput POST (continue the run)
```

The bridge is **transport-symmetric**: identical for native and remote, because it
operates on Card-Contract shapes. The *only* difference is the last hop
(host-internal push vs `postMessage` forward), which `CardStateStore` delegates to a
`CardDeliveryTarget` (one impl per transport).

### Correlation: how an AG-UI run maps to a `cardId`

The Card Contract keys everything on `CardEnvelope.id` (the `cardId`). AG-UI keys
on `threadId` / `runId` / `messageId` / `toolCallId`. We bridge them:

- A **card is created by a tool call**: the agent emits `TOOL_CALL_START` with a
  recognized `toolCallName` (e.g. `render_card` / `kc.renderCard`), streams the
  envelope JSON via `TOOL_CALL_ARGS` (`delta`), and `TOOL_CALL_END`. The assembled
  args **are** the `CardEnvelope` (with its own `id`). → `cardId = envelope.id`.
- A card is created by **A2UI** declarative output (see below): same tool-call
  carrier, `data` is the A2UI widget JSON.
- **State after that** targets the card by `cardId`. Because AG-UI `STATE_*` events
  carry agent state, not a `cardId`, we adopt the convention that **card live data
  lives under a top-level keyed map** in agent state: `state.cards[cardId]`. A
  `STATE_SNAPSHOT` replaces the whole map; a `STATE_DELTA` patch whose path is
  `/cards/<cardId>/…` targets that card. (See "State application model" for why a
  keyed map, and the Open Question on alternatives.)

This convention is the one piece this layer *adds on top of* AG-UI; it uses only
standard AG-UI fields (no new event types), so the wire stays interoperable. It is
documented as the kitn-chat **state shape contract** for card-driving agents.

### Files

```
src/primitives/agui/
  types.ts            # AG-UI event TS types (mirrors the open spec) + our effect union
  consumer.ts         # AguiStreamConsumer (SSE fetch/parse/reconnect)
  map-to-card.ts      # aguiToCard(): BaseEvent → CardEffect
  map-from-card.ts    # cardToAgui(): CardEvent → AG-UI input contribution
  state-store.ts      # CardStateStore + JSON-Patch application + CardDeliveryTarget
  json-patch.ts       # minimal RFC 6902 applier (add/remove/replace/move/copy/test)
```

(`agui/` sits alongside `card-contract.ts` in `src/primitives/`; both are framework-
agnostic. The Solid `CardProvider` from the contract wires a `CardStateStore` into
its context so native cards re-render reactively.)

## AG-UI event types (the open shapes we consume)

Mirrored from the AG-UI spec (`docs.ag-ui.com`, verified 2026-06). Wire `type`
values are SCREAMING_SNAKE_CASE; all events extend `BaseEvent`. We type only the
events we use; unknown events are tolerated (dropped + counted).

```ts
// src/primitives/agui/types.ts  (mirror of the open AG-UI shapes)
export type AguiEventType =
  | 'RUN_STARTED' | 'RUN_FINISHED' | 'RUN_ERROR'
  | 'STEP_STARTED' | 'STEP_FINISHED'
  | 'TEXT_MESSAGE_START' | 'TEXT_MESSAGE_CONTENT' | 'TEXT_MESSAGE_END'
  | 'TOOL_CALL_START' | 'TOOL_CALL_ARGS' | 'TOOL_CALL_END' | 'TOOL_CALL_RESULT'
  | 'STATE_SNAPSHOT' | 'STATE_DELTA' | 'MESSAGES_SNAPSHOT'
  | 'RAW' | 'CUSTOM';
  // NOTE: AG-UI also defines ACTIVITY_* and REASONING_* (and deprecated
  // THINKING_*). Out of scope for v1 (see Non-goals); tolerated as unknown.

export interface AguiBaseEvent { type: AguiEventType; timestamp?: number; rawEvent?: unknown }

export interface RunStarted   extends AguiBaseEvent { type:'RUN_STARTED';  threadId:string; runId:string; parentRunId?:string; input?:unknown }
export interface RunFinished  extends AguiBaseEvent { type:'RUN_FINISHED'; result?:unknown }
export interface RunError     extends AguiBaseEvent { type:'RUN_ERROR';    message:string; code?:string }
export interface StepStarted  extends AguiBaseEvent { type:'STEP_STARTED';  stepName:string }
export interface StepFinished extends AguiBaseEvent { type:'STEP_FINISHED'; stepName:string }

export interface TextMessageStart   extends AguiBaseEvent { type:'TEXT_MESSAGE_START';   messageId:string; role:string }
export interface TextMessageContent extends AguiBaseEvent { type:'TEXT_MESSAGE_CONTENT'; messageId:string; delta:string }
export interface TextMessageEnd     extends AguiBaseEvent { type:'TEXT_MESSAGE_END';     messageId:string }

export interface ToolCallStart  extends AguiBaseEvent { type:'TOOL_CALL_START';  toolCallId:string; toolCallName:string; parentMessageId?:string }
export interface ToolCallArgs   extends AguiBaseEvent { type:'TOOL_CALL_ARGS';   toolCallId:string; delta:string }   // delta = chunk of JSON args
export interface ToolCallEnd    extends AguiBaseEvent { type:'TOOL_CALL_END';    toolCallId:string }
export interface ToolCallResult extends AguiBaseEvent { type:'TOOL_CALL_RESULT'; messageId:string; toolCallId:string; content:string; role?:string }

export interface StateSnapshot   extends AguiBaseEvent { type:'STATE_SNAPSHOT';   snapshot:unknown }
export interface StateDelta      extends AguiBaseEvent { type:'STATE_DELTA';      delta:JsonPatchOp[] } // RFC 6902
export interface MessagesSnapshot extends AguiBaseEvent { type:'MESSAGES_SNAPSHOT'; messages:unknown[] }

export interface RawEvent    extends AguiBaseEvent { type:'RAW';    event:unknown; source?:string }
export interface CustomEvent_ extends AguiBaseEvent { type:'CUSTOM'; name:string; value:unknown }

export type AguiEvent =
  | RunStarted|RunFinished|RunError|StepStarted|StepFinished
  | TextMessageStart|TextMessageContent|TextMessageEnd
  | ToolCallStart|ToolCallArgs|ToolCallEnd|ToolCallResult
  | StateSnapshot|StateDelta|MessagesSnapshot|RawEvent|CustomEvent_;

export interface JsonPatchOp {
  op:'add'|'remove'|'replace'|'move'|'copy'|'test';
  path:string; value?:unknown; from?:string;
}
```

### AG-UI input (what we POST to continue a run)

```ts
// mirror of AG-UI RunAgentInput (the request body)
export interface RunAgentInput {
  threadId:string; runId:string; parentRunId?:string;
  state:unknown; messages:AguiMessage[]; tools:AguiTool[];
  context:AguiContextItem[]; forwardedProps?:unknown;
}
// Tool results ride back as a ToolMessage in `messages`:
export interface ToolMessage { id:string; role:'tool'; content:string; toolCallId:string; error?:string }
```

## The mapping table (AG-UI event ↔ Card Contract)

### Inbound: AG-UI event → contract effect (agent → UI)

The mapper is a pure function `aguiToCard(ev, ctx) → CardEffect`. `ctx` carries the
in-flight tool-call accumulator (for assembling streamed card args) and the current
state. Effects are then applied by `CardStateStore` / the host.

| AG-UI event | Fields used | Effect / Card-Contract action |
| --- | --- | --- |
| `TOOL_CALL_START` (name ∈ card-render set, e.g. `render_card`, `kc.renderCard`, `a2ui.render`) | `toolCallId`, `toolCallName` | Begin accumulating a card envelope for `toolCallId`. Effect: `noop` (buffering). |
| `TOOL_CALL_ARGS` (for an open card tool-call) | `toolCallId`, `delta` | Append `delta` to that tool-call's arg buffer (streamed JSON). Effect: `noop` (or `card-partial` if we choose to render incrementally — see Open Q). |
| `TOOL_CALL_END` (for an open card tool-call) | `toolCallId` | Parse buffered JSON → `CardEnvelope` (validated vs the `type`'s schema, per contract). Effect: **`render-card`** `{ envelope }`. `cardId = envelope.id`. Invalid → **`error`** effect (contract: render inline error + surface `error`). |
| `STATE_SNAPSHOT` | `snapshot` | Replace the whole card-state map. For each `snapshot.cards[cardId]`, set that card's live `data`. Effect: **`state-snapshot`** `{ cards }`. (Drives **task-list PROGRESS** + form prefill.) |
| `STATE_DELTA` | `delta` (RFC 6902) | Apply JSON Patch to the card-state tree. Ops under `/cards/<cardId>/…` → that card's live `data` changes. Effect: **`state-delta`** `{ ops }` → maps to the contract's `state` semantics for affected cards. |
| `TOOL_CALL_START` / `_ARGS` / `_END` (name ∉ card set) | `toolCallId`, `toolCallName`, `delta` | **Tool activity** for `<kc-tool>` (running indicator) — *and* a convenience driver for **task-list PROGRESS** if a task item is correlated to this `toolCallId` (see PROGRESS pattern). Effect: **`tool-activity`** `{ toolCallId, name, phase, argsDelta? }`. |
| `TOOL_CALL_RESULT` | `toolCallId`, `content` | Tool finished with a result → mark the correlated activity/task done; optionally feed the result into a card's data. Effect: **`tool-result`** `{ toolCallId, content }`. |
| `TEXT_MESSAGE_START/CONTENT/END` | `messageId`, `delta` | Assistant prose → the normal message stream (`<kc-response-stream>` / `<kc-message>`), **not** a card. Effect: **`text`** `{ messageId, phase, delta? }`. (Included for completeness; the existing message UI consumes it.) |
| `RUN_STARTED` | `threadId`, `runId` | Mark run active (correlate subsequent events; reset per-run accumulators). Effect: **`run`** `{ phase:'started', threadId, runId }`. |
| `STEP_STARTED` / `STEP_FINISHED` | `stepName` | Optional progress breadcrumbs. Effect: **`step`** `{ phase, stepName }` (UI may ignore in v1). |
| `RUN_FINISHED` | `result?` | Run complete → finalize any cards still in a `running` state that the agent didn't explicitly resolve (policy: leave as-is + mark stream idle). Effect: **`run`** `{ phase:'finished' }`. |
| `RUN_ERROR` | `message`, `code?` | Stream-level failure. Effect: **`run-error`** `{ message, code }` → surface globally; do **not** corrupt card data. |
| `MESSAGES_SNAPSHOT` | `messages` | Authoritative message-history replace (rehydrate). Effect: **`messages-snapshot`**. v1: hand to the message store; cards are re-derived from the latest `STATE_SNAPSHOT`. |
| `RAW` / `CUSTOM` | varies | Pass-through hook for app-specific extension. Effect: **`custom`** `{ name?, value }` (no built-in handling; surfaced to consumer). |
| *unknown `type`* | — | Tolerated: **`noop`**, counted in `consumer.stats.unknownEvents`, warned once per type. |

### Outbound: CardEvent → AG-UI input (UI → agent)

`cardToAgui(event, runCtx)` turns a user interaction (already authorized + routed by
the contract's `CardPolicy`) into a contribution to the **next** `RunAgentInput`
POST. The bridge does not bypass the host policy — it runs *after* it.

| CardEvent (`kind`) | Source | AG-UI input mapping |
| --- | --- | --- |
| `submit-data` | form submit, task-list selection | Append a `ToolMessage` resolving the card's originating `toolCallId` (if any): `{ role:'tool', toolCallId, content: JSON.stringify(data) }`. If no originating tool-call, fold into `forwardedProps.cardSubmissions[cardId]`. Then POST a new run (continue). |
| `action` | named intent (e.g. `approve`, `select:item-3`) | Same `ToolMessage` carrier with `content: JSON.stringify({ action, payload })`; or a `CUSTOM`-style entry in `forwardedProps.cardActions`. Continue the run. |
| `send-prompt` | card asks to put text in the conversation | A new `UserMessage` (`mode:'send'`, only if host policy allowed it) or pre-fill the composer (`mode:'compose'`, no POST). The contract's send-prompt downgrade default applies *before* this. |
| `state` | card-side local state change the agent should know (the reserved verb) | Contribute a `STATE_DELTA`-shaped patch to `forwardedProps.stateDelta` (client→agent state sync). The agent applies it to its own state on the next run. (This is the one CardEvent that round-trips the *same* JSON-Patch model upstream.) |
| `open` | open URL / drive artifact | **Host-local** (contract policy: `window.open` / drive `<kc-artifact>`). **No** AG-UI emission. |
| `resize` | iframe auto-height | **Transport-local** (iframe sizing). **No** AG-UI emission. |
| `ready` | card mounted | Host pushes initial `CardContext` + current live `data`. **No** AG-UI emission. |
| `dismiss` | card collapsed | Host-local UI state; optionally `forwardedProps.dismissed[cardId]`. |
| `error` | card render failure | Host-local surface; optionally a `CUSTOM` breadcrumb to the agent. No corruption of the run. |

Design note: AG-UI is **agent-emits-events / client-POSTs-input** (not a symmetric
event bus). So inbound is rich (event stream) and outbound is "contribute to the
next run input" — the table reflects that asymmetry honestly.

## State / JSON-Patch application model

### Why a keyed `state.cards[cardId]` map

AG-UI `STATE_*` events describe the **agent's whole state**, not a single card. To
drive *specific* cards we need a deterministic place in that state for each card's
live data. Convention: `state.cards` is an object keyed by `cardId`; each value is
that card's current `data` (same shape the card was rendered with). This makes:

- `STATE_SNAPSHOT` → `store.replace(snapshot.cards)` — full resync (also the
  reconnect recovery path).
- `STATE_DELTA` → `store.applyPatch(delta)` — incremental; a patch op with
  `path:"/cards/task-7/items/2/status"` `value:"done"` updates exactly one task.

Alternatives (flat state + a per-card path map; or one `STATE_DELTA` per card via
`forwardedProps`) are weighed in Open Questions — the keyed map is the v1 default
because it's the minimal convention over **unmodified** AG-UI.

### The patch applier (`json-patch.ts`)

A minimal **RFC 6902** implementation (`add`, `remove`, `replace`, `move`, `copy`,
`test`) over plain JSON, **immutable** (returns a new tree; never mutates in place,
so Solid signal identity changes and native cards re-render). JSON-Pointer path
parsing per **RFC 6901** (incl. `~0`/`~1` unescaping and `-` for array append).

```ts
export function applyPatch<T>(doc:T, ops:JsonPatchOp[]): { doc:T; ok:boolean; failedAt?:number };
```

Application rules:

- **Atomic per event:** apply a `STATE_DELTA`'s ops **in order**; if any op fails
  (bad path, failed `test`), **abort that delta** (don't half-apply), keep the prior
  tree, and surface a recoverable error (request a fresh `STATE_SNAPSHOT` — see
  error handling). Document quality > silent drift.
- **Snapshot wins:** a `STATE_SNAPSHOT` always fully replaces — it is the
  authoritative resync and the recovery primitive after a failed delta or reconnect.
- **Per-card diff notify:** after applying, `CardStateStore` computes which
  `cardId`s changed (top-level keys whose reference changed) and notifies only those
  delivery targets. No global re-render storm.
- **Validation hook:** changed card `data` is (re)validated against its card type's
  schema (contract requirement). A delta that produces invalid `data` → that card
  goes to inline-error + `error` event; other cards unaffected.

### CardStateStore + delivery

```ts
export interface CardDeliveryTarget {           // one impl per transport
  push(cardId:string, data:unknown):void;       // native: set Solid signal/attr
}                                               // remote: postMessage to iframe
export class CardStateStore {
  replace(cards:Record<string,unknown>):void;   // STATE_SNAPSHOT
  applyDelta(ops:JsonPatchOp[]):ApplyResult;     // STATE_DELTA
  get(cardId:string):unknown;                    // current live data (for `ready`)
  subscribe(cardId:string, fn:(data:unknown)=>void):()=>void;
}
```

## How live updates reach native vs remote cards

The store is identical; only the `CardDeliveryTarget` differs.

- **Native (`<kc-*>`):** the Solid `CardProvider` (from the contract) holds the
  `CardStateStore`. Each native card subscribes by its `cardId` and reads live
  `data` from a **Solid signal**; a snapshot/delta updates the signal → the card
  re-renders. (e.g. `<kc-task-list>` re-renders item statuses; a `<kc-form>` updates
  prefilled fields.) Bare custom-element cards receive new `data` via a reflected
  property/attribute the wrapper updates. No iframe, full theming/a11y.
- **Remote (provider iframe):** the host's delivery target **forwards** the new
  `data` (or, as an optimization, the raw `STATE_DELTA` ops scoped to that `cardId`)
  to the iframe via `postMessage`, wrapped in the Card-Contract envelope
  (`{ protocol:'kitn-card', version, … }`) defined by the **iframe-transport spec**.
  The provider runtime inside the iframe applies it (snapshot replace / patch) and
  re-renders its `<kc-*>` there. The bridge logic is the *same*; the last hop is the
  iframe wire (that spec owns the handshake/origin checks). The `state` CardEvent
  also rides the same wire upward for iframe cards.

This is the contract's promise — *one* contract, two transports — extended to live
state: the agent emits AG-UI once; the store fans out to whichever transport hosts
each `cardId`.

## `kc-task-list` PROGRESS mode (the headline live feature)

PROGRESS was **deferred** from the task-list v1 (select/approve) spec; this layer
delivers it. A task list rendered with items in a starting status streams to
completion driven by `STATE_DELTA`:

- Initial render: `render-card` with `data.items:[{id,label,status:'pending'},…]`
  and `data.mode:'progress'`.
- The agent updates statuses via deltas under `/cards/<cardId>/items/<i>/status`
  (`pending`→`running`→`done`|`failed`), optionally `/…/items/<i>/detail`.
- **Two driving styles (both supported):**
  1. **Explicit state:** agent emits `STATE_DELTA` ops directly (authoritative).
  2. **Tool-correlated convenience:** if a task item carries a `toolCallId`, the
     bridge auto-advances it from `TOOL_CALL_START` (→`running`) and
     `TOOL_CALL_RESULT`/`TOOL_CALL_END` (→`done`, or `failed` on error). This lets
     a plain tool-calling agent drive progress with **zero** extra state plumbing.
- `RUN_FINISHED` with items still `running` → policy: leave as `running` (don't
  fabricate `done`); the stream is marked idle.

## Error handling

| Failure | Behavior |
| --- | --- |
| **Malformed event** (not JSON / missing `type`) | Drop, increment `consumer.stats.malformed`, warn once per session; never throw, never break the stream. |
| **Unknown `type`** | `noop` effect, counted; warn once per type (forward-compat with new AG-UI events). |
| **Streamed tool-call args don't parse** at `TOOL_CALL_END` | Emit `error` effect → card renders inline error (contract); the run continues. |
| **`STATE_DELTA` op fails** (bad path / failed `test`) | Abort that delta atomically (no half-apply); request a fresh `STATE_SNAPSHOT` (re-POST a continue with `forwardedProps.resync:true`, or wait for the agent's next snapshot); surface a recoverable warning. |
| **Delta produces schema-invalid card `data`** | That card → inline error + `error` event; other cards unaffected; keep prior valid data for it. |
| **Unknown `cardId`** in a delta/snapshot (no rendered card) | Buffer the data in the store keyed by `cardId` (a card may render slightly after its first state, or never); GC buffered-but-unrendered entries on `RUN_FINISHED`. Warn at debug level only. |
| **Out-of-order** events | Mitigated by AG-UI's `messageId`/`toolCallId` correlation + the snapshot-wins rule. We do **not** assume global ordering; per-tool-call buffers are keyed by `toolCallId`, so interleaved tool calls are safe. (See Open Q on whether AG-UI guarantees per-stream ordering.) |
| **Connection loss** | `AguiStreamConsumer` reconnects with exponential backoff (cap ~30s, jitter). On reconnect it expects a `STATE_SNAPSHOT` to resync (and may send `Last-Event-ID` if the provider supports SSE resumption — Open Q). UI shows a non-blocking "reconnecting" affordance. |
| **Run-level `RUN_ERROR`** | Surface globally (toast / status); cards keep last good state; mark stream idle. |

## Accessibility

Live updates must be announced, not just visually changed:

- **Polite live region:** card state changes (task item → done, form prefilled)
  announce via an `aria-live="polite"` region the card owns. PROGRESS announces
  transitions ("Step 2 of 5: running" → "done"), not every patch op.
- **Assertive only for failures:** a `failed` task / card error uses
  `aria-live="assertive"` (or `role="alert"`).
- **No focus theft:** streaming updates never move focus; a user interacting with a
  card isn't interrupted by background state.
- **Reduced motion:** progress transitions respect `prefers-reduced-motion`
  (no spinner churn; status text still updates).
- **Remote (iframe):** announcements happen **inside** the iframe's own live region
  (the provider runtime must include one) — cross-boundary ARIA can't be relied on.
  This is the known iframe-a11y tax flagged in the handoff; the iframe-transport
  spec owns the focus/aria coordination details.
- Gate: native cards keep **0 axe violations** light + dark during/after live
  updates.

## Testing

**Unit — mapping (`map-to-card` / `map-from-card`), pure, exhaustive:**
- Each AG-UI event type → expected `CardEffect` (one case per table row).
- Streamed card tool-call: `TOOL_CALL_START` → N×`TOOL_CALL_ARGS` → `TOOL_CALL_END`
  assembles the exact `CardEnvelope`; malformed final JSON → `error` effect.
- `cardToAgui`: each `CardEvent` → expected `RunAgentInput` contribution
  (`ToolMessage` for submit/action; `UserMessage` for send-prompt send-mode;
  `forwardedProps.stateDelta` for `state`; host-local verbs emit nothing).

**Unit — JSON-Patch (`json-patch.ts`):**
- RFC 6902 op coverage (add/remove/replace/move/copy/test) incl. array append `-`
  and RFC 6901 escaping (`~0`/`~1`); immutability (input untouched, identity
  changes); atomic-abort on a failed `test`/bad path (doc unchanged).

**Unit — `CardStateStore`:**
- `STATE_SNAPSHOT` replace; `STATE_DELTA` per-card change detection (only changed
  `cardId`s notified); snapshot-wins after a failed delta; unknown-`cardId`
  buffering + GC; schema-invalid result isolates to one card.

**Integration — consumer (`AguiStreamConsumer`):**
- Parse a fixture SSE stream (recorded AG-UI events) end-to-end → assert the final
  card states. Malformed/unknown events don't break the stream. Reconnect path
  resyncs from a snapshot.

**Empirically verified (Playwright + measured, per project norm):**
- The **task-list PROGRESS** story actually animates pending→running→done from a
  scripted/streamed event sequence (measure DOM status attributes over time — not a
  static screenshot; the resizable saga taught us static checks lie).
- A streaming **form prefill** story: fields populate live from `STATE_DELTA`.
- Native vs remote parity: the *same* event script drives a native card and a
  (mock) iframe target to equivalent end states.

Gate: build + typecheck (3 tsconfigs) + test (baseline 3 Shiki failures) +
test:react + a11y (0 violations light+dark).

## Demo / story plan (source-visible, per Examples norm)

- **`Examples/AG-UI — Task List Progress`** (headline): a "Run" button replays a
  scripted AG-UI event sequence (RUN_STARTED → render-card task-list →
  STATE_DELTAs advancing each item → RUN_FINISHED). Shows the live pending→done
  animation; **source shows the exact event JSON** and the `<kc-task-list mode="progress">`
  markup. Also a tool-correlated variant (progress driven purely by `TOOL_CALL_*`).
- **`Examples/AG-UI — Streaming Form Prefill`:** a `<kc-form>` whose fields fill in
  from `STATE_DELTA`s as the "agent extracts" them.
- **`Examples/AG-UI — Live Stream Consumer`:** points `AguiStreamConsumer` at a
  tiny in-story mock SSE source (or a reference echo endpoint) to show the real
  fetch/parse path, reconnect affordance, and the effect log.
- **`Examples/AG-UI — Native vs Remote parity`:** the same event script driving a
  native card and a mock iframe target side by side (illustrates transport
  symmetry; full iframe wire is the transport spec's demo).
- Each story sets `parameters.docs.source.code` to the copy-pasteable event JSON +
  consumer wiring (non-negotiable per the Examples norm).

## A2UI relationship (optional input format — noted, not fully designed)

A2UI (Google, `a2ui.org` v0.9) is an open **declarative-UI** protocol that **rides
over AG-UI**: the agent emits JSON describing widgets; the client renders them with
its **native** catalog (for us, `<kc-*>`). It is the *client-owned* delivery
philosophy (vs the provider-owned iframe) — the handoff notes **both can coexist**.

This layer defines only the **seam**, not the renderer:

- A2UI widget JSON arrives over the **same carrier** as a card envelope — a
  recognized tool-call (`toolCallName:'a2ui.render'` / a `CUSTOM` event), with the
  A2UI document as the payload.
- We map it to a `CardEnvelope` with `type:'a2ui'` (or a thin per-widget mapping to
  existing card types where trivial, e.g. an A2UI form widget → `kc-form`), and a
  future **`<kc-a2ui>` renderer** walks the A2UI widget tree using the native
  catalog. A2UI's data/structure separation maps cleanly onto our `data`-down model;
  A2UI events map onto `CardEvent`s.
- **Live A2UI:** because A2UI rides over AG-UI, A2UI surfaces update through the
  *same* `STATE_SNAPSHOT`/`STATE_DELTA` path defined here — no separate mechanism.

**Out of scope here:** the full A2UI widget-tree renderer + the complete A2UI↔`kc-*`
catalog mapping. That's its own spec (`<kc-a2ui>`), built on this seam. Flagged so
the carrier + effect union already accommodate it (no rework later).

## Positioning

This is the layer that makes the handoff's positioning real: *"kitn-chat = the
open, framework-agnostic **AG-UI / A2UI front end**."* We consume the open wire,
render with quality `<kc-*>` components, drive live UI from agent state, and work
across native + provider-iframe transports — the free, interoperable answer to paid
CopilotKit, differentiated by the renderer + the bridge, **not** a new protocol.

## Open Questions (genuinely uncertain AG-UI specifics — verify before build)

1. **Exact card-render carrier.** AG-UI has no built-in "render this card" event.
   v1 uses a **tool-call convention** (`toolCallName ∈ {render_card, kc.renderCard,
   a2ui.render}`) with the envelope as streamed args. Confirm this is the idiomatic
   AG-UI pattern vs using `CUSTOM` events for card payloads. (Both are valid AG-UI;
   pick one and document it as the kitn-chat convention.)
2. **State shape for cards.** We adopt `state.cards[cardId]` as the convention so
   `STATE_*` can target individual cards. Confirm there's no emerging AG-UI/A2UI
   community convention we should match instead of inventing our own keying. If A2UI
   prescribes a state path for its surfaces, align with it.
3. **SSE resumption / `Last-Event-ID`.** Does the typical AG-UI provider emit SSE
   `id:` lines (enabling `Last-Event-ID` resume) or rely on `STATE_SNAPSHOT` after a
   fresh reconnect? v1 assumes snapshot-resync (safe); use `Last-Event-ID` only if
   present. **Verify** per-provider.
4. **Per-stream ordering guarantee.** SSE is ordered per connection, but does AG-UI
   guarantee event ordering across a logical run (esp. across reconnects)? Our
   design tolerates out-of-order via correlation + snapshot-wins; confirm whether
   stricter ordering can be assumed (would simplify the buffering).
5. **`RUN_FINISHED.outcome` shape.** One source shows `outcome` (discriminated
   union) + `result`; another shows just `result?`. Treat `result` as optional/opaque
   in v1; **verify** the exact field(s) against the pinned AG-UI version before
   relying on `outcome`.
6. **`ToolMessage` as the result carrier for `submit-data`.** Confirm a provider
   accepts a client-authored `ToolMessage` (resolving a `toolCallId`) in the next
   `RunAgentInput.messages` as the way to return card submissions — vs requiring the
   data in `forwardedProps`. (We support both; confirm the canonical one.)
7. **Client→agent state (`state` verb).** AG-UI's primary direction is agent→client
   for `STATE_*`. Confirm the idiomatic way a client pushes a state delta upstream
   (we use `forwardedProps.stateDelta`); there may be a standard field.
8. **AG-UI version pin.** `ACTIVITY_*` and `REASONING_*` (and deprecated
   `THINKING_*`) exist; the exact set varies by version. Pin a specific AG-UI spec
   version in `types.ts` and note it, so the tolerated-unknown path covers drift.

## Rollout

`feat/agui-wire-live` (this worktree, branched from the frozen contract) →
`docs(spec):` only. Implementation depends on: (a) `feat/card-contract` merged
(provides `card-contract.ts` + the `state` verb), and (b) the **iframe-transport
spec** for the remote delivery wire. Native-transport live state can ship first
(no iframe dependency); remote delivery lands with the transport spec.
