import { describe, it, expect } from 'vitest';
import { activityStepsFromParts, summarizeActivity, formatDuration, ACTIVITY_LABELS } from './activity';
import type { MessagePart } from '../web-components/chat/chat-types';

const R = (text: string, t?: [number, number?]): MessagePart => ({ type: 'reasoning', text, ...(t ? { timing: { startedAt: t[0], endedAt: t[1] } } : {}) });
const T = (type: string, state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error', extra: object = {}): MessagePart =>
  ({ type: 'tool', tool: { type, state, toolCallId: type + state, ...extra } } as MessagePart);

describe('activityStepsFromParts', () => {
  it('maps reasoning and tool parts to steps in order, skipping text', () => {
    const steps = activityStepsFromParts([R('hm'), { type: 'text', text: 'x' }, T('web_search', 'output-available')]);
    expect(steps.map((s) => [s.kind, s.status])).toEqual([['reasoning', 'done'], ['tool', 'done']]);
  });
  it('marks an unsettled tool running while streaming and an errored one error', () => {
    const steps = activityStepsFromParts([T('web_search', 'input-available'), T('read_file', 'output-error', { errorText: 'ENOENT' })], { streaming: true });
    expect(steps.map((s) => s.status)).toEqual(['running', 'error']);
    expect(steps[1].errorText).toBe('ENOENT');
  });
  it('an unsettled tool is INTERRUPTED once the turn is not streaming, never done', () => {
    for (const state of ['input-available', 'input-streaming'] as const) {
      expect(activityStepsFromParts([T('web_search', state)])[0].status, state).toBe('interrupted');
    }
    // A settled tool is unaffected, and streaming still means running.
    expect(activityStepsFromParts([T('web_search', 'output-available')])[0].status).toBe('done');
    expect(activityStepsFromParts([T('web_search', 'input-available')], { streaming: true })[0].status).toBe('running');
  });
  it('carries tool fields, classifies the kind and copies timing onto the step', () => {
    const [s] = activityStepsFromParts([T('web_search', 'output-available', { input: { q: 'x' }, output: { hits: 1 }, timing: { startedAt: 10, endedAt: 1210 } })]);
    expect(s).toMatchObject({ kind: 'tool', toolName: 'web_search', toolKind: 'search', input: { q: 'x' }, output: { hits: 1 }, startedAt: 10, endedAt: 1210, id: 'web_searchoutput-available' });
  });
  it('gives reasoning a stable id and its text', () => {
    const a = activityStepsFromParts([{ type: 'text', text: 't' }, R('thinking')]);
    expect(a[0]).toMatchObject({ kind: 'reasoning', text: 'thinking', id: 'reasoning-1' });
  });
  it('reasoning runs while streaming until its timing ends; the last untimed part runs too', () => {
    expect(activityStepsFromParts([R('a', [0])], { streaming: true })[0].status).toBe('running');
    expect(activityStepsFromParts([R('a', [0, 5])], { streaming: true })[0].status).toBe('done');
    expect(activityStepsFromParts([R('a')], { streaming: true })[0].status).toBe('running');
    expect(activityStepsFromParts([R('a'), { type: 'text', text: 'x' }], { streaming: true })[0].status).toBe('done');
  });
  it('labels the plan tool "Updated the plan"', () => {
    expect(activityStepsFromParts([T('kai_plan', 'output-available')])[0].label).toBe('Updated the plan');
  });
  it('tolerates parts with no timing (persisted threads)', () => {
    expect(() => summarizeActivity(activityStepsFromParts([R('a'), T('web_search', 'output-available')]))).not.toThrow();
  });
  it('never throws on a tool part missing every optional field', () => {
    expect(() => activityStepsFromParts([{ type: 'tool', tool: { type: '', state: 'input-available' } }, R('')])).not.toThrow();
  });
});

describe('summarizeActivity', () => {
  it('collapses same-kind runs into counts and adds durations when timed', () => {
    const s = activityStepsFromParts([R('a', [0, 6000]), T('web_search', 'output-available'), T('read_file', 'output-available'), T('read_file', 'output-available')]);
    expect(summarizeActivity(s)).toMatch(/^Thought for 6s · Searched( the web)? · .*2/);
    expect(summarizeActivity(s)).toBe('Thought for 6s · Searched the web · Read 2 files');
  });
  it('omits durations without timing', () => {
    expect(summarizeActivity(activityStepsFromParts([R('a')]))).toBe('Thought');
  });
  it('sums the reasoning in a run and omits the duration if any block is still open', () => {
    expect(summarizeActivity(activityStepsFromParts([R('a', [0, 2000]), R('b', [2000, 5000])]))).toBe('Thought for 5s');
    expect(summarizeActivity(activityStepsFromParts([R('a', [0, 2000]), R('b', [2000])]))).toBe('Thought');
  });
  it('does not merge different generic tools, or tools separated by another kind', () => {
    const s = activityStepsFromParts([T('read_file', 'output-available'), T('list_dir', 'output-available'), T('web_search', 'output-available'), T('read_file', 'output-available')]);
    expect(summarizeActivity(s)).toBe('Read a file · Used list_dir · Searched the web · Read a file');
  });
  it('counts kinds: pages, files, commands, images and the plan', () => {
    const s = activityStepsFromParts([
      T('fetch_url', 'output-available'), T('fetch_url', 'output-available'), T('fetch_url', 'output-available'),
      T('cat_file', 'output-available'),
      T('edit_file', 'output-available'), T('write_file', 'output-available'),
      T('bash', 'output-available'), T('image_gen', 'output-available'), T('kai_plan', 'output-available'),
    ]);
    expect(summarizeActivity(s)).toBe('Read 3 pages · Read a file · Edited 2 files · Ran a command · Generated an image · Updated the plan');
  });
  it('streaming form names the live step', () => {
    expect(summarizeActivity(activityStepsFromParts([T('web_search', 'input-available')], { streaming: true }), { streaming: true })).toMatch(/…$/);
    expect(summarizeActivity(activityStepsFromParts([T('web_search', 'input-available')], { streaming: true }), { streaming: true })).toBe('Searching the web…');
    expect(summarizeActivity(activityStepsFromParts([R('x')], { streaming: true }), { streaming: true })).toBe('Thinking…');
  });
  it('streaming with nothing live falls back to the settled summary', () => {
    const steps = activityStepsFromParts([T('web_search', 'output-available')], { streaming: true });
    expect(summarizeActivity(steps, { streaming: true })).toBe('Searched the web');
  });
  it('does not count an interrupted tool as completed work, and says so loudly', () => {
    const s = activityStepsFromParts([T('web_search', 'input-available')]);
    expect(summarizeActivity(s)).toBe('Called web_search, no result');
    expect(summarizeActivity(s)).not.toMatch(/Searched/);
    const mixed = activityStepsFromParts([T('web_search', 'output-available'), T('web_search', 'input-available'), T('web_search', 'input-available')]);
    expect(summarizeActivity(mixed)).toBe('Searched the web · Called web_search 2 times, no result');
    expect(summarizeActivity(activityStepsFromParts([T('', 'input-available')]))).toBe('Called a tool, no result');
  });
  it('an interrupted step is not "live": the streaming form only names a running one', () => {
    const steps = activityStepsFromParts([T('web_search', 'input-available')]);
    expect(summarizeActivity(steps, { streaming: true })).toBe('Called web_search, no result');
  });
  it('is empty for no steps', () => {
    expect(summarizeActivity([])).toBe('');
    expect(summarizeActivity([], { streaming: true })).toBe('');
  });
  it('a hostile tool name is text in the label, never interpreted', () => {
    const s = activityStepsFromParts([T('<img src=x onerror=alert(1)>', 'output-available')]);
    expect(summarizeActivity(s)).toBe('Used <img src=x onerror=alert(1)>');
  });
});

describe('formatDuration', () => {
  it('formats ms, seconds with one decimal under 10s, whole seconds, then minutes', () => {
    expect([0, 400, 999, 1000, 1200, 6000, 9949, 10_000, 59_400, 65_000, 3_600_000].map(formatDuration))
      .toEqual(['0ms', '400ms', '999ms', '1s', '1.2s', '6s', '9.9s', '10s', '59s', '1m 5s', '60m']);
  });
  it('is empty for a value that is not a duration', () => {
    expect([NaN, -1, Infinity].map(formatDuration)).toEqual(['', '', '']);
  });
});

describe('ACTIVITY_LABELS', () => {
  it('pins the wording of the whole table so a change is deliberate', () => {
    const rows = Object.fromEntries(
      Object.entries(ACTIVITY_LABELS).map(([k, v]) => [k, [v.done(1), v.done(3), v.done(1, 'my_tool'), v.live(), v.live('my_tool')]]),
    );
    expect(rows).toEqual({
      reasoning: ['Thought', 'Thought', 'Thought', 'Thinking…', 'Thinking…'],
      search: ['Searched', 'Searched 3 times', 'Searched', 'Searching…', 'Searching…'],
      fetch: ['Read a page', 'Read 3 pages', 'Read a page', 'Reading…', 'Reading…'],
      'file-change': ['Edited a file', 'Edited 3 files', 'Edited a file', 'Editing…', 'Editing…'],
      command: ['Ran a command', 'Ran 3 commands', 'Ran a command', 'Running…', 'Running…'],
      image: ['Generated an image', 'Generated 3 images', 'Generated an image', 'Generating an image…', 'Generating an image…'],
      'file-read': ['Read a file', 'Read 3 files', 'Read a file', 'Reading…', 'Reading…'],
      mcp: ['Used a tool', 'Used a tool 3 times', 'Used my_tool', 'Working…', 'Using my_tool…'],
      generic: ['Used a tool', 'Used a tool 3 times', 'Used my_tool', 'Working…', 'Using my_tool…'],
    });
  });
  it('says "the web" for web-named search tools and names the plan tool', () => {
    expect(ACTIVITY_LABELS.search.done(1, 'web_search')).toBe('Searched the web');
    expect(ACTIVITY_LABELS.search.live('web_search')).toBe('Searching the web…');
    expect(ACTIVITY_LABELS.generic.done(1, 'kai_plan')).toBe('Updated the plan');
    expect(ACTIVITY_LABELS.generic.done(2, 'kai_plan')).toBe('Updated the plan 2 times');
    expect(ACTIVITY_LABELS.generic.live('kai_plan')).toBe('Updating the plan…');
  });
});
