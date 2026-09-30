import { describe, it, expect } from 'vitest';
import type { ChatMessage, MessagePart } from '../web-components/chat/chat-types';
import type { ToolPart } from '../components/tool/tool-types';
import { PLAN_TOOL_NAME, isPlanTool, planFromMessages, validatePlan } from './plan';

const item = (id: string, status: 'pending' | 'in_progress' | 'completed' = 'pending') => ({ id, label: `step ${id}`, status });
const planCall = (id: string, input: unknown, state: ToolPart['state'] = 'output-available'): MessagePart => ({
  type: 'tool',
  tool: { type: PLAN_TOOL_NAME, state, toolCallId: id, input: input as Record<string, unknown> },
});
const asst = (id: string, ...parts: MessagePart[]): ChatMessage => ({ id, role: 'assistant', parts });

describe('isPlanTool', () => {
  it('recognises kai_plan exactly', () => {
    expect(PLAN_TOOL_NAME).toBe('kai_plan');
    expect(isPlanTool('kai_plan')).toBe(true);
    for (const n of ['KAI_PLAN', 'kai_plan ', 'kai_confirm', 'plan', '', 'kai_plan2']) expect(isPlanTool(n), n).toBe(false);
  });
});

describe('validatePlan', () => {
  it('accepts a well-formed plan and rebuilds the items field by field', () => {
    const r = validatePlan({ items: [{ ...item('a', 'completed'), extra: 'ignored' }, item('b', 'in_progress')] });
    expect(r).toEqual({ ok: true, items: [item('a', 'completed'), item('b', 'in_progress')] });
  });
  it('accepts an empty plan (it clears the plan)', () => {
    expect(validatePlan({ items: [] })).toEqual({ ok: true, items: [] });
  });

  const malformed: [string, unknown][] = [
    ['undefined', undefined],
    ['null', null],
    ['a string', 'plan'],
    ['an array', [item('a')]],
    ['no items', {}],
    ['items not an array', { items: 'a,b' }],
    ['items an object', { items: { 0: item('a') } }],
    ['an item that is null', { items: [null] }],
    ['an item that is a string', { items: ['do it'] }],
    ['a missing id', { items: [{ label: 'x', status: 'pending' }] }],
    ['an empty id', { items: [{ id: '', label: 'x', status: 'pending' }] }],
    ['a numeric id', { items: [{ id: 1, label: 'x', status: 'pending' }] }],
    ['a missing label', { items: [{ id: 'a', status: 'pending' }] }],
    ['a blank label', { items: [{ id: 'a', label: '   ', status: 'pending' }] }],
    ['an unknown status', { items: [{ id: 'a', label: 'x', status: 'done' }] }],
    ['a missing status', { items: [{ id: 'a', label: 'x' }] }],
    ['duplicate ids', { items: [item('a'), item('a')] }],
  ];
  it.each(malformed)('returns a loud error object for %s, never throws', (_name, input) => {
    let r!: ReturnType<typeof validatePlan>;
    expect(() => { r = validatePlan(input); }).not.toThrow();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/^kai_plan input is invalid: /);
    expect(r.error).toMatch(/Send the complete plan again/);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('survives hostile values: cycles, BigInt, getters, __proto__, huge strings', () => {
    const cyc: Record<string, unknown> = { id: 'a', label: 'x', status: 'nope' };
    cyc.self = cyc;
    const hostile = [
      { items: [cyc] },
      { items: [{ id: 'a', label: 'x', status: 10n }] },
      { items: [{ id: 'a', label: 'x'.repeat(50_000), status: 'y'.repeat(50_000) }] },
      JSON.parse('{"items":[{"id":"a","label":"x","status":"pending","__proto__":{"polluted":true}}]}'),
      { get items(): unknown { throw new Error('boom'); } },
    ];
    for (const h of hostile) expect(() => validatePlan(h)).not.toThrow();
    // A 50k status is echoed truncated, not whole.
    const long = validatePlan(hostile[2]);
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.error.length).toBeLessThan(1500);
    // The __proto__ entry validates and never reaches the rebuilt item.
    const ok = validatePlan(hostile[3]);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(Object.keys(ok.items[0])).toEqual(['id', 'label', 'status']);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    }
  });

  it('caps the issue list and says how many more there were', () => {
    const r = validatePlan({ items: Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, label: 'x', status: 'bad' })) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues).toHaveLength(10);
      expect(r.error).toMatch(/and 20 more/);
    }
  });
});

