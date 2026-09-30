import { describe, it, expect, afterEach, vi } from 'vitest';
import './activity';
import './activity-step';
import type { ActivityStep } from '../../primitives/activity';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
afterEach(() => document.body.replaceChildren());

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
type El = HTMLElement & Record<string, unknown>;

const STEPS: ActivityStep[] = [
  { id: 'r1', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 },
  { id: 't1', kind: 'tool', status: 'done', toolName: 'web_search', toolKind: 'search', input: { q: 'x' }, output: { n: 1 } },
];

const mountData = async (steps: ActivityStep[], attrs = ''): Promise<El> => {
  document.body.innerHTML = `<kai-activity ${attrs}></kai-activity>`; // test-authored markup
  await customElements.whenDefined('kai-activity');
  const el = document.querySelector('kai-activity') as unknown as El;
  el.steps = steps;
  await tick();
  return el;
};
const line = (el: El) => el.shadowRoot!.querySelector('[data-kai-activity] > button') as HTMLButtonElement;

describe('kai-activity, data mode', () => {
  it('renders the summary line as a closed disclosure and opens it by property', async () => {
    const el = await mountData(STEPS);
    expect(line(el).textContent).toBe('Thought for 6s · Searched the web');
    expect(line(el).getAttribute('aria-expanded')).toBe('false');
    const onOpen = vi.fn();
    el.addEventListener('kai-open-change', (e) => onOpen((e as CustomEvent).detail));
    (el as unknown as { show(): void }).show();
    await tick();
    expect(line(el).getAttribute('aria-expanded')).toBe('true');
    expect(el.shadowRoot!.querySelectorAll('li[data-kai-step]')).toHaveLength(2);
    expect(onOpen).toHaveBeenCalledWith({ open: true });
    expect(el.hasAttribute('open')).toBe(true);
  });

  it('the bare `open` attribute opens it, and `detail="summary"` removes the disclosure', async () => {
    const el = await mountData(STEPS, 'open');
    expect(line(el).getAttribute('aria-expanded')).toBe('true');
    el.detail = 'summary';
    await tick();
    expect(el.shadowRoot!.querySelector('button')).toBeNull();
  });

  it('fires kai-step-toggle with the step id', async () => {
    const el = await mountData(STEPS, 'default-open');
    const onToggle = vi.fn();
    el.addEventListener('kai-step-toggle', (e) => onToggle((e as CustomEvent).detail));
    (el.shadowRoot!.querySelector('[data-kai-step-trigger]') as HTMLElement).click();
    await tick();
    expect(onToggle).toHaveBeenCalledWith({ id: 't1', open: true });
  });

  it('shimmers while streaming', async () => {
    const el = await mountData([{ id: 'l', kind: 'tool', status: 'running', toolName: 'web_search', toolKind: 'search' }], 'streaming');
    expect(line(el).textContent).toBe('Searching the web…');
    expect(line(el).querySelector('[class*="kai-shimmer"]')).not.toBeNull();
  });

  it('renders steps as `.step` on a consumer element named in `renderers`', async () => {
    class Mine extends HTMLElement { step?: ActivityStep; }
    if (!customElements.get('mine-step')) customElements.define('mine-step', Mine);
    const el = await mountData([]);
    el.renderers = { tool: 'mine-step' };
    el.defaultOpen = true;
    el.setAttribute('open', '');
    el.steps = STEPS;
    await tick();
    const mine = el.shadowRoot!.querySelector('mine-step') as Mine;
    expect(mine.step?.id).toBe('t1');
  });
});

