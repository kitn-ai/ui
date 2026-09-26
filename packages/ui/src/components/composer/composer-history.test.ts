import { describe, it, expect } from 'vitest';
import { createHistory, type Snapshot } from './composer-history';

const snap = (text: string, caret = text.length): Snapshot => ({
  doc: text ? [{ type: 'text', text }] : [],
  caret,
});

describe('createHistory', () => {
  it('starts at the initial entry with nothing to undo/redo', () => {
    const h = createHistory(snap(''));
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  it('pushes non-coalesced entries and steps back/forward', () => {
    const h = createHistory(snap(''));
    h.record(snap('a'), false);
    h.record(snap('ab'), false);
    expect(h.size()).toBe(3);
    expect(h.undo()).toEqual(snap('a'));
    expect(h.undo()).toEqual(snap(''));
    expect(h.undo()).toBeNull();
    expect(h.redo()).toEqual(snap('a'));
    expect(h.redo()).toEqual(snap('ab'));
    expect(h.redo()).toBeNull();
  });

  it('coalesces a run of typing into the current entry', () => {
    const h = createHistory(snap(''));
    h.record(snap('h'), false);   // new entry (start of run)
    h.record(snap('he'), true);   // merge
    h.record(snap('hel'), true);  // merge
    expect(h.size()).toBe(2);
    expect(h.undo()).toEqual(snap('')); // one step undoes the whole run
  });

  it('a non-coalesced record after a run starts a distinct step (pill op)', () => {
    const h = createHistory(snap(''));
    h.record(snap('hi '), false);
    h.record(snap('hi !'), true);          // typing run → merged
    h.record({ doc: [{ type: 'text', text: 'hi !' }, { type: 'entity', entity: { kind: 'skill', id: 'x', label: 'X' } }], caret: 5 }, false); // pill: own step
    expect(h.size()).toBe(3);
    const afterUndo = h.undo();
    expect(afterUndo).toEqual(snap('hi !')); // undo removes the pill as one step
  });

  it('recording after an undo drops the redo branch', () => {
    const h = createHistory(snap(''));
    h.record(snap('a'), false);
    h.record(snap('ab'), false);
    h.undo(); // back to 'a'
    h.record(snap('aX'), false); // diverge
    expect(h.canRedo()).toBe(false);
    expect(h.redo()).toBeNull();
    expect(h.undo()).toEqual(snap('a'));
  });

  it('reset collapses to a single baseline entry', () => {
    const h = createHistory(snap('old'));
    h.record(snap('older'), false);
    h.reset(snap('new'));
    expect(h.size()).toBe(1);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it('enforces the entry limit by dropping the oldest', () => {
    const h = createHistory(snap('0'), 3);
    h.record(snap('1'), false);
    h.record(snap('2'), false);
    h.record(snap('3'), false); // would be 4 → oldest dropped, capped at 3
    expect(h.size()).toBe(3);
    // Oldest ('0') dropped; undo chain reaches '1' as the earliest.
    expect(h.undo()).toEqual(snap('2'));
    expect(h.undo()).toEqual(snap('1'));
    expect(h.undo()).toBeNull();
  });
});
