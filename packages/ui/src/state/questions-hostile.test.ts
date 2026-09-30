import { describe, it, expect, vi } from 'vitest';
import { pendingQuestions, answerQuestions, settlePendingQuestions, threadRows } from './questions';
import type { ChatMessage } from '../web-components/chat/chat-types';

const MB = 'x'.repeat(1_000_000);
const withInput = (input: unknown): ChatMessage[] => [
  { id: 'a', role: 'assistant', parts: [{ type: 'tool', tool: { type: 'kai_ask', state: 'input-available', toolCallId: 'c', input: input as Record<string, unknown> } }] },
];

describe('questions state under hostile input', () => {
  it('pending/settle/rows never throw on a hostile call input', () => {
    const inputs = [
      null, 'x', [], { questions: null }, { questions: Array.from({ length: 50_000 }, () => ({ header: 'h', question: MB.slice(0, 100), kind: 'text' })) },
      JSON.parse('{"__proto__":{"polluted":1},"questions":[{"kind":"__proto__","header":"h","question":"q"}]}'),
      { questions: [{ header: MB, question: MB, kind: 'choice', options: [{ label: MB }, { label: MB }] }] },
    ];
    for (const i of inputs) {
      const t = withInput(i);
      expect(() => pendingQuestions(t)).not.toThrow();
      expect(() => settlePendingQuestions(t)).not.toThrow();
      expect(() => threadRows(t)).not.toThrow();
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('a hostile tool call id, with pollution names, is inert', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const id of ['__proto__', 'constructor', 'prototype', MB]) {
      const t: ChatMessage[] = [
        { id: 'a', role: 'assistant', parts: [{ type: 'tool', tool: { type: 'kai_ask', state: 'input-available', toolCallId: id, input: { questions: [{ header: 'h', question: 'q', kind: 'text' }] } } }] },
      ];
      const res = { status: 'answered' as const, answers: [{ questionId: '__proto__', header: 'h', question: 'q', kind: 'text' as const, text: '<b>hi</b>' }] };
      const after = answerQuestions(t, id, res);
      expect(threadRows(after).map((r) => r.kind)).toEqual(['message', 'answers']);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    }
    warn.mockRestore();
  });

  it('a warning for a bad answer stays bounded when the id is 1MB', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    answerQuestions([], MB, { status: 'answered', answers: [] });
    expect(String(warn.mock.calls[0][0]).length).toBeLessThan(500);
    warn.mockRestore();
  });

  it('a very large thread stays linear enough: 20k messages', () => {
    const t: ChatMessage[] = Array.from({ length: 20_000 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? 'assistant' : 'user', parts: [{ type: 'text', text: 'x' }] }));
    const start = Date.now();
    threadRows(t);
    pendingQuestions(t);
    settlePendingQuestions(t);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
