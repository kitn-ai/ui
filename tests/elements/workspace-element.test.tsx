// tests/elements/workspace-element.test.tsx
import '../../src/elements/chat-workspace';
import type { ChatMessage } from '../../src/elements/chat-types';
import type { ConversationSummary } from '../../src/types';

if (!Element.prototype.scrollTo) { Element.prototype.scrollTo = () => {}; }

const conversations: ConversationSummary[] = [
  { id: 'c1', title: 'First chat', scope: { type: 'document' }, messageCount: 2, lastMessageAt: '2026-06-13T10:00:00Z', updatedAt: '2026-06-13T10:00:00Z' },
];
const messages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'Hi there' },
  { id: 'm2', role: 'assistant', content: 'Hello!' },
];

test('renders the list + thread and emits conversationselect and submit', async () => {
  const el = document.createElement('kai-workspace') as HTMLElement & { conversations: ConversationSummary[]; messages: ChatMessage[] };
  el.conversations = conversations;
  el.messages = messages;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('First chat'); // sidebar
  expect(el.shadowRoot!.textContent).toContain('Hi there');    // thread

  let selected: string | null = null;
  el.addEventListener('kai-conversation-select', (e) => (selected = (e as CustomEvent).detail.id));
  // the conversation row is a button containing the title
  const row = [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.includes('First chat'))!;
  row.click();
  expect(selected).toBe('c1');

  let submitted: string | null = null;
  el.addEventListener('kai-submit', (e) => (submitted = (e as CustomEvent).detail.value));
  const textarea = el.shadowRoot!.querySelector('textarea')!;
  textarea.value = 'q';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  expect(submitted).toBe('q');

  el.remove();
});
