// tests/components/plan-hostile-output.test.tsx
//
// A plan label is what the MODEL wrote (`kai_plan` input). It reaches the DOM in the collapsed
// line (inside the shimmer), in every row, and in the header. Two properties per vector: nothing
// live lands in the DOM, and the source text stays VISIBLE (showing `<img onerror>` is the correct
// rendering). A 50,000-character label is clamped for display, with the ellipsis visible.
import { render, fireEvent } from '@solidjs/testing-library';
import { afterEach, describe, expect, test } from 'vitest';
import { Plan } from '../../src/components/plan/plan';
import type { PlanItem } from '../../src/primitives/plan';

afterEach(() => { document.body.innerHTML = ''; });

const IMG = '<img src=x onerror="window.__PWNED__=1">';
const SCRIPT = '<script>window.__PWNED__=1</script>';
const LINK = '[click](javascript:alert(1))';

const hostile: PlanItem[] = [
  { id: 'a', label: IMG, status: 'completed' },
  { id: 'b', label: SCRIPT, status: 'in_progress' },
  { id: 'c', label: LINK, status: 'pending' },
];

function assertInert(el: HTMLElement) {
  expect(el.querySelector('img, script, iframe, object, embed, video, audio, a')).toBeNull();
  for (const node of el.querySelectorAll('*')) {
    for (const a of node.attributes) expect(a.name.startsWith('on'), `${node.tagName} has ${a.name}`).toBe(false);
  }
  expect((window as unknown as Record<string, unknown>).__PWNED__).toBeUndefined();
}

describe('plan sink: labels are text', () => {
  test('collapsed line carries the running hostile label as visible text', () => {
    const { container } = render(() => <Plan items={hostile} />);
    assertInert(container);
    expect(container.textContent).toContain(SCRIPT);
  });

  test('every row shows its hostile label verbatim, and markdown is not interpreted', () => {
    const { container } = render(() => <Plan items={hostile} defaultOpen />);
    fireEvent.click(container.querySelector('[data-kai-plan] > button')!);
    fireEvent.click(container.querySelector('[data-kai-plan] > button')!);
    assertInert(container);
    const text = [...container.querySelectorAll('[data-kai-plan-item]')].map((r) => r.textContent);
    expect(text).toEqual([IMG, SCRIPT, LINK]);
  });

  test('a hostile header label is text too', () => {
    const { container } = render(() => <Plan items={hostile} label={IMG} defaultOpen />);
    assertInert(container);
    expect(container.textContent).toContain(IMG);
  });

  test('a 50,000-character label is clamped, visibly', () => {
    const long = 'x'.repeat(50_000);
    const { container } = render(() => (
      <Plan items={[{ id: 'a', label: long, status: 'in_progress' }]} defaultOpen />
    ));
    const shown = container.querySelector('[data-kai-plan-item]')!.textContent!;
    expect(shown.length).toBeLessThan(1000);
    expect(shown.endsWith('…')).toBe(true);
    expect(container.textContent!.length).toBeLessThan(3000);
  });
});
