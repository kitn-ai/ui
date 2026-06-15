# AG-UI iframe transport (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remote (cross-origin sandboxed `<iframe>` + `postMessage`) transport for the Card Contract: a host embed SDK + a provider iframe runtime that carry the exact `CardEnvelope`/`CardContext`/`CardEvent` shapes over a hardened wire, routed through the **same `CardPolicy`** as native cards — plus a runnable mock-provider example and a real cross-origin test matrix.

**Architecture:** A new `src/remote/` folder (peer to `components/`/`elements/`): pure `wire`/`origin`/`version` modules; `host-embed.ts` (`mountRemoteCard` — drops the iframe, runs a nonce-bound handshake, pushes context+render, intercepts `resize`/`focus-edge`, routes everything else via `routeCardEvent`, with a `connecting→open→error|closed` state machine + pre-OPEN latest-wins buffer); `provider-runtime.ts` (`createCardBridge` — handshake responder + `CardHost` + content-height observer). A `<kc-remote>` element validates then re-emits `kc-card`. The provider ships as a separate `@kitn.ai/chat/provider` bundle.

**Tech Stack:** TypeScript, SolidJS (elements only; the transport is vanilla DOM), Vite (lib mode, second build entry), vitest+jsdom (unit), standalone Playwright (cross-origin e2e), Storybook.

**Spec (authoritative):** `docs/superpowers/specs/2026-06-13-agui-iframe-transport-design.md` — read the **"v1 Hardening addendum" (H-A … H-P)** and the canonical **"## The wire message types (TS)"** block; they supersede older prose where they conflict.

**Phasing (decided 2026-06-14):** ship in **two PRs** for reviewability.
- **Phase 1 — core transport + example (Tasks 1–11):** the `src/remote/` modules, `<kc-remote>`, the provider bundle/exports, the runnable mock-provider example, and the **unit** test suite (jsdom). Produces working, unit-verified software on its own.
- **Phase 2 — verification + surfacing (Tasks 12–14):** the real cross-origin **Playwright** matrix + CI workflow, Storybook stories, and the Overview docs. Hardens and documents what Phase 1 built.
Each phase is its own branch/PR off `main`.

**Conventions:**
- Run from the **main checkout** (worktree vitest is broken). Never destructure SolidJS props. Conventional-commit prefixes; commit each task.
- Run unit tests via `npx vitest run <file>`. The transport's pure modules are framework-free.
- The four interactive card verbs are `action` (confirm/choice) + `submit` (tasks/form). `kc-link-card` is now `kc-link-preview`.

---

## File Structure

**Create (transport core — `src/remote/`):**
- `wire.ts` — `CARD_WIRE_PROTOCOL`, `WireFrame`, `DownMessage`/`UpMessage`/`WireMessage`, `WireFaultCode`, `createPacker(version,nonce)`, `isCardWireFrame(data, dir)`. Pure.
- `origin.ts` — `assertOrigin(actual, expected)`, `assertCrossOrigin(src, providerOrigin, hostOrigin)`, `redactFrame(frame)`. Pure.
- `version.ts` — `negotiateVersion(hostVersions, mine)`, `isValidVersion(s)`. Pure.
- `validate.ts` — `validateInboundEvent(frame)` (direction + schema + prototype-pollution guard) reusing `src/primitives/card-validate.ts`. Pure-ish.
- `host-embed.ts` — `mountRemoteCard(opts): RemoteCardHandle` + the state machine.
- `provider-runtime.ts` — `createCardBridge(opts): CardBridge`, `RemoteCardRenderer`.
- `index.ts` — re-exports the host SDK surface.
- `provider.ts` — the `@kitn.ai/chat/provider` entry (re-exports `createCardBridge`, `RemoteCardRenderer`, wire/origin/version).

**Create (element + example + infra):**
- `src/elements/remote.tsx` — `<kc-remote>`.
- `src/primitives/use-resize-observer.ts` — shared ResizeObserver primitive.
- `examples/remote-provider/{index.html,provider-entry.ts,vite.config.ts}` — mock provider (standalone Vite app, reference runtime).
- `examples/remote-host/` (host demo page, optional within stories).
- `vite.config.provider.ts` — second build entry.
- `playwright.config.ts`, `tests/e2e/remote-element.spec.ts`.
- `.github/workflows/test.yml`.

**Modify:**
- `src/components/reasoning.tsx` — consume `use-resize-observer.ts` (no behavior change).
- `src/index.ts` — re-export the host SDK (`mountRemoteCard`, types).
- `package.json` — `build` (two entries), `exports` (`./provider`), devDeps (`concurrently`, `http-server`, `vite-plugin-dts@^4`), scripts (`dev:provider`, `test:e2e`).
- `src/elements/cards.tsx` is **not** touched (remote cards mount standalone — H-K).

---

## Task 1: `wire.ts` — protocol types + packer + guard

**Files:** Create `src/remote/wire.ts`; Test `tests/remote/wire.test.ts`.

- [ ] **Step 1: Write the failing test** — create `tests/remote/wire.test.ts`:

```ts
import { test, expect } from 'vitest';
import { CARD_WIRE_PROTOCOL, createPacker, isCardWireFrame } from '../../src/remote/wire';

test('createPacker stamps protocol, negotiated version, nonce', () => {
  const pack = createPacker('1', 'abc123');
  const f = pack({ dir: 'down', kind: 'hello', supportedVersions: ['1'] });
  expect(f).toEqual({
    protocol: CARD_WIRE_PROTOCOL, version: '1', nonce: 'abc123',
    message: { dir: 'down', kind: 'hello', supportedVersions: ['1'] },
  });
});

test('isCardWireFrame accepts a well-formed frame matching the expected direction', () => {
  const pack = createPacker('1', 'n');
  const up = pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' });
  expect(isCardWireFrame(up, 'up')).toBe(true);
  expect(isCardWireFrame(up, 'down')).toBe(false); // wrong direction (echo defense)
});

test('isCardWireFrame rejects foreign / malformed payloads', () => {
  expect(isCardWireFrame(null, 'up')).toBe(false);
  expect(isCardWireFrame('hi', 'up')).toBe(false);
  expect(isCardWireFrame({ protocol: 'other', version: '1', nonce: 'n', message: { dir: 'up' } }, 'up')).toBe(false);
  expect(isCardWireFrame({ protocol: CARD_WIRE_PROTOCOL, version: 1, nonce: 'n', message: { dir: 'up' } }, 'up')).toBe(false); // version not string
  expect(isCardWireFrame({ protocol: CARD_WIRE_PROTOCOL, version: '1', message: { dir: 'up' } }, 'up')).toBe(false); // no nonce
  expect(isCardWireFrame({ protocol: CARD_WIRE_PROTOCOL, version: '1', nonce: 'n' }, 'up')).toBe(false); // no message
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/remote/wire.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/remote/wire.ts` with the canonical block from the spec ("## The wire message types (TS)"):

