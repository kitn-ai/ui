import { test, expect, afterEach } from 'vitest';
import '../../src/elements/remote-card';

afterEach(() => document.querySelectorAll('kc-remote-card').forEach((e) => e.remove()));

const flush = () => new Promise((r) => setTimeout(r, 0));

test('kc-remote-card registers', () => {
  expect(customElements.get('kc-remote-card')).toBeTruthy();
});

test('invalid provider-origin ("*") renders an inline error, no iframe', async () => {
  const el = document.createElement('kc-remote-card') as HTMLElement & { envelope: unknown };
  el.setAttribute('provider-origin', '*');
  el.setAttribute('src', 'https://p.example/card');
  el.envelope = { type: 'form', id: 'f1', data: {} };
  document.body.appendChild(el);
  await flush();
  expect(el.shadowRoot?.querySelector('iframe')).toBeFalsy();
  expect(el.shadowRoot?.querySelector('[role="alert"]')).toBeTruthy();
});

test('http (non-localhost) provider-origin is rejected', async () => {
  const el = document.createElement('kc-remote-card') as HTMLElement & { envelope: unknown };
  el.setAttribute('provider-origin', 'http://p.example');
  el.setAttribute('src', 'http://p.example/card');
  el.envelope = { type: 'form', id: 'f1', data: {} };
  document.body.appendChild(el);
  await flush();
  expect(el.shadowRoot?.querySelector('iframe')).toBeFalsy();
});
