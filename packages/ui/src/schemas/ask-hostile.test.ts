// The model controls every byte of a `kai_ask` call. None of it may throw, pollute, or produce an
// unbounded error message.
import { describe, it, expect, vi } from 'vitest';
import { questionsFromToolCall } from './ask';

const call = (input: unknown) => questionsFromToolCall('kai_ask', input, { id: 'c' });
const q = (over: Record<string, unknown> = {}) => ({ header: 'H', question: 'Q', kind: 'text', ...over });
const MB = 'x'.repeat(1_000_000);

describe('questionsFromToolCall under hostile input', () => {
  it('never throws on anything JSON or JS can hand it', () => {
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    const thrower = { get questions(): never { throw new Error('boom'); } };
    const inputs: unknown[] = [
      undefined, null, 0, NaN, true, 'x', [], {}, { questions: null }, { questions: 'x' }, { questions: {} }, { questions: [null] },
      { questions: [1] }, { questions: [[]] }, { questions: [q({ kind: 5 })] }, { questions: [q({ header: 5 })] },
      { questions: [q({ question: {} })] }, { questions: [q({ kind: 'form', fields: cyc })] }, thrower,
      Object.create(null), { questions: [q({ options: [null, 1, 'a'] , kind: 'choice'})] }, { questions: [q({ multiSelect: 'yes' })] },
      { questions: [q({ required: 'no' })] }, { questions: [q({ placeholder: 5 })] }, { questions: [q({ kind: 'choice', options: [{ label: 'A', description: 5 }, { label: 'B' }] })] },
    ];
    for (const i of inputs) {
      expect(() => call(i)).not.toThrow();
      const r = call(i);
      expect(r === null || typeof r === 'object').toBe(true);
    }
  });

  it('errors on wrong types are errors, not repairs', () => {
    for (const bad of [{ header: 5 }, { question: {} }, { kind: 5 }, { multiSelect: 'yes' }, { required: 'no' }, { placeholder: 5 }]) {
      expect(call({ questions: [q(bad)] })).toEqual({ error: expect.any(String) });
    }
  });

  it('a huge array of questions does not throw, keeps them all, and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = call({ questions: Array.from({ length: 20_000 }, () => q()) });
    expect((r as { questions: unknown[] }).questions).toHaveLength(20_000);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0]).length).toBeLessThan(2000);
    warn.mockRestore();
  });

  it('bounds every error message however large the offending value is', () => {
    const cases: unknown[] = [
      { questions: [q({ kind: MB })] },
      { questions: [q({ header: MB, kind: 'nope' })] },
      { questions: [q({ id: MB }), q({ id: MB })] },
      { questions: [q({ kind: 'choice', options: [{ label: MB }, { label: MB }] })] },
      { questions: Array.from({ length: 5000 }, () => q({ kind: 'bogus' })) },
      { questions: Array.from({ length: 5000 }, () => q({ header: 5 })) },
      MB,
    ];
    for (const c of cases) {
      const r = call(c) as { error: string };
      expect(typeof r.error).toBe('string');
      expect(r.error.length).toBeLessThan(2000);
    }
  });

  it('keeps 1MB strings verbatim in a valid call (the panel clamps, the kit does not decide)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = call({ questions: [q({ header: MB, question: MB, kind: 'choice', options: [{ label: 'A', preview: MB, description: MB }, { label: 'B' }] })] }) as {
      questions: { question: string; options: { preview: string }[] }[];
    };
    expect(r.questions[0].question.length).toBe(1_000_000);
    expect(r.questions[0].options[0].preview.length).toBe(1_000_000);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0]).length).toBeLessThan(2000);
    warn.mockRestore();
  });

  it('HTML and script text rides through as plain strings, unchanged', () => {
    const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>javascript:alert(3)';
    const r = call({ questions: [q({ header: 'H', question: evil, kind: 'choice', options: [{ label: evil, description: evil, preview: evil }, { label: 'B' }] })] }) as {
      questions: { question: string; options: { label: string; preview: string }[] }[];
    };
    expect(r.questions[0].question).toBe(evil);
    expect(r.questions[0].options[0]).toEqual({ label: evil, description: evil, preview: evil });
  });

  it('prototype-pollution keys neither pollute nor ride: unknown keys are not copied', () => {
    const payload = JSON.parse(
      '{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":2}},"questions":[{"__proto__":{"polluted":3},"header":"H","question":"Q","kind":"choice","constructor":"x","options":[{"label":"A","__proto__":{"polluted":4}},{"label":"B"}]}]}',
    );
    const r = call(payload) as unknown as { questions: Record<string, unknown>[] };
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(r, 'constructor')).toBe(false);
    expect(Object.keys(r.questions[0]).sort()).toEqual(['header', 'id', 'kind', 'options', 'question', 'required']);
    expect(Object.keys((r.questions[0].options as object[])[0])).toEqual(['label']);
    expect(Object.getPrototypeOf(r.questions[0])).toBe(Object.prototype);
  });

  it('a form `fields` object with pollution keys is copied without touching any prototype', () => {
    const fields = JSON.parse('{"type":"object","__proto__":{"polluted":9},"properties":{"__proto__":{"polluted":8},"a":{"type":"string"}}}');
    const r = call({ questions: [q({ kind: 'form', fields })] }) as { questions: { fields: Record<string, unknown> }[] };
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(r.questions[0].fields)).toBe(Object.prototype);
    expect((r.questions[0].fields as { polluted?: unknown }).polluted).toBeUndefined();
    expect(r.questions[0].fields.type).toBe('object');
  });

  it('a model-supplied id of __proto__ is just a string', () => {
    const r = call({ questions: [q({ id: '__proto__' })] }) as { questions: { id: string }[] };
    expect(r.questions[0].id).toBe('__proto__');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('a deeply nested `fields` is an error, not a stack overflow', () => {
    let deep: Record<string, unknown> = {};
    for (let i = 0; i < 100_000; i++) deep = { n: deep };
    expect(() => call({ questions: [q({ kind: 'form', fields: deep })] })).not.toThrow();
    expect(call({ questions: [q({ kind: 'form', fields: deep })] })).toEqual({ error: expect.stringMatching(/fields/) });
  });
});