```ts
import { type CardEnvelope, type CardContext, type CardEvent } from '../primitives/card-contract';

export const CARD_WIRE_PROTOCOL = 'kitn-card' as const;

export interface WireFrame<M extends WireMessage = WireMessage> {
  protocol: typeof CARD_WIRE_PROTOCOL;
  /** The NEGOTIATED contract version (set by the per-bridge packer). */
  version: string;
  /** Per-bridge instance nonce (host-minted, echoed on every up-frame). */
  nonce: string;
  message: M;
}

export type DownMessage =
  | { dir: 'down'; kind: 'hello'; supportedVersions: string[] }
  | { dir: 'down'; kind: 'render'; envelope: CardEnvelope }
  | { dir: 'down'; kind: 'context'; context: CardContext }
  | { dir: 'down'; kind: 'teardown' };

export type UpMessage =
  | { dir: 'up'; kind: 'ready'; acceptedVersion: string; capabilities?: { types?: string[] } }
  | { dir: 'up'; kind: 'event'; event: CardEvent }
  | { dir: 'up'; kind: 'focus-edge'; edge: 'start' | 'end' }
  | { dir: 'up'; kind: 'fault'; code: WireFaultCode; message: string };

export type WireFaultCode = 'version-unsupported' | 'bad-frame' | 'render-failed' | 'origin-rejected';
export type WireMessage = DownMessage | UpMessage;

export function createPacker(version: string, nonce: string) {
  return function pack<M extends WireMessage>(message: M): WireFrame<M> {
    return { protocol: CARD_WIRE_PROTOCOL, version, nonce, message };
  };
}

/** Structural + direction guard. Host calls with 'up', runtime with 'down'.
 *  STRUCTURAL only — nonce/version equality + schema validation happen after. */
export function isCardWireFrame(data: unknown, expectedDir: 'up' | 'down'): data is WireFrame {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  const m = d.message as Record<string, unknown> | undefined;
  return (
    d.protocol === CARD_WIRE_PROTOCOL &&
    typeof d.version === 'string' &&
    typeof d.nonce === 'string' &&
    typeof m === 'object' && m !== null &&
    m.dir === expectedDir
  );
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run tests/remote/wire.test.ts && npm run typecheck` → PASS, clean.
- [ ] **Step 5: Commit** — `git add src/remote/wire.ts tests/remote/wire.test.ts && git commit -m "feat(remote): wire protocol types + packer + direction guard"`

---

## Task 2: `version.ts` — version negotiation

**Files:** Create `src/remote/version.ts`; Test `tests/remote/version.test.ts`.

- [ ] **Step 1: Failing test** — `tests/remote/version.test.ts`:

```ts
import { test, expect } from 'vitest';
import { negotiateVersion, isValidVersion } from '../../src/remote/version';

test('isValidVersion accepts decimal-int strings only', () => {
  expect(isValidVersion('1')).toBe(true);
  expect(isValidVersion('12')).toBe(true);
  expect(isValidVersion('1e3')).toBe(false);
  expect(isValidVersion('0x2')).toBe(false);
  expect(isValidVersion(' 2 ')).toBe(false);
  expect(isValidVersion('')).toBe(false);
});

test('negotiateVersion picks the highest common, null when disjoint or invalid', () => {
  expect(negotiateVersion(['1'], ['1'])).toBe('1');
  expect(negotiateVersion(['1', '2'], ['1', '2', '3'])).toBe('2');
  expect(negotiateVersion(['1'], ['2'])).toBeNull();
  expect(negotiateVersion(['1e3'], ['1e3'])).toBeNull(); // invalid strings rejected
  expect(negotiateVersion([], ['1'])).toBeNull();
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run tests/remote/version.test.ts`.
- [ ] **Step 3: Implement** — `src/remote/version.ts`:

```ts
/** Contract versions are decimal integer strings ('1','2',…). */
export function isValidVersion(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

/** Highest version both sides support; null if disjoint or any candidate is malformed. */
export function negotiateVersion(hostVersions: string[], mine: string[]): string | null {
  const set = new Set(mine.filter(isValidVersion));
  const common = hostVersions.filter((v) => isValidVersion(v) && set.has(v));
  if (common.length === 0) return null;
  return common.sort((a, b) => Number(b) - Number(a))[0];
}
```

- [ ] **Step 4: Run → PASS** + `npm run typecheck`.
- [ ] **Step 5: Commit** — `git add src/remote/version.ts tests/remote/version.test.ts && git commit -m "feat(remote): version negotiation (validated, highest-common)"`

---

## Task 3: `origin.ts` — origin guards + cross-origin precondition + redaction

**Files:** Create `src/remote/origin.ts`; Test `tests/remote/origin.test.ts`.

- [ ] **Step 1: Failing test** — `tests/remote/origin.test.ts`:

