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
  expect(isCardWireFrame(up, 'down')).toBe(false);
});

test('isCardWireFrame rejects foreign / malformed payloads', () => {
  expect(isCardWireFrame(null, 'up')).toBe(false);
  expect(isCardWireFrame('hi', 'up')).toBe(false);
  expect(isCardWireFrame({ protocol: 'other', version: '1', nonce: 'n', message: { dir: 'up' } }, 'up')).toBe(false);
  expect(isCardWireFrame({ protocol: CARD_WIRE_PROTOCOL, version: 1, nonce: 'n', message: { dir: 'up' } }, 'up')).toBe(false);
  expect(isCardWireFrame({ protocol: CARD_WIRE_PROTOCOL, version: '1', message: { dir: 'up' } }, 'up')).toBe(false);
  expect(isCardWireFrame({ protocol: CARD_WIRE_PROTOCOL, version: '1', nonce: 'n' }, 'up')).toBe(false);
});
