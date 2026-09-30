import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { createSignal } from 'solid-js';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Activity, ActivityStepItem, activityLine, INTERRUPTED_NOTE, MAX_VALUE_CHARS, LONG_RUN_STEPS } from './activity';
import { summarizeActivity, type ActivityStep } from '../../primitives/activity';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
afterEach(cleanup);

const STEPS: ActivityStep[] = [
  { id: 'r1', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 },
  {
    id: 't1', kind: 'tool', status: 'done', toolName: 'web_search', toolKind: 'search', startedAt: 0, endedAt: 1200,
    input: { query: 'solid effects' }, output: { results: 2 },
  },
  {
    id: 't2', kind: 'tool', status: 'error', toolName: 'read_file', toolKind: 'file-read', startedAt: 0, endedAt: 100,
    input: { path: 'src/app.ts' }, errorText: 'ENOENT: no such file',
  },
];

const trigger = (c: HTMLElement) => c.querySelector('[data-kai-activity] > button') as HTMLButtonElement;
const rows = (c: HTMLElement) => [...c.querySelectorAll('li[data-kai-step]')] as HTMLElement[];
const stepButton = (li: HTMLElement) => li.querySelector('[data-kai-step-trigger]') as HTMLButtonElement | null;

describe('Activity, collapsed', () => {
  it('is one disclosure button, closed, whose text is the summary line', () => {
    const { container } = render(() => <Activity steps={STEPS.slice(0, 2)} />);
    const b = trigger(container);
    expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(b.textContent).toBe(summarizeActivity(STEPS.slice(0, 2)));
    expect(rows(container)).toHaveLength(0);
  });

  it('says what failed, and does not count the failed step as work done', () => {
    const { container } = render(() => <Activity steps={STEPS} />);
    expect(trigger(container).textContent).toBe("Thought for 6s · Searched the web · Couldn't read src/app.ts");
    // the dot turns red for a failure
    expect(container.querySelector('[data-kai-dot]')!.className).toContain('destructive-text');
  });

  it('names several failures by count', () => {
    const two = [STEPS[2]!, { ...STEPS[2]!, id: 't3', toolName: 'write_file' }];
    expect(activityLine(two)).toBe('2 steps failed');
  });

  it('a `summary` prop replaces the derived line', () => {
    const { container } = render(() => <Activity steps={STEPS} summary="Did some work" />);
    expect(trigger(container).textContent).toBe('Did some work');
  });
});

describe('Activity, expanded', () => {
  it('opens on click to a list with one row per step, and closes again', () => {
    const { container } = render(() => <Activity steps={STEPS} />);
    fireEvent.click(trigger(container));
    expect(trigger(container)).toHaveAttribute('aria-expanded', 'true');
    const list = container.querySelector('ol')!;
    expect(list.id).toBe(trigger(container).getAttribute('aria-controls'));
    expect(rows(container)).toHaveLength(3);
    fireEvent.click(trigger(container));
    expect(rows(container)).toHaveLength(0);
  });

  it('each row shows its label and duration', () => {
    const { container } = render(() => <Activity steps={STEPS} defaultOpen />);
    const [r, t] = rows(container);
    expect(r!.textContent).toContain('Thought');
    expect(r!.textContent).toContain('6s');
    expect(t!.textContent).toContain('Searched the web');
    expect(t!.textContent).toContain('1.2s');
  });

  it('a step with a detail is its own disclosure and shows Arguments and Result as JSON text', () => {
    const { container } = render(() => <Activity steps={STEPS} defaultOpen />);
    const [, t] = rows(container);
    const b = stepButton(t!)!;
    expect(b).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(b);
    expect(b).toHaveAttribute('aria-expanded', 'true');
    const panel = t!.querySelector(`[id="${b.getAttribute('aria-controls')}"]`)!;
    expect(panel.textContent).toContain('Arguments');
    expect(panel.textContent).toContain('"query": "solid effects"');
    expect(panel.textContent).toContain('Result');
    expect(panel.textContent).toContain('"results": 2');
  });

  it('a step with nothing to show is not a button', () => {
    const { container } = render(() => <Activity steps={[STEPS[0]!]} defaultOpen />);
    expect(stepButton(rows(container)[0]!)).toBeNull();
  });

  it('an error step is red, shows its reason under the step, and repeats it in the detail', () => {
    const { container } = render(() => <Activity steps={STEPS} defaultOpen />);
    const li = rows(container)[2]!;
    expect(li.getAttribute('data-kai-status')).toBe('error');
    expect(li.querySelector('[data-kai-step-note]')!.textContent).toBe('ENOENT: no such file');
    expect(li.querySelector('[data-kai-step-note]')!.className).toContain('destructive-text');
    fireEvent.click(stepButton(li)!);
    expect(li.querySelector('[data-kai-activity-value="Error"]')!.textContent).toContain('ENOENT: no such file');
  });

  it('reports a step toggle with the step id', () => {
    const onStepToggle = vi.fn();
    const { container } = render(() => <Activity steps={STEPS} defaultOpen onStepToggle={onStepToggle} />);
    fireEvent.click(stepButton(rows(container)[1]!)!);
    expect(onStepToggle).toHaveBeenCalledWith('t1', true);
  });

  it('an expanded step survives the steps being replaced with fresh objects (a stream tick)', () => {
    const [steps, setSteps] = createSignal(STEPS);
    const { container } = render(() => <Activity steps={steps()} defaultOpen />);
    fireEvent.click(stepButton(rows(container)[1]!)!);
    setSteps(STEPS.map((s) => ({ ...s })));
    expect(stepButton(rows(container)[1]!)).toHaveAttribute('aria-expanded', 'true');
  });

  it('two steps with the same id are still two rows', () => {
    const { container } = render(() => <Activity steps={[STEPS[1]!, { ...STEPS[1]! }]} defaultOpen />);
    expect(rows(container)).toHaveLength(2);
  });
});

