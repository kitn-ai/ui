import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '../elements/chat-types';
import { appendMessage, upsertMessage, updateMessage, removeMessage, appendContent } from './messages';

const m = (id: string, content = ''): ChatMessage => ({ id, role: 'assistant', content });

describe('message helpers', () => {
  it('appendMessage adds to the end and returns a new array (input untouched)', () => {
    const a = [m('1')];
    const out = appendMessage(a, m('2'));
    expect(out.map((x) => x.id)).toEqual(['1', '2']);
    expect(out).not.toBe(a);
    expect(a).toHaveLength(1);
  });

  it('upsertMessage replaces by id, else appends', () => {
    const a = [m('1', 'old')];
    const replaced = upsertMessage(a, m('1', 'new'));
    expect(replaced).not.toBe(a);
    expect(replaced[0].content).toBe('new');
    expect(upsertMessage(a, m('2')).map((x) => x.id)).toEqual(['1', '2']);
  });

  it('updateMessage patches the matched id with a new object; leaves others by reference', () => {
    const keep = m('1');
    const a = [keep, m('2', 'a')];
    const out = updateMessage(a, '2', { content: 'b' });
    expect(out[1].content).toBe('b');
    expect(out[1]).not.toBe(a[1]);   // touched → new object
    expect(out[0]).toBe(keep);       // untouched → same reference
  });

  it('updateMessage accepts an updater function', () => {
    const input = m('1', 'x');
    const out = updateMessage([input], '1', (msg) => ({ ...msg, content: msg.content + 'y' }));
    expect(out[0].content).toBe('xy');
    expect(out[0]).not.toBe(input);
  });

  it('removeMessage drops by id', () => {
    const a = [m('1'), m('2')];
    const out = removeMessage(a, '1');
    expect(out.map((x) => x.id)).toEqual(['2']);
    expect(out).not.toBe(a);
    expect(a).toHaveLength(2);
  });

  it('appendContent concatenates the streamed delta on the matched message', () => {
    const input = [m('1', 'He')];
    const out = appendContent(input, '1', 'llo');
    expect(out[0].content).toBe('Hello');
    expect(out).not.toBe(input); // new array reference
  });
});
