import '../../src/elements/chat';
import type { ChatMessage } from '../../src/elements/chat-types';

// jsdom does not implement Element.prototype.scrollTo. ChatContainer's
// stick-to-bottom primitive calls it via requestAnimationFrame when message
// content mounts; without this polyfill that async call throws an uncaught
// TypeError. Real browsers implement scrollTo, so this is a jsdom-only shim.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

const messages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'Hi there' },
  { id: 'm2', role: 'assistant', content: 'Hello! How can I help?', actions: ['copy'] },
];

test('renders messages and emits submit', async () => {
  const el = document.createElement('kitn-chat') as HTMLElement & { messages: ChatMessage[] };
  el.messages = messages;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hi there');
  expect(el.shadowRoot!.textContent).toContain('Hello! How can I help?');

  let submitted: string | null = null;
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));
  const textarea = el.shadowRoot!.querySelector('textarea')!;
  textarea.value = 'next question';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  expect(submitted).toBe('next question');

  el.remove();
});

test('emits messageaction when an action button is clicked', async () => {
  const el = document.createElement('kitn-chat') as HTMLElement & { messages: ChatMessage[] };
  el.messages = messages;
  document.body.appendChild(el);
  await Promise.resolve();

  let action: { messageId: string; action: string } | null = null;
  el.addEventListener('messageaction', (e) => (action = (e as CustomEvent).detail));
  const btn = el.shadowRoot!.querySelector('[data-action="copy"]') as HTMLElement;
  btn.click();
  expect(action).toEqual({ messageId: 'm2', action: 'copy' });

  el.remove();
});

test('codeHighlight={false} renders fenced code as plain text (no Shiki)', async () => {
  const el = document.createElement('kitn-chat') as HTMLElement & {
    messages: ChatMessage[]; codeHighlight: boolean;
  };
  el.codeHighlight = false;
  el.messages = [{ id: 'm1', role: 'assistant', content: '```tsx\nconst answer = 42\n```' }];
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.querySelector('pre')).toBeTruthy();
  expect(el.shadowRoot!.textContent).toContain('const answer = 42');
  // Shiki adds inline token color styles; the disabled path must not.
  expect(el.shadowRoot!.innerHTML).not.toMatch(/style="[^"]*color/);

  el.remove();
});
