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
