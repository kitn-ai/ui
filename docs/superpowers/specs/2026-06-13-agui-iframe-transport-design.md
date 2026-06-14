# AG-UI iframe transport + provider runtime — design (2026-06-13)

The **remote** implementation of the [Card Contract](./2026-06-13-card-contract-design.md).
A provider-owned, cross-origin, sandboxed `<iframe>` renders cards; the **exact**
`CardEnvelope` / `CardContext` / `CardEvent` shapes flow across the boundary over
`postMessage`. This spec defines the wire envelope, the handshake/version
negotiation, the down/up channels, the CSP/sandbox config, the two thin SDK
surfaces, the security model, error handling, a11y caveats, and the test/Storybook
plan.

> **Built against the frozen contract.** This spec invents **no** new message
> protocol. It serializes the contract's shapes and wraps them with
> `{ protocol: 'kitn-card', version: CARD_CONTRACT_VERSION }`. If a shape needs to
> change, it changes in `card-contract.ts`, not here.

Prior context: the handoff `docs/handoff/2026-06-13-kc-rename-resizable-artifact-agui.md`
(AG-UI sections: provider-owned iframe, postMessage with strict origin validation
both ways, theme/locale/context/short-lived-token down, events/auto-height/lifecycle
up, two thin pieces) and the existing iframe plumbing in `src/components/artifact.tsx`.

> **Ratified 2026-06-14 (session 3).** Scope confirmed: **full v1** (everything below —
> host SDK + provider runtime + `<kc-remote-card>` element + the `@kitn.ai/chat/provider`
> subpath + the mock-provider example + unit tests + the full cross-origin Playwright
> matrix + the 6 Storybook stories). Built against the **renamed contract**: the terminal
> data verb is now **`submit`** (was `submit-data`) and the policy handler is **`onSubmit`**;
> `CardContext.a11y.reducedMotion` already exists, so reduced-motion is carried there. The
> 5 open questions are now **decided** (see the closing "Resolved decisions" section). The
> contract is otherwise unchanged (`CARD_CONTRACT_VERSION` stays `'1'`).

---

## Problem

The agent/server wants to render a card the host app does **not** pre-bundle. The
provider owns and versions that UI server-side; the host must embed it without
trusting it with host-origin DOM access, and without inventing a parallel event
protocol. We already have the **what** (the Card Contract) and a **native**
transport (`<kc-*>` + `kc-card` CustomEvent). We need the **remote** transport: a
secure, typed, versioned `postMessage` bridge between a host page and a provider's
sandboxed cross-origin iframe, carrying the same contract shapes.

## Goal

1. A **host embed SDK** — the *only* client install — that drops one iframe, runs
   the handshake (origin checks + version negotiate), pushes `CardContext` down,
   receives `CardEvent`s up, and routes them through the **same `CardPolicy`** the
   native transport uses. Auto-sizes the iframe from `resize` events.
2. A **provider iframe runtime** — loaded *inside* the iframe by the provider — that
   completes the handshake, receives the envelope + context, renders the card
   (client-side-in-iframe, reusing `<kc-*>` as the catalog), reports height, and
   emits `CardEvent`s up.
3. **Wire fidelity:** every payload is a contract shape, schema-validated at the
   boundary, with strict `event.origin` / `targetOrigin` validation **both ways**
   and an explicit version handshake.

## Non-goals

- **Not** the cards themselves (separate card specs) — this transport carries any
  card type opaquely; it validates the *envelope/context/event* shapes, and defers
  per-`type` `data` validation to the same schemas the contract mandates.
- **Not** the native transport (frozen in the contract spec).
- **Not** the AG-UI/SSE wire between the **provider server and its own iframe** —
  that is the provider's internal concern (the runtime *surface* is defined; the
  SSE pipe is the provider's). The `state` verb is carried but the live/AG-UI
  state layer is a later spec (contract reserves `state`).