describe('Activity, interrupted', () => {
  const INT: ActivityStep[] = [{ id: 'i', kind: 'tool', status: 'interrupted', toolName: 'run_tests', toolKind: 'command' }];
  it('reads as no result, in amber, distinct from an error', () => {
    const { container } = render(() => <Activity steps={INT} defaultOpen />);
    expect(trigger(container).textContent).toBe('Called run_tests, no result');
    expect(container.querySelector('[data-kai-dot]')!.className).toContain('warning');
    expect(container.querySelector('[data-kai-dot]')!.className).not.toContain('destructive');
    const li = rows(container)[0]!;
    expect(li.getAttribute('data-kai-status')).toBe('interrupted');
    expect(li.querySelector('[data-kai-step-note]')!.textContent).toBe(INTERRUPTED_NOTE);
    expect(li.querySelector('[data-kai-step-note]')!.className).toContain('warning');
    expect(li.textContent).toContain('Interrupted, no result');
  });
});

describe('Activity, streaming', () => {
  const LIVE: ActivityStep[] = [
    STEPS[0]!,
    { id: 'l', kind: 'tool', status: 'running', toolName: 'web_search', toolKind: 'search' },
  ];
  it('shows the live step in the present tense with the shimmer', () => {
    const { container } = render(() => <Activity steps={LIVE} streaming />);
    expect(trigger(container).textContent).toBe('Searching the web…');
    expect(trigger(container).querySelector('[class*="kai-shimmer"]')).not.toBeNull();
  });
  it('settled, it has no shimmer', () => {
    const { container } = render(() => <Activity steps={STEPS} />);
    expect(trigger(container).querySelector('[class*="kai-shimmer"]')).toBeNull();
  });
  it('a running step in the timeline shows a spinner glyph, not a check', () => {
    const { container } = render(() => <Activity steps={LIVE} streaming defaultOpen />);
    expect(rows(container)[1]!.getAttribute('data-kai-status')).toBe('running');
    expect(rows(container)[1]!.querySelector('svg.animate-spin, svg[class*="animate-spin"]')).not.toBeNull();
  });
});

