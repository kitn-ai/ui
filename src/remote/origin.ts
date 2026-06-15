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
