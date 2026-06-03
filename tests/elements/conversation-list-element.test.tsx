import '../../src/elements/conversation-list';
import type { ConversationGroup, ConversationSummary } from '../../src/types';

const groups: ConversationGroup[] = [{ id: 'g1', name: 'Today', sortOrder: 0, createdAt: '2026-06-01' }];
const conversations: ConversationSummary[] = [{
  id: 'c1', title: 'Hello world', groupId: 'g1', scope: { type: 'document' },
  messageCount: 2, lastMessageAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
}];

test('renders conversations and emits select', async () => {
  const el = document.createElement('kitn-conversation-list') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[]; activeId?: string;
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hello world');

  let selected: string | null = null;
  el.addEventListener('select', (e) => (selected = (e as CustomEvent).detail.id));
  const item = el.shadowRoot!.querySelector('[data-conversation-id="c1"]') as HTMLElement;
  item.click();
  expect(selected).toBe('c1');

  el.remove();
});
