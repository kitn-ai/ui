// src/remote/host-embed.ts
// The host embed SDK: mountRemoteCard() + the RemoteCardHandle. Drops one sandboxed
// cross-origin iframe, runs the handshake (origin+source+nonce+version), pushes
// CardContext + CardEnvelope down, validates inbound up-frames, and routes every
// CardEvent through the SAME routeCardEvent the native transport uses. Auto-sizes the
// iframe from `resize`, intercepts `focus-edge`.
//
// Security-critical, stateful, vanilla DOM ONLY — NO SolidJS imports. See the
// iframe-transport design spec ("Host embed SDK surface" + addendum H-A/H-C/H-D/H-E/
// H-F/H-G/H-O).

import {
  type CardEnvelope,
  type CardContext,
  type CardEvent,
  type CardPolicy,
} from '../primitives/card-contract';
import { createPacker, isCardWireFrame, type WireMessage } from './wire';
import { assertCrossOrigin, redactFrame } from './origin';
import { isValidVersion } from './version';
import { hasPollutionKey, isKnownEventKind } from './validate';
import { routeCardEvent } from '../primitives/card-routing';

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
  /** The SAME routing policy native cards use. resize/focus-edge are handled by the SDK. */
  policy?: CardPolicy;
  /** Override sandbox. Default: allow-scripts allow-forms allow-same-origin (NO allow-popups — H-G). */
  sandbox?: string;
  /** Cap auto-height (px); frame scrolls internally beyond it. */
  maxHeight?: number;
  /** Handshake timeout (ms). Default 5000. */
  handshakeTimeoutMs?: number;
}

export interface RemoteCardHandle {
  /** Push new ambient context (theme toggle, token refresh). Shallow top-level merge;
   *  `theme`/`a11y` replaced wholesale. Always sends a FULL resolved CardContext. */
  updateContext(context: Partial<CardContext>): void;
  /** Re-render with a new/updated envelope (same id = update). */
  update(envelope: CardEnvelope): void;
  /** Send `teardown`, stop listeners, remove the iframe. Idempotent. */
  destroy(): void;
  /** Current bridge state for the host to reflect in UI. */
  state(): 'connecting' | 'open' | 'error' | 'closed';
}

type BridgeState = 'connecting' | 'open' | 'error' | 'closed';

const HOST_SUPPORTED_VERSIONS = ['1'];
const DEFAULT_SANDBOX = 'allow-scripts allow-forms allow-same-origin';
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 5000;

/** Provider host for the iframe title (best-effort; never throws). */
function providerHost(providerOrigin: string): string {
  try { return new URL(providerOrigin).host; } catch { return providerOrigin; }
}

