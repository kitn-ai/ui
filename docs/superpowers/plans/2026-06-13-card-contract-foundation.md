# Card Contract Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frozen Card Contract foundation — the types, the shared validator, the native transport (emit/route/provider), and the schema artifacts — that every card and the remote transport import.

**Architecture:** Pure types in `card-contract.ts`; a lean JSON-Schema validator in `card-validate.ts`; framework-agnostic emit/route helpers in `card-routing.ts`; a SolidJS `CardProvider`/`useCardHost` context in `card-host.tsx`; shipped `*.schema.json` artifacts copied to `dist/schemas/`. No card components here — this is the spine they build on.

**Tech Stack:** TypeScript, SolidJS (context), Vitest (`@solidjs/testing-library` for the provider), JSON Schema (draft 2020-12), Node build script for schema copy.

**Spec:** `docs/superpowers/specs/2026-06-13-card-contract-design.md`

**Project norms (apply to EVERY task):**
- SolidJS: **never destructure props** — always `props.x`.
- Gate: `npm run build` && `npm run typecheck` && `npm test` && `npm run test:react`. The suite is currently **fully green (432/432)** — there is NO baseline failure anymore; any failure is yours to fix.
- These are internal-but-published foundation modules; export the public surface from `src/index.ts`.
- New code lives in `src/primitives/` (contract foundation). Cards (later specs) live in `src/cards/`.

---

### Task 1: Contract types (`card-contract.ts`)

**Files:**
- Create: `src/primitives/card-contract.ts`
- Test: `tests/primitives/card-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/primitives/card-contract.test.ts
import { expect, test } from 'vitest';
import {
  CARD_CONTRACT_VERSION,
  type CardEnvelope,
  type CardContext,
  type CardEvent,
  type CardHost,
  type CardPolicy,
} from '../../src/primitives/card-contract';

test('contract version is the frozen value', () => {
  expect(CARD_CONTRACT_VERSION).toBe('1');
});

test('envelope + event shapes are usable as typed values', () => {
  const env: CardEnvelope<'form', { x: number }> = { type: 'form', id: 'c1', data: { x: 1 }, title: 'T' };
  expect(env.type).toBe('form');
  const ev: CardEvent = { kind: 'submit-data', cardId: 'c1', data: { ok: true } };
  expect(ev.kind).toBe('submit-data');
  const ctx: CardContext = { theme: { mode: 'dark' }, locale: 'en', a11y: { reducedMotion: true } };
  expect(ctx.a11y?.reducedMotion).toBe(true);
  const host: CardHost = { context: () => ctx, emit: () => {} };
  expect(host.context().theme.mode).toBe('dark');
  const policy: CardPolicy = { maxSendPromptMode: 'compose' };
  expect(policy.maxSendPromptMode).toBe('compose');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-contract.test.ts`
Expected: FAIL — cannot resolve `card-contract`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/primitives/card-contract.ts
// The frozen Card Contract: the one typed contract every card speaks across both
// transports (native <kc-*> + remote iframe). Pure types only — no runtime, no DOM.
// See docs/superpowers/specs/2026-06-13-card-contract-design.md.

/** Bumped on any BREAKING change to the shapes below. Additive/optional fields do not bump it. */
export const CARD_CONTRACT_VERSION = '1' as const;

/** A card the agent/server asks the chat to render. `data` conforms to the card
 *  type's own published JSON Schema (one schema per `type`). */
export interface CardEnvelope<TType extends string = string, TData = unknown> {
  type: TType;
  id: string;
  data: TData;
  title?: string;
}

/** Context the host pushes to every card; updated when it changes (theme, etc.). */
export interface CardContext {
  theme: { mode: 'light' | 'dark'; tokens?: Record<string, string> };
  locale: string;
  conversationId?: string;
  /** Remote (iframe) cards only: short-lived signed token. Never long-lived. */
  authToken?: string;
  /** Host-resolved a11y prefs (e.g. reduced-motion, which doesn't cross the iframe). */
  a11y?: { reducedMotion?: boolean };
}

