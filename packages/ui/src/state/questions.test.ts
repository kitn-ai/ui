import { describe, it, expect, vi } from 'vitest';
import { pendingQuestions, answerQuestions, settlePendingQuestions, threadRows, approvalQuestion, isOneClick } from './questions';
import { thread, result } from '../../tests/fixtures/ask-thread';

const toolOf = (m: { parts: unknown[] }, i = 1) => (m.parts[i] as { tool: { state: string; output: unknown; errorText?: string } }).tool;

describe('settle and rows', () => {
  it('settlePendingQuestions settles an open ask as dismissed, keeping partial answers', () => {
    const partial = [result.answers[0]];
    const after = settlePendingQuestions(thread(), partial);
    const tool = toolOf(after[1]);
    expect(tool.state).toBe('output-available');
    expect(tool.output).toEqual({ status: 'dismissed', answers: partial });
    expect(settlePendingQuestions(after)).toBe(after); // nothing pending: same array
  });

  it('settlePendingQuestions with no answers dismisses with an empty list, and leaves other messages alone', () => {
    const before = thread();
    const after = settlePendingQuestions(before);
    expect(toolOf(after[1]).output).toEqual({ status: 'dismissed', answers: [] });
    expect(after[0]).toBe(before[0]);
    expect(after).not.toBe(before);
  });

  it('settlePendingQuestions does not touch a call still streaming its arguments', () => {
    const t = thread();
    (t[1].parts[1] as { tool: { state: string } }).tool.state = 'input-streaming';
    expect(settlePendingQuestions(t)).toBe(t);
  });

  it('threadRows inserts one answers row after an answered ask, none while pending', () => {
    expect(threadRows(thread()).map((r) => r.kind)).toEqual(['message', 'message']);
    const rows = threadRows(answerQuestions(thread(), 'call_1', result));
    expect(rows.map((r) => r.kind)).toEqual(['message', 'message', 'answers']);
    expect(rows[2].key).toBe('answers:call_1');
    expect(rows[0].key).toBe('u');
    expect(rows[2]).toMatchObject({ kind: 'answers', toolCallId: 'call_1', result });
  });

  it('threadRows: dismissed with no answers adds no row; with some adds one', () => {
    expect(threadRows(settlePendingQuestions(thread())).map((r) => r.kind)).toEqual(['message', 'message']);
    expect(threadRows(settlePendingQuestions(thread(), [result.answers[0]])).at(-1)?.kind).toBe('answers');
  });

  it('threadRows keys are stable across re-derivation and an unrelated change', () => {
    const answered = answerQuestions(thread(), 'call_1', result);
    const keys = threadRows(answered).map((r) => r.key);
    const more = [...answered, { id: 'u2', role: 'user' as const, parts: [{ type: 'text' as const, text: 'thanks' }] }];
    expect(threadRows(more).map((r) => r.key).slice(0, 3)).toEqual(keys);
  });

  it('threadRows is total over a corrupt thread', () => {
    const corrupt = [null, undefined, 5, {}, { id: 'x', role: 'assistant' }, { id: 'y', role: 'assistant', parts: [null, { type: 'tool' }, { type: 'tool', tool: null }, { type: 'tool', tool: { type: 'kai_ask', state: 'output-available', toolCallId: 'k', output: 'nope' } }] }] as never;
    expect(() => threadRows(corrupt)).not.toThrow();
    expect(() => threadRows(null as never)).not.toThrow();
    expect(threadRows(null as never)).toEqual([]);
  });

  it('threadRows: a malformed AskResult output adds no row', () => {
    const t = thread();
    (t[1].parts[1] as { tool: { state: string; output: unknown } }).tool.state = 'output-available';
    (t[1].parts[1] as { tool: { output: unknown } }).tool.output = { status: 'answered', answers: 'x' };
    expect(threadRows(t).map((r) => r.kind)).toEqual(['message', 'message']);
  });
});

