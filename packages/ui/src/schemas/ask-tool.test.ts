import { describe, expect, it } from 'vitest';
import { askTool, cardTools, isCardTool, cardFromToolCall, cardTypeFromToolName, ASK_TOOL_NAME } from './index';

describe('askTool', () => {
  it('projects one schema per provider envelope', () => {
    const o = askTool({ provider: 'openai' });
    const a = askTool({ provider: 'anthropic' });
    const j = askTool({ provider: 'jsonschema' });
    expect(o.type).toBe('function');
    expect(o.function.name).toBe(ASK_TOOL_NAME);
    expect(a.name).toBe('kai_ask');
    expect(j.name).toBe('kai_ask');
    expect(o.function.parameters).toEqual(a.input_schema);
    expect(a.input_schema).toEqual(j.schema);
    expect(a.description).toMatch(/question/i);
    expect(a.description).toMatch(/wait/i);
  });

  it('carries the guidance limits and strips authoring metadata', () => {
    const { input_schema } = askTool({ provider: 'anthropic' });
    expect(JSON.stringify(input_schema)).not.toMatch(/\$schema|\$id|x-kai/);
    const s = input_schema as { required: string[]; properties: { questions: { minItems: number; maxItems: number; items: { properties: { header: { maxLength: number }; kind: { enum: string[] } } } } } };
    expect(s.required).toEqual(['questions']);
    expect(s.properties.questions.minItems).toBe(1);
    expect(s.properties.questions.maxItems).toBe(4);
    expect(s.properties.questions.items.properties.header.maxLength).toBe(12);
    expect(s.properties.questions.items.properties.kind.enum).toEqual(['choice', 'confirm', 'tasks', 'text', 'form']);
  });

  it('is not a card tool', () => {
    expect(cardTools({ provider: 'jsonschema' }).map((t) => t.name)).not.toContain('kai_ask');
    expect(isCardTool('kai_ask')).toBe(false);
    expect(cardTypeFromToolName('kai_ask')).toBeNull();
    expect(cardFromToolCall('kai_ask', { questions: [] }, { id: 'c' })).toBeNull();
    expect(isCardTool('kai_asks')).toBe(true);
  });

  it('throws a TypeError without a provider', () => {
    expect(() => (askTool as (o: unknown) => unknown)({})).toThrow(TypeError);
    expect(() => (askTool as (o: unknown) => unknown)(undefined)).toThrow(TypeError);
  });
});
