# Card Contract — design (2026-06-13)

The **foundation** for kitn-chat's generative-UI / AG-UI feature. Defines the one
typed contract that every "card" speaks — across **both** transports (native
`<kc-*>` components and remote provider iframes). Frozen first; every card and
transport spec builds against it.

> This spec is the shared spine. The card specs (`kc-form`, `kc-confirm`,
> `kc-task-list`, `kc-link-card`, `kc-embed`), the iframe transport spec, and the
> AG-UI wire spec are written **against the interfaces frozen here**. Changing
> these shapes after fan-out breaks every consumer — treat them as load-bearing.

Prior context: handoff `docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md`
(provider-owned iframe direction) and the brainstorm decisions that produced this:
unified contract + two transports; JSON-Schema-first form shapes; schema-first /
bidirectional tenet (well-defined shapes for the AI **and** the servers).

## What a "Card" is

A **Card** is a self-contained UI unit the agent/server asks the chat to render. It:
1. receives **data down** — its own typed payload + ambient host context, and
2. emits **events up** — typed verbs the host **authorizes and routes**.

Two transports implement the *same* contract:
- **Native** — a `<kc-*>` component rendered in-process; theme-aware (inherits
  `--kitn-*` tokens), fully accessible, no iframe. The 90% path.
- **Remote** — a provider-owned cross-origin sandboxed iframe; the *same* events
  and data flow over `postMessage`. The provider-control path. (Wire details:
  iframe-transport spec. This spec defines the shapes it carries.)

```
                Card contract (one schema set)
                 /                         \
        native <kc-*>                  remote iframe
     (Solid ctx + CustomEvent)     (postMessage, same shapes)
                 \                         /
                host authorizes + routes events
                        ↓  (later: AG-UI on the wire)
                       agent / provider server
```

## Core tenet: schema-first & bidirectional

Every shape that crosses a boundary is **published, typed, and versioned**, so it
is well-defined for the AI *and* for any server in any language:

- **Down** (server → card): each card type's `data` payload has a **JSON Schema +
  TS type**. A backend knows exactly what to send to render each card.
- **Up** (card → host → server): each event verb has a **payload schema**. A
  backend knows exactly what it will receive.
- **Artifacts**: ship `.d.ts` (client devs) **and** `.schema.json` (everyone
  else). Agents emit against the same JSON Schema they already use for tools.
- **Validated at the host boundary**: incoming card `data` and outgoing event
  payloads are validated against their schema. Malformed shapes fail **loud**
  (surface an `error`), never render silently wrong.
- **Versioned**: the contract carries a version; host and remote card negotiate
  and validate it.

## The shapes (frozen)

All types live in a new primitive: **`src/primitives/card-contract.ts`**. JSON
Schema artifacts live in **`src/primitives/card-schemas/`** (`*.schema.json`), and
the build copies them to `dist/schemas/` (mechanism in the implementation plan).

### Contract version

```ts
/** Bumped on any breaking change to the shapes below. */
export const CARD_CONTRACT_VERSION = '1' as const;
```

### Card envelope (data down)

```ts
/**
 * A card the agent/server asks the chat to render. `data` conforms to the card
 * type's own published JSON Schema (one schema per `type`).
 */
export interface CardEnvelope<TType extends string = string, TData = unknown> {
  /** Discriminator: 'form' | 'confirm' | 'task-list' | 'link' | 'embed' | <custom>. */
  type: TType;
  /** Stable id — correlates every event (and future state) back to this card. */
  id: string;
  /** Card-type-specific payload, validated against the `type`'s schema. */
  data: TData;
  /** Optional title rendered in the card chrome. */
  title?: string;
}
```

### Ambient context (data down, host-pushed)

```ts
/** Context the host pushes to every card; updated when it changes (theme, etc.). */
export interface CardContext {
  theme: { mode: 'light' | 'dark'; tokens?: Record<string, string> };
  locale: string;
  /** The conversation the card lives in (for correlation/routing). */
  conversationId?: string;
  /** REMOTE (iframe) cards only: short-lived signed token for provider callbacks.
   *  Never a long-lived secret. Omitted for native cards. */
  authToken?: string;
}
```