describe('planFromMessages', () => {
  it('is undefined with no kai_plan call', () => {
    expect(planFromMessages([])).toBeUndefined();
    expect(planFromMessages([{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }, asst('a', { type: 'text', text: 'yo' })])).toBeUndefined();
  });
  it('returns the LAST kai_plan input across a realistic thread', () => {
    const thread: ChatMessage[] = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'ship it' }] },
      asst('a1',
        { type: 'reasoning', text: 'plan first' },
        planCall('p1', { items: [item('a', 'in_progress'), item('b')] }),
        { type: 'tool', tool: { type: 'web_search', state: 'output-available', toolCallId: 's1', input: { q: 'x' } } },
        planCall('p2', { items: [item('a', 'completed'), item('b', 'in_progress')] }),
        { type: 'text', text: 'working' }),
      { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'go on' }] },
      asst('a2', planCall('p3', { items: [item('a', 'completed'), item('b', 'completed'), item('c', 'in_progress')] })),
    ];
    expect(planFromMessages(thread)?.map((i) => [i.id, i.status])).toEqual([['a', 'completed'], ['b', 'completed'], ['c', 'in_progress']]);
    expect(planFromMessages(thread.slice(0, 2))?.map((i) => i.id)).toEqual(['a', 'b']);
    expect(planFromMessages(thread.slice(0, 2))?.[1].status).toBe('in_progress');
  });
  it('shows an empty plan as [] when the model clears it', () => {
    expect(planFromMessages([asst('a', planCall('p1', { items: [item('a')] }), planCall('p2', { items: [] }))])).toEqual([]);
  });
  it('skips a call still streaming its arguments, an errored call and an invalid one, keeping the last good plan', () => {
    const good = planCall('p1', { items: [item('a', 'in_progress')] });
    const thread = [asst('a', good,
      planCall('p2', { items: [item('a', 'completed'), item('b')] }, 'input-streaming'),
      planCall('p3', { items: [item('z')] }, 'output-error'),
      planCall('p4', { items: [{ id: 'q', label: 'x', status: 'wat' }] }))];
    expect(planFromMessages(thread)).toEqual([item('a', 'in_progress')]);
  });
  it('is total over corrupt saved threads: skips malformed messages and parts, still finds the plan', () => {
    const good = asst('g', planCall('p', { items: [item('a', 'in_progress')] }));
    const corrupt = [
      null, undefined, 5, 'm', {}, { id: 'x', role: 'assistant' }, { id: 'x', parts: null }, { id: 'x', parts: 'no' },
      { id: 'x', role: 'assistant', parts: [null, undefined, 3, {}, { type: 'tool' }, { type: 'tool', tool: null }, { type: 'tool', tool: 'x' }] },
      good,
      { id: 'y', role: 'assistant', parts: [null, { type: 'tool', tool: null }] },
    ] as unknown as ChatMessage[];
    let r: ReturnType<typeof planFromMessages>;
    expect(() => { r = planFromMessages(corrupt); }).not.toThrow();
    expect(r!).toEqual([item('a', 'in_progress')]);
    for (const bad of [undefined, null, 'm', 5, {}]) {
      expect(() => planFromMessages(bad as never), String(bad)).not.toThrow();
      expect(planFromMessages(bad as never)).toBeUndefined();
    }
  });
  it('never throws on a tool part with no input', () => {
    expect(planFromMessages([asst('a', { type: 'tool', tool: { type: 'kai_plan', state: 'input-available', toolCallId: 'x' } })])).toBeUndefined();
  });
});
