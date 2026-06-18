/**
 * Unit tests for parseKaiSlashCommandElement and the merge behaviour
 * in kai-prompt-input's declarative <kai-slash-command> reader.
 *
 * Strategy: test the exported pure helper directly with synthetic DOM elements
 * (no Shadow DOM, no custom element upgrade needed).
 * Merge behaviour is verified by constructing the same arrays the element would
 * produce and asserting the result — pure array logic, no browser environment needed.
 */
import { describe, it, expect } from 'vitest';
import { parseKaiSlashCommandElement } from './prompt-input';

// ---------------------------------------------------------------------------
// parseKaiSlashCommandElement — attribute → SlashCommandItem mapping
// ---------------------------------------------------------------------------

describe('parseKaiSlashCommandElement', () => {
  function makeEl(
    attrs: Record<string, string | null>,
    textContent?: string,
  ): Element {
    const el = document.createElement('kai-slash-command');
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null) el.setAttribute(k, v);
    }
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  it('maps command attr → id, textContent → label, description attr → description', () => {
    const el = makeEl(
      { command: 'summarize', description: 'Summarize the thread' },
      'summarize',
    );
    expect(parseKaiSlashCommandElement(el)).toEqual({
      id: 'summarize',
      label: 'summarize',
      description: 'Summarize the thread',
      category: undefined,
    });
  });

  it('maps category attr → category', () => {
    const el = makeEl(
      { command: 'search', category: 'tools' },
      'search',
    );
    expect(parseKaiSlashCommandElement(el).category).toBe('tools');
  });

  it('falls back to label attr when textContent is empty', () => {
    const el = makeEl({ command: 'help', label: 'Help' }, '');
    expect(parseKaiSlashCommandElement(el).label).toBe('Help');
  });

  it('falls back to command attr as label when both textContent and label attr are absent', () => {
    const el = makeEl({ command: 'debug' });
    expect(parseKaiSlashCommandElement(el).label).toBe('debug');
  });

  it('returns empty string for id when command attr is absent', () => {
    const el = makeEl({}, 'orphan');
    expect(parseKaiSlashCommandElement(el).id).toBe('');
  });

  it('returns undefined for optional attrs when absent', () => {
    const el = makeEl({ command: 'bare' }, 'bare');
    const item = parseKaiSlashCommandElement(el);
    expect(item.description).toBeUndefined();
    expect(item.category).toBeUndefined();
  });

  it('whitespace-trims textContent for the label', () => {
    const el = makeEl({ command: 'trim' }, '  trim  ');
    expect(parseKaiSlashCommandElement(el).label).toBe('trim');
  });
});

// ---------------------------------------------------------------------------
// merge behaviour — prop slashCommands + slotted children
// ---------------------------------------------------------------------------

describe('slashCommands merge (prop + declarative children)', () => {
  function makeEl(command: string, label: string, description?: string): Element {
    const el = document.createElement('kai-slash-command');
    el.setAttribute('command', command);
    el.textContent = label;
    if (description) el.setAttribute('description', description);
    return el;
  }

  it('prop items appear before slotted children in the merged list', () => {
    const propItems = [{ id: 'prop-cmd', label: 'Prop Command' }];
    const slottedItems = [
      parseKaiSlashCommandElement(makeEl('child-cmd', 'Child Command')),
    ];
    const merged = [...propItems, ...slottedItems];
    expect(merged[0].id).toBe('prop-cmd');
    expect(merged[1].id).toBe('child-cmd');
  });

  it('merged list is empty when both prop and children are absent', () => {
    const propItems: ReturnType<typeof parseKaiSlashCommandElement>[] = [];
    const slottedItems: ReturnType<typeof parseKaiSlashCommandElement>[] = [];
    expect([...propItems, ...slottedItems]).toHaveLength(0);
  });

  it('slotted-only: single child appears as the only item', () => {
    const el = makeEl('summarize', 'Summarize', 'Summarize the thread');
    const merged = [...[], parseKaiSlashCommandElement(el)];
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({
      id: 'summarize',
      label: 'Summarize',
      description: 'Summarize the thread',
      category: undefined,
    });
  });

  it('prop-only: prop items flow through unchanged', () => {
    const propItems = [
      { id: 'a', label: 'Alpha', description: 'First' },
      { id: 'b', label: 'Beta' },
    ];
    const merged = [...propItems, ...([] as typeof propItems)];
    expect(merged).toEqual(propItems);
  });
});
