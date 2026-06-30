import { test, expect, afterEach, vi } from 'vitest';

// Capture the RemoteCardHandle so we can assert the element re-pushes context on
// a theme change. mountRemoteCard is stubbed (the real cross-origin handshake is
// covered by the Playwright suite); we only care that <kai-remote> drives the handle.
const updateContext = vi.fn();
const destroy = vi.fn();
vi.mock('../../src/remote/host-embed', () => ({
  mountRemoteCard: vi.fn(() => ({ updateContext, update: vi.fn(), destroy })),
}));

// eslint-disable-next-line import/first
import '../../src/elements/remote';

afterEach(() => {
  document.querySelectorAll('kai-remote').forEach((e) => e.remove());
  updateContext.mockClear();
  destroy.mockClear();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

test('kai-remote registers', () => {
  expect(customElements.get('kai-remote')).toBeTruthy();
});

test('invalid provider-origin ("*") renders an inline error, no iframe', async () => {
  const el = document.createElement('kai-remote') as HTMLElement & { envelope: unknown };
  el.setAttribute('provider-origin', '*');
  el.setAttribute('src', 'https://p.example/card');
  el.envelope = { type: 'form', id: 'f1', data: {} };
  document.body.appendChild(el);
  await flush();
  expect(el.shadowRoot?.querySelector('iframe')).toBeFalsy();
  expect(el.shadowRoot?.querySelector('[role="alert"]')).toBeTruthy();
});

test('http (non-localhost) provider-origin is rejected', async () => {
  const el = document.createElement('kai-remote') as HTMLElement & { envelope: unknown };
  el.setAttribute('provider-origin', 'http://p.example');
  el.setAttribute('src', 'http://p.example/card');
  el.envelope = { type: 'form', id: 'f1', data: {} };
  document.body.appendChild(el);
  await flush();
  expect(el.shadowRoot?.querySelector('iframe')).toBeFalsy();
});

test('a theme attribute change re-pushes context to the live handle', async () => {
  const el = document.createElement('kai-remote') as HTMLElement & { envelope: unknown };
  el.setAttribute('provider-origin', 'https://p.example');
  el.setAttribute('src', 'https://p.example/card');
  el.setAttribute('theme', 'light');
  el.envelope = { type: 'form', id: 'f1', data: {} };
  document.body.appendChild(el);
  await flush();
  updateContext.mockClear(); // ignore the initial effect run

  el.setAttribute('theme', 'dark');
  await flush();
  expect(updateContext).toHaveBeenCalledWith({ theme: { mode: 'dark' } });
});
