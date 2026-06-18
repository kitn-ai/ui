import '../../src/elements/conversation-list';
import type { ConversationGroup, ConversationSummary } from '../../src/types';

const groups: ConversationGroup[] = [{ id: 'g1', name: 'Today', sortOrder: 0, createdAt: '2026-06-01' }];
const conversations: ConversationSummary[] = [{
  id: 'c1', title: 'Hello world', groupId: 'g1', scope: { type: 'document' },
  messageCount: 2, lastMessageAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
}];

test('renders conversations and emits conversationselect', async () => {
  const el = document.createElement('kai-conversations') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[]; activeId?: string;
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hello world');

  let selected: string | null = null;
  el.addEventListener('kai-conversation-select', (e) => (selected = (e as CustomEvent).detail.id));
  const item = el.shadowRoot!.querySelector('[data-conversation-id="c1"]') as HTMLElement;
  item.click();
  expect(selected).toBe('c1');

  el.remove();
});

test('does not emit old "select" event (breaking change)', async () => {
  const el = document.createElement('kai-conversations') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[];
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  let selectFired = false;
  el.addEventListener('kai-select', () => (selectFired = true));
  const item = el.shadowRoot!.querySelector('[data-conversation-id="c1"]') as HTMLElement;
  item.click();
  expect(selectFired).toBe(false);

  el.remove();
});

test('icon-only controls have accessible names (a11y A1)', async () => {
  const el = document.createElement('kai-conversations') as HTMLElement & {
    groups: ConversationGroup[]; conversations: ConversationSummary[];
  };
  el.groups = groups;
  el.conversations = conversations;
  document.body.appendChild(el);
  await Promise.resolve();

  const root = el.shadowRoot!;
  const toggle = root.querySelector<HTMLButtonElement>('button[aria-label="Toggle sidebar"]');
  const newChat = root.querySelector<HTMLButtonElement>('button[aria-label="New chat"]');
  const search = root.querySelector<HTMLInputElement>('input[type="text"]');

  expect(toggle).not.toBeNull();
  expect(toggle!.getAttribute('aria-label')).toBe('Toggle sidebar');
  expect(newChat).not.toBeNull();
  expect(newChat!.getAttribute('aria-label')).toBe('New chat');
  expect(search!.getAttribute('aria-label')).toBe('Search chats');

  el.remove();
});
