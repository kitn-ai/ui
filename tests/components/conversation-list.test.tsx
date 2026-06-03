import { describe, it, expect } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { ConversationList } from '../../src/components/conversation-list';
import type { ConversationSummary, ConversationGroup } from '../../src/types';

describe('ConversationList', () => {
  const groups: ConversationGroup[] = [
    { id: 'g1', name: 'Research', sortOrder: 0, createdAt: '2026-01-01' },
  ];
  const conversations: ConversationSummary[] = [
    { id: 'c1', title: 'Database options', groupId: 'g1', scope: { type: 'collection' }, messageCount: 5, lastMessageAt: '2026-04-10', updatedAt: '2026-04-10' },
    { id: 'c2', title: 'Quick question', groupId: undefined, scope: { type: 'collection' }, messageCount: 2, lastMessageAt: '2026-04-09', updatedAt: '2026-04-09' },
  ];

  it('renders groups with conversation counts', () => {
    render(() => <ConversationList groups={groups} conversations={conversations} activeId="c1" onSelect={() => {}} onNewChat={() => {}} />);
    expect(screen.getByText('Research')).toBeTruthy();
  });
});
