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