describe('kai-activity, item mode', () => {
  const mountItems = async (inner: string, attrs = ''): Promise<El> => {
    document.body.innerHTML = `<kai-activity ${attrs}>${inner}</kai-activity>`; // test-authored markup
    await customElements.whenDefined('kai-activity');
    await customElements.whenDefined('kai-activity-step');
    await tick(80);
    return document.querySelector('kai-activity') as unknown as El;
  };
  const TWO = `
    <kai-activity-step id="a" kind="reasoning" duration="6000" label="Thought">why</kai-activity-step>
    <kai-activity-step id="b" tool="web_search" label="Searched the web" duration="1200"><pre>args</pre></kai-activity-step>`;

  it('derives the same line shape from the children and marks them as list items', async () => {
    const el = await mountItems(TWO);
    expect(line(el).textContent).toBe('Thought for 6s · Searched the web');
    expect([...document.querySelectorAll('kai-activity-step')].every((s) => s.getAttribute('role') === 'listitem')).toBe(true);
  });

  it('a label-only step contributes its label verbatim', async () => {
    const el = await mountItems(`<kai-activity-step label="Booked the flight"></kai-activity-step>`);
    expect(line(el).textContent).toBe('Booked the flight');
  });

  it('opens to a slot of steps; a step with content is a disclosure that shows its content', async () => {
    const el = await mountItems(TWO, 'open');
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
    const b = document.querySelector('kai-activity-step#b')!;
    const trig = b.shadowRoot!.querySelector('[data-kai-step-trigger]') as HTMLButtonElement;
    expect(trig).not.toBeNull();
    expect(trig.getAttribute('aria-expanded')).toBe('false');
    expect(b.shadowRoot!.querySelector('slot')).toBeNull();
    trig.click();
    await tick();
    expect(trig.getAttribute('aria-expanded')).toBe('true');
    expect(b.shadowRoot!.querySelector('slot')).not.toBeNull();
  });

  it('a step toggle surfaces as kai-step-toggle on the container', async () => {
    const el = await mountItems(TWO, 'open');
    const onToggle = vi.fn();
    el.addEventListener('kai-step-toggle', (e) => onToggle((e as CustomEvent).detail));
    (document.querySelector('kai-activity-step#b')!.shadowRoot!.querySelector('[data-kai-step-trigger]') as HTMLElement).click();
    await tick();
    expect(onToggle).toHaveBeenCalledWith({ id: 'b', open: true });
  });

  it('a step whose status changes by property updates the line', async () => {
    const el = await mountItems(`<kai-activity-step id="x" tool="web_search" status="running" label="Searching"></kai-activity-step>`, 'streaming');
    expect(line(el).textContent).toBe('Searching the web…');
    (document.querySelector('kai-activity-step') as unknown as El).status = 'error';
    el.streaming = false;
    el.removeAttribute('streaming');
    await tick();
    expect(line(el).textContent).toBe('web_search failed');
  });

  it('roves one tab stop over the steps that can expand', async () => {
    const el = await mountItems(`
      <kai-activity-step id="a" label="One"><p>x</p></kai-activity-step>
      <kai-activity-step id="b" label="Two"><p>y</p></kai-activity-step>`, 'open');
    const trig = (id: string) => document.querySelector(`kai-activity-step#${id}`)!.shadowRoot!.querySelector('[data-kai-step-trigger]') as HTMLElement;
    expect(trig('a').getAttribute('tabindex')).toBe('0');
    expect(trig('b').getAttribute('tabindex')).toBe('-1');
    trig('a').focus();
    trig('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await tick();
    expect(trig('b').getAttribute('tabindex')).toBe('0');
    expect(el.isConnected).toBe(true);
  });

  it('warns once, and children win, when both `steps` and children are given', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = await mountItems(`<kai-activity-step label="Mine"></kai-activity-step>`);
    el.steps = STEPS;
    await tick();
    expect(line(el).textContent).toBe('Mine');
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('kai-activity')).length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
});

describe('kai-activity-step, standalone', () => {
  it('falls back to a derived label, and shows an error note', async () => {
    document.body.innerHTML = `<kai-activity-step kind="reasoning" status="running"></kai-activity-step><kai-activity-step status="error" tool="read_file" note="ENOENT"></kai-activity-step>`;
    await customElements.whenDefined('kai-activity-step');
    await tick();
    const [a, b] = [...document.querySelectorAll('kai-activity-step')];
    expect(a!.shadowRoot!.textContent).toContain('Thinking…');
    expect(b!.shadowRoot!.querySelector('[data-kai-step-note]')!.textContent).toBe('ENOENT');
  });
});