- **Not** SSR of `<kc-*>` into the iframe doc — v1 renders **client-side in the
  iframe** (per the handoff's resolved lean; see Architecture).
- **No** changes to existing source in this spec (design only).

---

## Architecture — the two thin pieces

```
┌──────────────────────── HOST PAGE (host origin) ───────────────────────┐
│  host app                                                               │
│    │  mountRemoteCard({ envelope, providerOrigin, src, policy, … })     │
│    ▼                                                                     │
│  HOST EMBED SDK  ── src/remote/host-embed.ts                            │
│    • drops <iframe src=provider sandbox=…>                              │
│    • handshake: hello ⇄ ready, version negotiate, origin lock           │
│    • DOWN: context (theme/locale/conversationId/authToken), envelope    │
│    • UP:   CardEvent → validate → CardPolicy.route() (SAME as native)   │
│    • resize → sizes the iframe height                                   │
│    • iframe plumbing generalized from artifact.tsx                      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │  postMessage (strict origin both ways)
                                 │  { protocol:'kitn-card', version, msg }
┌───────────────────────────────▼─────────────── IFRAME (provider origin) ┐
│  PROVIDER IFRAME RUNTIME  ── src/remote/provider-runtime.ts             │
│    • handshake responder; locks host origin from the hello              │
│    • receives envelope + context → renders card                        │
│    • renders with <kc-*> catalog (client-side-in-iframe)               │
│    • CardHost impl over the bridge: context() + emit(CardEvent)        │
│    • ResizeObserver → emit {kind:'resize', height}                     │
│    • provider serves this doc with its OWN hardened CSP                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module boundaries / exact files

New, all under a new `src/remote/` folder (a third peer to `src/components/` +
`src/elements/`; remote transport is neither a Solid component nor an element
facade):

| File | Role |
| --- | --- |
| `src/remote/wire.ts` | The wire types + `WireMessage` union + `pack()`/`unpack()` + `isCardWireMessage()` guard. Imports shapes from `../primitives/card-contract`. |
| `src/remote/host-embed.ts` | `mountRemoteCard()` + the `RemoteCardHandle`. The host side: iframe drop, handshake, origin lock, down-push, up-route via `CardPolicy`, auto-resize. |
| `src/remote/provider-runtime.ts` | `createCardBridge()` → a `CardHost` impl for the iframe + the handshake responder + `ResizeObserver` height reporting. Provider-side. |
| `src/remote/origin.ts` | `assertOrigin()` / origin-allowlist helpers, shared by both sides + unit-tested in isolation. |
| `src/remote/version.ts` | `negotiateVersion()` — pure function, unit-tested. |
| `src/elements/remote-card.tsx` | OPTIONAL `<kc-remote-card>` facade wrapping `mountRemoteCard` for the no-JS-host / pure-markup path (attributes: `provider-origin`, `src`, `envelope` as a JS prop). Emits a bubbling+composed `kc-card` CustomEvent so it routes through the **native** host listener too — making remote cards drop-in interchangeable with native ones. |

`src/remote/index.ts` re-exports the public surface; `src/index.ts` adds the host
SDK to the package's published entry (provider runtime ships as a separate subpath
export `@kitn.ai/chat/provider` so a provider bundles only the iframe side).

**Reuse from existing source (do not duplicate):**
- **`src/components/artifact.tsx`** iframe plumbing — the `<iframe sandbox … title …>`
  framing, `about:blank` reset-on-reload trick, and the "cross-origin frame's
  `history`/`location` are opaque" discipline. `host-embed.ts` generalizes that
  iframe drop. The key difference: artifact uses **NO** postMessage (it keeps its
  own nav stack); the remote transport **adds** the postMessage bridge on top of
  the same framing.
- **Auto-height primitive** — the contract's `resize` event comment says it
  "reuses `useAutoResize`". ⚠️ Honest correction: the existing
  `src/primitives/use-auto-resize.ts` is **textarea-specific** (it sets
  `style.height` from `scrollHeight` on `input`), so it is **not** directly usable
  for iframe content height. The correct reusable pattern is the **`ResizeObserver`**
  already used in `src/components/reasoning.tsx`. v1 therefore reports height via a
  small `observeContentHeight()` helper in `provider-runtime.ts` built on
  `ResizeObserver` (same pattern as reasoning.tsx), and we extract a shared
  `src/primitives/use-resize-observer.ts` so both reasoning and the provider runtime
  use one primitive. (See **Open questions** — whether to also retrofit
  `useAutoResize` onto it.)

---

## The wire message types (TS) — wrapping the contract shapes

`src/remote/wire.ts`. Every shape inside `payload` is a **contract** type imported
from `../primitives/card-contract` — never redefined.

```ts
import {
  CARD_CONTRACT_VERSION,
  type CardEnvelope,
  type CardContext,
  type CardEvent,
} from '../primitives/card-contract';

/** Wire-protocol identifier. Distinguishes our frames from any other postMessage
 *  traffic sharing the window (analytics, other widgets, devtools). */
export const CARD_WIRE_PROTOCOL = 'kitn-card' as const;

/** The envelope that wraps EVERY message in both directions. */
export interface WireFrame<M extends WireMessage = WireMessage> {
  protocol: typeof CARD_WIRE_PROTOCOL;
  /** Negotiated contract version (= CARD_CONTRACT_VERSION at author time). */
  version: string;
  /** Monotonic per-bridge id; lets a side correlate a reply to a request. */
  seq: number;
  /** The contract-shaped message. */
  message: M;
}

// ── DOWN: host → iframe ────────────────────────────────────────────────────
export type DownMessage =
  /** First frame the host sends after the iframe signals it loaded. Begins the
   *  handshake; advertises the versions the host supports. */
  | { dir: 'down'; kind: 'hello'; supportedVersions: string[] }
  /** Push (or re-push) the envelope to render. Re-sending with the same
   *  `envelope.id` is an update (re-render); a new id is a new card. */
  | { dir: 'down'; kind: 'render'; envelope: CardEnvelope }
  /** Push (or update) ambient context. Sent right after handshake and again
   *  whenever theme/locale/token change. */
  | { dir: 'down'; kind: 'context'; context: CardContext }
  /** Host acknowledges a card-up event it has routed (optional, for the runtime
   *  to clear pending UI; carries the originating `seq`). */
  | { dir: 'down'; kind: 'ack'; ackSeq: number }
  /** Host tells the runtime to tear down (card dismissed / iframe being reused). */
  | { dir: 'down'; kind: 'teardown' };

// ── UP: iframe → host ──────────────────────────────────────────────────────
export type UpMessage =
  /** Runtime's handshake reply: the single version it picked from the host's
   *  `supportedVersions`, plus the card types it can render. */
  | { dir: 'up'; kind: 'ready'; acceptedVersion: string; capabilities?: { types?: string[] } }
  /** A contract CardEvent, verbatim. THIS is the up channel for every verb
   *  (submit | action | send-prompt | open | resize | state | dismiss |
   *  error | ready). The contract's own `CardEvent['kind']:'ready'` is the
   *  per-card mount signal; the wire `ready` above is the BRIDGE handshake. */
  | { dir: 'up'; kind: 'event'; event: CardEvent }
  /** Runtime reports it could not start (bad envelope, unsupported version,
   *  internal error) — surfaced before/independently of a per-card error. */
  | { dir: 'up'; kind: 'fault'; code: WireFaultCode; message: string };

export type WireFaultCode =
  | 'version-unsupported'
  | 'bad-frame'
  | 'render-failed'
  | 'origin-rejected';

export type WireMessage = DownMessage | UpMessage;

/** Build an outbound frame. */
export function pack<M extends WireMessage>(message: M, seq: number): WireFrame<M> {
  return { protocol: CARD_WIRE_PROTOCOL, version: CARD_CONTRACT_VERSION, seq, message };
}

/** Structural guard: is this a frame we own? Used right after the origin check
 *  so foreign postMessage traffic is silently ignored. */
export function isCardWireFrame(data: unknown): data is WireFrame {
  return (
    typeof data === 'object' && data !== null &&
    (data as Record<string, unknown>).protocol === CARD_WIRE_PROTOCOL &&
    typeof (data as Record<string, unknown>).version === 'string' &&
    typeof (data as Record<string, unknown>).message === 'object'
  );
}
```

**Why a `dir` tag inside the message** (belt-and-suspenders): even though the host
only ever receives `up` frames and the iframe only `down` frames, tagging lets the
guard reject a reflected/echoed frame and makes logs unambiguous.

**Why wire `ready` ≠ contract `CardEvent{kind:'ready'}`:** the wire `ready` is the
**bridge** handshake (one per iframe, carries the negotiated version). The
contract's `ready` event is the **per-card** mount signal and rides up inside an
`{ kind:'event', event:{ kind:'ready', cardId } }` frame. Keeping them distinct
avoids overloading one word for two lifecycles.

---

## Handshake + version negotiation (step-by-step)

A four-way handshake; the host is the initiator but waits for the iframe's load.

```
HOST                                              IFRAME (provider runtime)
 1. drop <iframe src=providerSrc sandbox=…>
    start timeout (HANDSHAKE_TIMEOUT_MS, 5000)
                                                  2. doc loads; runtime boots
                                                     postMessage to parent:
                                                     {kind:'ready-probe'}*  OR
                                                     host waits for iframe 'load'
 3. on iframe load event (or ready-probe),
    targetOrigin = providerOrigin (EXACT):
      → pack(hello{supportedVersions:['1']})
 4.                                               receive frame; assert
                                                  event.origin === expectedHostOrigin
                                                  (locked from this first hello's
                                                   event.origin); else drop+fault
                                                  negotiateVersion(['1'], MY=['1'])
                                                  → '1'
 5.                                               ← pack(ready{acceptedVersion:'1',
                                                          capabilities:{types}})
 6. assert event.origin === providerOrigin;
    version === a supported one; clear timeout;
    mark bridge OPEN; lock providerOrigin
 7. → pack(context{theme,locale,convId,token})
 8. → pack(render{envelope})
                                                  9. render card with <kc-*>;
                                                     emit event{ready,cardId}
                                                     start ResizeObserver
10. ← event{ready} ; ← event{resize,height}
11. size iframe to height; bridge fully live
```

\* The host does **not** require the runtime to send a `ready-probe`; the iframe's
native `load` event is the trigger to send `hello`. A `ready-probe` (an extra
unsolicited up-frame *before* `hello`) is accepted as an early trigger but is
optional — it only matters if the provider doc loads before the host attaches its
listener (the host attaches the listener **before** setting `iframe.src`, so this
race is closed by construction; the probe is a defensive nicety). **v1: the
`ready-probe` is DROPPED — the runtime sends nothing until `hello` arrives. See
Resolved decisions #4.**

### `negotiateVersion` (pure, `src/remote/version.ts`)

```ts
/** Pick the highest version both sides support; null if disjoint. Versions are
 *  the contract's monotonically increasing string ints ('1','2',…). */
export function negotiateVersion(hostVersions: string[], mine: string[]): string | null {
  const set = new Set(mine);
  const common = hostVersions.filter((v) => set.has(v));
  if (common.length === 0) return null;
  return common.sort((a, b) => Number(b) - Number(a))[0];
}
```

- No common version → runtime replies `fault{code:'version-unsupported'}`; host
  surfaces an `error` via policy and shows an inline fallback (see Error handling).
- v1 ships only `'1'`, so negotiation is trivial today — but the channel exists so
  a future `'2'` runtime can talk to a `'1'` host (and vice-versa) without breakage.

---

## DOWN channel (host → iframe)

| Message | Payload (contract shape) | When | Notes |
| --- | --- | --- | --- |
| `hello` | `supportedVersions: string[]` | once, on iframe `load` | begins handshake; locks expected host origin on the iframe side |
| `context` | `CardContext` | after `ready`, then on any change | theme `{mode,tokens}`, `locale`, `conversationId`, **short-lived** `authToken` |
| `render` | `CardEnvelope` | after first `context` | re-send same `id` = update; new `id` = new card |
| `ack` | `ackSeq: number` | optional, after routing an up-event | lets runtime clear pending state |
| `teardown` | — | on dismiss / iframe reuse | runtime unmounts + stops observers |

**Theme push (no FOUC):** the host sends `context` with `theme.tokens` (the
resolved `--kc-*` values) **before** `render`, so the runtime applies tokens to
its `:root` before first paint. On host theme toggle, a fresh `context` re-pushes
tokens; the runtime live-updates CSS variables (no reload).

**Token handling:** `authToken` is a **short-lived, signed** token minted by the
host's backend for *this* card/conversation, used by the iframe to call the
provider's own backend. It is re-pushed on refresh via a new `context`. It is
**never** a long-lived secret and is **never** put in the iframe URL query string
(it would leak via `Referer`/history) — it travels only in a `context` frame to the
locked provider origin. (See Security.)

## UP channel (iframe → host)

| Message | Payload | Routed to | Notes |
| --- | --- | --- | --- |
| `ready` (wire) | `acceptedVersion`, `capabilities.types?` | handshake | completes negotiation; not a card event |
| `event{ready}` | `CardEvent{kind:'ready',cardId}` | `policy` (lifecycle) | per-card mount |
| `event{submit}` | `{cardId,data}` | `policy.onSubmit` | validated vs the card type's result schema first |
| `event{action}` | `{cardId,action,payload?}` | `policy.onAction` | named intent |
| `event{send-prompt}` | `{cardId,text,mode?,context?}` | `policy.onSendPrompt` | **`mode:'send'` downgraded to `'compose'`** unless `policy.maxSendPromptMode==='send'` (contract default) |
| `event{open}` | `{cardId,url,target?}` | `policy.onOpen` | scheme-validated (http/https/mailto); `'tab'`→`window.open(_,_,'noopener,noreferrer')` |
| `event{resize}` | `{cardId,height}` | **host SDK** | sizes the iframe; not forwarded to app policy |
| `event{state}` | `{cardId,patch}` | `policy.onState` | reserved for AG-UI/live layer |
| `event{dismiss}` | `{cardId}` | `policy.onDismiss` | host may also send `teardown` down |
| `event{error}` | `{cardId,message}` | `policy.onError` | per-card failure |
| `fault` | `{code,message}` | host → `policy.onError` + inline fallback | bridge-level failure |

**Auto-height flow (the `resize` verb):**
`ResizeObserver` in the iframe observes the card's root element → debounced (1
rAF) → `bridge.emit({kind:'resize', cardId, height})` →
`{dir:'up',kind:'event',event:{kind:'resize',…}}` over postMessage → host receives,
validates, and sets `iframe.style.height = clamp(height, MIN, MAX) + 'px'`. The
host **intercepts** `resize` (sizes the iframe) and does **not** forward it to the
app's `CardPolicy` — it is transport plumbing, not an app intent. A `maxHeight`
option caps it (the iframe then scrolls internally), mirroring `useAutoResize`'s
`maxHeight` semantics.

---

## CSP + sandbox config

### Host page obligations (minimal)

The host's **only** CSP obligation is to allow the provider as a frame source:

```
Content-Security-Policy: frame-src https://cards.provider.example;
```

(If multiple providers, list each origin. Wildcards are discouraged — see
Security/allowlist.)

### iframe `sandbox` attribute (host sets it)

```html
<iframe
  src="https://cards.provider.example/card/abc"
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
  title="<card title> — provided by cards.provider.example"
  referrerpolicy="no-referrer"
  allow=""
></iframe>
```

- `allow-scripts` — the runtime is JS.
- `allow-forms` — cards submit (`<kc-form>`).
- `allow-same-origin` — **refers to the *provider's* origin**, which the UI needs
  for its own storage/fetch. Because the frame is **cross-origin to the host**,
  granting `allow-same-origin` does **not** give it host-origin access (SOP still
  isolates the host). This is the handoff's resolved nuance: cross-origin +
  `allow-same-origin` = provider gets its own origin, host stays protected.
- `allow-popups` — `open{target:'tab'}` opens a new tab.
- **Deliberately omitted:** `allow-top-navigation` (a card must never navigate the
  host away — it uses the `open` verb instead), `allow-modals`, `allow-pointer-lock`,
  `allow-popups-to-escape-sandbox`.
- `referrerpolicy="no-referrer"` so the host URL never leaks to the provider.
- `allow=""` disables all Permissions-Policy features by default (camera/mic/etc.);
  a provider that needs one negotiates it as a future capability.

The `sandbox` string is overridable per-mount (`mountRemoteCard({ sandbox })`),
defaulting to the above — same pattern as `artifact.tsx`'s `sandbox` prop, but with
`allow-same-origin` added (artifact deliberately omits it to keep history opaque;
the remote transport needs it for the provider's own origin).

### Provider obligations (its iframe document's own CSP)

The provider **hardens the iframe doc it serves** with its own CSP, e.g.:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';        # kit CSS is injected inline per-element
  connect-src 'self' https://api.provider.example;
  frame-ancestors https://host-app.example;   # only THIS host may frame it
  base-uri 'none';
  form-action 'self';
```

`frame-ancestors` is the provider's lock that **only the intended host origin(s)**
may embed the card — the mirror of the host's `frame-src`. Both sides pin each
other. (`style-src 'unsafe-inline'` is required because `defineKitnElement` injects
the kit CSS as an inline `<style>` when Constructable Stylesheets are unavailable;
a provider on modern browsers can tighten this once it confirms the constructable
sheet path — noted, not blocking.)

---

## Security model

1. **Origin validation both ways, fail-closed.**
   - **Host side:** every inbound `message` event is checked `event.origin ===
     providerOrigin` (the exact origin passed to `mountRemoteCard`) **before** the
     structural guard. Mismatch → dropped + warned, never parsed.
   - **Host outbound:** every `postMessage` uses `targetOrigin = providerOrigin`
     (never `'*'`).
   - **Iframe side:** the runtime locks the host origin from the **first `hello`'s**
     `event.origin` and rejects every later frame from a different origin
     (`fault{code:'origin-rejected'}`). It also reads `frame-ancestors` as the
     hard backstop (the browser refuses to load it in a disallowed host anyway).
   - **Iframe outbound:** `parent.postMessage(frame, lockedHostOrigin)` — exact,
     never `'*'`. (The runtime knows the host origin from `hello`; until `hello`
     arrives it sends **nothing** — the `ready-probe` is dropped in v1, so there is no
     pre-`hello` outbound frame at all. See Resolved decisions #4.)
   - All of this lives in `src/remote/origin.ts` (`assertOrigin`,
     `lockOrigin`) and is unit-tested in isolation.

2. **Origin allowlist.** `mountRemoteCard` takes a single `providerOrigin`. The
   `<kc-remote-card>` facade reads `provider-origin` and validates it is a single
   absolute `https:` origin (rejects `*`, lists, or `http:` except `localhost` for
   dev). The host SDK never trusts the iframe's `src` to *imply* the origin — the
   caller states it explicitly and it is pinned.

3. **Short-lived tokens only.** `authToken` is minted per-card by the host's
   backend, signed, short-TTL, scoped to the conversation; refreshed via a new
   `context` frame. Never long-lived, never in the URL, never logged.

4. **send-prompt cannot impersonate the user.** The contract default
   (`maxSendPromptMode:'compose'`) means a remote card **cannot silently send a
   message as the user**; it can only pre-fill the composer unless the host
   explicitly opts into `'send'`. Enforced in the **same** policy router as native
   — there is exactly one place this rule lives.

5. **Scheme validation on `open`.** Reuses the contract's policy: `http`/`https`/
   `mailto` only; `javascript:`/`data:` rejected and surfaced as `error`.

6. **Schema validation at the boundary (both shapes + payloads).** On the host,
   inbound `event` frames are validated against the `CardEvent` schema, and
   `submit`/`action` payloads against the card type's published schema, before
   routing (contract requirement). On the iframe, the inbound `envelope.data` is
   validated against the card type's schema before render. Failures fail **loud**
   (host `error`; runtime inline error + `fault{render-failed}`), never render
   silently wrong. Same validator the contract picks (lean internal subset, ajv
   opt-in) — shared, not re-implemented.

7. **The sandbox protects the host, not the provider from itself.** The provider
   must still sanitize the card output it renders. Stated as a provider obligation,
   not enforced by us.

---

## Error handling

| Failure | Detection | Behavior |
| --- | --- | --- |
| **Origin mismatch** (inbound) | `event.origin !== expected` | drop frame, `console.warn` once per offending origin, never parse. No app-visible error (could be unrelated traffic). |
| **Foreign / malformed frame** | `isCardWireFrame()` false | drop silently (it's not ours). |
| **Version mismatch** | `negotiateVersion()→null` | runtime sends `fault{version-unsupported}`; host clears timeout, routes `error` via policy, renders inline "This card needs a newer/older host" fallback. |
| **Load failure** | iframe `error` event OR handshake timeout | host renders inline "Couldn't load card from `<origin>`" + a Retry that re-creates the iframe. `policy.onError`. |
| **Handshake timeout** | no `ready` within `HANDSHAKE_TIMEOUT_MS` (5 s) | same as load failure; the iframe may be wrong-origin, CSP-blocked, or crashed. |
| **Bad envelope `data`** | iframe schema-validate fails | runtime renders inline card-error + emits `event{error}` (per-card) — the contract's "never a broken/partial card" rule. |
| **Bad up-payload** | host schema-validate fails | dropped at boundary + warned; NOT routed (contract rule). |
| **Unknown card `type`** | iframe has no renderer | runtime renders the contract's "unsupported card" placeholder + emits `event{error}`. |
| **Render crash** | runtime try/catch around mount | `fault{render-failed}`; host inline error. |
| **Missing policy handler** | router finds no handler | no-op + warn (contract rule; never throws). |

All host-side errors degrade to an **inline, accessible** fallback inside the
host's card slot (a `role="alert"` region with a human message + optional Retry) —
the iframe is replaced by host-rendered DOM, so a dead provider never leaves an
empty hole.

---

## Accessibility & focus caveats (the honest tax) + mitigations

Cross-iframe a11y is the real cost of provider-owned UI. Honest caveats and what we
do about each:

1. **Focus continuity.** Tab focus *can* cross the iframe boundary natively (the
   iframe participates in the tab order), but the host can't observe focus *inside*
   the frame. **Mitigation:** the runtime emits an `action{action:'focus-trap-edge',
   payload:{edge:'start'|'end'}}` when focus would leave the card's first/last
   focusable, letting the host move focus to the next host element deterministically
   (opt-in; default browser tab order otherwise). The iframe's own content must be
   fully keyboard-navigable (provider obligation).

2. **Screen-reader context.** A screen reader announces the iframe as a frame
   boundary; the card's content is read from the iframe's accessibility tree.
   **Mitigation:** the host sets a meaningful `iframe title` ("`<card title>` —
   provided by `<provider>`") from the envelope, so the boundary is announced
   usefully; the runtime sets a top-level `role`/`aria-label` on the card root and
   manages `aria-live` for async updates **inside** the frame (its tree is intact
   within the frame, which is the part SRs handle well).

3. **Height/scroll & SR virtual cursor.** Auto-height keeps the whole card on
   screen (no inner scroll by default), which avoids the worst SR-in-scrollable-
   iframe problems. When `maxHeight` is hit and the frame scrolls, that inner scroll
   is a known SR friction point — documented; prefer leaving `maxHeight` unset for
   forms.

4. **Theme/contrast.** Tokens are pushed down so the card matches host light/dark
   and contrast; without the push the card could be unreadable. The `context`-before-
   `render` ordering guarantees correct contrast at first paint.

5. **Reduced motion.** `prefers-reduced-motion` does **not** automatically cross
   the boundary in all engines; the host includes the resolved preference in
   `CardContext` (carried in `theme.tokens` or a future field) so the runtime can
   honor it. (Flagged in Open questions — whether to add an explicit field.)

These are stated as **caveats with mitigations**, matching the handoff's "a11y/focus
continuity across the boundary is the real tax" note — not solved-and-forgotten.

---

## Host embed SDK surface

`src/remote/host-embed.ts`. One function + a handle. Wires the **same `CardPolicy`**
the native transport uses (no second routing path).

```ts
import { type CardEnvelope, type CardContext, type CardPolicy } from '../primitives/card-contract';

export interface MountRemoteCardOptions {
  /** Where to mount the iframe. */
  container: HTMLElement;
  /** The card to render (carried down as a `render` frame). */
  envelope: CardEnvelope;
  /** EXACT provider origin (https). Pinned for all origin checks. */
  providerOrigin: string;
  /** The provider URL the iframe frames (must be same-origin as providerOrigin). */
  src: string;
  /** Ambient context; theme/locale/conversationId/short-lived authToken. */
  context: CardContext;
  /** The SAME routing policy native cards use. resize is handled by the SDK. */
  policy?: CardPolicy;
  /** Override sandbox (default: allow-scripts allow-forms allow-same-origin allow-popups). */
  sandbox?: string;
  /** Cap auto-height (px); frame scrolls internally beyond it. */
  maxHeight?: number;
  /** Handshake timeout (ms). Default 5000. */
  handshakeTimeoutMs?: number;
}

export interface RemoteCardHandle {
  /** Push new ambient context (theme toggle, token refresh). */
  updateContext(context: Partial<CardContext>): void;
  /** Re-render with a new/updated envelope (same id = update). */
  update(envelope: CardEnvelope): void;
  /** Send `teardown`, stop listeners, remove the iframe. Idempotent. */
  destroy(): void;
  /** Current bridge state for the host to reflect in UI. */
  state(): 'connecting' | 'open' | 'error' | 'closed';
}

export function mountRemoteCard(options: MountRemoteCardOptions): RemoteCardHandle;
```

- It **drops one iframe**, attaches the `message` listener **before** setting
  `iframe.src` (closes the load-before-listener race), runs the handshake, pushes
  `context` then `render`, intercepts `resize` to size the frame, and routes every
  other `CardEvent` through `routeCardEvent(policy, event)` — **the exact function
  the native `kc-card` host listener calls** (defined by the contract). One policy,
  two transports.
- **iframe reuse:** a host showing many remote cards from one provider can call
  `update(envelope)` on a single handle to swap cards in one warm iframe (perf;
  see Caveats), rather than mounting N iframes.

## Provider iframe runtime surface

`src/remote/provider-runtime.ts`. The provider's iframe doc imports this, picks a
renderer for the envelope's `type`, and lets the runtime own the bridge.

```ts
import { type CardEnvelope, type CardContext, type CardHost } from '../primitives/card-contract';

export interface CardRenderer {
  /** The card `type` this renderer handles. */
  type: string;
  /** Mount into `root`, given the envelope + a CardHost (context() + emit()).
   *  Return a disposer. Reuse <kc-*> here. */
  mount(root: HTMLElement, envelope: CardEnvelope, host: CardHost): () => void;
}

export interface CreateCardBridgeOptions {
  /** Element the card mounts into + whose height is observed. */
  root: HTMLElement;
  /** Renderers by card type. Unknown type → contract's unsupported placeholder. */
  renderers: CardRenderer[];
  /** Versions this runtime supports (default [CARD_CONTRACT_VERSION]). */
  supportedVersions?: string[];
}

export interface CardBridge {
  /** Begin: listen for `hello`, complete handshake, render on `render`. */
  start(): void;
  /** Stop observers + listeners. */
  stop(): void;
}

/** Build the iframe-side bridge: handshake responder + CardHost + auto-height. */
export function createCardBridge(options: CreateCardBridgeOptions): CardBridge;
```

- `createCardBridge` provides each renderer a `CardHost` whose `context()` returns
  the latest pushed `CardContext` (updated live on each `context` frame) and whose
  `emit(event)` packs the event into an `up` frame to the locked host origin.
- It runs `observeContentHeight(root)` (the shared `ResizeObserver` primitive) and
  emits `resize` on change.
- Renderers reuse the `<kc-*>` catalog: e.g. a `form` renderer mounts `<kc-form>`,
  feeds it `envelope.data`, listens for its `kc-card`/`submit` and calls
  `host.emit({kind:'submit', …})`. The runtime is the bridge; the cards are
  the existing components — the provider bundles `@kitn.ai/chat/provider` +
  whichever `<kc-*>` it renders.

---

## Testing

**Unit (pure, deterministic — the must-haves):**
- `origin.ts`: `assertOrigin` accepts exact match, rejects mismatch / `null` /
  case + trailing-slash variants; `lockOrigin` pins the first origin and rejects
  later differing ones.
- `version.ts`: `negotiateVersion` picks the highest common; returns `null` when
  disjoint; handles single-version (today's) case.
- `wire.ts`: `pack` round-trips; `isCardWireFrame` accepts a real frame and rejects
  foreign postMessage payloads (analytics blobs, strings, `null`, missing protocol).
- **Message routing:** an inbound `up` `event` frame for each verb routes to the
  right `CardPolicy` handler; `resize` is intercepted (sizes the iframe, NOT
  forwarded); `send-prompt{mode:'send'}` is downgraded unless opted in; `open`
  scheme validation rejects `javascript:`; missing handler is a no-op; invalid
  payload is dropped not routed. (Reuses the contract's `routeCardEvent` tests,
  extended for the wire path.)
- **Handshake (jsdom, two `postMessage` stubs):** host `hello` → runtime `ready`
  → `context`/`render` order; timeout fires `error` + inline fallback when no
  `ready`; `fault{version-unsupported}` path; origin-mismatch frame dropped.

**Empirically verified (Playwright, real cross-origin frames — what static tests
miss, per the project's hard-won norm):**
- Two dev origins (host on `:6006`, provider on `:6007`) so origin checks are
  **real**, not same-origin shortcuts. Verify: handshake completes; a `<kc-form>`
  submit in the frame arrives at the host's `onSubmit`; **measured** auto-height
  (host iframe `clientHeight` matches the card's content height after a field
  toggles the card taller/shorter); theme toggle re-paints the framed card to dark
  (measured background); a wrong-origin postMessage is ignored (host policy never
  fires); load failure (bad src) shows the inline fallback.
- a11y: axe on the **host** page (the iframe boundary + fallback regions) — 0
  violations light + dark; keyboard tab reaches into and out of the frame.

**Gate (project norm):** build + typecheck (3 tsconfigs) + test (baseline 3 Shiki
failures) + test:react + a11y. New Storybook stories require a full restart (custom
elements don't re-register on HMR).

---

## Storybook / demo story plan

A new `Web Components/kc-remote-card` (+ an `Examples/Remote cards` group), every
story **source-visible** (`parameters.docs.source.code`, per the Examples norm):

1. **Remote form (happy path).** A mock provider iframe (served from Storybook
   `staticDirs`, e.g. `examples/remote-provider/`, on a second origin via the
   preview server) renders a `<kc-form>`; the story logs the routed `submit`
   in an actions panel. Shows the `CardEnvelope` JSON next to the live frame.
2. **Auto-height.** A card whose content grows/shrinks on interaction; the iframe
   visibly resizes. Demonstrates the `resize` verb end-to-end.
3. **Theme push.** Storybook light/dark toolbar toggles re-push `context`; the
   framed card re-themes live (no reload).
4. **send-prompt policy.** Two stories: default (`compose` — fills the composer) vs
   opted-in (`send`), making the security default visible.
5. **Failure modes.** Bad `providerOrigin` (load failure → inline fallback +
   Retry); version mismatch (mock runtime advertising `'2'` only → fallback);
   wrong-origin postMessage injected via the actions panel is ignored.
6. **iframe reuse.** One handle, `update(envelope)` swaps between two cards in a
   single warm frame.

The mock provider doc (`examples/remote-provider/index.html` +
`provider-entry.ts`) doubles as the **reference provider iframe runtime** a real
provider copies — it imports `createCardBridge` + registers `<kc-form>`/etc.
renderers. Served on a distinct origin so the demo exercises **real** cross-origin
postMessage, not a same-origin shortcut.

---

## Resolved decisions (2026-06-14)

The 5 prior open questions are now decided:

1. **Auto-height primitive.** Add a new `src/primitives/use-resize-observer.ts` (the
   `reasoning.tsx` `ResizeObserver` pattern) and build height reporting on it. **Leave
   the textarea-only `useAutoResize` untouched** (no retrofit — avoids churn). v1 ships
   the new primitive only.

2. **`reduced-motion` in `CardContext`.** **Already resolved** — `CardContext.a11y.reducedMotion`
   exists in the contract today. The host populates it; the runtime reads it. No contract
   change.

3. **Provider subpath export.** **Yes** — ship the provider runtime as a separate
   `@kitn.ai/chat/provider` subpath (its own bundle), so a provider doesn't pull the host
   SDK. Clearer security boundary + smaller provider bundle. Add it to `package.json`
   `exports` alongside `./elements` / `./react`.

4. **`ready-probe`.** **Dropped.** The host attaches its `message` listener **before**
   setting `iframe.src`, which closes the load-before-listener race by construction. That
   ordering is the documented guarantee; the speculative `ready-probe` up-frame is removed
   from the protocol.

5. **Multi-card-per-iframe.** **Deferred to v2.** v1 = one card per iframe (a warm iframe
   may be reused for one card at a time via `update(envelope)`). The `cardId` on every
   event already supports demux, so the door stays open without designing the multi-render
   down channel now.