### Events up (the verbs — discriminated union)

```ts
/** Everything a card can ask the host to do. The host authorizes + routes each. */
export type CardEvent =
  /** Card finished mounting; host may push initial context. */
  | { kind: 'ready'; cardId: string }
  /** Structured submission (form values, task-list selection). Validated vs the
   *  card type's result schema before routing. */
  | { kind: 'submit-data'; cardId: string; data: unknown }
  /** Named intent + optional payload, e.g. action:'approve' | 'select:item-3'. */
  | { kind: 'action'; cardId: string; action: string; payload?: unknown }
  /** Put text into the conversation. `mode` defaults to 'compose' (user sees it
   *  in the composer); 'send' (send immediately) requires host policy opt-in. */
  | { kind: 'send-prompt'; cardId: string; text: string; mode?: 'compose' | 'send'; context?: unknown }
  /** Request to open a URL ('tab' = new tab w/ noopener) or drive the artifact panel. */
  | { kind: 'open'; cardId: string; url: string; target?: 'tab' | 'artifact' }
  /** Report content height (iframe auto-height; reuses useAutoResize on the card side). */
  | { kind: 'resize'; cardId: string; height: number }
  /** State change the agent should know (AG-UI STATE_DELTA-style). Reserved for
   *  the live/AG-UI layer; defined now so the shape is stable. */
  | { kind: 'state'; cardId: string; patch: unknown }
  /** Card asks to be dismissed/collapsed. */
  | { kind: 'dismiss'; cardId: string }
  /** Card reports a failure (bad data, render error). */
  | { kind: 'error'; cardId: string; message: string };

export type CardEventKind = CardEvent['kind'];
```

### Host interface + routing policy

```ts
/** What every card is handed (via native context or the iframe bridge). */
export interface CardHost {
  /** Current ambient context (reactive on the native side). */
  context(): CardContext;
  /** Emit an event up. The host validates + routes it per policy. */
  emit(event: CardEvent): void;
}

/** How the host routes each verb. Consumers supply handlers; defaults below. */
export interface CardPolicy {
  onSubmitData?: (cardId: string, data: unknown) => void;
  onAction?: (cardId: string, action: string, payload?: unknown) => void;
  onSendPrompt?: (text: string, opts: { mode: 'compose' | 'send'; context?: unknown }) => void;
  onOpen?: (url: string, target: 'tab' | 'artifact') => void;
  onState?: (cardId: string, patch: unknown) => void;
  onDismiss?: (cardId: string) => void;
  onError?: (cardId: string, message: string) => void;
  /** Cap on send-prompt: 'compose' (default) forbids silent sends. Set 'send' to allow. */
  maxSendPromptMode?: 'compose' | 'send';
}
```

**Default policy (security-first):**
- `send-prompt` defaults to `mode:'compose'` — a card (especially remote) **cannot
  silently send as the user**. `mode:'send'` is honored only if
  `policy.maxSendPromptMode === 'send'`; otherwise it's downgraded to `compose`.
- `open` with `target:'tab'` → `window.open(url, '_blank', 'noopener,noreferrer')`
  after URL scheme validation (http/https/mailto only). `target:'artifact'` → drive
  a `<kc-artifact>` if the host wired one, else fall back to `tab`.
- `submit-data` / `action` / `state` → forwarded to the handler; no-op + console
  warning if no handler registered (never throws).
- Every inbound `data` and outbound payload is schema-validated; failures emit an
  `error` and are NOT routed.

## Transports (interfaces only — implementations are separate specs)

### Native (in this contract's scope to define the API; cards use it)

- A Solid **`CardProvider`** supplies a `CardHost` via context; native card
  components read `host.context()` and call `host.emit(event)`.