```ts
import { test, expect } from 'vitest';
import { assertOrigin, assertCrossOrigin, redactFrame } from '../../src/remote/origin';

test('assertOrigin: exact match only', () => {
  expect(assertOrigin('https://p.example', 'https://p.example')).toBe(true);
  expect(assertOrigin('https://p.example/', 'https://p.example')).toBe(false); // trailing slash
  expect(assertOrigin('http://p.example', 'https://p.example')).toBe(false);
  expect(assertOrigin('', 'https://p.example')).toBe(false);
  expect(assertOrigin(null as unknown as string, 'https://p.example')).toBe(false);
});

test('assertCrossOrigin: throws when provider equals host or src origin mismatches', () => {
  // valid: provider cross-origin to host, src on provider origin
  expect(() => assertCrossOrigin('https://p.example/card', 'https://p.example', 'https://host.example')).not.toThrow();
  // src origin must equal providerOrigin
  expect(() => assertCrossOrigin('https://other.example/card', 'https://p.example', 'https://host.example')).toThrow();
  // provider must NOT be the host origin (else allow-same-origin escalates)
  expect(() => assertCrossOrigin('https://host.example/card', 'https://host.example', 'https://host.example')).toThrow();
});

test('redactFrame: allowlists known-safe fields, redacts authToken + nonce + everything else', () => {
  const f = {
    protocol: 'kitn-card', version: '1', nonce: 'secret-nonce',
    message: { dir: 'down', kind: 'context', context: { theme: { mode: 'light' }, locale: 'en', authToken: 'SECRET' } },
  };
  const r = JSON.stringify(redactFrame(f));
  expect(r).not.toContain('SECRET');
  expect(r).not.toContain('secret-nonce');
  expect(r).toContain('context'); // structural shape kept for debugging
});
```

- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — `src/remote/origin.ts`:

```ts
export function assertOrigin(actual: string, expected: string): boolean {
  return typeof actual === 'string' && actual.length > 0 && actual === expected;
}

/** Fail-closed precondition (H-F): the iframe must be cross-origin to the host so
 *  `allow-same-origin` can't reach host DOM, and `src` must be on the provider origin. */
export function assertCrossOrigin(src: string, providerOrigin: string, hostOrigin: string): void {
  const srcOrigin = new URL(src).origin;
  if (providerOrigin === hostOrigin) throw new Error('[kc-remote] providerOrigin must be cross-origin to the host');
  if (srcOrigin === hostOrigin) throw new Error('[kc-remote] src must not be same-origin as the host');
  if (srcOrigin !== providerOrigin) throw new Error('[kc-remote] src origin must equal providerOrigin');
}

/** Field-positive log redaction (H-H/H-P): keep structural keys, redact secrets +
 *  unknown leaf values by default. nonce + authToken are always redacted. */
const SAFE_KEYS = new Set(['protocol', 'version', 'dir', 'kind', 'mode', 'locale', 'edge', 'code', 'acceptedVersion', 'supportedVersions', 'cardId', 'type', 'id', 'height', 'target']);
const ALWAYS_REDACT = new Set(['authToken', 'nonce']);
export function redactFrame(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactFrame);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (ALWAYS_REDACT.has(k)) out[k] = '[redacted]';
      else if (typeof v === 'object' && v !== null) out[k] = redactFrame(v);
      else out[k] = SAFE_KEYS.has(k) ? v : '[redacted]';
    }
    return out;
  }
  return value;
}
```

- [ ] **Step 4: Run → PASS** + typecheck.
- [ ] **Step 5: Commit** — `git add src/remote/origin.ts tests/remote/origin.test.ts && git commit -m "feat(remote): origin guards, cross-origin precondition, log redaction"`

---

## Task 4: `validate.ts` — inbound direction+schema+proto-pollution guard

**Files:** Create `src/remote/validate.ts`; Test `tests/remote/validate.test.ts`. Reuse `src/primitives/card-validate.ts`.

- [ ] **Step 1: Failing test** — `tests/remote/validate.test.ts`:

```ts
import { test, expect } from 'vitest';
import { hasPollutionKey, isKnownEventKind } from '../../src/remote/validate';

test('hasPollutionKey walks nested objects', () => {
  expect(hasPollutionKey({ a: { b: { __proto__: 1 } } })).toBe(true);
  expect(hasPollutionKey({ a: { constructor: 1 } })).toBe(true);
  expect(hasPollutionKey({ a: { b: 1 } })).toBe(false);
  expect(hasPollutionKey([{ ok: 1 }, { prototype: 2 }])).toBe(true);
});

test('isKnownEventKind accepts contract verbs only', () => {
  expect(isKnownEventKind('submit')).toBe(true);
  expect(isKnownEventKind('action')).toBe(true);
  expect(isKnownEventKind('open')).toBe(true);
  expect(isKnownEventKind('nope')).toBe(false);
});
```

- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — `src/remote/validate.ts`:

```ts
import type { CardEventKind } from '../primitives/card-contract';

const POLLUTION = new Set(['__proto__', 'constructor', 'prototype']);
/** Recursive guard (H-D): nested data/patch/context are forwarded to app handlers. */
export function hasPollutionKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasPollutionKey);
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      if (POLLUTION.has(k)) return true;
      if (hasPollutionKey((value as Record<string, unknown>)[k])) return true;
    }
  }
  return false;
}

const KINDS: ReadonlySet<string> = new Set<CardEventKind>([
  'ready', 'submit', 'action', 'send-prompt', 'open', 'resize', 'state', 'dismiss', 'error',
] as CardEventKind[]);
export function isKnownEventKind(k: unknown): k is CardEventKind {
  return typeof k === 'string' && KINDS.has(k);
}
```

> NOTE: confirm `CardEventKind` lists exactly these verbs in `src/primitives/card-contract.ts` (the rename made `submit-data`→`submit`); adjust the set to match the source of truth.

- [ ] **Step 4: Run → PASS** + typecheck.
- [ ] **Step 5: Commit** — `git add src/remote/validate.ts tests/remote/validate.test.ts && git commit -m "feat(remote): inbound validation (proto-pollution + known-verb guards)"`

---

## Task 5: `use-resize-observer.ts` primitive + refactor `reasoning.tsx`

**Files:** Create `src/primitives/use-resize-observer.ts`; Modify `src/components/reasoning.tsx`; Test `tests/primitives/use-resize-observer.test.ts`.

