import { it, expect, describe } from 'vitest';
import { toAnthropicMessages, toOpenAIMessages } from './encode';
import { answerQuestions, settlePendingQuestions } from '../state/questions';
import { thread, result } from '../../tests/fixtures/ask-thread';

const hasToolUse = (wire: unknown[]) => JSON.stringify(wire).includes('call_1');
const count = (wire: unknown[], needle: string) => JSON.stringify(wire).split(needle).length - 1;
const userText = { id: 'u2', role: 'user' as const, parts: [{ type: 'text' as const, text: 'actually, just chat' }] };

describe('kai_ask on the wire', () => {
  it('an unanswered kai_ask is dropped on both wires (as today)', () => {
    expect(hasToolUse(toAnthropicMessages(thread()))).toBe(false);
    expect(hasToolUse(toOpenAIMessages(thread()))).toBe(false);
  });

  it('an answered kai_ask encodes as tool_use then a user tool_result carrying the AskResult JSON (Anthropic)', () => {
    const wire = toAnthropicMessages(answerQuestions(thread(), 'call_1', result));
    const last = wire[wire.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toEqual([expect.objectContaining({ type: 'tool_result', tool_use_id: 'call_1', content: JSON.stringify(result) })]);
    expect(JSON.stringify(wire[wire.length - 2])).toContain('"tool_use"');
  });

  it('exactly one tool result and no extra user turn (Anthropic)', () => {
    const wire = toAnthropicMessages(answerQuestions(thread(), 'call_1', result));
    expect(count(wire, '"tool_result"')).toBe(1);
    expect(wire.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    // The answer text lives only inside the tool result: no separate "Tone: Casual" user text.
    expect(wire.filter((m) => m.role === 'user')).toHaveLength(2);
    expect(count(wire, 'selected')).toBe(1);
  });

  it('settling then a user message is ONE merged user turn on Anthropic: the tool_result, then the text', () => {
    const next = [...settlePendingQuestions(thread()), userText];
    const wire = toAnthropicMessages(next);
    const last = wire[wire.length - 1];
    expect(last.role).toBe('user');
    expect((last.content as { type: string }[]).map((b) => b.type)).toEqual(['tool_result', 'text']);
    expect(wire.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(count(wire, '"tool_result"')).toBe(1);
    expect(JSON.stringify(last.content)).toContain('dismissed');
  });

  it('and as a role:"tool" message on OpenAI', () => {
    const wire = toOpenAIMessages(answerQuestions(thread(), 'call_1', result));
    const last = wire[wire.length - 1] as { role: string; tool_call_id?: string; content?: unknown };
    expect(last.role).toBe('tool');
    expect(last.tool_call_id).toBe('call_1');
    expect(last.content).toBe(JSON.stringify(result));
    expect(wire.filter((m) => m.role === 'tool')).toHaveLength(1);
    expect(wire.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('settling then a user message on OpenAI: one dismissed tool message then the text, no dangling call', () => {
    const wire = toOpenAIMessages([...settlePendingQuestions(thread()), userText]) as { role: string; content?: unknown; tool_calls?: unknown[] }[];
    expect(wire.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'user']);
    expect(wire.filter((m) => m.role === 'tool')).toHaveLength(1);
    expect(String(wire[2].content)).toContain('dismissed');
    expect(wire[3].content).toEqual('actually, just chat');
    expect(wire[1].tool_calls).toHaveLength(1);
  });

  it('the dangling call WITHOUT settle is dropped, and settle is what keeps it (the point of settlePendingQuestions)', () => {
    const dangling = toAnthropicMessages([...thread(), userText]);
    expect(hasToolUse(dangling)).toBe(false);
    expect(hasToolUse(toAnthropicMessages([...settlePendingQuestions(thread()), userText]))).toBe(true);
  });

  it('a settled kai_ask round-trips: encoded thread holds the same answers the state holds', () => {
    const answered = answerQuestions(thread(), 'call_1', result);
    const wire = toAnthropicMessages(answered);
    const block = (wire[wire.length - 1].content as { content: string }[])[0];
    expect(JSON.parse(block.content)).toEqual(result);
    // and re-answering (a double submit) does not change what is sent
    expect(toAnthropicMessages(answerQuestions(answered, 'call_1', result))).toEqual(wire);
  });

  it('hostile answer text is JSON-escaped inside the one tool result on both wires', () => {
    const evil = { status: 'answered' as const, answers: [{ questionId: 'q0', header: 'H', question: 'Q', kind: 'text' as const, text: '"}],"x":<script>\n' + 'y'.repeat(100_000) }] };
    const a = toAnthropicMessages(answerQuestions(thread(), 'call_1', evil));
    const o = toOpenAIMessages(answerQuestions(thread(), 'call_1', evil)) as { content?: string }[];
    expect(JSON.parse((a[a.length - 1].content as { content: string }[])[0].content)).toEqual(evil);
    expect(JSON.parse(o[o.length - 1].content as string)).toEqual(evil);
  });
});
