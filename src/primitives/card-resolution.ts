// Pure consumer-facing helpers for the re-hydration round-trip. Feed a terminal
// CardEvent back into the cards array so a resolved card survives reload:
//   el.cards = applyResolution(el.cards, e.detail)
// Deterministic — no Date (the optional `at` provenance is left to the consumer).
import type { CardEnvelope, CardEvent, CardResolution } from './card-contract';

/** Map a terminal CardEvent (`action` | `submit`) to a CardResolution.
 *  Returns undefined for every non-terminal verb (ready/error/resize/state/…). */
export function resolutionFromEvent(event: CardEvent): CardResolution | undefined {
  if (event.kind === 'action') {
    return {
      kind: 'action',
      action: event.action,
      ...(event.payload !== undefined ? { payload: event.payload } : {}),
    };
  }
  if (event.kind === 'submit') {
    return { kind: 'submit', data: event.data };
  }
  return undefined;
}

/** Return a new cards array with the envelope matching `event.cardId` stamped with its
 *  resolution. Non-terminal events or an unknown cardId return the SAME array reference
 *  (cheap no-op; safe to call on every event). Never mutates the input. */
export function applyResolution(cards: CardEnvelope[], event: CardEvent): CardEnvelope[] {
  const resolution = resolutionFromEvent(event);
  if (!resolution) return cards;
  let changed = false;
  const next = cards.map((c) => {
    if (c.id !== event.cardId) return c;
    changed = true;
    return { ...c, resolution };
  });
  return changed ? next : cards;
}