- [ ] **Step 1: Read** `src/components/reasoning.tsx` lines ~108–130 (the `new ResizeObserver(...)` block) to preserve its exact behavior.
- [ ] **Step 2: Failing test** — `tests/primitives/use-resize-observer.test.ts`:

```ts
import { test, expect, vi, beforeEach } from 'vitest';
import { observeContentHeight } from '../../src/primitives/use-resize-observer';

beforeEach(() => {
  // jsdom lacks ResizeObserver — stub it (H-N).
  const cbs: Array<(e: { contentRect: { height: number } }[]) => void> = [];
  vi.stubGlobal('ResizeObserver', class {
    cb: (e: unknown[]) => void;
    constructor(cb: (e: unknown[]) => void) { this.cb = cb; cbs.push(cb as never); }
    observe() {} disconnect() {}
    static emit(h: number) { cbs.forEach((c) => c([{ contentRect: { height: h } } as never])); }
  });
});

test('observeContentHeight reports height changes above the threshold only', () => {
  const el = document.createElement('div');
  const heights: number[] = [];
  const dispose = observeContentHeight(el, (h) => heights.push(h));
  (globalThis.ResizeObserver as unknown as { emit(h: number): void }).emit(100);
  (globalThis.ResizeObserver as unknown as { emit(h: number): void }).emit(100.5); // sub-threshold
  (globalThis.ResizeObserver as unknown as { emit(h: number): void }).emit(140);
  dispose();
  expect(heights).toEqual([100, 140]);
});
```

- [ ] **Step 3: Run → FAIL**.
- [ ] **Step 4: Implement** — `src/primitives/use-resize-observer.ts`:

```ts
/** Observe an element's content height; invoke `onHeight` when it changes by more than
 *  THRESHOLD px (hysteresis kills sub-pixel oscillation — H-J). Returns a disposer. */
const THRESHOLD = 1;
export function observeContentHeight(el: Element, onHeight: (height: number) => void): () => void {
  let last = -1;
  const ro = new ResizeObserver((entries) => {
    const h = entries[entries.length - 1]?.contentRect.height ?? el.getBoundingClientRect().height;
    if (last < 0 || Math.abs(h - last) > THRESHOLD) { last = h; onHeight(h); }
  });
  ro.observe(el);
  return () => ro.disconnect();
}
```

- [ ] **Step 5: Refactor `reasoning.tsx`** to use `observeContentHeight` for its height tracking (replace the inline `new ResizeObserver`), keeping the maxHeight-animation logic in the callback. Run `npx vitest run tests/components` (reasoning tests) → still PASS (no behavior change).
- [ ] **Step 6: Run** `npx vitest run tests/primitives/use-resize-observer.test.ts && npm run typecheck` → PASS.
- [ ] **Step 7: Commit** — `git add src/primitives/use-resize-observer.ts src/components/reasoning.tsx tests/primitives/use-resize-observer.test.ts && git commit -m "feat(primitives): shared use-resize-observer; reasoning.tsx consumes it"`

---

## Task 6: `provider-runtime.ts` — `createCardBridge` + `RemoteCardRenderer`

**Files:** Create `src/remote/provider-runtime.ts`; Test `tests/remote/provider-runtime.test.ts`. Depends on Tasks 1–5.

- [ ] **Step 1: Failing test** — `tests/remote/provider-runtime.test.ts` (jsdom; drive via `new MessageEvent` per H-N):

```ts
import { test, expect, vi, beforeEach } from 'vitest';
import { createCardBridge } from '../../src/remote/provider-runtime';
import { createPacker } from '../../src/remote/wire';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} constructor(_: unknown) {} });
});

function hostStub() {
  const sent: unknown[] = [];
  // The "host" is window.parent in the runtime; stub postMessage capture.
  vi.stubGlobal('parent', { postMessage: (f: unknown) => sent.push(f) } as unknown as Window);
  return sent;
}

test('bridge replies to hello with ready echoing the nonce + version, then renders', async () => {
  const sent = hostStub();
  const root = document.createElement('div');
  let mounted: { type: string } | null = null;
  const bridge = createCardBridge({
    root,
    renderers: [{ type: 'demo', mount: (r, env, host) => { mounted = { type: env.type }; host.emit({ kind: 'ready', cardId: env.id }); return () => {}; } }],
  });
  bridge.start();
  const pack = createPacker('1', 'NONCE');
  // host → hello (origin/source are honored by the runtime; jsdom uses MessageEvent fields)
  window.dispatchEvent(new MessageEvent('message', {
    data: pack({ dir: 'down', kind: 'hello', supportedVersions: ['1'] }),
    origin: 'https://host.example', source: window.parent as Window,
  }));
  // runtime should have replied ready with the nonce
  const ready = sent.map((f) => f as { message: { kind: string }; nonce: string }).find((f) => f.message.kind === 'ready');
  expect(ready?.nonce).toBe('NONCE');
  // render
  window.dispatchEvent(new MessageEvent('message', {
    data: pack({ dir: 'down', kind: 'render', envelope: { type: 'demo', id: 'c1', data: {} } }),
    origin: 'https://host.example', source: window.parent as Window,
  }));
  expect(mounted).toEqual({ type: 'demo' });
  bridge.stop();
});

test('runtime rejects frames whose source differs from the locked host window', () => {
  const sent = hostStub();
  const bridge = createCardBridge({ root: document.createElement('div'), renderers: [] });
  bridge.start();
  const pack = createPacker('1', 'N');
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'down', kind: 'hello', supportedVersions: ['1'] }), origin: 'https://host.example', source: window.parent as Window }));
  sent.length = 0;
  // a frame from a DIFFERENT source window must be ignored
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'down', kind: 'render', envelope: { type: 'x', id: 'c2', data: {} } }), origin: 'https://host.example', source: {} as Window }));
  expect(sent.length).toBe(0);
  bridge.stop();
});
```

- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — `src/remote/provider-runtime.ts`. Behavior (per spec H-A/H-B/H-D/H-E/H-J):
  - `start()` attaches a `message` listener.
  - On first valid `down` `hello` (`isCardWireFrame(data,'down')`): lock `event.source` (must be `window.parent`) + the host origin from `event.origin` + the bridge `nonce` from the frame; `negotiateVersion(supportedVersions, mine)`; build `packer = createPacker(negotiated, nonce)`; reply `ready{acceptedVersion, capabilities:{types}}` to the locked origin via `parent.postMessage(packer(...), lockedOrigin)`. If no common version → `fault{version-unsupported}` and stop.
  - Reject any later frame whose `event.source !== lockedSource` or `event.origin !== lockedOrigin` or `frame.nonce !== nonce` or `frame.version !== negotiated` (drop, `console.warn(redactFrame(...))` once).
  - On `context`: store the full `CardContext` (the runtime's `CardHost.context()` returns the latest).
  - On `render`: validate `envelope.data` via `card-validate` against the type's schema; pick the `RemoteCardRenderer` by `envelope.type` (unknown → render contract's unsupported placeholder + `event{error}`). Dispose any current card (same-id → renderer update path if present else dispose+remount; different id → dispose+clear+mount). Mount, passing a `CardHost` whose `emit` packs `{dir:'up',kind:'event',event}` and sends to the locked host. Wrap mount in try/catch → `fault{render-failed}` (non-reflective message).
  - Run `observeContentHeight(root, h => emit resize)` and emit `event{resize, cardId, height}`.
  - Emit `{dir:'up',kind:'focus-edge',edge}` from a focus-edge sentinel (optional in v1 if no focusables; wire the hook).
  - On `teardown`: dispose current card, stop observers.
  - `stop()`: remove listener, disconnect observers, dispose.
  - Export `RemoteCardRenderer` interface exactly as the spec's provider-runtime block.

(Write it as a single vanilla-DOM module; no SolidJS imports. Use `createPacker`, `isCardWireFrame`, `assertOrigin`, `redactFrame`, `negotiateVersion`, `hasPollutionKey`, `observeContentHeight`.)

- [ ] **Step 4: Run → PASS** (`npx vitest run tests/remote/provider-runtime.test.ts`) + `npm run typecheck`.
- [ ] **Step 5: Commit** — `git add src/remote/provider-runtime.ts tests/remote/provider-runtime.test.ts && git commit -m "feat(remote): provider iframe runtime (createCardBridge + RemoteCardRenderer)"`

---

## Task 7: `host-embed.ts` — `mountRemoteCard` + state machine

**Files:** Create `src/remote/host-embed.ts`; Test `tests/remote/host-embed.test.ts`. Depends on Tasks 1–4. Reuse `routeCardEvent` from `src/primitives/card-routing.ts`.

