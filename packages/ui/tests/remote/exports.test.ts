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