- Custom-element cards (the `<kc-*>` wrappers) dispatch a **bubbling**
  `CustomEvent<CardEvent>` named **`kc-card`** (`{ bubbles: true, composed: true }`)
  that a host-level listener routes through the same policy. This lets bare
  `<kc-form>` work without a Solid host.

### Remote (defined by the iframe-transport spec; shapes frozen here)

- The same `CardEnvelope` / `CardContext` / `CardEvent` shapes serialized over
  `postMessage`, wrapped with `{ protocol: 'kitn-card', version: CARD_CONTRACT_VERSION }`
  and validated for `event.origin` / `targetOrigin` both ways. Details there.

## Conventions every card spec MUST follow (so the fan-out stays consistent)

The parallel card specs (A–C in the fan-out) build against these:

1. **Two-layer pattern (matches the codebase):** each card = a Solid component in
   `src/components/<file>.tsx` + a web-component wrapper in `src/elements/<file>.tsx`
   via `defineKitnElement`. Tag names exactly: `kc-form`, `kc-confirm`,
   `kc-task-list`, `kc-link-card`, `kc-embed`.
2. **Type discriminator + schema:** each card exports its `type` string and ships
   `src/primitives/card-schemas/<type>.schema.json` for its `data` (and, if it
   submits, a `<type>.result.schema.json`). Provide the matching TS type.
3. **Consume the contract, don't reinvent it:** read context + emit via the
   `CardHost` (native) / `kc-card` CustomEvent; never define ad-hoc events.
4. **SolidJS norm:** never destructure props.
5. **A11y:** native cards are fully keyboard + screen-reader accessible; 0 axe
   violations light + dark (project gate).
6. **Source-visible stories:** each card gets Storybook stories that show the
   exact `CardEnvelope` JSON and the live render (the Examples norm).

## Scope of THIS spec (the contract only)

In scope: the types above (`card-contract.ts`), the JSON Schema artifacts for the
envelope/context/events, the host routing/policy semantics + defaults, the native
transport API (`CardProvider` + `kc-card` CustomEvent), versioning, and
boundary-validation requirement.

**Out of scope (separate specs):** the cards themselves; the iframe wire transport
+ provider runtime; the AG-UI event mapping + live/state/progress. `state` is
defined here only so its shape is stable for the live layer.

### Validator note (implementation decision, flagged not decided)

Boundary validation needs a JSON Schema validator. Lean-first preference: a small
internal validator covering the subset we use (type, enum, required, min/max,
array items, the `x-kitn-*` hints) to avoid a heavy dependency; fall back to
documenting an `ajv` opt-in if the subset proves insufficient. The implementation
plan decides; the **requirement** (validate at the boundary) is fixed here.

## Error handling

- Invalid envelope `data` (fails its schema) → card renders an inline error state +
  host receives `error`; never a broken/partial card.
- Unknown `type` → host renders a graceful "unsupported card" placeholder + warns.
- Unknown event `kind` / invalid payload → dropped at the boundary + warned.
- Missing policy handler → no-op + warn (never throw).

## Testing

- **Types compile** (the union, envelope, host) under all 3 tsconfigs.
- **Policy unit tests:** `send-prompt` downgrade (`send`→`compose` unless opted in);
  `open` scheme validation (rejects `javascript:`); missing-handler no-op;
  invalid-payload → `error` not routed.
- **Native transport:** a `kc-card` CustomEvent bubbles to the host listener and
  routes through policy; `CardProvider` exposes context + emit.
- **Schema artifacts:** each shipped `*.schema.json` parses and validates a known-good
  and known-bad example.
- Gate: build + typecheck + test (baseline 3 Shiki failures) + test:react + a11y.

## Rollout

`feat/card-contract` → main (cuts a minor). Must merge **before** card/transport
implementation so consumers have the frozen types. The five fan-out specs are
written against this doc; their *implementations* depend on this branch being
merged (for `card-contract.ts`) + the `kc-card` base.
