import { describe, it, expect } from 'vitest';
import { activityStepsFromParts, summarizeActivity, formatDuration, truncateForDisplay, MAX_DISPLAY_NAME, ACTIVITY_LABELS } from './activity';
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
  it('is total over corrupt saved threads: malformed parts are skipped, good ones kept', () => {
    const corrupt = [
      null, undefined, 7, 'text', [], {}, { type: 'tool' }, { type: 'tool', tool: null }, { type: 'tool', tool: 'x' },
      { type: 'tool', tool: { state: 'output-available' } },
      { type: 'tool', tool: { type: 42, state: 'output-available', toolCallId: 9 } },
      { type: 'reasoning' }, { type: 'reasoning', text: 5, timing: 'soon' },
      { type: 'weird', text: 'x' },
      T('web_search', 'output-available'),
    ] as unknown as MessagePart[];
    let steps: ReturnType<typeof activityStepsFromParts> = [];
    expect(() => { steps = activityStepsFromParts(corrupt); }).not.toThrow();
    expect(steps.some((s) => s.toolName === 'web_search' && s.status === 'done')).toBe(true);
    expect(() => summarizeActivity(steps)).not.toThrow();
    expect(steps.every((s) => typeof s.id === 'string')).toBe(true);
    for (const bad of [undefined, null, 'parts', 5, {}]) {
      expect(activityStepsFromParts(bad as never), String(bad)).toEqual([]);
    }
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

describe('truncateForDisplay', () => {
  it('leaves a short string alone and cuts a long one with a visible ellipsis', () => {
    expect(truncateForDisplay('web_search')).toBe('web_search');
    expect(truncateForDisplay('x'.repeat(MAX_DISPLAY_NAME))).toBe('x'.repeat(MAX_DISPLAY_NAME));
    const cut = truncateForDisplay('x'.repeat(MAX_DISPLAY_NAME + 1));
    expect(cut).toBe(`${'x'.repeat(MAX_DISPLAY_NAME)}…`);
    expect(truncateForDisplay('abcdef', 3)).toBe('abc…');
  });
  it('never splits a surrogate pair', () => {
    const cut = truncateForDisplay('😀'.repeat(10), 3);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/[\uD800-\uDBFF]…$/);
  });
  it('is total: a non-string is empty, a bad max falls back to the default', () => {
    expect(truncateForDisplay(undefined as never)).toBe('');
    expect(truncateForDisplay('abc', NaN)).toBe('abc');
  });
});

describe('a huge tool name in the summary', () => {
  const huge = 'a'.repeat(1_000_000);
  it('is truncated with a visible marker in every phrase that names the tool, but kept whole on the step', () => {
    const settled = activityStepsFromParts([T(huge, 'output-available')]);
    expect(settled[0].toolName).toHaveLength(1_000_000);
    const line = summarizeActivity(settled);
    expect(line).toBe(`Used ${'a'.repeat(MAX_DISPLAY_NAME)}…`);
    const interrupted = summarizeActivity(activityStepsFromParts([T(huge, 'input-available')]));
    expect(interrupted).toBe(`Called ${'a'.repeat(MAX_DISPLAY_NAME)}…, no result`);
    const live = summarizeActivity(activityStepsFromParts([T(huge, 'input-available')], { streaming: true }), { streaming: true });
    expect(live).toBe(`Using ${'a'.repeat(MAX_DISPLAY_NAME)}…`);
    expect(line.length).toBeLessThan(200);
  });
  it('does not merge two long names that only differ after the cut', () => {
    const a = 'n'.repeat(500) + 'A';
    const b = 'n'.repeat(500) + 'B';
    const steps = activityStepsFromParts([T(a, 'output-available'), T(b, 'output-available')]);
    expect(summarizeActivity(steps).split(' · ')).toHaveLength(2);
  });
});

describe('a realistic turn hand-written with kind: "generic"', () => {
  // Apps build parts by hand, and `kind: 'generic'` is what ToolPart's own docs show. "generic" means
  // "not classified", so the tool NAME still decides; an explicit kind of any other value wins.
  const tool = (type: string, toolCallId: string, extra: Record<string, unknown> = {}): MessagePart => ({
    type: 'tool',
    tool: { type, toolCallId, kind: 'generic', state: 'output-available', input: {}, output: {}, ...extra } as never,
  });
  const turn: MessagePart[] = [
    { type: 'text', text: 'Intro' },
    { type: 'reasoning', text: 'thinking', timing: { startedAt: 0, endedAt: 5000 } },
    tool('web_search', 'c1'),
    tool('fetch_url', 'c2', { state: 'output-error', errorText: 'boom' }),
    tool('read_file', 'c3'),
    { type: 'text', text: 'Middle' },
    tool('get_weather', 'c4'),
    { type: 'text', text: 'End' },
  ];
  const run1 = turn.slice(1, 5) as MessagePart[];
  const run2 = turn.slice(6, 7) as MessagePart[];

  it('summarises by kind, not by tool name', () => {
    const settled = activityStepsFromParts(run1).filter((st) => st.status !== 'error');
    expect(summarizeActivity(settled)).toBe('Thought for 5s · Searched the web · Read a file');
    expect(summarizeActivity(activityStepsFromParts(run2))).toBe('Used get_weather');
  });

  it('counts consecutive calls of one kind', () => {
    const steps = activityStepsFromParts([tool('web_search', 'a'), tool('web_search', 'b'), tool('web_search', 'c'), tool('read_file', 'd'), tool('read_file', 'e')]);
    expect(summarizeActivity(steps)).toBe('Searched the web 3 times · Read 2 files');
  });

  it('an explicit non-generic kind still wins over the name', () => {
    const steps = activityStepsFromParts([tool('web_search', 'a', { kind: 'fetch' })]);
    expect(steps[0]!.toolKind).toBe('fetch');
  });
});
