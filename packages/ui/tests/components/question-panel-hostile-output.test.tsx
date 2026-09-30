/**
 * Every string in a question is model output: header, question, option labels, descriptions,
 * previews, the placeholder, and the confirm pair. None of it may become markup, a link or a
 * script, and none of it may vanish: escaping is the right rendering, and a filter that deleted the
 * text would pass a security assertion while being a worse UI. The user's own Other text is rendered
 * the same way (it can be pasted from anywhere).
 *
 * jsdom here; the same vectors are re-checked in real Chromium by
 * tests/browser/question-panel.browser.test.tsx.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../src/web-components/question/question-panel';
import type { KaiQuestionPanelElement } from '../../src/web-components/web-component-types';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const tick = () => new Promise((r) => setTimeout(r, 40));

const VECTORS = [
  '<img src=x onerror="window.__pwned=1">',
  '<script>window.__pwned=1</script>',
  '<a href="javascript:window.__pwned=1">click</a>',
  '"><iframe srcdoc="<script>window.__pwned=1</script>"></iframe>',
  'javascript:window.__pwned=1',
];

async function mount(questions: unknown[]) {
  const el = document.createElement('kai-question-panel') as KaiQuestionPanelElement;
  el.questions = questions as never;
  el.focusOnOpen = false;
  document.body.append(el);
  await tick();
  return { el, root: el.shadowRoot! };
}

const inert = (root: ShadowRoot) => {
  expect(root.querySelectorAll('img, script, iframe, object, embed, link, form')).toHaveLength(0);
  // The only anchors or navigable hrefs the panel could have are ones it drew; it draws none.
  expect(root.querySelectorAll('a, [href], [src], [srcdoc]')).toHaveLength(0);
  expect([...root.querySelectorAll('*')].flatMap((n) => [...n.attributes].filter((a) => /^on/i.test(a.name)))).toHaveLength(0);
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
};

describe('question panel: hostile model output', () => {
  for (const vector of VECTORS) {
    it(`renders ${JSON.stringify(vector.slice(0, 28))} as visible, inert text everywhere a model string lands`, async () => {
      const { root } = await mount([
        {
          id: 'q', header: vector, question: vector, kind: 'choice', required: true, placeholder: vector,
          options: [{ label: vector, description: vector, preview: vector }, { label: 'plain' }],
        },
        { id: 'c', header: 'Confirm', question: vector, kind: 'confirm', options: [{ label: vector }, { label: vector + ' no' }] },
        { id: 't', header: 'Text', question: vector, kind: 'text', placeholder: vector },
      ]);
      inert(root);
      const text = root.textContent ?? '';
      expect(text).toContain(vector); // question, label, description, preview: visible verbatim
      expect((root.querySelector('[role="tab"]') as HTMLElement).textContent).toContain(vector);
      expect((root.querySelector('[role="tab"]') as HTMLElement).title).toBe(vector); // tooltip carries the full header
      expect((root.querySelector('pre[data-preview]') as HTMLElement).textContent).toBe(vector);
    });
  }

  it("renders the user's own Other text inert, in the field and in the review row", async () => {
    const vector = VECTORS[0];
    const { el, root } = await mount([
      { id: 'a', header: 'A', question: 'Pick', kind: 'choice', required: true, options: [{ label: 'x' }, { label: 'y' }] },
      { id: 'b', header: 'B', question: 'Pick again', kind: 'choice', required: true, options: [{ label: 'x' }] },
    ]);
    (root.querySelectorAll('input[type="radio"]')[2] as HTMLInputElement).click();
    await tick();
    const ta = root.querySelector('textarea[data-other]') as HTMLTextAreaElement;
    ta.value = vector;
    ta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await tick();
    expect(ta.value).toBe(vector);
    el.select(2);
    await tick();
    inert(root);
    expect(root.querySelector('[role="tabpanel"]')!.textContent).toContain(vector);
  });

  it('clamps a 100k-character preview and says so, visibly', async () => {
    const big = 'x'.repeat(100_000);
    const { root } = await mount([
      { id: 'q', header: 'Cfg', question: 'Which?', kind: 'choice', required: true, options: [{ label: 'a', preview: big }, { label: 'b' }] },
    ]);
    const pre = root.querySelector('pre[data-preview]') as HTMLElement;
    expect(pre.textContent!.length).toBeLessThan(5000);
    expect(pre.textContent).toContain('preview truncated: showing 4000 of 100000 characters');
  });

  it('a 100k header does not blow the tab out: the tab truncates and the title holds the full text', async () => {
    const { root } = await mount([{ id: 'q', header: 'h'.repeat(100_000), question: 'Which?', kind: 'choice', required: true, options: [{ label: 'a' }, { label: 'b' }] }]);
    const tab = root.querySelector('[role="tab"]') as HTMLElement;
    expect(tab.className).toContain('max-w-40');
    expect(tab.querySelector('span.truncate')).toBeTruthy();
  });
});
