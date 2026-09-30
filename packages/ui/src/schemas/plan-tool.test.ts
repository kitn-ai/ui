import { describe, expect, it } from 'vitest';
import { planTool, cardTools, isCardTool, cardFromToolCall, cardTypeFromToolName } from './index';
import { planSchema, PLAN_TOOL_NAME, validatePlan } from '../primitives/plan';

describe('planTool', () => {
  it('projects the same schema for every provider, in that provider\'s envelope', () => {
    const o = planTool({ provider: 'openai' });
    const a = planTool({ provider: 'anthropic' });
    const j = planTool({ provider: 'jsonschema' });
    expect(o.type).toBe('function');
    expect(o.function.name).toBe(PLAN_TOOL_NAME);
    expect(a.name).toBe(PLAN_TOOL_NAME);
    expect(j.name).toBe(PLAN_TOOL_NAME);
    expect(o.function.parameters).toEqual(a.input_schema);
    expect(a.input_schema).toEqual(j.schema);
    expect(o.function.description).toBe(a.description);
    expect(a.description).toMatch(/plan/i);
  });

  it('strips authoring metadata like the card tools do, and keeps the constraints', () => {
    const { input_schema } = planTool({ provider: 'anthropic' });
    expect(JSON.stringify(input_schema)).not.toMatch(/\$schema|\$id|x-kai/);
    expect(input_schema).toMatchObject({ type: 'object', required: ['items'] });
    const item = (input_schema as { properties: { items: { items: { properties: { status: { enum: string[] } } } } } }).properties.items.items;
    expect(item.properties.status.enum).toEqual(['pending', 'in_progress', 'completed']);
  });

  it('is not one of the card tools, and a card-tool loop does not treat it as a card', () => {
    const names = cardTools({ provider: 'jsonschema' }).map((t) => t.name);
    expect(names).not.toContain(PLAN_TOOL_NAME);
    expect(isCardTool(PLAN_TOOL_NAME)).toBe(false);
    expect(cardTypeFromToolName(PLAN_TOOL_NAME)).toBeNull();
    expect(cardFromToolCall(PLAN_TOOL_NAME, { items: [] }, { id: 'c' })).toBeNull();
    // ...while the neighbours are unaffected.
    expect(isCardTool('kai_plans')).toBe(true);
    expect(isCardTool('kai_confirm')).toBe(true);
  });

  it('throws a TypeError without a provider, like cardTools', () => {
    expect(() => (planTool as (o: unknown) => unknown)({})).toThrow(TypeError);
    expect(() => (planTool as (o: unknown) => unknown)(undefined)).toThrow(TypeError);
  });

  it('the schema it hands the model is the one validatePlan enforces', () => {
    expect(planSchema.required).toEqual(['items']);
    expect(validatePlan({ items: [{ id: 'a', label: 'x', status: 'pending' }] }).ok).toBe(true);
  });
});
