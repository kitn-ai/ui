/**
 * `<kai-question-panel>` as an element: the `questions` property (the preset), the app's own
 * `<kai-question>` children (item mode), the events it fires (non-bubbling, `kai-*`), the `dismiss`
 * slot, the methods, and `<kai-questions-waiting>`.
 *
 * jsdom has no layout, so the textarea growth, the side-by-side previews and the real focus order are
 * settled in Chromium by tests/browser/question-panel.browser.test.tsx.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import './question-panel';
import './question';
import './question-option';
import './questions-waiting';
import type { KaiQuestionPanelElement, KaiQuestionsWaitingElement } from '../web-component-types';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const tick = () => new Promise((r) => setTimeout(r, 30));

const QUESTIONS = [
  { id: 'scope', header: 'Scope', question: 'Which part?', kind: 'choice', required: true, options: [{ label: 'One', description: 'first' }, { label: 'Two' }] },
  { id: 'note', header: 'Note', question: 'Anything else?', kind: 'text', required: false, placeholder: 'Type' },
];

async function mount(setup: (el: KaiQuestionPanelElement) => void, html = '') {
  const el = document.createElement('kai-question-panel') as KaiQuestionPanelElement;
  el.innerHTML = html; // test-authored markup, not model output
  el.focusOnOpen = false;
  setup(el);
  document.body.append(el);
  await customElements.whenDefined('kai-question-panel');
  await tick();
  const root = el.shadowRoot!;
  return {
    el, root,
    text: () => root.textContent ?? '',
    btn: (name: string) => [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined,
    rows: () => [...root.querySelectorAll<HTMLElement>('[data-option-row]')],
  };
}

const COMPOSED = `
  <kai-question question-id="scope" header="Scope" question="Which part?" kind="choice">
    <kai-question-option label="One" description="first"></kai-question-option>
    <kai-question-option label="Two"></kai-question-option>
  </kai-question>
  <kai-question question-id="note" header="Note" question="Anything else?" kind="text" placeholder="Type" required="false"></kai-question>`;

describe('<kai-question-panel> data mode', () => {
  it('draws the questions property', async () => {
    const p = await mount((el) => { el.questions = QUESTIONS as never; });
    expect([...p.root.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim())).toEqual(['Scope', 'Note', 'Review']);
    expect(p.rows().map((r) => r.textContent)).toEqual([expect.stringContaining('One'), expect.stringContaining('Two'), expect.stringContaining('Other')]);
  });

  it('fires non-bubbling kai-* events: answer change, active change, submit, dismiss', async () => {
    const p = await mount((el) => { el.questions = QUESTIONS as never; el.toolCallId = 'call_9'; });
    const seen: [string, unknown][] = [];
    let bubbled = false;
    document.body.addEventListener('kai-answer-change', () => { bubbled = true; });
    for (const name of ['kai-answer-change', 'kai-active-change', 'kai-questions-submit', 'kai-questions-dismiss']) {
      p.el.addEventListener(name, (e) => seen.push([name, (e as CustomEvent).detail]));
    }
    p.rows()[1].querySelector('input')!.click();
    await tick();
    expect(seen.find(([n]) => n === 'kai-answer-change')![1]).toMatchObject({ answers: [{ questionId: 'scope', selected: ['Two'] }] });
    expect(bubbled).toBe(false);
    p.el.select(2);
    await tick();
    expect(seen.find(([n]) => n === 'kai-active-change')![1]).toEqual({ index: 1, questionId: 'note' });
    expect(seen.map(([n]) => n)).toEqual(expect.arrayContaining(['kai-answer-change', 'kai-active-change']));
  });

  it('submit() sends the AskResult with the call id once the required questions are answered', async () => {
    const p = await mount((el) => { el.questions = QUESTIONS as never; el.toolCallId = 'call_9'; });
    const submits: unknown[] = [];
    p.el.addEventListener('kai-questions-submit', (e) => submits.push((e as CustomEvent).detail));
    p.el.submit();
    expect(submits).toHaveLength(0); // nothing answered yet
    p.rows()[0].querySelector('input')!.click();
    await tick();
    p.el.submit();
    expect(submits[0]).toEqual({
      toolCallId: 'call_9',
      result: { status: 'answered', answers: [{ questionId: 'scope', header: 'Scope', question: 'Which part?', kind: 'choice', selected: ['One'] }] },
    });
  });

  it('dismiss carries the partial answers and settles nothing', async () => {
    const p = await mount((el) => { el.questions = QUESTIONS as never; el.toolCallId = 'c1'; });
    const out: unknown[] = [];
    p.el.addEventListener('kai-questions-dismiss', (e) => out.push((e as CustomEvent).detail));
    p.rows()[1].querySelector('input')!.click();
    await tick();
    p.btn("Let's chat")!.click();
    expect(out[0]).toMatchObject({ toolCallId: 'c1', answers: [{ questionId: 'scope', selected: ['Two'] }] });
  });

  it('dismissLabel and submitLabel are attributes', async () => {
    const p = await mount((el) => {
      el.questions = [QUESTIONS[0]] as never;
      el.setAttribute('dismiss-label', 'Skip for now');
      el.setAttribute('submit-label', 'Send');
    });
    expect(p.btn('Skip for now')).toBeTruthy();
    expect(p.btn('Send')).toBeTruthy();
  });

  it('skips a question of an unknown kind, loudly and once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = await mount((el) => { el.questions = [{ ...QUESTIONS[0], kind: 'poll' }, QUESTIONS[1]] as never; });
    expect(p.root.querySelectorAll('[role="tab"]')).toHaveLength(1);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('unknown kind'))).toHaveLength(1);
  });

  it('exposes next, back, select, submit and focus as methods', async () => {
    const p = await mount((el) => { el.questions = QUESTIONS as never; });
    for (const m of ['next', 'back', 'select', 'submit', 'focus'] as const) expect(typeof p.el[m]).toBe('function');
    p.el.next();
    await tick();
    expect(p.root.querySelector('[data-question-body]')!.getAttribute('data-question-body')).toBe('note');
    p.el.back();
    await tick();
    expect(p.root.querySelector('[data-question-body]')!.getAttribute('data-question-body')).toBe('scope');
  });
});

describe('<kai-question-panel> item mode', () => {
  it('draws the app\'s own <kai-question> children, which render nothing themselves', async () => {
    const p = await mount(() => {}, COMPOSED);
    expect([...p.root.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim())).toEqual(['Scope', 'Note', 'Review']);
    expect(p.rows()).toHaveLength(3);
    const child = p.el.querySelector('kai-question')!;
    // jsdom does not apply :host rules, so read the rule itself: the child draws nothing.
    expect([...child.shadowRoot!.querySelectorAll('style')].some((st) => st.textContent === ':host{display:none}')).toBe(true);
    const holder = document.createElement('div');
    holder.append(...[...child.shadowRoot!.childNodes].map((n) => n.cloneNode(true)));
    holder.querySelectorAll('style').forEach((n) => n.remove());
    expect(holder.textContent!.trim()).toBe('');
  });

  it('follows the children: an option added later shows up', async () => {
    const p = await mount(() => {}, COMPOSED);
    const opt = document.createElement('kai-question-option');
    opt.setAttribute('label', 'Three');
    p.el.querySelector('kai-question')!.append(opt);
    await tick();
    expect(p.rows()).toHaveLength(4);
    expect(p.rows()[2].textContent).toContain('Three');
  });

  it('follows a property change on a child (no attribute involved)', async () => {
    const p = await mount(() => {}, COMPOSED);
    (p.el.querySelector('kai-question') as HTMLElement & { header: string }).header = 'Area';
    await tick();
    expect([...p.root.querySelectorAll('[role="tab"]')][0].textContent!.trim()).toBe('Area');
  });

  it('children win over questions, with one warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = await mount((el) => { el.questions = [QUESTIONS[0]] as never; }, COMPOSED);
    expect(p.root.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("'questions' property is ignored"))).toHaveLength(1);
  });

  it('option text is the label fallback, and required="false" makes a question optional', async () => {
    const p = await mount(() => {}, `
      <kai-question header="Pick" question="Which?" kind="choice" required="false">
        <kai-question-option>Alpha</kai-question-option>
      </kai-question>`);
    expect(p.rows()[0].textContent).toContain('Alpha');
    p.btn('Submit')!.click();
    await tick();
    // optional and unanswered: Submit is enabled, and it submits with no answers
    const submits: unknown[] = [];
    p.el.addEventListener('kai-questions-submit', (e) => submits.push((e as CustomEvent).detail));
    p.btn('Submit')!.click();
    expect(submits[0]).toMatchObject({ result: { status: 'answered', answers: [] } });
  });
});

describe('<kai-question-panel> dismiss slot', () => {
  it('replaces the control, and a click on the slotted node still dismisses', async () => {
    const p = await mount((el) => { el.questions = [QUESTIONS[0]] as never; }, '<button slot="dismiss" id="later">Later</button>');
    expect(p.btn("Let's chat")).toBeUndefined();
    const slot = p.root.querySelector('slot[name="dismiss"]') as HTMLSlotElement;
    expect(slot.assignedElements()[0]).toBe(p.el.querySelector('#later'));
    const out: unknown[] = [];
    p.el.addEventListener('kai-questions-dismiss', (e) => out.push((e as CustomEvent).detail));
    (p.el.querySelector('#later') as HTMLButtonElement).click();
    expect(out).toHaveLength(1);
  });
});

describe('<kai-questions-waiting>', () => {
  it('reads the count and fires kai-reopen', async () => {
    const el = document.createElement('kai-questions-waiting') as KaiQuestionsWaitingElement;
    el.count = 2;
    el.total = 3;
    document.body.append(el);
    await customElements.whenDefined('kai-questions-waiting');
    await tick();
    expect(el.shadowRoot!.textContent).toContain('2 of 3 questions waiting');
    let n = 0;
    el.addEventListener('kai-reopen', () => n++);
    (el.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
    expect(n).toBe(1);
    el.reopenLabel = 'Bring back';
    await tick();
    expect(el.shadowRoot!.textContent).toContain('Bring back');
  });
});