export function mountRemoteCard(options: MountRemoteCardOptions): RemoteCardHandle {
  const {
    container,
    providerOrigin,
    src,
    policy,
    maxHeight,
  } = options;

  // ── Cross-origin precondition (H-F): fail closed BEFORE mounting. ──
  const hostOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  assertCrossOrigin(src, providerOrigin, hostOrigin);

  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS;

  // ── Bridge identity + generation (H-A). A new nonce per generation; stale frames are
  //    rejected by construction (generation capture + nonce equality). ──
  let generation = 0;
  let nonce = mintNonce();
  let packer = createPacker('1', nonce); // provisional until `ready` negotiates the version.

  // ── State machine (H-E). ──
  let state: BridgeState = 'connecting';

  // ── Latest-wins pre-OPEN buffer (H-E). Always the newest pending context/render. ──
  let currentContext: CardContext = resolveContext(options.context);
  let currentEnvelope: CardEnvelope = options.envelope;
  let pendingContext: CardContext | null = null;
  let pendingRender: CardEnvelope | null = null;

  let iframe: HTMLIFrameElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let listener: ((e: MessageEvent) => void) | null = null;

  function warn(data: unknown): void {
    try { console.warn('[kai-remote]', redactFrame(data)); } catch { /* best-effort */ }
  }

  function postDown(message: WireMessage): void {
    const cw = iframe?.contentWindow;
    if (!cw) return;
    try { cw.postMessage(packer(message), providerOrigin); } catch { /* best-effort */ }
  }

  function clearTimer(): void {
    if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
  }

  function sendContext(ctx: CardContext): void {
    if (state === 'open') postDown({ dir: 'down', kind: 'context', context: ctx });
    else if (state === 'connecting') pendingContext = ctx; // latest-wins; no buffer in error/closed
  }

  function sendRender(envelope: CardEnvelope): void {
    if (state === 'open') postDown({ dir: 'down', kind: 'render', envelope });
    else if (state === 'connecting') pendingRender = envelope; // latest-wins; no buffer in error/closed
  }

  function flushBuffer(): void {
    // Order: context → render (H-E), so the runtime themes before first paint.
    if (pendingContext) { postDown({ dir: 'down', kind: 'context', context: pendingContext }); pendingContext = null; }
    if (pendingRender) { postDown({ dir: 'down', kind: 'render', envelope: pendingRender }); pendingRender = null; }
  }

  function renderFallback(message: string): void {
    // Replace the iframe with an inline accessible fallback + a Retry button.
    const fallback = document.createElement('div');
    fallback.setAttribute('role', 'alert');
    fallback.dataset.kaiRemoteFallback = '';
    const msg = document.createElement('p');
    msg.textContent = message;
    fallback.appendChild(msg);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => retryMount());
    fallback.appendChild(retry);
    if (iframe && iframe.parentNode === container) container.replaceChild(fallback, iframe);
    else container.appendChild(fallback);
    iframe = null;
  }

  function toError(message: string): void {
    if (state === 'closed') return;
    clearTimer();
    state = 'error';
    pendingContext = null;
    pendingRender = null; // discard the coalesced buffer (H-O)
    renderFallback(message);
  }

  /** Build the iframe, wire the listener BEFORE setting src (race closure), append, set src. */
  function createIframe(): void {
    const myGen = generation;
    const el = document.createElement('iframe');
    el.setAttribute('sandbox', options.sandbox ?? DEFAULT_SANDBOX);
    el.setAttribute('referrerpolicy', 'no-referrer');
    el.setAttribute('allow', '');
    const titleBase = currentEnvelope.title ?? currentEnvelope.type;
    el.setAttribute('title', `${titleBase} — provided by ${providerHost(providerOrigin)}`);
    el.style.border = '0';
    el.style.width = '100%';

    el.addEventListener('load', () => {
      if (generation !== myGen || state !== 'connecting') return;
      // Provisional packer (negotiated version is set on `ready`).
      packer = createPacker('1', nonce);
      postDown({ dir: 'down', kind: 'hello', supportedVersions: HOST_SUPPORTED_VERSIONS });
      clearTimer();
      timer = setTimeout(() => {
        if (generation !== myGen || state !== 'connecting') return;
        toError('[timeout] The card took too long to load.');
        policy?.onError?.(currentEnvelope.id, '[timeout] handshake timed out');
      }, handshakeTimeoutMs);
    });

    // Listener BEFORE src (H — load-before-listener race closure).
    listener = (event: MessageEvent) => onMessage(event, myGen);
    window.addEventListener('message', listener);

    iframe = el;
    container.appendChild(el);
    el.setAttribute('src', src); // set LAST.
  }

  function retryMount(): void {
    // Guard: only retry from error state; a double-click (or stray call) is a no-op.
    if (state !== 'error') return;
    // New generation + new nonce; stale frames from the dead iframe are rejected.
    generation += 1;
    nonce = mintNonce();
    packer = createPacker('1', nonce);
    state = 'connecting';
    pendingContext = null;
    pendingRender = null;
    clearTimer();
    if (listener) { window.removeEventListener('message', listener); listener = null; }
    // Defensively remove any lingering iframe before creating a fresh one.
    if (iframe) { iframe.remove(); iframe = null; }
    // Always re-push the latest resolved context + envelope after the new handshake.
    pendingContext = currentContext;
    pendingRender = currentEnvelope;
    // Remove any existing fallback before re-mounting.
    container.querySelectorAll('[data-kai-remote-fallback]').forEach((n) => n.remove());
    createIframe();
  }

  function sizeIframe(height: number): void {
    if (!iframe) return;
    const clamped = Math.min(height, maxHeight ?? Infinity);
    iframe.style.height = `${clamped}px`;
  }

  function moveFocusPastIframe(): void {
    // v1 focus-edge handling: blur the iframe so default browser tab order moves past it.
    // (A richer "next host focusable" mover is a later refinement; blur is deterministic
    //  and never routes through CardPolicy.)
    if (iframe) { try { iframe.blur(); } catch { /* best-effort */ } }
  }

  function onMessage(event: MessageEvent, myGen: number): void {
    // ── Stale-generation defense (H-A): ignore frames from a superseded/closed bridge. ──
    if (myGen !== generation || state === 'closed' || state === 'error') return;
    const data = event.data;

    // ── Inbound security gates, in order (H-A/H-C/H-D): ──
    // 1. origin pin   2. source-window pin   3. structural + direction guard
    // 4. nonce equality (bridge-instance binding)
    if (event.origin !== providerOrigin) return;
    if (event.source !== iframe?.contentWindow) return;
    if (!isCardWireFrame(data, 'up')) return;
    if (data.nonce !== nonce) return;

    // A throw past the gate must NOT kill the listener.
    try {
      const message = data.message;
      switch (message.kind) {
        case 'ready': {
          if (state !== 'connecting') return;
          const accepted = message.acceptedVersion;
          // 5. version: accepted MUST be a host-supported version (H-C).
          if (!isValidVersion(accepted) || !HOST_SUPPORTED_VERSIONS.includes(accepted)) {
            toError('[version-unsupported] This card needs a different host version.');
            policy?.onError?.(currentEnvelope.id, '[version-unsupported] no compatible protocol version');
            return;
          }
          // Rebuild the packer with the negotiated version (H-C).
          packer = createPacker(accepted, nonce);
          clearTimer();
          state = 'open';
          // Seed the buffer with the current resolved context + envelope, then flush.
          if (!pendingContext) pendingContext = currentContext;
          if (!pendingRender) pendingRender = currentEnvelope;
          flushBuffer();
          return;
        }
        case 'event': {
          if (state !== 'open') return;
          const ev: CardEvent = message.event;
          // cardId fence (H-E): drop in-flight events for a replaced/stale card.
          if (ev.cardId !== currentEnvelope.id) return;
          // resize is transport plumbing — intercept, never route (H-J / spec UP table).
          if (ev.kind === 'resize') { sizeIframe(ev.height); return; }
          // Schema/pollution gate before routing (H-D).
          if (!isKnownEventKind(ev.kind) || hasPollutionKey(ev)) { warn(data); return; }
          routeCardEvent(policy ?? {}, ev);
          return;
        }
        case 'focus-edge': {
          // a11y plumbing — intercept, never route (H-O).
          moveFocusPastIframe();
          return;
        }
        case 'fault': {
          const code = message.code;
          const reason = message.message;
          toError(`[${code}] The card reported a problem.`);
          policy?.onError?.(currentEnvelope.id, `[${code}] ${reason}`);
          return;
        }
        default:
          return;
      }
    } catch {
      warn(data);
    }
  }

  // ── Public handle ──────────────────────────────────────────────────────────
  const handle: RemoteCardHandle = {
    updateContext(partial: Partial<CardContext>): void {
      if (state === 'closed') return;
      currentContext = mergeContext(currentContext, partial);
      sendContext(currentContext);
    },
    update(envelope: CardEnvelope): void {
      if (state === 'closed') return;
      currentEnvelope = envelope;
      sendRender(envelope);
    },
    destroy(): void {
      if (state === 'closed') return;
      generation += 1; // tombstone the current generation (rejects stale inbound).
      if (state === 'open') postDown({ dir: 'down', kind: 'teardown' });
      state = 'closed';
      clearTimer();
      if (listener) { window.removeEventListener('message', listener); listener = null; }
      if (iframe) { iframe.remove(); iframe = null; }
      container.querySelectorAll('[data-kai-remote-fallback]').forEach((n) => n.remove());
    },
    state(): BridgeState {
      return state;
    },
  };

  createIframe();
  return handle;
}

/** Crypto-random hex nonce (H-A): 16 bytes → 32 hex chars. */
function mintNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** A shallow copy so the caller's context object isn't mutated by later merges. */
function resolveContext(ctx: CardContext): CardContext {
  return { ...ctx };
}

/** Shallow top-level merge (H-E): `theme` and `a11y` are replaced wholesale, not
 *  deep-merged. Returns a new full resolved CardContext. */
function mergeContext(base: CardContext, partial: Partial<CardContext>): CardContext {
  return { ...base, ...partial };
}
