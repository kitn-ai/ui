// src/elements/remote.tsx
// <kc-remote> — Shadow-DOM facade that mounts a sandboxed cross-origin iframe
// card via mountRemoteCard(), re-emits every CardEvent as a bubbling+composed
// kc-card CustomEvent, and validates the provider-origin before mounting.
import { onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { mountRemoteCard } from '../remote/host-embed';
import type { RemoteCardHandle } from '../remote/host-embed';
import type { CardEnvelope, CardContext, CardPolicy, CardEvent } from '../primitives/card-contract';
import { emitCardEvent } from '../primitives/card-routing';

interface Props extends Record<string, unknown> {
  /** The remote card URL. Attribute: `src`. */
  src?: string;
  /** Exact provider origin (https: or http://localhost for dev). Attribute: `provider-origin`. */
  providerOrigin?: string;
  /** The card envelope to render. JS property only. */
  envelope?: Record<string, unknown>;
  /** Optional routing policy. JS property only. */
  policy?: Record<string, unknown>;
}

/**
 * Validate that `origin` is a single absolute origin that is either:
 *   - an https: origin (e.g. "https://provider.example")
 *   - http://localhost or http://127.0.0.1 (local dev only)
 *
 * Rejects "*", comma-lists, bare paths, and any other http: origin.
 */
function isValidProviderOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  // Reject wildcard and comma-lists immediately.
  if (origin === '*' || origin.includes(',')) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  // Must be an exact origin: no pathname beyond '/', no search, no hash.
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') return false;
  if (parsed.protocol === 'https:') return true;
  if (parsed.protocol === 'http:') {
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  }
  return false;
}

/**
 * Build a CardPolicy that re-emits each routed CardEvent as a bubbling+composed
 * `kc-card` CustomEvent on `element`, AND delegates to the caller-supplied `policy`.
 */
function buildWrappedPolicy(element: HTMLElement, userPolicy: CardPolicy | undefined): CardPolicy {
  function emit(ev: CardEvent): void {
    emitCardEvent(element, ev);
  }
  return {
    onSubmit(cardId, data) {
      emit({ kind: 'submit', cardId, data });
      userPolicy?.onSubmit?.(cardId, data);
    },
    onAction(cardId, action, payload) {
      emit({ kind: 'action', cardId, action, payload });
      userPolicy?.onAction?.(cardId, action, payload);
    },
    onSendPrompt(text, opts) {
      // send-prompt doesn't carry cardId in the policy signature; we use a placeholder.
      emit({ kind: 'send-prompt', cardId: '', text, mode: opts.mode, context: opts.context });
      userPolicy?.onSendPrompt?.(text, opts);
    },
    onOpen(url, target) {
      // open doesn't carry cardId in the policy signature.
      emit({ kind: 'open', cardId: '', url, target });
      userPolicy?.onOpen?.(url, target);
    },
    onState(cardId, patch) {
      emit({ kind: 'state', cardId, patch });
      userPolicy?.onState?.(cardId, patch);
    },
    onDismiss(cardId) {
      emit({ kind: 'dismiss', cardId });
      userPolicy?.onDismiss?.(cardId);
    },
    onError(cardId, message) {
      emit({ kind: 'error', cardId, message });
      userPolicy?.onError?.(cardId, message);
    },
    maxSendPromptMode: userPolicy?.maxSendPromptMode,
  };
}

/**
 * `<kc-remote>` — mounts a sandboxed cross-origin iframe card.
 *
 * Required props:
 *   - `provider-origin` attribute: the exact HTTPS origin of the card provider
 *     (or http://localhost for local dev).
 *   - `src` attribute: the URL of the card page (must share the provider origin).
 *   - `envelope` JS property: the CardEnvelope to render.
 *
 * Optional:
 *   - `policy` JS property: a CardPolicy for routing card events.
 *   - `theme` attribute (inherited from defineWebComponent): 'light' | 'dark' | 'auto'.
 *
 * Every routed CardEvent is also dispatched as a bubbling+composed `kc-card`
 * CustomEvent off the host element.
 */
defineWebComponent<Props>(
  'kc-remote',
  {
    src: undefined,
    providerOrigin: undefined,
    envelope: undefined,
    policy: undefined,
  },
  (props, { element }) => {
    onMount(() => {
      const shadow = element.shadowRoot;
      if (!shadow) return;

      function renderError(message: string): void {
        const alert = document.createElement('div');
        alert.setAttribute('role', 'alert');
        alert.textContent = message;
        shadow!.appendChild(alert);
      }

      // Validate provider-origin before attempting any mount.
      const providerOrigin = props.providerOrigin;
      if (!isValidProviderOrigin(providerOrigin)) {
        renderError(
          `[kc-remote] Invalid provider-origin "${providerOrigin ?? ''}". ` +
          `Must be an absolute https: origin, or http://localhost / http://127.0.0.1 for local dev.`,
        );
        return;
      }

      const src = props.src;
      if (!src) {
        renderError('[kc-remote] Missing required "src" attribute.');
        return;
      }

      const envelope = props.envelope as CardEnvelope | undefined;
      if (!envelope) {
        renderError('[kc-remote] Missing required "envelope" property.');
        return;
      }

      // Derive a minimal CardContext from the element's theme attribute.
      const themeAttr = element.getAttribute('theme') ?? 'auto';
      const systemDark =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
      const isDark = themeAttr === 'dark' || (themeAttr === 'auto' && systemDark);
      const context: CardContext = {
        theme: { mode: isDark ? 'dark' : 'light' },
        locale: (typeof navigator !== 'undefined' && navigator.language) || 'en',
      };

      const userPolicy = props.policy as CardPolicy | undefined;
      const wrappedPolicy = buildWrappedPolicy(element, userPolicy);

      // Create a container inside the shadow root for mountRemoteCard.
      const container = document.createElement('div');
      shadow.appendChild(container);

      let handle: RemoteCardHandle | undefined;
      try {
        handle = mountRemoteCard({
          container,
          providerOrigin: providerOrigin as string,
          src,
          envelope,
          context,
          policy: wrappedPolicy,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        renderError(`[kc-remote] Mount failed: ${message}`);
        container.remove();
        return;
      }

      onCleanup(() => {
        handle?.destroy();
      });
    });

    // This element renders purely into the shadow root via onMount — no JSX return needed.
    return <></>;
  },
);
