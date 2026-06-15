import { test, expect, vi, beforeEach } from 'vitest';
import { mountRemoteCard } from '../../src/remote/host-embed';
import { createPacker } from '../../src/remote/wire';
import type { CardEvent } from '../../src/primitives/card-contract';

beforeEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

function setup() {
  const posted: unknown[] = [];
  const contentWindow = { postMessage: (f: unknown) => posted.push(f) };
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreate(tag);
    if (tag === 'iframe') Object.defineProperty(el, 'contentWindow', { value: contentWindow });
    return el;
  });
  return { posted, contentWindow };
}

test('handshake: sends hello on load, sends context+render after ready', () => {
  const { posted, contentWindow } = setup();
  const handle = mountRemoteCard({
    container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card',
    envelope: { type: 'form', id: 'f1', data: {} },
    context: { theme: { mode: 'light' }, locale: 'en' },
    policy: {},
  });
  const iframe = document.querySelector('iframe')!;
  iframe.dispatchEvent(new Event('load'));
  const hello = posted.map((f) => f as { message: { kind: string }; nonce: string }).find((f) => f.message.kind === 'hello');
  expect(hello).toBeTruthy();
  const nonce = hello!.nonce;
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  expect(posted.some((f) => (f as { message: { kind: string } }).message.kind === 'context')).toBe(true);
  expect(posted.some((f) => (f as { message: { kind: string } }).message.kind === 'render')).toBe(true);
  expect(handle.state()).toBe('open');
});

test('a submit event from the framed card routes through CardPolicy', () => {
  const { posted, contentWindow } = setup();
  const got: Array<{ cardId: string; data: unknown }> = [];
  mountRemoteCard({ container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card', envelope: { type: 'form', id: 'f1', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' }, policy: { onSubmit: (cardId, data) => got.push({ cardId, data }) } });
  document.querySelector('iframe')!.dispatchEvent(new Event('load'));
  const nonce = (posted.find((f) => (f as { message: { kind: string } }).message.kind === 'hello') as { nonce: string }).nonce;
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'event', event: { kind: 'submit', cardId: 'f1', data: { ok: 1 } } }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  expect(got).toEqual([{ cardId: 'f1', data: { ok: 1 } }]);
});

test('a frame from the wrong source window is ignored', () => {
  const { posted, contentWindow } = setup();
  const got: unknown[] = [];
  mountRemoteCard({ container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card', envelope: { type: 'form', id: 'f1', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' }, policy: { onSubmit: () => got.push(1) } });
  document.querySelector('iframe')!.dispatchEvent(new Event('load'));
  const nonce = (posted.find((f) => (f as { message: { kind: string } }).message.kind === 'hello') as { nonce: string }).nonce;
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'event', event: { kind: 'submit', cardId: 'f1', data: {} } }), origin: 'https://p.example', source: {} as Window }));
  expect(got.length).toBe(0);
});

test('a frame with a mismatched nonce is ignored', () => {
  const { posted, contentWindow } = setup();
  const got: unknown[] = [];
  mountRemoteCard({ container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card', envelope: { type: 'form', id: 'f1', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' }, policy: { onSubmit: () => got.push(1) } });
  document.querySelector('iframe')!.dispatchEvent(new Event('load'));
  const nonce = (posted.find((f) => (f as { message: { kind: string } }).message.kind === 'hello') as { nonce: string }).nonce;
  window.dispatchEvent(new MessageEvent('message', { data: createPacker('1', nonce)({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: createPacker('1', 'WRONG')({ dir: 'up', kind: 'event', event: { kind: 'submit', cardId: 'f1', data: {} } }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  expect(got.length).toBe(0);
});

test('same-origin providerOrigin throws (cross-origin precondition)', () => {
  setup();
  expect(() => mountRemoteCard({ container: document.body, providerOrigin: window.location.origin, src: window.location.origin + '/x', envelope: { type: 'form', id: 'f', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' } })).toThrow();
});

test('resize event sizes the iframe and is NOT routed to policy', () => {
  const { posted, contentWindow } = setup();
  let routed = 0;
  mountRemoteCard({ container: document.body, providerOrigin: 'https://p.example', src: 'https://p.example/card', envelope: { type: 'form', id: 'f1', data: {} }, context: { theme: { mode: 'light' }, locale: 'en' }, policy: { onAction: () => { routed++; }, onSubmit: () => { routed++; } } });
  const iframe = document.querySelector('iframe')! as HTMLIFrameElement;
  iframe.dispatchEvent(new Event('load'));
  const nonce = (posted.find((f) => (f as { message: { kind: string } }).message.kind === 'hello') as { nonce: string }).nonce;
  const pack = createPacker('1', nonce);
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'ready', acceptedVersion: '1' }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  window.dispatchEvent(new MessageEvent('message', { data: pack({ dir: 'up', kind: 'event', event: { kind: 'resize', cardId: 'f1', height: 222 } }), origin: 'https://p.example', source: contentWindow as unknown as Window }));
  expect(iframe.style.height).toBe('222px');
  expect(routed).toBe(0);
});
