import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { QuestionPanel, type QuestionPanelProps } from './question-panel';
import { QuestionsWaiting } from './questions-waiting';
import type { PanelQuestion } from './question-state';
import type { AskResult } from '../../primitives/questions';

afterEach(cleanup);
const tick = () => new Promise((r) => setTimeout(r, 5));
// Focus moves in a requestAnimationFrame, so wait a frame or two.
const frame = () => new Promise((r) => setTimeout(r, 50));

const scope: PanelQuestion = {
  id: 'scope', header: 'Scope', question: 'Which part should I clean up?', kind: 'choice', required: true,
  options: [{ label: 'This package', description: 'Only packages/ui' }, { label: 'Everything' }, { label: 'Docs' }],
};
const tone: PanelQuestion = {
  id: 'tone', header: 'Tone', question: 'How formal?', kind: 'choice', required: true, multiSelect: true,
  options: [{ label: 'Casual' }, { label: 'Neutral' }, { label: 'Formal' }],
};
const todo: PanelQuestion = {
  id: 'todo', header: 'Checks', question: 'Which checks?', kind: 'tasks', required: true,
  options: [{ label: 'lint' }, { label: 'types' }, { label: 'tests' }],
};
const ok: PanelQuestion = { id: 'ok', header: 'Run', question: 'Run the migration?', kind: 'confirm', required: true };
const note: PanelQuestion = { id: 'note', header: 'Note', question: 'Anything else?', kind: 'text', required: false, placeholder: 'Type here' };
const withPreview: PanelQuestion = {
  id: 'cfg', header: 'Config', question: 'Which config?', kind: 'choice', required: true,
  options: [{ label: 'One', preview: 'alpha: 1' }, { label: 'Two', preview: 'beta: 2' }],
};

