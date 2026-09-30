/**
 * `renderers` on `<kai-message>`, `<kai-thread>` and `<kai-chat>`: a JS property that swaps how
 * a part renders. Read through the facades, so the property really reaches `MessageBody`.
 * (Behaviour of the swap itself is pinned in `components/message/message-activity.test.tsx`.)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './message';
import '../thread/thread';
import '../chat/chat';

if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}

if (!customElements.get('renderers-text-b3')) {
  customElements.define('renderers-text-b3', class extends HTMLElement {
    set messagePart(v: { text: string }) { this.textContent = `custom:${v.text}`; }
  });
}
if (!customElements.get('renderers-step-b3')) {
  customElements.define('renderers-step-b3', class extends HTMLElement {
    set step(v: { toolName?: string }) { this.textContent = `step:${v.toolName}`; }
  });
}

const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
const message = { id: 'm1', role: 'assistant', parts: [{ type: 'text', text: 'hello' }] };
const withTool = {
  id: 'm2', role: 'assistant',
  parts: [{ type: 'tool', tool: { type: 'web_search', toolCallId: 'c1', state: 'output-available', input: { q: 1 }, output: { n: 1 } } }],
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('renderers reaches MessageBody from each facade', () => {
  it('<kai-message> swaps a text part for the consumer element', async () => {
    const el = document.createElement('kai-message') as HTMLElement & { message?: unknown; renderers?: unknown };
    el.message = message;
    el.renderers = { text: 'renderers-text-b3' };
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot!.querySelector('renderers-text-b3')!.textContent).toBe('custom:hello');
  });

  it('<kai-thread> swaps a text part, and a later assignment re-renders', async () => {
    const el = document.createElement('kai-thread') as HTMLElement & { messages?: unknown; renderers?: unknown };
    el.messages = [message];
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot!.querySelector('renderers-text-b3')).toBeNull();
    el.renderers = { text: 'renderers-text-b3' };
    await flush();
    expect(el.shadowRoot!.querySelector('renderers-text-b3')!.textContent).toBe('custom:hello');
  });

  it('<kai-chat> swaps one tool step and leaves the line in place', async () => {
    const el = document.createElement('kai-chat') as HTMLElement & { messages?: unknown; renderers?: unknown };
    el.messages = [withTool];
    el.renderers = { 'tool:web_search': 'renderers-step-b3' };
    document.body.appendChild(el);
    await flush();
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-kai-activity]')).toBeTruthy();
    (root.querySelector('[data-kai-activity] > button') as HTMLButtonElement).click();
    await flush();
    expect(root.querySelector('renderers-step-b3')!.textContent).toBe('step:web_search');
  });

  it('a card:* key warns and is ignored on the facade too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('kai-message') as HTMLElement & { message?: unknown; renderers?: unknown };
    el.message = message;
    el.renderers = { 'card:facade-b3': 'renderers-text-b3' };
    document.body.appendChild(el);
    await flush();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('card:facade-b3'))).toBe(true);
    expect(el.shadowRoot!.querySelector('renderers-text-b3')).toBeNull();
  });
});
