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

// Verbs MUST match CardEventKind in card-contract.ts (verify against source).
const KINDS: ReadonlySet<string> = new Set<CardEventKind>([
  'ready', 'submit', 'action', 'send-prompt', 'open', 'resize', 'state', 'dismiss', 'error',
] as CardEventKind[]);
export function isKnownEventKind(k: unknown): k is CardEventKind {
  return typeof k === 'string' && KINDS.has(k);
}