function mount(questions: PanelQuestion[], extra: Partial<QuestionPanelProps> = {}) {
  const submits: { toolCallId?: string; result: AskResult }[] = [];
  const dismisses: { toolCallId?: string; answers: unknown[] }[] = [];
  const view = render(() => (
    <QuestionPanel
      questions={questions}
      toolCallId="call_1"
      focusOnOpen={false}
      onSubmit={(d) => submits.push(d)}
      onDismiss={(d) => dismisses.push(d)}
      {...extra}
    />
  ));
  const $ = (sel: string) => view.container.querySelector(sel) as HTMLElement;
  const $$ = (sel: string) => [...view.container.querySelectorAll<HTMLElement>(sel)];
  const btn = (name: string) => $$('button').find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined;
  const rows = () => $$('[data-option-row]');
  const input = (i: number) => rows()[i].querySelector('input') as HTMLInputElement;
  const key = (target: Element, k: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(target, { key: k, bubbles: true, ...init });
  return { ...view, $, $$, btn, rows, input, key, submits, dismisses };
}

describe('QuestionPanel: tabs', () => {
  it('gives each question a tab, plus Review from two questions, with the tab roles wired', () => {
    const p = mount([scope, tone]);
    const tabs = p.$$('[role="tab"]');
    expect(tabs.map((t) => t.textContent!.trim())).toEqual(['Scope', 'Tone', 'Review']);
    expect(p.$('[role="tablist"]')).toBeTruthy();
    const panel = p.$('[role="tabpanel"]');
    expect(tabs[0].getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('a single question has one tab and no Review', () => {
    expect(mount([scope]).$$('[role="tab"]').map((t) => t.textContent!.trim())).toEqual(['Scope']);
  });

  it('clicking an earlier tab goes back, and arrows move between tabs', async () => {
    const p = mount([scope, tone]);
    await fireEvent.click(p.btn('Next')!);
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
    await fireEvent.click(p.$$('[role="tab"]')[0]);
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('scope');
    p.key(p.$$('[role="tab"]')[0], 'ArrowRight');
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
    p.key(p.$$('[role="tab"]')[1], 'End');
    expect(p.$('[role="tabpanel"] ul')).toBeTruthy(); // Review
    p.key(p.$$('[role="tab"]')[2], 'ArrowLeft');
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
  });

  it('an answered question shows a check on its tab and names it for assistive tech', async () => {
    const p = mount([scope, tone]);
    await fireEvent.click(p.input(0));
    await tick();
    expect(p.$$('[role="tab"]')[0].textContent).toContain('(answered)');
  });
});

describe('QuestionPanel: Back and Next', () => {
  it('Back is hidden on the first step and Next becomes the submit label on the last', async () => {
    const p = mount([scope, tone], { submitLabel: 'Send it' });
    expect(p.btn('Back')).toBeUndefined();
    expect(p.btn('Next')).toBeTruthy();
    await fireEvent.click(p.btn('Next')!);
    await fireEvent.click(p.btn('Next')!);
    expect(p.btn('Next')).toBeUndefined();
    expect(p.btn('Send it')).toBeTruthy();
    expect(p.btn('Back')).toBeTruthy();
  });
});

describe('QuestionPanel: choice', () => {
  it('a number key with focus inside the panel picks the row and advances', async () => {
    const p = mount([scope, tone]);
    p.input(0).focus();
    p.key(p.input(0), '2');
    await tick();
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
    await fireEvent.click(p.$$('[role="tab"]')[0]);
    expect(p.input(1)).toBeChecked();
  });

  it('a digit typed into a text field never picks', async () => {
    const outside = document.createElement('input');
    document.body.append(outside);
    const p = mount([scope]);
    p.key(outside, '2');
    expect(p.input(1)).not.toBeChecked();
    // and inside the panel, typing into the Other textarea is not a pick
    await fireEvent.click(p.input(3));
    await tick();
    const ta = p.$('textarea[data-other]');
    p.key(ta, '1');
    expect(p.input(0)).not.toBeChecked();
    outside.remove();
  });

  it('is a radiogroup labelled by the question, with real radios and one tab stop', () => {
    const p = mount([scope]);
    const group = p.$('[role="radiogroup"]');
    expect(group.getAttribute('aria-labelledby')).toBe(p.$('[data-question-body] p').id);
    expect(p.$$('input[type="radio"]')).toHaveLength(4);
    expect(p.$$('input[type="radio"]').filter((i) => i.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('arrows move focus and select, but do not advance', async () => {
    const p = mount([scope, tone]);
    p.input(0).focus();
    p.key(p.input(0), 'ArrowDown');
    await tick();
    expect(document.activeElement).toBe(p.input(1));
    expect(p.input(1)).toBeChecked();
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('scope');
  });

  it('renders label and description as text nodes, never markup', () => {
    const hostile: PanelQuestion = { ...scope, question: '<img src=x onerror=alert(1)>', options: [{ label: '<b>bold</b>', description: '<script>1</script>' }, { label: 'b' }] };
    const p = mount([hostile]);
    expect(p.container.querySelector('img,script,b')).toBeNull();
    expect(p.container.textContent).toContain('<b>bold</b>');
    expect(p.container.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('QuestionPanel: multi and tasks', () => {
  it('checkboxes: Next advances, and selected comes back in option order', async () => {
    const p = mount([tone], { });
    expect(p.$('[role="group"][aria-labelledby]')).toBeTruthy();
    await fireEvent.click(p.input(2));
    await fireEvent.click(p.input(0));
    await fireEvent.click(p.btn('Submit')!);
    expect(p.submits[0].result).toMatchObject({ status: 'answered', answers: [{ questionId: 'tone', selected: ['Casual', 'Formal'] }] });
  });

  it('tasks read as a checklist with a running count', async () => {
    const p = mount([todo]);
    expect(p.$$('input[type="checkbox"]')).toHaveLength(4);
    await fireEvent.click(p.input(1));
    await tick();
    expect(p.container.textContent).toContain('1 of 3 ticked');
  });

  it('picking never advances a multi-select question', async () => {
    const p = mount([tone, scope]);
    await fireEvent.click(p.input(0));
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
  });
});

describe('QuestionPanel: Other', () => {
  it('is the last numbered row, and its number key selects it and focuses the textarea', async () => {
    const p = mount([scope]);
    expect(p.rows()).toHaveLength(4);
    expect(p.rows()[3].textContent).toContain('Other');
    expect(p.rows()[3].textContent).toContain('4');
    p.input(0).focus();
    p.key(p.input(0), '4');
    await frame();
    expect(p.input(3)).toBeChecked();
    expect(document.activeElement).toBe(p.$('textarea[data-other]'));
  });

  it('single-select Other replaces the selection: text set, selected empty', async () => {
    const p = mount([scope]);
    await fireEvent.click(p.input(0));
    await fireEvent.click(p.input(3));
    await tick();
    const ta = p.$('textarea[data-other]') as HTMLTextAreaElement;
    await fireEvent.input(ta, { target: { value: 'Somewhere else' } });
    await fireEvent.click(p.btn('Submit')!);
    expect(p.submits[0].result.answers[0]).toMatchObject({ selected: [], text: 'Somewhere else' });
  });

  it('multi-select Other adds text beside the ticked options', async () => {
    const p = mount([tone]);
    await fireEvent.click(p.input(1));
    await fireEvent.click(p.input(3));
    await tick();
    await fireEvent.input(p.$('textarea[data-other]'), { target: { value: 'Warm' } });
    await fireEvent.click(p.btn('Submit')!);
    expect(p.submits[0].result.answers[0]).toMatchObject({ selected: ['Neutral'], text: 'Warm' });
  });

  it('Enter advances and Shift+Enter is left to insert a newline', async () => {
    const p = mount([scope, tone]);
    await fireEvent.click(p.input(3));
    await tick();
    const ta = p.$('textarea[data-other]');
    const shift = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
    ta.dispatchEvent(shift);
    expect(shift.defaultPrevented).toBe(false);
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('scope');
    const plain = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    ta.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    await tick();
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
  });

  it('an Other row that is on but blank is not an answer', async () => {
    const p = mount([scope]);
    await fireEvent.click(p.input(3));
    await tick();
    expect(p.btn('Submit')).toBeDisabled();
  });

  it('allowOther false removes the row', () => {
    expect(mount([{ ...scope, allowOther: false }]).rows()).toHaveLength(3);
  });
});

describe('QuestionPanel: confirm and one-click', () => {
  it('a lone confirm submits on the click of Approve, with no Submit button', async () => {
    const p = mount([ok]);
    expect(p.rows().map((r) => r.textContent)).toEqual([expect.stringContaining('Approve'), expect.stringContaining('Deny'), expect.stringContaining('Other')]);
    expect(p.btn('Submit')).toBeUndefined();
    await fireEvent.click(p.input(0));
    expect(p.submits).toHaveLength(1);
    expect(p.submits[0]).toMatchObject({ toolCallId: 'call_1', result: { status: 'answered', answers: [{ selected: ['Approve'] }] } });
  });

  it('a lone confirm explains no missing answer: it has no Submit to explain', () => {
    expect(mount([ok]).container.textContent).not.toContain('still needs an answer');
    expect(mount([scope]).container.textContent).toContain('1 question still needs an answer');
  });

  it('a lone confirm submits on its number key too', () => {
    const p = mount([ok]);
    p.input(0).focus();
    p.key(p.input(0), '2');
    expect(p.submits[0].result.answers[0]).toMatchObject({ selected: ['Deny'] });
  });

  it('a confirm beside another question keeps Submit', async () => {
    const p = mount([ok, scope]);
    await fireEvent.click(p.input(0));
    expect(p.submits).toHaveLength(0);
  });

  it('a confirm preview is the thing being approved: a monospace strip of text, not the side-by-side preview', () => {
    const cmd = '<b>rm -rf</b> node_modules';
    const p = mount([{ ...ok, options: [{ label: 'Approve', preview: cmd }, { label: 'Deny' }] }]);
    const strip = p.$('[data-confirm-detail]');
    expect(strip.textContent).toBe(cmd);
    expect(strip.querySelector('b')).toBeNull();
    expect(strip.className).toContain('font-mono');
    expect(p.$('[data-preview]')).toBeNull();
    expect(mount([ok]).$('[data-confirm-detail]')).toBeNull();
  });

  it("the model's pair overrides Approve and Deny", () => {
    const p = mount([{ ...ok, options: [{ label: 'Ship' }, { label: 'Hold' }] }]);
    expect(p.rows()[0].textContent).toContain('Ship');
  });
});

describe('QuestionPanel: text and form', () => {
  it('the text kind records text through a labelled textarea', async () => {
    const p = mount([{ ...note, required: true }]);
    const ta = p.$('textarea') as HTMLTextAreaElement;
    expect(ta.getAttribute('aria-labelledby')).toBe(p.$('[data-question-body] p').id);
    expect(ta.placeholder).toBe('Type here');
    await fireEvent.input(ta, { target: { value: 'hello' } });
    await fireEvent.click(p.btn('Submit')!);
    expect(p.submits[0].result.answers[0]).toMatchObject({ kind: 'text', text: 'hello' });
  });

  it('the form kind records values through the kit form widgets', async () => {
    const form: PanelQuestion = {
      id: 'who', header: 'Who', question: 'Who is it for?', kind: 'form', required: true,
      fields: { type: 'object', required: ['name'], properties: { name: { type: 'string', title: 'Name' } } },
    };
    const p = mount([form]);
    expect(p.btn('Submit')).toBeDisabled();
    await fireEvent.input(p.$('input[type="text"]'), { target: { value: 'Ada' } });
    await tick();
    await fireEvent.click(p.btn('Submit')!);
    expect(p.submits[0].result.answers[0]).toMatchObject({ kind: 'form', values: { name: 'Ada' } });
  });
});

describe('QuestionPanel: previews', () => {
  it('shows a preview beside the list, following the pointed option', async () => {
    const p = mount([withPreview]);
    expect(p.$('[data-preview]').textContent).toBe('alpha: 1');
    await fireEvent.mouseEnter(p.rows()[1]);
    expect(p.$('[data-preview]').textContent).toBe('beta: 2');
    expect(p.$('[data-preview]').tagName).toBe('PRE');
  });

  it('no option with a preview means no preview region', () => {
    expect(mount([scope]).$('[data-preview]')).toBeNull();
  });
});

describe('QuestionPanel: review', () => {
  it('rows link back to their tab, and Submit is disabled with the reason visible', async () => {
    const p = mount([scope, tone]);
    await fireEvent.click(p.input(1));
    await tick();
    await fireEvent.click(p.$$('[role="tab"]')[2]);
    expect(p.container.textContent).toContain('Everything');
    expect(p.container.textContent).toContain('1 question still needs an answer');
    expect(p.btn('Submit')).toBeDisabled();
    await fireEvent.click(p.$('[data-review-edit="1"]'));
    expect(p.$('[data-question-body]')?.getAttribute('data-question-body')).toBe('tone');
  });

  it('submits once every required question is answered; an optional one can stay blank', async () => {
    const p = mount([scope, note]);
    await fireEvent.click(p.input(0));
    await tick();
    await fireEvent.click(p.$$('[role="tab"]')[2]);
    expect(p.btn('Submit')).not.toBeDisabled();
    await fireEvent.click(p.btn('Submit')!);
    expect(p.submits[0].result.answers.map((a) => a.questionId)).toEqual(['scope']);
  });
});

describe("QuestionPanel: Let's chat", () => {
  it('has the default label, and dismissLabel changes it', () => {
    expect(mount([scope]).btn("Let's chat")).toBeTruthy();
    expect(mount([scope], { dismissLabel: 'Skip for now' }).btn('Skip for now')).toBeTruthy();
  });

  it('dismisses with the partial answers and does not submit', async () => {
    const p = mount([scope, tone]);
    await fireEvent.click(p.input(2));
    await fireEvent.click(p.btn("Let's chat")!);
    expect(p.submits).toHaveLength(0);
    expect(p.dismisses).toHaveLength(1);
    expect(p.dismisses[0]).toMatchObject({ toolCallId: 'call_1', answers: [{ questionId: 'scope', selected: ['Docs'] }] });
  });

  it('a click anywhere in the dismiss override dismisses', async () => {
    const p = mount([scope], { dismiss: <button type="button" data-custom>Later</button> });
    expect(p.btn("Let's chat")).toBeUndefined();
    await fireEvent.click(p.$('[data-custom]'));
    expect(p.dismisses).toHaveLength(1);
  });

  it('Escape inside the panel dismisses exactly like the button, with the partial answers', async () => {
    const p = mount([scope, tone]);
    await fireEvent.click(p.input(2));
    p.key(p.input(2), 'Escape');
    expect(p.dismisses).toHaveLength(1);
    expect(p.dismisses[0]).toMatchObject({ toolCallId: 'call_1', answers: [{ questionId: 'scope', selected: ['Docs'] }] });
    expect(p.submits).toHaveLength(0);
  });

  it('Escape that something else already handled does not also dismiss', () => {
    const p = mount([scope]);
    const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    p.input(0).addEventListener('keydown', (ev) => ev.preventDefault());
    p.input(0).dispatchEvent(e);
    expect(p.dismisses).toHaveLength(0);
  });
});

describe('QuestionPanel: value, focus, events', () => {
  it('focuses the first option of the first question when it opens', async () => {
    const p = mount([scope], { focusOnOpen: true });
    await frame();
    expect(document.activeElement).toBe(p.input(0));
  });

  it('reports answer changes and step changes', async () => {
    const changes: unknown[] = [];
    const steps: unknown[] = [];
    const p = mount([scope, tone], { onValueChange: (a) => changes.push(a), onActiveChange: (d) => steps.push(d) });
    await fireEvent.click(p.input(1));
    await tick();
    expect(changes.at(-1)).toMatchObject([{ questionId: 'scope', selected: ['Everything'] }]);
    expect(steps.at(-1)).toEqual({ index: 1, questionId: 'tone' });
  });

  it('defaultValue seeds the answers (a Reopen with the answers kept)', () => {
    const p = mount([scope], { defaultValue: [{ questionId: 'scope', header: 'Scope', question: 'q', kind: 'choice', selected: ['Docs'] }] });
    expect(p.input(2)).toBeChecked();
  });

  it('a new toolCallId starts from a clean slate even when the question ids repeat', async () => {
    const [id, setId] = (await import('solid-js')).createSignal('a');
    const view = render(() => <QuestionPanel questions={[scope]} toolCallId={id()} focusOnOpen={false} />);
    await fireEvent.click(view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0]);
    expect(view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0]).toBeChecked();
    setId('b');
    await tick();
    expect(view.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0]).not.toBeChecked();
  });

  it('an empty set renders a stated empty panel instead of nothing', () => {
    expect(mount([]).container.textContent).toContain('no questions');
  });
});

describe('QuestionsWaiting', () => {
  it('reads "2 of 3 questions waiting" with a Reopen control', async () => {
    const reopen = vi.fn();
    const view = render(() => <QuestionsWaiting count={2} total={3} onReopen={reopen} />);
    expect(view.container.textContent).toContain('2 of 3 questions waiting');
    await fireEvent.click(view.getByText('Reopen'));
    expect(reopen).toHaveBeenCalledOnce();
  });
});