/** Everything a card can ask the host to do. The host authorizes + routes each. */
export type CardEvent =
  | { kind: 'ready'; cardId: string }
  | { kind: 'submit-data'; cardId: string; data: unknown }
  | { kind: 'action'; cardId: string; action: string; payload?: unknown }
  | { kind: 'send-prompt'; cardId: string; text: string; mode?: 'compose' | 'send'; context?: unknown }
  | { kind: 'open'; cardId: string; url: string; target?: 'tab' | 'artifact' }
  | { kind: 'resize'; cardId: string; height: number }
  | { kind: 'state'; cardId: string; patch: unknown }
  | { kind: 'dismiss'; cardId: string }
  | { kind: 'error'; cardId: string; message: string };

export type CardEventKind = CardEvent['kind'];

/** What every card is handed (via native context or the iframe bridge). */
export interface CardHost {
  context(): CardContext;
  emit(event: CardEvent): void;
}

/** How the host routes each verb. Consumers supply handlers; defaults applied otherwise. */
export interface CardPolicy {
  onSubmitData?: (cardId: string, data: unknown) => void;
  onAction?: (cardId: string, action: string, payload?: unknown) => void;
  onSendPrompt?: (text: string, opts: { mode: 'compose' | 'send'; context?: unknown }) => void;
  onOpen?: (url: string, target: 'tab' | 'artifact') => void;
  onState?: (cardId: string, patch: unknown) => void;
  onDismiss?: (cardId: string) => void;
  onError?: (cardId: string, message: string) => void;
  /** Cap on send-prompt: 'compose' (default) forbids silent sends. 'send' to allow. */
  maxSendPromptMode?: 'compose' | 'send';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/card-contract.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/card-contract.ts tests/primitives/card-contract.test.ts
git commit -m "feat(card-contract): frozen contract types + version"
```

---

### Task 2: Lean validator (`card-validate.ts`)

**Files:**
- Create: `src/primitives/card-validate.ts`
- Test: `tests/primitives/card-validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/primitives/card-validate.test.ts
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const ok = (s: JsonSchema, v: unknown) => validateAgainstSchema(s, v).valid;

test('type checks', () => {
  expect(ok({ type: 'string' }, 'x')).toBe(true);
  expect(ok({ type: 'string' }, 1)).toBe(false);
  expect(ok({ type: 'integer' }, 2)).toBe(true);
  expect(ok({ type: 'integer' }, 2.5)).toBe(false);
  expect(ok({ type: 'number' }, 2.5)).toBe(true);
  expect(ok({ type: 'boolean' }, true)).toBe(true);
  expect(ok({ type: 'array' }, [])).toBe(true);
  expect(ok({ type: 'object' }, {})).toBe(true);
});

test('enum + const', () => {
  expect(ok({ enum: ['a', 'b'] }, 'a')).toBe(true);
  expect(ok({ enum: ['a', 'b'] }, 'c')).toBe(false);
  expect(ok({ const: true }, true)).toBe(true);
  expect(ok({ const: true }, false)).toBe(false);
});

test('object required + properties', () => {
  const s: JsonSchema = { type: 'object', required: ['a'], properties: { a: { type: 'string' }, n: { type: 'integer' } } };
  expect(ok(s, { a: 'x' })).toBe(true);
  expect(ok(s, { n: 1 })).toBe(false);          // missing required a
  expect(ok(s, { a: 'x', n: 1.5 })).toBe(false); // n not integer
});

test('number bounds + string length + pattern', () => {
  expect(ok({ type: 'number', minimum: 1, maximum: 5 }, 5)).toBe(true);
  expect(ok({ type: 'number', minimum: 1, maximum: 5 }, 6)).toBe(false);
  expect(ok({ type: 'number', exclusiveMaximum: 5 }, 5)).toBe(false);
  expect(ok({ type: 'string', minLength: 2, maxLength: 3 }, 'ab')).toBe(true);
  expect(ok({ type: 'string', minLength: 2 }, 'a')).toBe(false);
  expect(ok({ type: 'string', pattern: '^[a-z]+$' }, 'abc')).toBe(true);
  expect(ok({ type: 'string', pattern: '^[a-z]+$' }, 'AB')).toBe(false);
});

test('array items + minItems + uniqueItems', () => {
  expect(ok({ type: 'array', items: { type: 'string' } }, ['a', 'b'])).toBe(true);
  expect(ok({ type: 'array', items: { type: 'string' } }, ['a', 1])).toBe(false);
  expect(ok({ type: 'array', minItems: 1 }, [])).toBe(false);
  expect(ok({ type: 'array', uniqueItems: true }, ['a', 'a'])).toBe(false);
});

test('x-kc-* keywords are ignored (not treated as constraints)', () => {
  expect(ok({ type: 'string', 'x-kc-widget': 'rating' } as JsonSchema, 'x')).toBe(true);
});

test('errors are reported with paths', () => {
  const r = validateAgainstSchema(
    { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
    { a: 1 },
  );
  expect(r.valid).toBe(false);
  expect(r.errors.some((e) => e.includes('a'))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-validate.test.ts`
Expected: FAIL — cannot resolve `card-validate`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/primitives/card-validate.ts
// The single shared lean JSON-Schema validator the contract mandates. Covers the
// subset cards use; `x-*` keywords (incl. x-kc-*) are ignored. No ajv. Used at
// every boundary (incoming card data, outgoing payloads) by cards + both transports.

export interface JsonSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minimum?: number; maximum?: number;
  exclusiveMinimum?: number; exclusiveMaximum?: number;
  minLength?: number; maxLength?: number;
  pattern?: string;
  minItems?: number; maxItems?: number;
  uniqueItems?: boolean;
  // x-* keywords (e.g. x-kc-widget) are allowed and ignored.
  [key: `x-${string}`]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function matchesType(v: unknown, t: NonNullable<JsonSchema['type']>): boolean {
  switch (t) {
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'array': return Array.isArray(v);
    case 'null': return v === null;
    case 'object': return typeOf(v) === 'object';
    default: return typeof v === t;
  }
}

function walk(schema: JsonSchema, value: unknown, path: string, errors: string[]): void {
  const at = path || '(root)';
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${at}: expected ${schema.type}, got ${typeOf(value)}`);
    return; // type wrong → downstream checks are meaningless
  }
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${at}: must equal const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${at}: must be one of ${JSON.stringify(schema.enum)}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: > maximum ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${at}: <= exclusiveMinimum`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errors.push(`${at}: >= exclusiveMaximum`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at}: shorter than minLength ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at}: longer than maxLength ${schema.maxLength}`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) errors.push(`${at}: does not match pattern`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: fewer than minItems ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: more than maxItems ${schema.maxItems}`);
    if (schema.uniqueItems) {
      const seen = new Set(value.map((v) => JSON.stringify(v)));
      if (seen.size !== value.length) errors.push(`${at}: items not unique`);
    }
    if (schema.items) value.forEach((v, i) => walk(schema.items!, v, `${at}[${i}]`, errors));
  }
  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in obj) || obj[key] === undefined) errors.push(`${at}.${key}: required`);
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in obj && obj[key] !== undefined) walk(sub, obj[key], `${at}.${key}`, errors);
      }
    }
  }
}

/** Validate `value` against the lean JSON-Schema subset. */
export function validateAgainstSchema(schema: JsonSchema, value: unknown): ValidationResult {
  const errors: string[] = [];
  walk(schema, value, '', errors);
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/card-validate.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/card-validate.ts tests/primitives/card-validate.test.ts
git commit -m "feat(card-contract): shared lean JSON-Schema validator"
```

---

### Task 3: Emit + route helpers (`card-routing.ts`)

**Files:**
- Create: `src/primitives/card-routing.ts`
- Test: `tests/primitives/card-routing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/primitives/card-routing.test.ts
import { afterEach, expect, test, vi } from 'vitest';
import {
  CARD_EVENT_NAME,
  emitCardEvent,
  routeCardEvent,
  listenForCardEvents,
} from '../../src/primitives/card-routing';
import type { CardPolicy } from '../../src/primitives/card-contract';

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

test('emitCardEvent dispatches a bubbling, composed kc-card event', () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const seen = vi.fn();
  document.addEventListener(CARD_EVENT_NAME, (e) => seen((e as CustomEvent).detail));
  emitCardEvent(el, { kind: 'ready', cardId: 'c1' });
  expect(seen).toHaveBeenCalledWith({ kind: 'ready', cardId: 'c1' });
});

test('routeCardEvent dispatches verbs to handlers', () => {
  const policy: CardPolicy = { onSubmitData: vi.fn(), onAction: vi.fn() };
  routeCardEvent(policy, { kind: 'submit-data', cardId: 'c1', data: { a: 1 } });
  expect(policy.onSubmitData).toHaveBeenCalledWith('c1', { a: 1 });
  routeCardEvent(policy, { kind: 'action', cardId: 'c1', action: 'approve', payload: 7 });
  expect(policy.onAction).toHaveBeenCalledWith('c1', 'approve', 7);
});

test('send-prompt downgrades send→compose unless opted in', () => {
  const onSendPrompt = vi.fn();
  routeCardEvent({ onSendPrompt }, { kind: 'send-prompt', cardId: 'c1', text: 'hi', mode: 'send' });
  expect(onSendPrompt).toHaveBeenCalledWith('hi', { mode: 'compose', context: undefined });
  onSendPrompt.mockClear();
  routeCardEvent({ onSendPrompt, maxSendPromptMode: 'send' }, { kind: 'send-prompt', cardId: 'c1', text: 'hi', mode: 'send' });
  expect(onSendPrompt).toHaveBeenCalledWith('hi', { mode: 'send', context: undefined });
});

test('open rejects unsafe schemes and surfaces an error', () => {
  const onOpen = vi.fn(); const onError = vi.fn();
  routeCardEvent({ onOpen, onError }, { kind: 'open', cardId: 'c1', url: 'javascript:alert(1)' });
  expect(onOpen).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalled();
  routeCardEvent({ onOpen, onError }, { kind: 'open', cardId: 'c1', url: 'https://x.com', target: 'tab' });
  expect(onOpen).toHaveBeenCalledWith('https://x.com', 'tab');
});

test('missing handler is a no-op + warns, never throws', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(() => routeCardEvent({}, { kind: 'dismiss', cardId: 'c1' })).not.toThrow();
  expect(warn).toHaveBeenCalled();
});

test('listenForCardEvents routes bubbling events through policy + unsubscribes', () => {
  const onAction = vi.fn();
  const off = listenForCardEvents(document, { onAction });
  const el = document.createElement('div'); document.body.appendChild(el);
  emitCardEvent(el, { kind: 'action', cardId: 'c1', action: 'go' });
  expect(onAction).toHaveBeenCalledWith('c1', 'go', undefined);
  off();
  emitCardEvent(el, { kind: 'action', cardId: 'c1', action: 'again' });
  expect(onAction).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-routing.test.ts`
Expected: FAIL — cannot resolve `card-routing`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/primitives/card-routing.ts
// Framework-agnostic card-event plumbing: the bubbling kc-card emitter, the single
// policy router (used by BOTH the native listener and the remote transport), and a
// host-side listener helper for the bare-element path.
import type { CardEvent, CardPolicy } from './card-contract';

/** The single contract event name. */
export const CARD_EVENT_NAME = 'kc-card';

/** Dispatch a CardEvent as the bubbling, composed `kc-card` event a host listener
 *  routes. NB: this is deliberately different from defineWebComponent's built-in
 *  non-bubbling dispatch. */
export function emitCardEvent(element: HTMLElement, event: CardEvent): void {
  element.dispatchEvent(
    new CustomEvent<CardEvent>(CARD_EVENT_NAME, { detail: event, bubbles: true, composed: true }),
  );
}

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];
function isSafeUrl(url: string): boolean {
  try { return SAFE_SCHEMES.includes(new URL(url, 'http://_invalid_base').protocol); } catch { return false; }
}
function warnNoHandler(kind: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[kc-card] no policy handler for "${kind}"`);
}

/** Apply the contract's policy to one event. The ONE place routing lives. */
export function routeCardEvent(policy: CardPolicy | undefined, event: CardEvent): void {
  const p: CardPolicy = policy ?? {};
  switch (event.kind) {
    case 'ready':
      break; // lifecycle; host may react via its own listener
    case 'submit-data':
      p.onSubmitData ? p.onSubmitData(event.cardId, event.data) : warnNoHandler('submit-data');
      break;
    case 'action':
      p.onAction ? p.onAction(event.cardId, event.action, event.payload) : warnNoHandler('action');
      break;
    case 'send-prompt': {
      const requested = event.mode ?? 'compose';
      const mode = p.maxSendPromptMode === 'send' ? requested : 'compose';
      p.onSendPrompt ? p.onSendPrompt(event.text, { mode, context: event.context }) : warnNoHandler('send-prompt');
      break;
    }
    case 'open': {
      if (!isSafeUrl(event.url)) {
        p.onError ? p.onError(event.cardId, `Blocked unsafe url: ${event.url}`) : warnNoHandler('open(unsafe)');
        break;
      }
      const target = event.target ?? 'tab';
      if (p.onOpen) p.onOpen(event.url, target);
      else if (typeof window !== 'undefined') window.open(event.url, '_blank', 'noopener,noreferrer');
      break;
    }
    case 'state':
      p.onState ? p.onState(event.cardId, event.patch) : warnNoHandler('state');
      break;
    case 'dismiss':
      p.onDismiss ? p.onDismiss(event.cardId) : warnNoHandler('dismiss');
      break;
    case 'error':
      p.onError ? p.onError(event.cardId, event.message) : warnNoHandler('error');
      break;
    case 'resize':
      break; // transport plumbing (iframe height); not an app-policy concern natively
  }
}

/** Attach a host-level `kc-card` listener that routes every bubbling card event
 *  through `policy`. Returns an unsubscribe fn. For the bare-element path. */
export function listenForCardEvents(
  root: HTMLElement | Document,
  policy: CardPolicy,
): () => void {
  const handler = (e: Event) => routeCardEvent(policy, (e as CustomEvent<CardEvent>).detail);
  root.addEventListener(CARD_EVENT_NAME, handler as EventListener);
  return () => root.removeEventListener(CARD_EVENT_NAME, handler as EventListener);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/card-routing.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/card-routing.ts tests/primitives/card-routing.test.ts
git commit -m "feat(card-contract): emitCardEvent + routeCardEvent + listener"
```

---

### Task 4: Native Solid provider (`card-host.tsx`)

**Files:**
- Create: `src/primitives/card-host.tsx`
- Test: `tests/primitives/card-host.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/primitives/card-host.test.tsx
import { render } from '@solidjs/testing-library';
import { expect, test, vi } from 'vitest';
import { CardProvider, useCardHost } from '../../src/primitives/card-host';
import type { CardContext } from '../../src/primitives/card-contract';

test('useCardHost returns undefined with no provider', () => {
  let host: ReturnType<typeof useCardHost>;
  function Probe() { host = useCardHost(); return <span>x</span>; }
  render(() => <Probe />);
  expect(host).toBeUndefined();
});

test('CardProvider exposes context() and emit() routes through policy', () => {
  const onAction = vi.fn();
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  let host: ReturnType<typeof useCardHost>;
  function Probe() { host = useCardHost(); return <span>x</span>; }
  render(() => (
    <CardProvider context={ctx} policy={{ onAction }}>
      <Probe />
    </CardProvider>
  ));
  expect(host!.context().theme.mode).toBe('light');
  host!.emit({ kind: 'action', cardId: 'c1', action: 'go' });
  expect(onAction).toHaveBeenCalledWith('c1', 'go', undefined);
});

test('CardProvider accepts a reactive context getter', () => {
  let host: ReturnType<typeof useCardHost>;
  function Probe() { host = useCardHost(); return <span>x</span>; }
  render(() => (
    <CardProvider context={() => ({ theme: { mode: 'dark' as const }, locale: 'fr' })}>
      <Probe />
    </CardProvider>
  ));
  expect(host!.context().locale).toBe('fr');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-host.test.tsx`
Expected: FAIL — cannot resolve `card-host`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/primitives/card-host.tsx
// The native transport: a Solid context exposing a CardHost (context() + emit()).
// emit() routes through the contract policy via the shared routeCardEvent. Cards
// inside <kc-chat>/<CardProvider> use this; bare cards fall back to the bubbling
// kc-card event (see card-routing.listenForCardEvents).
import { createContext, useContext, type JSX } from 'solid-js';
import type { CardContext, CardEvent, CardHost, CardPolicy } from './card-contract';
import { routeCardEvent } from './card-routing';

const CardHostContext = createContext<CardHost>();

export interface CardProviderProps {
  /** Ambient context, static or a reactive getter. */
  context: CardContext | (() => CardContext);
  /** Routing policy applied to every emitted event. */
  policy?: CardPolicy;
  children: JSX.Element;
}

export function CardProvider(props: CardProviderProps): JSX.Element {
  // Never destructure props (Solid norm). Resolve context lazily so a getter stays reactive.
  const host: CardHost = {
    context: () =>
      typeof props.context === 'function'
        ? (props.context as () => CardContext)()
        : props.context,
    emit: (event: CardEvent) => routeCardEvent(props.policy, event),
  };
  return <CardHostContext.Provider value={host}>{props.children}</CardHostContext.Provider>;
}

/** Read the current CardHost. `undefined` when no provider is present (bare card). */
export function useCardHost(): CardHost | undefined {
  return useContext(CardHostContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/card-host.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/primitives/card-host.tsx tests/primitives/card-host.test.tsx
git commit -m "feat(card-contract): CardProvider + useCardHost native transport"
```

---

### Task 5: Schema artifacts + build copy to `dist/schemas/`

**Files:**
- Create: `src/primitives/card-schemas/card-envelope.schema.json`
- Create: `src/primitives/card-schemas/card-event.schema.json`
- Create: `scripts/copy-card-schemas.mjs`
- Modify: `package.json` (add `build:schemas`, chain into `postbuild`)
- Test: `tests/primitives/card-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/primitives/card-schemas.test.ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateAgainstSchema, type JsonSchema } from '../../src/primitives/card-validate';

const load = (name: string): JsonSchema =>
  JSON.parse(readFileSync(`src/primitives/card-schemas/${name}`, 'utf-8'));

test('card-envelope schema parses + validates a good/bad envelope', () => {
  const s = load('card-envelope.schema.json');
  expect(validateAgainstSchema(s, { type: 'form', id: 'c1', data: {} }).valid).toBe(true);
  expect(validateAgainstSchema(s, { id: 'c1', data: {} }).valid).toBe(false); // missing type
});

test('card-event schema parses + validates a good/bad event', () => {
  const s = load('card-event.schema.json');
  expect(validateAgainstSchema(s, { kind: 'ready', cardId: 'c1' }).valid).toBe(true);
  expect(validateAgainstSchema(s, { cardId: 'c1' }).valid).toBe(false); // missing kind
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-schemas.test.ts`
Expected: FAIL — schema files don't exist.

- [ ] **Step 3: Write the schemas + copy script + wire the build**

Create `src/primitives/card-schemas/card-envelope.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/card-envelope.schema.json",
  "title": "CardEnvelope",
  "description": "A card the agent/server asks the chat to render. `data` validates against the per-type schema.",
  "type": "object",
  "required": ["type", "id", "data"],
  "properties": {
    "type": { "type": "string", "minLength": 1 },
    "id": { "type": "string", "minLength": 1 },
    "data": {},
    "title": { "type": "string" }
  }
}
```

Create `src/primitives/card-schemas/card-event.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kitn.ai/schemas/card/card-event.schema.json",
  "title": "CardEvent",
  "description": "An event a card emits up to the host. `kind` discriminates the payload.",
  "type": "object",
  "required": ["kind"],
  "properties": {
    "kind": { "enum": ["ready", "submit-data", "action", "send-prompt", "open", "resize", "state", "dismiss", "error"] },
    "cardId": { "type": "string" }
  }
}
```

Create `scripts/copy-card-schemas.mjs`:

```js
// Copy the published card JSON-Schema artifacts to dist/schemas/ so backends in any
// language can fetch/validate against the same shapes the kit uses.
import { mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src/primitives/card-schemas';
const OUT = 'dist/schemas';

mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => f.endsWith('.schema.json'));
for (const f of files) copyFileSync(join(SRC, f), join(OUT, f));
console.log(`✓ dist/schemas — ${files.length} card schema(s)`);
```

Modify `package.json` scripts — add `build:schemas` and chain it into `postbuild` (which currently is `npm run build:theme && npm run build:api`):

```jsonc
"build:schemas": "node scripts/copy-card-schemas.mjs",
"postbuild": "npm run build:theme && npm run build:api && npm run build:schemas",
```

- [ ] **Step 4: Run test + build to verify**

Run: `npx vitest run tests/primitives/card-schemas.test.ts`
Expected: PASS (2 tests).
Run: `npm run build && ls dist/schemas`
Expected: build OK; `dist/schemas` lists `card-envelope.schema.json` + `card-event.schema.json`.

- [ ] **Step 5: Commit**

```bash
git add src/primitives/card-schemas scripts/copy-card-schemas.mjs package.json tests/primitives/card-schemas.test.ts
git commit -m "feat(card-contract): ship envelope/event schemas to dist/schemas"
```

---

### Task 6: Public barrel exports + full gate

**Files:**
- Modify: `src/index.ts` (after the `configurePdfPreview` exports added earlier)
- Test: `tests/primitives/card-contract-exports.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/primitives/card-contract-exports.test.ts
import { expect, test } from 'vitest';
import {
  CARD_CONTRACT_VERSION,
  CARD_EVENT_NAME,
  CardProvider,
  useCardHost,
  emitCardEvent,
  routeCardEvent,
  listenForCardEvents,
  validateAgainstSchema,
} from '../../src/index';

test('contract foundation is exported from the public barrel', () => {
  expect(CARD_CONTRACT_VERSION).toBe('1');
  expect(CARD_EVENT_NAME).toBe('kc-card');
  expect(typeof CardProvider).toBe('function');
  expect(typeof useCardHost).toBe('function');
  expect(typeof emitCardEvent).toBe('function');
  expect(typeof routeCardEvent).toBe('function');
  expect(typeof listenForCardEvents).toBe('function');
  expect(typeof validateAgainstSchema).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/primitives/card-contract-exports.test.ts`
Expected: FAIL — symbols not exported from `src/index.ts`.

- [ ] **Step 3: Add the exports** to `src/index.ts` (immediately after the `configurePdfPreview` / `PdfPreviewOptions` export lines added by the PDF feature):

```ts
// Card Contract (generative-UI foundation)
export { CARD_CONTRACT_VERSION } from './primitives/card-contract';
export type {
  CardEnvelope, CardContext, CardEvent, CardEventKind, CardHost, CardPolicy,
} from './primitives/card-contract';
export { CardProvider, useCardHost } from './primitives/card-host';
export type { CardProviderProps } from './primitives/card-host';
export { CARD_EVENT_NAME, emitCardEvent, routeCardEvent, listenForCardEvents } from './primitives/card-routing';
export { validateAgainstSchema } from './primitives/card-validate';
export type { JsonSchema, ValidationResult } from './primitives/card-validate';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/primitives/card-contract-exports.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the FULL gate**

Run: `npm run build && npm run typecheck && npm test && npm run test:react`
Expected: build OK; typecheck clean; `npm test` **fully green (no failures)**; test:react 5/5. If anything fails, fix before declaring done.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts tests/primitives/card-contract-exports.test.ts
git commit -m "feat(card-contract): export the foundation from the public barrel"
```

---

## Self-Review

**Spec coverage:**
- Types (`CardEnvelope`/`CardContext` incl. `a11y`/`CardEvent`/`CardHost`/`CardPolicy`) + version → Task 1. ✓
- Shared lean validator (`card-validate`, the contract's decided validator) → Task 2. ✓
- `emitCardEvent` (bubbling/composed) + `routeCardEvent` (single policy router, send-prompt downgrade, open scheme-validation, missing-handler no-op) + `listenForCardEvents` → Task 3. ✓
- Native transport `CardProvider` + `useCardHost` → Task 4. ✓
- Schema artifacts shipped to `dist/schemas/` → Task 5. ✓
- Public barrel exports → Task 6. ✓
- Boundary-validation requirement: `validateAgainstSchema` provided + tested; cards/transport call it (their specs). ✓
- Out of scope (cards, iframe transport, AG-UI wire) correctly excluded. ✓

**Placeholder scan:** none — every step has complete code + exact commands.

**Type consistency:** `validateAgainstSchema`/`JsonSchema`/`ValidationResult` (Task 2) reused in Tasks 5–6. `CardEvent`/`CardPolicy`/`CardHost`/`CardContext` (Task 1) reused in Tasks 3–4–6. `CARD_EVENT_NAME`/`emitCardEvent`/`routeCardEvent`/`listenForCardEvents` (Task 3) reused in Task 4 (CardProvider.emit → routeCardEvent) + Task 6. `CardProvider`/`useCardHost`/`CardProviderProps` (Task 4) exported in Task 6. Consistent.
