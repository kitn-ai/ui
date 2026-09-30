import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Plan, PlanItemRow, planSummary } from './plan';
import { DefaultPromptInput } from '../prompt/default-input';
import type { PlanItem } from '../../primitives/plan';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
afterEach(cleanup);

const ITEMS: PlanItem[] = [
  { id: 'a', label: 'Read the brief', status: 'completed' },
  { id: 'b', label: 'Draft the outline', status: 'completed' },
  { id: 'c', label: 'Write the intro', status: 'in_progress' },
  { id: 'd', label: 'Review', status: 'pending' },
];

const trigger = (c: HTMLElement) => c.querySelector('[data-kai-plan] > button') as HTMLButtonElement;
const rows = (c: HTMLElement) => [...c.querySelectorAll('[data-kai-plan-item]')] as HTMLElement[];

describe('planSummary', () => {
  it('is "N of M done" plus the in-progress label', () => {
    expect(planSummary(ITEMS)).toBe('2 of 4 done · Write the intro');
  });
  it('drops the tail when nothing is running, and when everything is done', () => {
    expect(planSummary(ITEMS.map((i) => ({ ...i, status: 'pending' as const })))).toBe('0 of 4 done');
    expect(planSummary(ITEMS.map((i) => ({ ...i, status: 'completed' as const })))).toBe('4 of 4 done');
  });
});

describe('Plan, collapsed', () => {
  it('is a closed disclosure whose text is "N of M done · <current>"', () => {
    const { container } = render(() => <Plan items={ITEMS} />);
    expect(trigger(container)).toHaveAttribute('aria-expanded', 'false');
    expect(trigger(container).textContent).toBe('2 of 4 done · Write the intro');
    expect(rows(container)).toHaveLength(0);
  });

  it('carries a progress bar named with the count', () => {
    const { container } = render(() => <Plan items={ITEMS} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    expect(bar).toHaveAttribute('aria-label', '2 of 4 steps done');
  });

  it('renders nothing for an empty plan', () => {
    const { container } = render(() => <Plan items={[]} />);
    expect(container.querySelector('[data-kai-plan]')).toBeNull();
  });
});

describe('Plan, expanded', () => {
  it('opens on click to one row per item, each glyph named with its status', () => {
    const { container } = render(() => <Plan items={ITEMS} />);
    fireEvent.click(trigger(container));
    expect(trigger(container)).toHaveAttribute('aria-expanded', 'true');
    expect(trigger(container).getAttribute('aria-controls')).toBe(container.querySelector('ol')!.id);
    expect(rows(container)).toHaveLength(4);
    const names = rows(container).map((r) => r.querySelector('[role="img"]')!.getAttribute('aria-label'));
    expect(names).toEqual(['completed', 'completed', 'in progress', 'pending']);
    expect(rows(container)[0]!.textContent).toBe('Read the brief');
    fireEvent.click(trigger(container));
    expect(rows(container)).toHaveLength(0);
  });

  it('strikes done items through and mutes pending ones', () => {
    const { container } = render(() => <Plan items={ITEMS} defaultOpen />);
    const [done, , running, pending] = rows(container);
    expect(done!.className).toContain('line-through');
    expect(pending!.className).toContain('text-muted-foreground');
    expect(running!.className).not.toContain('line-through');
  });

  it('is controllable, and reports a change', () => {
    const seen: boolean[] = [];
    const { container } = render(() => <Plan items={ITEMS} open onOpenChange={(o) => seen.push(o)} />);
    expect(rows(container)).toHaveLength(4);
    fireEvent.click(trigger(container));
    expect(seen).toEqual([false]);
  });

  it('the header label defaults to "Plan" and can be replaced', () => {
    const a = render(() => <Plan items={ITEMS} defaultOpen />);
    expect(trigger(a.container).textContent).toContain('Plan');
    cleanup();
    const b = render(() => <Plan items={ITEMS} defaultOpen label="Steps" />);
    expect(trigger(b.container).textContent).toContain('Steps');
  });
});

describe('Plan, composed rows', () => {
  it('item mode renders the same rows as data mode', () => {
    const data = render(() => <Plan items={ITEMS} defaultOpen />);
    const dataRows = rows(data.container).map((r) => [r.textContent, r.querySelector('[role="img"]')!.getAttribute('aria-label')]);
    cleanup();
    const composed = render(() => (
      <Plan items={ITEMS} defaultOpen>
        {ITEMS.map((i) => <PlanItemRow label={i.label} status={i.status} />)}
      </Plan>
    ));
    const composedRows = rows(composed.container).map((r) => [r.textContent, r.querySelector('[role="img"]')!.getAttribute('aria-label')]);
    expect(composedRows).toEqual(dataRows);
  });
});

describe('Plan inside the prompt input', () => {
  it('sits in the `above` region ahead of the divider, with no surface of its own', () => {
    const { container } = render(() => (
      <DefaultPromptInput
        value=""
        onValueChange={() => {}}
        onSubmit={() => {}}
        onSuggestionClick={() => {}}
        above={<Plan items={ITEMS} />}
      />
    ));
    const above = container.querySelector('[part="attachment-above"]')!;
    const divider = container.querySelector('[part="divider-above"]')!;
    const plan = above.querySelector('[data-kai-plan]') as HTMLElement;
    expect(plan).not.toBeNull();
    expect(above.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const cs = getComputedStyle(plan);
    expect(['', 'transparent', 'rgba(0, 0, 0, 0)']).toContain(cs.backgroundColor);
    expect(['', 'none']).toContain(cs.boxShadow);
    expect(plan.className).not.toMatch(/\b(border|shadow|bg-)\S*/);
  });
});