- [ ] **Step 1: Failing test** — `tests/remote/host-embed.test.ts` (jsdom; the iframe's `contentWindow` is mocked; drive inbound via `new MessageEvent` with `source` = that mock):

```ts
import { test, expect, vi, beforeEach } from 'vitest';
import { mountRemoteCard } from '../../src/remote/host-embed';
import { createPacker, isCardWireFrame } from '../../src/remote/wire';
import type { CardEvent } from '../../src/primitives/card-contract';

beforeEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

function setup() {
  // Stub the iframe so contentWindow is a known object we can use as event.source.
  const posted: unknown[] = [];
  const contentWindow = { postMessage: (f: unknown) => posted.push(f) };
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreate(tag);
    if (tag === 'iframe') Object.defineProperty(el, 'contentWindow', { value: contentWindow });
    return el;
  });
  return { posted, contentWindow };
}

test('handshake: sends hello on load, sends context+render after ready', async () => {
  const { posted, contentWindow } = setup();
  const events: CardEvent[] = [];
  const handle = mountRemoteCard({
    container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card',
    envelope: { type: 'form', id: 'f1', data: {} },
    context: { theme: { mode: 'light' }, locale: 'en' },
    policy: { onSubmit: (cardId, data) => events.push({ kind: 'submit', cardId, data }) },
  });
  const iframe = document.querySelector('iframe')!;
  iframe.dispatchEvent(new Event('load'));
  const hello = posted.map((f) => f as { message: { kind: string }; nonce: string }).find((f) => f.message.kind === 'hello');
  expect(hello).toBeTruthy();
  const nonce = hello!.nonce;
  // runtime replies ready
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  expect(posted.some((f) => (f as { message: { kind: string } }).message.kind === 'context')).toBe(true);
  expect(posted.some((f) => (f as { message: { kind: string } }).message.kind === 'render')).toBe(true);
  expect(handle.state()).toBe('open');
});

test('a submit event from the framed card routes through CardPolicy', async () => {
  const { posted, contentWindow } = setup();
  const got: Array<{ cardId: string; data: unknown }> = [];
  mountRemoteCard({
    container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card',
    envelope: { type: 'form', id: 'f1', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' },
    policy: { onSubmit: (cardId, data) => got.push({ cardId, data }) },
  });
  document.querySelector('iframe')!.dispatchEvent(new Event('load'));
  const nonce = (posted.find((f) => (f as { message: { kind: string } }).message.kind === 'hello') as { nonce: string }).nonce;
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'event', event: { kind: 'submit', cardId: 'f1', data: { ok: 1 } } }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  expect(got).toEqual([{ cardId: 'f1', data: { ok: 1 } }]);
});

test('a frame from the wrong source window is ignored', async () => {
  const { posted, contentWindow } = setup();
  const got: unknown[] = [];
  mountRemoteCard({ container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card', envelope: { type: 'form', id: 'f1', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' }, policy: { onSubmit: () => got.push(1) } });
  document.querySelector('iframe')!.dispatchEvent(new Event('load'));
  const nonce = (posted.find((f) => (f as { message: { kind: string } }).message.kind === 'hello') as { nonce: string }).nonce;
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'event', event: { kind: 'submit', cardId: 'f1', data: {} } }), origin: 'https://p.example', source: {} as Window }));
  expect(got.length).toBe(0);
});

test('same-origin providerOrigin throws (cross-origin precondition)', () => {
  setup();
  expect(() => mountRemoteCard({ container: document.body, providerOrigin: window.location.origin, src: window.location.origin + '/x', envelope: { type: 'form', id: 'f', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' } })).toThrow();
});
```

- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — `src/remote/host-embed.ts`. Behavior (spec H-A/H-C/H-D/H-E/H-F/H-G/H-O):
  - `mountRemoteCard(opts)`: call `assertCrossOrigin(src, providerOrigin, window.location.origin)` first (throws on violation). Mint `nonce = crypto.getRandomValues` → hex. Create `<iframe>` with `sandbox="allow-scripts allow-forms allow-same-origin"` (NO `allow-popups` — H-G), `referrerpolicy="no-referrer"`, `title="<envelope.title> — provided by <providerOrigin host>"`, `allow=""`. **Attach the `message` listener BEFORE setting `iframe.src`.** Append to `container`, then set `src`.
  - State machine `connecting|open|error|closed`. Pre-OPEN: buffer `update`/`updateContext` with latest-wins; flush `context`→`render` on entering `open`.
  - On iframe `load`: build `packer = createPacker('1', nonce)` (version provisional until ready); send `hello{supportedVersions:['1']}` to `providerOrigin`.
  - Inbound `message`: drop unless `event.origin === providerOrigin` AND `event.source === iframe.contentWindow` AND `isCardWireFrame(data,'up')` AND `data.nonce === nonce`. On `ready`: assert `acceptedVersion ∈ ['1']`; rebuild packer with negotiated version; mark `open`; flush buffer. On `event`: if `event.cardId !== currentEnvelope.id` drop; if `resize` → clamp to `maxHeight` and set `iframe.style.height` (fixed-point at max — H-J), do NOT route; `validateInboundEvent` (known kind + `!hasPollutionKey`) then `routeCardEvent(policy ?? {}, event)`. On `focus-edge` → move focus to next host-focusable, do NOT route. On `fault` → `policy.onError(currentEnvelope.id, \`[\${code}] \${message}\`)`, transition `error`, render inline fallback + Retry. `fault`/`timeout` while `connecting` → `error`, discard buffer.
  - Handshake timeout (5s) → `error` + inline fallback.
  - `RemoteCardHandle`: `updateContext(Partial)` (shallow top-level merge; `theme`/`a11y` wholesale-replace; always send a full resolved `CardContext` down), `update(envelope)`, `destroy()` (tombstone generation, best-effort `teardown` if open, remove listener/iframe/timers, idempotent), `state()`.
  - Log via `console.warn(redactFrame(...))`.
  - Export `mountRemoteCard`, `MountRemoteCardOptions`, `RemoteCardHandle`.

- [ ] **Step 4: Run → PASS** + typecheck.
- [ ] **Step 5: Commit** — `git add src/remote/host-embed.ts tests/remote/host-embed.test.ts && git commit -m "feat(remote): host embed SDK (mountRemoteCard + bridge state machine)"`

---

## Task 8: `src/remote/index.ts` + `provider.ts` + `src/index.ts` exports

**Files:** Create `src/remote/index.ts`, `src/remote/provider.ts`; Modify `src/index.ts`; Test `tests/remote/exports.test.ts`.

- [ ] **Step 1: Failing test** — `tests/remote/exports.test.ts`:

```ts
import { test, expect } from 'vitest';
import * as host from '../../src/remote/index';
import * as provider from '../../src/remote/provider';

test('host SDK surface', () => {
  expect(typeof host.mountRemoteCard).toBe('function');
});
test('provider surface (no host SDK)', () => {
  expect(typeof provider.createCardBridge).toBe('function');
  expect((provider as Record<string, unknown>).mountRemoteCard).toBeUndefined();
});
```

- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement**:
  - `src/remote/index.ts`: `export { mountRemoteCard } from './host-embed'; export type { MountRemoteCardOptions, RemoteCardHandle } from './host-embed';` and re-export wire/origin/version types consumers need.
  - `src/remote/provider.ts`: `export { createCardBridge } from './provider-runtime'; export type { RemoteCardRenderer, CardBridge } from './provider-runtime';`
  - `src/index.ts`: add `export { mountRemoteCard } from './remote/host-embed'; export type { MountRemoteCardOptions, RemoteCardHandle } from './remote/host-embed';`
- [ ] **Step 4: Run → PASS** + typecheck.
- [ ] **Step 5: Commit** — `git add src/remote/index.ts src/remote/provider.ts src/index.ts tests/remote/exports.test.ts && git commit -m "feat(remote): public host + provider entry points"`

---

## Task 9: `<kc-remote>` element

**Files:** Create `src/elements/remote.tsx`; Test `tests/elements/remote-element.test.tsx`. Follow the `defineWebComponent` pattern of `src/elements/confirm-card.tsx`.

- [ ] **Step 1: Read** `src/elements/confirm-card.tsx` for the facade pattern.
- [ ] **Step 2: Failing test** — `tests/elements/remote-element.test.tsx`:

```tsx
import { test, expect, afterEach } from 'vitest';
import '../../src/elements/remote';

afterEach(() => document.querySelectorAll('kc-remote').forEach((e) => e.remove()));

test('kc-remote registers', () => {
  expect(customElements.get('kc-remote')).toBeTruthy();
});

test('validates provider-origin: rejects "*" and http (non-localhost)', async () => {
  const el = document.createElement('kc-remote') as HTMLElement & { envelope: unknown };
  el.setAttribute('provider-origin', '*');
  el.setAttribute('src', 'https://p.example/card');
  el.envelope = { type: 'form', id: 'f1', data: {} };
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 0));
  // invalid provider-origin → inline error, no iframe mounted
  expect(el.shadowRoot?.querySelector('iframe')).toBeFalsy();
});
```

- [ ] **Step 3: Run → FAIL**.
- [ ] **Step 4: Implement** — `src/elements/remote.tsx`: a `defineWebComponent('kc-remote', …)` with props `providerOrigin` (attr `provider-origin`), `src` (attr), `envelope` (JS property), `policy?` (JS property). On mount, validate `providerOrigin` is a single absolute `https:` origin (or `http://localhost*` for dev) — else render inline error. Call `mountRemoteCard({ container: <shadow div>, ... })`. The host SDK already routes through `routeCardEvent`; for the "re-emit `kc-card`" path (H-K), wrap the policy so each validated routed event also dispatches a bubbling+composed `kc-card` CustomEvent via `emitCardEvent(element, event)` — validation (origin/source/nonce/schema) has already happened in `host-embed` before this point. `destroy()` on cleanup.
- [ ] **Step 5: Run → PASS** + typecheck.
- [ ] **Step 6: Commit** — `git add src/elements/remote.tsx tests/elements/remote-element.test.tsx && git commit -m "feat(remote): <kc-remote> element facade"`

---

## Task 10: Build & packaging — provider bundle + exports + devDeps

**Files:** Create `vite.config.provider.ts`; Modify `package.json`.

- [ ] **Step 1: Add devDeps** — `npm i -D concurrently http-server vite-plugin-dts@^4`.
- [ ] **Step 2: Create `vite.config.provider.ts`**:

```ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true, include: ['src/remote/**'] })],
  build: {
    emptyOutDir: false,            // do NOT clobber dist/kitn-chat.es.js (main runs first)
    lib: { entry: 'src/remote/provider.ts', formats: ['es'], fileName: () => 'kitn-chat-provider.es.js' },
    rollupOptions: { external: ['solid-js', 'solid-js/web'] },  // provider carries no SolidJS
  },
});
```

- [ ] **Step 3: Update `package.json`** — set `"build": "vite build --config vite.config.ts && vite build --config vite.config.provider.ts"`; add to `exports`: `"./provider": { "types": "./dist/kitn-chat-provider.d.ts", "default": "./dist/kitn-chat-provider.es.js" }`; add scripts `"dev:provider": "vite examples/remote-provider --port 6007 --strictPort"`, `"test:e2e": "playwright test"`.
- [ ] **Step 4: Verify** — `npm run build` → emits BOTH `dist/kitn-chat.es.js` and `dist/kitn-chat-provider.es.js` + `dist/kitn-chat-provider.d.ts`. Confirm: `ls dist/kitn-chat-provider.*`. Then `npm run typecheck`.
- [ ] **Step 5: Commit** — `git add vite.config.provider.ts package.json package-lock.json && git commit -m "build(remote): @kitn.ai/chat/provider subpath bundle + types"`

---

## Task 11: `examples/remote-provider/` mock provider (reference runtime)

**Files:** Create `examples/remote-provider/{index.html,provider-entry.ts,vite.config.ts}`.

- [ ] **Step 1: Create `examples/remote-provider/index.html`** — a minimal doc with `<div id="root"></div>`, `<script type="module" src="./provider-entry.ts"></script>`, and a `<meta>` documenting the provider's own CSP (`frame-ancestors http://localhost:6006`, `form-action 'self'`).
- [ ] **Step 2: Create `provider-entry.ts`** — import `createCardBridge` from the built provider bundle (or `../../src/remote/provider` for dev), register **two** `RemoteCardRenderer`s to demonstrate both interaction patterns, then `createCardBridge({root, renderers}).start()`:
  - **Interactive / data-collecting** — `type:'form'` mounts `<kc-form>` (from `@kitn.ai/chat/elements`), feeds `envelope.data`, listens for its `kc-card` `submit` and calls `host.emit({kind:'submit', cardId, data})`. (Represents the calendar/date-time-picker class: render inputs → user fills → emit.)
  - **Display-rich / self-contained** — `type:'info'` (a small "weather"-style card) renders a rich read-only view from `envelope.data` (e.g. a heading, a value, a few facts), is internally interactive (a details toggle) but **emits nothing beyond `ready`** — proving the no-round-trip pattern. The bridge still auto-sizes it via `resize`.
- [ ] **Step 3: Create `examples/remote-provider/vite.config.ts`** — trivial root config so `vite examples/remote-provider` serves it.
- [ ] **Step 4: Manual smoke** — `npm run build && npm run dev:provider` then open `http://localhost:6007` — confirm it loads without console errors (no host yet → it just waits for `hello`).
- [ ] **Step 5: Commit** — `git add examples/remote-provider && git commit -m "docs(remote): runnable mock-provider example (reference iframe runtime)"`

---

## Task 12: Cross-origin Playwright matrix + CI

**Files:** Create `playwright.config.ts`, `tests/e2e/remote-element.spec.ts`, `examples/remote-host/index.html` (host demo), `.github/workflows/test.yml`.

- [ ] **Step 1: Create `examples/remote-host/index.html`** — a host page that imports `mountRemoteCard` and mounts a remote `form` card pointing at `http://localhost:6007`, logging routed events to a `<pre id="log">`. Served by Storybook static or its own vite root on `:6006`.
- [ ] **Step 2: Create `playwright.config.ts`**:

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  webServer: [
    { command: 'npm run build-storybook && ./node_modules/.bin/http-server storybook-static -p 6006', url: 'http://localhost:6006', reuseExistingServer: !process.env.CI, timeout: 120_000 },
    { command: 'npm run dev:provider', url: 'http://localhost:6007', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
```

- [ ] **Step 3: Create `tests/e2e/remote-element.spec.ts`** — the matrix (real two-origin): handshake completes; a `<kc-form>` submit inside the `:6007` frame arrives at the host's `onSubmit` (assert via the host log); **measured** auto-height (host `iframe.clientHeight` changes after a field toggles the card taller — `page.evaluate`); theme toggle re-themes the framed card (measured background); a wrong-origin `postMessage` injected into the host is ignored (host log unchanged); bad `src` → inline fallback + Retry. Use `page.frameLocator('iframe')` for the cross-origin frame.
- [ ] **Step 4: Run** — `npx playwright install --with-deps chromium` then `npm run test:e2e` → all pass.
- [ ] **Step 5: Create `.github/workflows/test.yml`** — a CI job running `npm ci`, `npm run build`, `npm run typecheck`, `npm test`, `npm run test:react`, `npm run test:storybook`, `npx playwright install --with-deps chromium`, `npm run test:e2e`.
- [ ] **Step 6: Commit** — `git add playwright.config.ts tests/e2e/ examples/remote-host .github/workflows/test.yml && git commit -m "test(remote): cross-origin Playwright matrix + CI workflow"`

---

## Task 13: Storybook stories (source-visible)

**Files:** Create `src/elements/remote.stories.tsx` (+ an `Examples/Remote cards` MDX note if useful).

- [ ] **Step 1: Read** `src/elements/choice.stories.tsx` for the element-story pattern.
- [ ] **Step 2: Implement stories** — a `Web Components/kc-remote` (or `Generative UI/Remote`) title. Stories (same-origin provider served from Storybook `staticDirs` for the visual demos; the real cross-origin security matrix is the Playwright suite — H-L):
  1. **Remote form (happy path)** — frame renders `<kc-form>`; routed `submit` logged in an actions panel; show the `CardEnvelope` JSON beside the frame.
  2. **Auto-height** — a card that grows/shrinks; the iframe visibly resizes.
  3. **Theme push** — the Storybook light/dark toolbar re-pushes `context`; framed card re-themes.
  4. **Display-rich / self-contained** — the `type:'info'` "weather"-style card: renders a rich read-only view, internally interactive, emits no data (proves the zero-round-trip pattern); the iframe auto-sizes.
  5. **Failure: bad providerOrigin** — inline fallback + Retry.
  Add `examples/remote-provider/` to `.storybook/main.ts` `staticDirs` so the same-origin demo provider is served at `/remote-provider/`.
- [ ] **Step 3: Run** — `npm run test:storybook` → PASS, 0 axe violations (axe scoped to host; the story config uses `a11y: { context: { exclude: [['iframe']] } }` — H-L).
- [ ] **Step 4: Commit** — `git add src/elements/remote.stories.tsx .storybook/main.ts && git commit -m "docs(stories): kc-remote stories (happy path, auto-height, theme, failure)"`

---

## Task 14: Docs + full gate

**Files:** Modify the Generative UI Overview MDX; regenerate meta.

- [ ] **Step 1: Locate the Overview** — `grep -rl "Generative UI" src --include=*.mdx`.
- [ ] **Step 2: Add a "Remote cards" subsection** — how to register a provider-served card via `<kc-remote>` (standalone) or `mountRemoteCard`, the `providerOrigin`/`src`/`envelope` inputs, the security model in one paragraph (origin+source+nonce pinning; short-lived `authToken`; host `frame-ancestors` obligation), and a pointer to `examples/remote-provider/` as the reference runtime. Include a short code sample using `mountRemoteCard` + the `applyResolution` round-trip.
- [ ] **Step 3: Full gate** — `npm run build && npm run typecheck && npm run test && npm run test:react && npm run test:storybook && npm run test:e2e`. All green; `git add` regenerated artifacts (`element-meta.json`, `element-types.d.ts`, `frameworks/react/index.tsx`, `llms*.txt`, `docs/web-components.md`).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "docs(remote): document remote cards + register/usage; regen meta"` (do NOT add `docs/notes.md`).
- [ ] **Step 5: Open the PR** — `git push -u origin feat/iframe-transport`; open a PR to `main` titled `feat(remote): AG-UI iframe transport (host SDK + provider runtime + kc-remote)`, summarizing the feature + the security model + the new `@kitn.ai/chat/provider` subpath. **Call out** that it adds `src/remote/`, a second build entry, and a Playwright/CI setup. Merge via REST ([[gh-cli-projects-classic-bug]]). Pre-1.0 → release-please bumps the minor.

---

## Self-Review

**Spec coverage** (against the addendum + body):
- Wire types/packer/guard (H-B/H-C/H-D) → Task 1. Version (H-C) → Task 2. Origin guards + cross-origin precondition (H-F) + redaction allowlist (H-H/H-P) → Task 3. Direction+schema+proto-pollution (H-D) → Task 4. Resize primitive (H-J, Resolved #1, H-M) → Task 5. Provider runtime + RemoteCardRenderer (H-A/H-E/H-J/H-K) → Task 6. Host SDK + state machine + buffer + nonce/source pin + cross-origin + resize/focus-edge intercept + fault cardId (H-A/H-C/H-E/H-F/H-G/H-O) → Task 7. Exports + provider subpath surface → Task 8. `<kc-remote>` scope (H-K) → Task 9. Build/exports/devDeps + `vite-plugin-dts@^4` + `emptyOutDir:false` (H-N) → Task 10. Mock provider example → Task 11. Cross-origin Playwright matrix + jsdom patterns + CI (H-N, H-L) → Task 12. Stories + axe iframe-exclude (H-L) → Task 13. Docs + gate → Task 14. ✓ all addendum items mapped.
- Security model (origin/source/nonce, sandbox sans popups, frame-ancestors, send-prompt/open via `routeCardEvent`) → Tasks 3/6/7/9; the `routeCardEvent` reuse means send-prompt downgrade + open scheme-validation come for free (verify in Task 7).

**Placeholder scan:** Tasks 6 and 7 describe the runtime/host behavior as a bulleted contract rather than full literal code (the modules are large stateful vanilla-DOM files); each bullet maps to a spec item + has concrete tests that pin behavior. This is intentional for the two big stateful modules — the tests are the executable spec. All pure modules (1–5, 8) have complete code. No TBD/TODO.

**Type consistency:** `createPacker(version,nonce)`, `isCardWireFrame(data,dir)`, `RemoteCardRenderer`, `mountRemoteCard`/`RemoteCardHandle`, `createCardBridge`/`CardBridge`, `observeContentHeight`, `assertCrossOrigin`, `redactFrame`, `hasPollutionKey`, `isKnownEventKind` are used consistently across tasks and match the spec's canonical names. Verbs `submit`/`action` match the renamed contract. `CardEventKind` set in Task 4 flagged to reconcile against the contract source.
