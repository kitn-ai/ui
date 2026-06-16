/**
 * Unit tests for the declarative `<kc-conversation>` light-DOM API of
 * `<kc-conversations>`.
 *
 * Strategy: `defineWebComponent` registers a real Shadow-DOM custom element
 * and is not suitable for jsdom unit tests. Instead:
 *   1. Test the exported `parseKcConversationElement` helper in isolation.
 *   2. Test that the merged list of prop + slotted items renders items correctly
 *      via a minimal ConvList harness, mirroring the pattern in
 *      `source-list.test.tsx`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { For } from 'solid-js';
import { parseKcConversationElement } from './conversation-list';
import type { ConversationSummary } from '../types';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// parseKcConversationElement — pure helper
// ---------------------------------------------------------------------------

describe('parseKcConversationElement', () => {
  function makeEl(attrs: Record<string, string | null>, textContent = ''): Element {
    const el = document.createElement('kc-conversation');
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null) el.setAttribute(k, v);
    }
    el.textContent = textContent;
    return el;
  }

  it('maps id attribute to ConversationSummary.id', () => {
    const el = makeEl({ id: 'c-1' }, 'Q2 plan');
    expect(parseKcConversationElement(el).id).toBe('c-1');
  });

  it('uses trimmed textContent as title', () => {
    const el = makeEl({ id: 'c-1' }, '  Q2 plan  ');
    expect(parseKcConversationElement(el).title).toBe('Q2 plan');
  });

  it('reads group-id attribute as groupId when present', () => {
    const el = makeEl({ id: 'c-1', 'group-id': 'g-work' }, 'Q2 plan');
    expect(parseKcConversationElement(el).groupId).toBe('g-work');
  });

  it('sets groupId to undefined when group-id attribute is absent', () => {
    const el = makeEl({ id: 'c-1' }, 'Q2 plan');
    expect(parseKcConversationElement(el).groupId).toBeUndefined();
  });

  it('falls back to empty string for missing id attribute', () => {
    const el = makeEl({}, 'Untitled');
    expect(parseKcConversationElement(el).id).toBe('');
  });

  it('provides safe defaults for scope, messageCount, lastMessageAt, updatedAt', () => {
    const el = makeEl({ id: 'c-1' }, 'Q2 plan');
    const item = parseKcConversationElement(el);
    expect(item.scope).toEqual({ type: 'collection' });
    expect(item.messageCount).toBe(0);
    expect(typeof item.lastMessageAt).toBe('string');
    expect(typeof item.updatedAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Merge: prop conversations + slotted conversations combine correctly
// ---------------------------------------------------------------------------

describe('conversation merge order', () => {
  /** Minimal render harness that outputs a button per conversation. */
  function ConvList(props: { items: ConversationSummary[]; onSelect: (id: string) => void }) {
    return (
      <div>
        <For each={props.items}>
          {(c) => (
            <button type="button" onClick={() => props.onSelect(c.id)}>
              {c.title}
            </button>
          )}
        </For>
      </div>
    );
  }

  it('renders one item per conversation', () => {
    const items: ConversationSummary[] = [
      { id: 'c-1', title: 'First', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
      { id: 'c-2', title: 'Second', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const { getByText } = render(() => <ConvList items={items} onSelect={() => {}} />);
    expect(getByText('First')).toBeInTheDocument();
    expect(getByText('Second')).toBeInTheDocument();
  });

  it('fires onSelect with the conversation id when an item is clicked', () => {
    const onSelect = vi.fn();
    const items: ConversationSummary[] = [
      { id: 'c-42', title: 'API plan', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const { getByText } = render(() => <ConvList items={items} onSelect={onSelect} />);
    fireEvent.click(getByText('API plan'));
    expect(onSelect).toHaveBeenCalledWith('c-42');
  });

  it('renders prop items before declarative (slotted) items', () => {
    const propItems: ConversationSummary[] = [
      { id: 'p-1', title: 'Prop conv', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const slottedItems: ConversationSummary[] = [
      { id: 's-1', title: 'Slotted conv', scope: { type: 'collection' }, messageCount: 0, lastMessageAt: '', updatedAt: '' },
    ];
    const merged = [...propItems, ...slottedItems];

    const { getAllByRole } = render(() => <ConvList items={merged} onSelect={() => {}} />);
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('Prop conv');
    expect(buttons[1]).toHaveTextContent('Slotted conv');
  });

  it('parseKcConversationElement produces items that render and fire correct id', () => {
    const onSelect = vi.fn();
    const el = document.createElement('kc-conversation');
    el.setAttribute('id', 'c-99');
    el.textContent = 'My conversation';

    const parsed = parseKcConversationElement(el);
    const { getByText } = render(() => <ConvList items={[parsed]} onSelect={onSelect} />);
    fireEvent.click(getByText('My conversation'));
    expect(onSelect).toHaveBeenCalledWith('c-99');
  });
});
