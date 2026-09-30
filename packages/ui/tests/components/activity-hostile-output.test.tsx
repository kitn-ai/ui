// tests/components/activity-hostile-output.test.tsx
//
// The activity timeline shows what the MODEL produced: a step label, a tool name, arguments, a
// result, an error and reasoning text. The threat model is model OUTPUT (retrieval over an
// untrusted document, a prompt injection), not a hostile provider.
//
// Two properties for every vector, and both matter:
//   1. nothing live lands in the DOM (no img/script/iframe element, no handler, no javascript: link), and
//   2. the source text stays VISIBLE, because showing `<img onerror>` is the correct rendering of a
//      model explaining it. A filter that deleted it would pass (1) and be a worse UI.
// A 50,000-character argument must clamp WITH a visible marker (decide loudly) and stay responsive.
import { render, fireEvent } from '@solidjs/testing-library';
import { afterEach, describe, expect, test } from 'vitest';
import { Activity, ActivityStepItem, MAX_VALUE_CHARS } from '../../src/components/activity/activity';
import type { ActivityStep } from '../../src/primitives/activity';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
afterEach(() => { document.body.innerHTML = ''; });

const IMG = '<img src=x onerror="window.__PWNED__=1">';
const SCRIPT = '<script>window.__PWNED__=1</script>';
const JS_URL = 'javascript:alert(1)';

const hostile: ActivityStep[] = [
  { id: 'r', kind: 'reasoning', status: 'done', label: IMG, text: `Thinking about ${IMG}\n\n[click](${JS_URL})\n\n${SCRIPT}` },
  {
    id: 't', kind: 'tool', status: 'error', toolName: IMG, toolKind: 'generic',
    input: { q: SCRIPT, href: JS_URL }, output: { html: IMG, link: JS_URL },
    errorText: `failed: ${IMG}`,
  },
];

const expandAll = (c: HTMLElement) => {
  for (const b of c.querySelectorAll<HTMLButtonElement>('[data-kai-step-trigger]')) fireEvent.click(b);
};
const settle = () => new Promise((r) => setTimeout(r, 50));

function assertInert(el: HTMLElement) {
  expect(el.querySelector('img, script, iframe, object, embed, video, audio')).toBeNull();
  for (const node of el.querySelectorAll('*')) {
    for (const a of node.attributes) {
      expect(a.name.startsWith('on'), `${node.tagName} has ${a.name}`).toBe(false);
    }
  }
  for (const a of el.querySelectorAll('a')) expect(a.getAttribute('href') ?? '').not.toMatch(/^\s*javascript:/i);
  expect((window as unknown as Record<string, unknown>).__PWNED__).toBeUndefined();
}

describe('activity sink: model output never becomes live DOM', () => {
  test('a hostile tool name and label stay visible text in the collapsed line and the rows', () => {
    const { container } = render(() => <Activity steps={hostile} defaultOpen />);
    assertInert(container);
    // the tool name is in the (failed) summary line, and the label is the reasoning row's text
    expect(container.textContent).toContain('<img src=x onerror=');
    expect(container.querySelector('[data-kai-step]')!.textContent).toContain(IMG);
  });

  test('arguments, results, errors and reasoning render as inert, visible text', async () => {
    const { container } = render(() => <Activity steps={hostile} defaultOpen />);
    expandAll(container);
    await settle();
    assertInert(container);
    const text = container.textContent ?? '';
    expect(text).toContain('<script>window.__PWNED__=1</script>');
    expect(text).toContain('javascript:alert(1)');
    expect(text).toContain('failed: <img src=x onerror=');
    // the markdown link is not navigable
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
  });

  test('item mode: text a consumer passes as label, note and detail is text too', () => {
    const { container } = render(() => (
      <Activity summary={IMG} defaultOpen>
        <ActivityStepItem label={IMG} status="error" note={SCRIPT}><p>{JS_URL}</p></ActivityStepItem>
      </Activity>
    ));
    fireEvent.click(container.querySelector('[data-kai-step-trigger]')!);
    assertInert(container);
    expect(container.textContent).toContain(IMG);
    expect(container.textContent).toContain(SCRIPT);
  });

  test('a 50,000-character argument clamps with a visible marker and a way to see it all', () => {
    const big = 'A'.repeat(50_000);
    const steps: ActivityStep[] = [{ id: 'b', kind: 'tool', status: 'done', toolName: 'echo', input: { text: big } }];
    const { container } = render(() => <Activity steps={steps} defaultOpen />);
    const t0 = performance.now();
    fireEvent.click(container.querySelector('[data-kai-step-trigger]')!);
    expect(performance.now() - t0).toBeLessThan(2000);
    const marker = container.querySelector('[data-kai-truncated]');
    expect(marker).not.toBeNull();
    expect(marker!.textContent).toMatch(/Truncated/);
    const rendered = container.querySelector('[data-kai-activity-value="Arguments"]')!.textContent!;
    // the clamp, not the whole value (the marker text is inside the block too)
    expect(rendered.length).toBeLessThan(MAX_VALUE_CHARS + 500);
    expect(rendered.length).toBeLessThan(big.length);
    expect(Array.from(marker!.querySelectorAll('button')).some((b) => b.textContent === 'Show all')).toBe(true);
  });

  describe('a failed file read names its path in a fixed phrase', () => {
    const failedRead = (path: unknown): ActivityStep[] => [
      { id: 'f', kind: 'tool', status: 'error', toolName: 'read_file', toolKind: 'file-read', input: { path }, errorText: 'ENOENT' },
    ];

    test('HTML in the path stays visible text, with no element and no link', () => {
      const { container } = render(() => <Activity steps={failedRead(`${IMG}${SCRIPT}`)} />);
      assertInert(container);
      expect(container.querySelector('button')!.textContent).toContain("Couldn't read <img src=x onerror=");
      expect(container.querySelector('a')).toBeNull();
    });

    test('control characters and newlines cannot reshape the line', () => {
      const { container } = render(() => <Activity steps={failedRead('a\n\r\u0000\u001b[31m\u202eb\u2028c')} />);
      const line = container.querySelector('button')!.textContent!;
      expect(line).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u2028-\u202e]/);
      expect(line.startsWith("Couldn't read a")).toBe(true);
    });

    test('a 1MB path is cut, quickly, and marked', () => {
      const t0 = performance.now();
      const { container } = render(() => <Activity steps={failedRead('x'.repeat(1_000_000))} />);
      const line = container.querySelector('button')!.textContent!;
      expect(performance.now() - t0).toBeLessThan(2000);
      expect(line.length).toBeLessThan(150);
      expect(line).toContain('…');
    });

    test('a path that is not a string falls back to the tool name', () => {
      const { container } = render(() => <Activity steps={failedRead({ toString: () => '<img>' })} />);
      expect(container.querySelector('button')!.textContent).toBe('read_file failed');
    });
  });
});
