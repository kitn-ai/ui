/**
 * The widget-box list view's half of the one list-order rule. The row anatomy
 * (time, preview, unread dot) is pinned by conversation-item.test.tsx, which shares
 * it; what this file pins is WHICH rows render and in what order: archived ones are
 * left out (an archived-only set is the empty state), pinned ones lead, and the
 * recency order is untouched inside each half.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { ConversationPanel } from './conversation-panel';
import type { ConversationSummary } from '../../types';

afterEach(cleanup);

const conv = (
  id: string,
  updatedAt: string,
  flags: Partial<ConversationSummary> = {},
): ConversationSummary => ({ id, title: id, messageCount: 1, updatedAt, ...flags });

const rowIds = (container: HTMLElement): (string | null)[] =>
  [...container.querySelectorAll('[data-conversation-id]')].map((el) => el.getAttribute('data-conversation-id'));

const noop = () => {};

describe('ConversationPanel — the one list-order rule', () => {
  it('renders pinned rows first, then recency, and never the archived one', () => {
    const { container } = render(() => (
      <ConversationPanel
        conversations={[
          conv('newest', '2026-08-05T00:00:00Z'),
          conv('pinned-old', '2026-08-01T00:00:00Z', { pinned: true }),
          conv('archived', '2026-08-06T00:00:00Z', { archived: true }),
          conv('older', '2026-08-02T00:00:00Z'),
        ]}
        onSelect={noop}
        onNewChat={noop}
      />
    ));
    expect(rowIds(container)).toEqual(['pinned-old', 'newest', 'older']);
  });

  it('a set that is entirely archived reads as the empty state', () => {
    const { container, getByText } = render(() => (
      <ConversationPanel
        conversations={[conv('only', '2026-08-05T00:00:00Z', { archived: true })]}
        onSelect={noop}
        onNewChat={noop}
      />
    ));
    expect(rowIds(container)).toEqual([]);
    expect(getByText('No conversations yet')).toBeInTheDocument();
  });

  it('a LEGACY summary (no flags at all) keeps the plain recency order', () => {
    const { container } = render(() => (
      <ConversationPanel
        conversations={[conv('a', '2026-08-02T00:00:00Z'), conv('b', '2026-08-05T00:00:00Z')]}
        onSelect={noop}
        onNewChat={noop}
      />
    ));
    expect(rowIds(container)).toEqual(['b', 'a']);
  });

  it('rows still select by id, and the row list is derived, not handed through', () => {
    const onSelect = vi.fn();
    const conversations = [conv('a', '2026-08-02T00:00:00Z'), conv('b', '2026-08-05T00:00:00Z')];
    const { container } = render(() => (
      <ConversationPanel conversations={conversations} onSelect={onSelect} onNewChat={noop} />
    ));
    fireEvent.click(container.querySelector('[data-conversation-id="a"]')!);
    expect(onSelect).toHaveBeenCalledWith('a');
    // The caller's array is untouched by the ordering (list()'s array is shared by
    // the whole controller cache).
    expect(conversations.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