describe('Activity detail="summary"', () => {
  it('is the line with no disclosure', () => {
    const { container } = render(() => <Activity steps={STEPS} detail="summary" defaultOpen />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[data-kai-activity-summary]')!.textContent).toBe(activityLine(STEPS));
    expect(rows(container)).toHaveLength(0);
  });
});

describe('Activity, keyboard', () => {
  it('Enter and Space toggle the line (native button)', () => {
    const { container } = render(() => <Activity steps={STEPS} />);
    const b = trigger(container);
    b.focus();
    fireEvent.click(b); // a native button turns Enter/Space into click
    expect(b).toHaveAttribute('aria-expanded', 'true');
  });

  it('gives the expandable steps one tab stop and moves it with the arrows', async () => {
    const { container } = render(() => <Activity steps={STEPS} defaultOpen />);
    await Promise.resolve();
    const [, a, b] = rows(container).map(stepButton) as HTMLButtonElement[];
    expect(a!.getAttribute('tabindex')).toBe('0');
    expect(b!.getAttribute('tabindex')).toBe('-1');
    a!.focus();
    fireEvent.keyDown(a!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(b);
    expect(b!.getAttribute('tabindex')).toBe('0');
    expect(a!.getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(b!, { key: 'Home' });
    expect(document.activeElement).toBe(a);
  });

  it('Enter on a step toggles its detail', async () => {
    const { container } = render(() => <Activity steps={STEPS} defaultOpen />);
    await Promise.resolve();
    const a = stepButton(rows(container)[1]!)!;
    a.focus();
    fireEvent.keyDown(a, { key: 'Enter' });
    expect(a).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapsing while focus is inside the timeline returns focus to the line', async () => {
    const { container } = render(() => <Activity steps={STEPS} defaultOpen />);
    await Promise.resolve();
    const a = stepButton(rows(container)[1]!)!;
    a.focus();
    fireEvent.click(trigger(container));
    expect(document.activeElement).toBe(trigger(container));
  });
});

describe('Activity, renderers', () => {
  it('draws a step with the consumer element and hands it `.step`; the others stay built in', () => {
    class MySearch extends HTMLElement { step?: ActivityStep; }
    if (!customElements.get('my-search-step')) customElements.define('my-search-step', MySearch);
    const { container } = render(() => <Activity steps={STEPS} defaultOpen renderers={{ 'tool:web_search': 'my-search-step' }} />);
    const el = container.querySelector('my-search-step') as MySearch;
    expect(el).not.toBeNull();
    expect(el.step?.id).toBe('t1');
    expect(container.querySelectorAll('my-search-step')).toHaveLength(1);
    // reasoning and read_file keep the built-in row
    expect(rows(container)[0]!.textContent).toContain('Thought');
    expect(rows(container)[2]!.textContent).toContain('Read a file');
  });

  it('`tool` matches any tool and a more specific key wins', () => {
    for (const t of ['any-tool-step', 'one-tool-step']) if (!customElements.get(t)) customElements.define(t, class extends HTMLElement {});
    const { container } = render(() => (
      <Activity steps={STEPS} defaultOpen renderers={{ tool: 'any-tool-step', 'tool:web_search': 'one-tool-step' }} />
    ));
    expect(container.querySelectorAll('one-tool-step')).toHaveLength(1);
    expect(container.querySelectorAll('any-tool-step')).toHaveLength(1);
  });
});

describe('Activity, controlled', () => {
  it('follows `open` and reports the change without changing itself', () => {
    const onOpenChange = vi.fn();
    const { container } = render(() => <Activity steps={STEPS} open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(trigger(container));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger(container)).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Activity, item mode', () => {
  it('renders the app\'s own rows in the same list, with the same disclosure', () => {
    const { container } = render(() => (
      <Activity summary="Two things happened">
        <ActivityStepItem label="Searched the web" duration="1.2s" status="done">
          <p>detail body</p>
        </ActivityStepItem>
        <ActivityStepItem label="Read a file" status="error" note="ENOENT" />
      </Activity>
    ));
    expect(trigger(container).textContent).toBe('Two things happened');
    fireEvent.click(trigger(container));
    expect(rows(container)).toHaveLength(2);
    const b = stepButton(rows(container)[0]!)!;
    expect(container.textContent).not.toContain('detail body');
    fireEvent.click(b);
    expect(container.textContent).toContain('detail body');
    expect(stepButton(rows(container)[1]!)).toBeNull();
    expect(rows(container)[1]!.querySelector('[data-kai-step-note]')!.textContent).toBe('ENOENT');
  });
});

describe('Activity, long runs', () => {
  it('caps the timeline and scrolls it', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...STEPS[1]!, id: `s${i}` }));
    const { container } = render(() => <Activity steps={many} defaultOpen />);
    const scroller = container.querySelector('[data-kai-activity-scroller]')!;
    expect(scroller.className).toContain('max-h-72');
    expect(scroller.className).toContain('overflow-y-auto');
    expect(rows(container)).toHaveLength(30);
  });

  it('truncates a very long tool name in the summary line, and keeps it whole on the step', () => {
    const name = 'x'.repeat(500);
    const step: ActivityStep = { id: 'n', kind: 'tool', status: 'done', toolName: name, toolKind: 'generic' };
    const { container } = render(() => <Activity steps={[step]} />);
    expect(trigger(container).textContent!.length).toBeLessThan(120);
    expect(trigger(container).textContent).toContain('…');
  });

  it('clamps a huge value with a visible truncated marker, and Show all reveals the rest', () => {
    const big = 'a'.repeat(MAX_VALUE_CHARS * 2 + 5);
    const step: ActivityStep = { id: 'b', kind: 'tool', status: 'done', toolName: 't', input: { blob: big } };
    const { container } = render(() => <Activity steps={[step]} defaultOpen />);
    fireEvent.click(stepButton(rows(container)[0]!)!);
    const marker = container.querySelector('[data-kai-truncated]')!;
    expect(marker.textContent).toMatch(/Truncated/);
    expect(marker.textContent).toContain('20,000');
    const shown = container.querySelector('[data-kai-activity-value="Arguments"]')!.textContent!;
    expect(shown.length).toBeLessThan(MAX_VALUE_CHARS + 500);
    fireEvent.click([...marker.querySelectorAll('button')].find((x) => x.textContent === 'Show all')!);
    expect(container.querySelector('[data-kai-truncated]')).toBeNull();
    expect(container.querySelector('[data-kai-activity-value="Arguments"]')!.textContent!.length).toBeGreaterThan(big.length);
  });
});

describe('Activity, timeline height cap', () => {
  const scroller = (c: HTMLElement) => c.querySelector('[data-kai-activity-scroller]') as HTMLElement;
  const run = (n: number) => Array.from({ length: n }, (_, i) => ({ ...STEPS[1]!, id: `s${i}` }));

  it('does not cap a short run, so an opened step is never clipped', () => {
    const { container } = render(() => <Activity steps={run(LONG_RUN_STEPS)} defaultOpen />);
    expect(scroller(container).className).not.toContain('max-h-72');
    expect(scroller(container).className).not.toContain('overflow-y-auto');
  });

  it('caps a run past the threshold', () => {
    const { container } = render(() => <Activity steps={run(LONG_RUN_STEPS + 1)} defaultOpen />);
    expect(scroller(container).className).toContain('max-h-72');
  });

  it('lifts the cap while any step of a long run is open, and restores it when closed', () => {
    const { container } = render(() => <Activity steps={run(LONG_RUN_STEPS + 1)} defaultOpen />);
    const b = stepButton(rows(container)[0]!)!;
    fireEvent.click(b);
    expect(scroller(container).className).not.toContain('max-h-72');
    fireEvent.click(b);
    expect(scroller(container).className).toContain('max-h-72');
  });

  it('item mode is never capped (the app owns the rows)', () => {
    const { container } = render(() => (
      <Activity summary="x" defaultOpen><ActivityStepItem label="a" /></Activity>
    ));
    expect(scroller(container).className).not.toContain('max-h-72');
  });
});

describe('Activity, failed file read', () => {
  const failed = (input: Record<string, unknown> | undefined, extra: Partial<ActivityStep> = {}): ActivityStep => ({
    id: 'f', kind: 'tool', status: 'error', toolName: 'read_file', toolKind: 'file-read', errorText: 'ENOENT', ...(input ? { input } : {}), ...extra,
  });

  it("names the path in a fixed phrase: Couldn't read <path>", () => {
    expect(activityLine([failed({ path: 'src/app.ts' })])).toBe("Couldn't read src/app.ts");
    expect(activityLine([failed({ file_path: 'a/b.ts' })])).toBe("Couldn't read a/b.ts");
  });
  it('keeps it after the counted steps', () => {
    expect(activityLine([STEPS[0]!, failed({ path: 'src/app.ts' })])).toBe("Thought for 6s · Couldn't read src/app.ts");
  });
  it('falls back to "<tool> failed" without a usable string path, or for other kinds', () => {
    expect(activityLine([failed(undefined)])).toBe('read_file failed');
    expect(activityLine([failed({ path: 42 })])).toBe('read_file failed');
    expect(activityLine([failed({ path: '   ' })])).toBe('read_file failed');
    expect(activityLine([failed({ path: 'x' }, { toolKind: 'search' })])).toBe('read_file failed');
  });
  it('strips control characters and newlines, and truncates a long path', () => {
    const line = activityLine([failed({ path: 'a\n\r\u0000b\u202ec\td' })]);
    expect(line).toBe("Couldn't read a b c d");
    const long = activityLine([failed({ path: 'p'.repeat(1_000_000) })]);
    expect(long.length).toBeLessThan(150);
    expect(long).toContain('…');
  });
  it('renders the path as text in the line, never as markup', () => {
    const { container } = render(() => <Activity steps={[failed({ path: '<img src=x onerror=alert(1)>' })]} />);
    expect(trigger(container).textContent).toBe("Couldn't read <img src=x onerror=alert(1)>");
    expect(container.querySelector('img, a')).toBeNull();
  });
});