describe('questions state', () => {
  it('finds the open ask on the last assistant message (and after a reload)', () => {
    expect(pendingQuestions(JSON.parse(JSON.stringify(thread())))?.id).toBe('call_1');
    expect(pendingQuestions(thread())?.questions[0]).toMatchObject({ id: 'q0', header: 'Tone' });
  });

  it('is not pending once a user message follows, while streaming, when invalid, or when errored', () => {
    const t = thread();
    expect(pendingQuestions([...t, { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'hi' }] }])).toBeUndefined();
    const s = thread();
    (s[1].parts[1] as { tool: { state: string } }).tool.state = 'input-streaming';
    expect(pendingQuestions(s)).toBeUndefined();
    const bad = thread();
    (bad[1].parts[1] as { tool: { input: unknown } }).tool.input = { questions: [] };
    expect(pendingQuestions(bad)).toBeUndefined();
    const err = thread();
    (err[1].parts[1] as { tool: { state: string; errorText: string } }).tool.state = 'output-error';
    (err[1].parts[1] as { tool: { errorText: string } }).tool.errorText = 'x';
    expect(pendingQuestions(err)).toBeUndefined();
    expect(pendingQuestions([])).toBeUndefined();
    expect(pendingQuestions(null as never)).toBeUndefined();
  });

  it('answerQuestions settles the tool part with new array, message and part objects', () => {
    const before = thread();
    const after = answerQuestions(before, 'call_1', result);
    expect(after).not.toBe(before);
    expect(after[1]).not.toBe(before[1]);
    expect(after[0]).toBe(before[0]);
    expect(after[1].parts[1]).not.toBe(before[1].parts[1]);
    const tool = toolOf(after[1]);
    expect(tool.state).toBe('output-available');
    expect(tool.output).toEqual(result);
    expect(pendingQuestions(after)).toBeUndefined();
    // the input is untouched
    expect(toolOf(before[1]).state).toBe('input-available');
  });

  it('is idempotent for the same result and refuses a different second result loudly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const once = answerQuestions(thread(), 'call_1', result);
    expect(answerQuestions(once, 'call_1', JSON.parse(JSON.stringify(result)))).toBe(once);
    expect(warn).not.toHaveBeenCalled();
    const other = { ...result, answers: [{ ...result.answers[0], selected: ['Formal'] }] };
    expect(answerQuestions(once, 'call_1', other)).toBe(once);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('refuses a result after the call was settled as dismissed, and an unknown id, loudly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dismissed = settlePendingQuestions(thread());
    expect(answerQuestions(dismissed, 'call_1', result)).toBe(dismissed);
    expect(warn).toHaveBeenCalledTimes(1);
    const t = thread();
    expect(answerQuestions(t, 'nope', result)).toBe(t);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('refuses a malformed result and a call still streaming, loudly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = thread();
    expect(answerQuestions(t, 'call_1', { status: 'maybe', answers: [] } as never)).toBe(t);
    expect(answerQuestions(t, 'call_1', null as never)).toBe(t);
    expect(warn).toHaveBeenCalledTimes(2);
    const s = thread();
    (s[1].parts[1] as { tool: { state: string } }).tool.state = 'input-streaming';
    expect(answerQuestions(s, 'call_1', result)).toBe(s);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('a double submit after a failed request does not apply the answers twice', () => {
    const once = answerQuestions(thread(), 'call_1', result);
    const twice = answerQuestions(once, 'call_1', result);
    expect(twice).toBe(once);
    expect(JSON.stringify(twice).split('"output"').length - 1).toBe(1);
  });
});

describe('approvalQuestion and isOneClick', () => {
  it('builds a confirm question for a tool call', () => {
    const q = approvalQuestion({ type: 'delete_file', state: 'input-available', toolCallId: 't1' });
    expect(q).toMatchObject({ kind: 'confirm', header: 'Approve', question: 'Run delete_file?', required: true, options: [{ label: 'Approve' }, { label: 'Deny' }] });
    expect(typeof q.id).toBe('string');
  });
  it('takes overrides, and clamps a hostile tool name visibly', () => {
    expect(approvalQuestion({ type: 't', state: 'input-available' }, { header: 'Deploy', question: 'Ship?' })).toMatchObject({ header: 'Deploy', question: 'Ship?' });
    const q = approvalQuestion({ type: 'x'.repeat(1_000_000), state: 'input-available' });
    expect(q.question.length).toBeLessThan(500);
    expect(q.question).toMatch(/…/);
  });
  it('isOneClick: only a lone confirm', () => {
    const c = approvalQuestion({ type: 't', state: 'input-available' });
    expect(isOneClick([c])).toBe(true);
    expect(isOneClick([c, c])).toBe(false);
    expect(isOneClick([{ ...c, kind: 'choice' }])).toBe(false);
    expect(isOneClick([])).toBe(false);
  });
});
