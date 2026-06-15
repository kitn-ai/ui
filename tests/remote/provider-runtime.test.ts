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

test('render→render restarts the observer so the second card emits its initial resize', () => {
  const sent = hostStub();
  // A ResizeObserver stub that immediately fires the callback with the given height on observe().
  let observeCallbacks: Array<(entries: ResizeObserverEntry[]) => void> = [];
  let disconnectCount = 0;
  vi.stubGlobal('ResizeObserver', class {
    private cb: (entries: ResizeObserverEntry[]) => void;
    constructor(cb: (entries: ResizeObserverEntry[]) => void) { this.cb = cb; observeCallbacks.push(cb); }
    observe() { this.cb([{ contentRect: { height: 42 } } as unknown as ResizeObserverEntry]); }
    disconnect() { disconnectCount++; }
  });

  const root = document.createElement('div');
  const bridge = createCardBridge({
    root,
    renderers: [{ type: 'card', mount: (_r, _e, _h) => () => {} }],
  });
  bridge.start();
  const pack = createPacker('1', 'N2');
  const dispatch = (msg: object) =>
    window.dispatchEvent(new MessageEvent('message', { data: pack(msg as Parameters<ReturnType<typeof createPacker>>[0]), origin: 'https://host.example', source: window.parent as Window }));

  dispatch({ dir: 'down', kind: 'hello', supportedVersions: ['1'] });
  dispatch({ dir: 'down', kind: 'render', envelope: { type: 'card', id: 'c1', data: {} } });
  dispatch({ dir: 'down', kind: 'render', envelope: { type: 'card', id: 'c2', data: {} } });

  // First render creates observer #1; second render disconnects it and creates observer #2.
  expect(disconnectCount).toBeGreaterThanOrEqual(1);

  // Both renders should have produced a resize event (height 42 each time).
  const resizes = (sent as unknown[])
    .map((f) => f as { message: { kind: string; event?: { kind: string; cardId: string; height: number } } })
    .filter((f) => f.message.kind === 'event' && f.message.event?.kind === 'resize');
  expect(resizes.length).toBe(2);
  expect(resizes[0].message.event?.cardId).toBe('c1');
  expect(resizes[1].message.event?.cardId).toBe('c2');

  bridge.stop();
});
