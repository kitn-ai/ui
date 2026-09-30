import { describe, it, expect, vi } from 'vitest';
import { questionsFromToolCall, isAskTool } from './ask';

describe('questionsFromToolCall', () => {
  it('returns null for other tools', () => {
    expect(questionsFromToolCall('get_weather', {}, { id: 'c' })).toBeNull();
  });

  it('normalises ids and required', () => {
    const r = questionsFromToolCall(
      'kai_ask',
      { questions: [{ header: 'Tone', question: 'How formal?', kind: 'choice', options: [{ label: 'Casual' }, { label: 'Formal' }] }] },
      { id: 'call_1' },
    );
    expect(r).toEqual({ id: 'call_1', questions: [expect.objectContaining({ id: 'q0', required: true, kind: 'choice' })] });
  });

  it('errors (never throws) on zero questions and on an unknown kind', () => {
    expect(questionsFromToolCall('kai_ask', { questions: [] }, { id: 'c' })).toEqual({ error: expect.stringMatching(/at least one question/) });
    expect(questionsFromToolCall('kai_ask', { questions: [{ header: 'x', question: 'y', kind: 'poll' }] }, { id: 'c' })).toEqual({
      error: expect.stringMatching(/unknown kind "poll"/),
    });
    expect(() => questionsFromToolCall('kai_ask', 'garbage', { id: 'c' })).not.toThrow();
    expect(questionsFromToolCall('kai_ask', 'garbage', { id: 'c' })).toEqual({ error: expect.any(String) });
  });

  it('keeps an over-long header but warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = questionsFromToolCall('kai_ask', { questions: [{ header: 'A very long header', question: 'q', kind: 'text' }] }, { id: 'c' });
    expect((r as { questions: { header: string }[] }).questions[0].header).toBe('A very long header');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('warns ONCE for every over-limit thing in a call, and keeps all of it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const qs = Array.from({ length: 6 }, (_, i) => ({
      header: `Header number ${i}`,
      question: 'q',
      kind: 'choice',
      options: Array.from({ length: 8 }, (_, j) => ({ label: `o${j}` })),
    }));
    const r = questionsFromToolCall('kai_ask', { questions: qs }, { id: 'c' }) as { questions: { options: unknown[] }[] };
    expect(r.questions).toHaveLength(6);
    expect(r.questions[0].options).toHaveLength(8);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('does not warn for a call inside the limits', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    questionsFromToolCall('kai_ask', { questions: [{ header: 'Ok', question: 'q', kind: 'text' }] }, { id: 'c' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('isAskTool', () => {
    expect(isAskTool('kai_ask')).toBe(true);
    expect(isAskTool('kai_confirm')).toBe(false);
    expect(isAskTool('KAI_ASK')).toBe(false);
  });

  describe('every kind', () => {
    const one = (q: Record<string, unknown>) => questionsFromToolCall('kai_ask', { questions: [{ header: 'H', question: 'Q', ...q }] }, { id: 'c' });
    const first = (r: unknown) => (r as { questions: Record<string, unknown>[] }).questions[0];

    it('choice: single and multi-select, options with description and preview', () => {
      const r = one({ kind: 'choice', multiSelect: true, options: [{ label: 'A', description: 'd', preview: 'p' }, { label: 'B' }] });
      expect(first(r)).toMatchObject({ kind: 'choice', multiSelect: true, options: [{ label: 'A', description: 'd', preview: 'p' }, { label: 'B' }] });
      expect(first(one({ kind: 'choice', options: [{ label: 'A' }, { label: 'B' }] })).multiSelect).toBeUndefined();
    });
    it('confirm: options optional, an overriding pair is kept', () => {
      expect(first(one({ kind: 'confirm' })).options).toBeUndefined();
      expect(first(one({ kind: 'confirm', options: [{ label: 'Ship it' }, { label: 'Hold' }] })).options).toEqual([{ label: 'Ship it' }, { label: 'Hold' }]);
    });
    it('tasks: needs options', () => {
      expect(first(one({ kind: 'tasks', options: [{ label: 'A' }] })).kind).toBe('tasks');
      expect(one({ kind: 'tasks' })).toEqual({ error: expect.stringMatching(/tasks.*options/) });
    });
    it('text: placeholder kept', () => {
      expect(first(one({ kind: 'text', placeholder: 'type' })).placeholder).toBe('type');
    });
    it('form: fields kept as a copy; missing fields is an error', () => {
      const fields = { type: 'object', properties: { a: { type: 'string' } } };
      const r = first(one({ kind: 'form', fields }));
      expect(r.fields).toEqual(fields);
      expect(r.fields).not.toBe(fields);
      expect(one({ kind: 'form' })).toEqual({ error: expect.stringMatching(/form.*fields/) });
    });
    it('required: false is honoured', () => {
      expect(first(one({ kind: 'text', required: false })).required).toBe(false);
    });
    it('keeps a model-supplied id, refuses duplicates', () => {
      const r = questionsFromToolCall('kai_ask', { questions: [{ id: 'scope', header: 'H', question: 'Q', kind: 'text' }] }, { id: 'c' });
      expect(first(r).id).toBe('scope');
      const dup = questionsFromToolCall(
        'kai_ask',
        { questions: [{ id: 'x', header: 'H', question: 'Q', kind: 'text' }, { id: 'x', header: 'H', question: 'Q', kind: 'text' }] },
        { id: 'c' },
      );
      expect(dup).toEqual({ error: expect.stringMatching(/used twice/) });
    });
    it('malformed options are errors, not repairs', () => {
      expect(one({ kind: 'choice', options: 'a,b' })).toEqual({ error: expect.any(String) });
      expect(one({ kind: 'choice', options: [{ label: 'A' }, { label: 7 }] })).toEqual({ error: expect.stringMatching(/label/) });
      expect(one({ kind: 'choice', options: [{ label: 'A' }, { label: 'A' }] })).toEqual({ error: expect.stringMatching(/used twice|duplicate/) });
      expect(one({ kind: 'choice', options: [{ label: '  ' }, { label: 'B' }] })).toEqual({ error: expect.stringMatching(/blank/) });
    });
  });
});
