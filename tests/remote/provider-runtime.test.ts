import { test, expect, vi, beforeEach } from 'vitest';
import { createCardBridge } from '../../src/remote/provider-runtime';
import { createPacker } from '../../src/remote/wire';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} constructor(_: unknown) {} });
});

function hostStub() {
  const sent: unknown[] = [];
  vi.stubGlobal('parent', { postMessage: (f: unknown) => sent.push(f) } as unknown as Window);
  return sent;
}

test('bridge replies to hello with ready echoing the nonce + version, then renders', () => {
  const sent = hostStub();
  const root = document.createElement('div');
  let mounted: { type: string } | null = null;
  const bridge = createCardBridge({
    root,
    renderers: [{ type: 'demo', mount: (_r, env, host) => { mounted = { type: env.type }; host.emit({ kind: 'ready', cardId: env.id }); return () => {}; } }],
  });
  bridge.start();
  const pack = createPacker('1', 'NONCE');
  window.dispatchEvent(new MessageEvent('message', {
    data: pack({ dir: 'down', kind: 'hello', supportedVersions: ['1'] }),
    origin: 'https://host.example', source: window.parent as Window,
  }));
  const ready = sent.map((f) => f as { message: { kind: string }; nonce: string }).find((f) => f.message.kind === 'ready');
  expect(ready?.nonce).toBe('NONCE');
  window.dispatchEvent(new MessageEvent('message', {
    data: pack({ dir: 'down', kind: 'render', envelope: { type: 'demo', id: 'c1', data: {} } }),
    origin: 'https://host.example', source: window.parent as Window,
  }));
  expect(mounted).toEqual({ type: 'demo' });
  bridge.stop();
});

test('runtime rejects frames whose source differs from the locked host window', () => {
  const sent = hostStub();
  const bridge = createCardBridge({ root: document.createElement('div'), renderers: [] });
  bridge.start();
  const pack = createPacker('1', 'N');
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'down', kind: 'hello', supportedVersions: ['1'] }), origin: 'https://host.example', source: window.parent as Window }));
  sent.length = 0;
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'down', kind: 'render', envelope: { type: 'x', id: 'c2', data: {} } }), origin: 'https://host.example', source: {} as Window }));
  expect(sent.length).toBe(0);
  bridge.stop();
});

test('runtime drops frames with a mismatched nonce after lock', () => {
  const sent = hostStub();
  let mounted = false;
  const bridge = createCardBridge({ root: document.createElement('div'), renderers: [{ type: 'x', mount: () => { mounted = true; return () => {}; } }] });
  bridge.start();
  window.dispatchEvent(new MessageEvent('message', { data: createPacker('1', 'GOOD')({ dir: 'down', kind: 'hello', supportedVersions: ['1'] }), origin: 'https://host.example', source: window.parent as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: createPacker('1', 'EVIL')({ dir: 'down', kind: 'render', envelope: { type: 'x', id: 'c3', data: {} } }), origin: 'https://host.example', source: window.parent as Window }));
  expect(mounted).toBe(false);
  bridge.stop();
});
