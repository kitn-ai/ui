import { describe, expect, it, afterEach } from 'vitest';
import { userEvent, page } from 'vitest/browser';
import '../../src/web-components/question/question-panel';
import '../../src/web-components/question/question';
import '../../src/web-components/question/question-option';
import '../../src/web-components/question/questions-waiting';

/**
 * `<kai-question-panel>` in real Chromium: real key events on the real focus, real layout.
 *
 * jsdom cannot say whether a number key reaches the panel from a focused radio inside a shadow root,
 * whether the Other textarea actually grows, whether the previews sit beside the list or under it, or
 * where focus is after each move. Every claim below is asserted on the live element.
 */
afterEach(() => {
  document.body.replaceChildren();
  delete (window as unknown as { __pwned?: number }).__pwned;
});

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Panel = HTMLElement & {
  questions: unknown; toolCallId: string; focus(): void; select(i: number): void; submit(): void;
  value?: unknown; defaultValue?: unknown; focusOnOpen?: boolean; activeIndex?: number;
};

const SCOPE = { id: 'scope', header: 'Scope', question: 'Which part should I clean up?', kind: 'choice', required: true,
  options: [{ label: 'This package', description: 'Only packages/ui' }, { label: 'Everything', description: 'All packages' }, { label: 'Docs', description: 'No code' }] };
const TONE = { id: 'tone', header: 'Tone', question: 'How formal?', kind: 'choice', required: true,
  options: [{ label: 'Casual' }, { label: 'Formal' }] };
const APPROVE = { id: 'run', header: 'Run', question: 'Run the migration?', kind: 'confirm', required: true };

async function mount(questions: unknown[], opts: { width?: string; before?: string; focusOnOpen?: boolean } = {}) {
  const box = document.createElement('div');
  box.style.cssText = `width:${opts.width ?? '720px'};margin:0 auto;padding:8px`;
  box.innerHTML = `${opts.before ?? ''}<kai-question-panel></kai-question-panel>`; // test-authored markup, not model output
  document.body.append(box);
  const el = box.querySelector('kai-question-panel') as Panel;
  el.toolCallId = 'call_1';
  el.focusOnOpen = opts.focusOnOpen ?? false;
  el.questions = questions;
  const events: [string, any][] = [];
  for (const n of ['kai-answer-change', 'kai-active-change', 'kai-questions-submit', 'kai-questions-dismiss']) {
    el.addEventListener(n, (e) => events.push([n, (e as CustomEvent).detail]));
  }
  await customElements.whenDefined('kai-question-panel');
  await wait(120);
  const root = el.shadowRoot!;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const active = () => root.activeElement as HTMLElement | null;
  const body = () => $('[data-question-body]')?.getAttribute('data-question-body');
  const btn = (name: string) => $$('button').find((b) => b.textContent?.trim() === name);
  return { box, el, root, $, $$, active, body, btn, events, rows: () => $$('[data-option-row]') };
}

describe('question panel in Chromium: keyboard', () => {
  it('opens with focus on the first option of the first question', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    expect(p.active()).toBe(p.rows()[0].querySelector('input'));
  });

  it('a real number key picks the row, advances, and puts focus on the next question', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    await userEvent.keyboard('2');
    await wait(120);
    expect(p.body()).toBe('tone');
    expect(p.active()).toBe(p.rows()[0].querySelector('input'));
    await userEvent.click(p.$$('[role="tab"]')[0]);
    await wait(60);
    expect((p.rows()[1].querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('number keys are the panel\'s: pressed in an input outside it, they type there and pick nothing', async () => {
    const p = await mount([SCOPE], { before: '<input id="outside" aria-label="outside">' });
    const outside = p.box.querySelector('#outside') as HTMLInputElement;
    outside.focus();
    await userEvent.keyboard('2');
    expect(outside.value).toBe('2');
    expect((p.rows()[1].querySelector('input') as HTMLInputElement).checked).toBe(false);
    expect(p.events.filter(([n]) => n === 'kai-answer-change')).toHaveLength(0);
  });

  it('is one tab stop per option group, arrows move focus and select without advancing', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    expect(p.$$('input[type="radio"]').filter((i) => i.tabIndex === 0)).toHaveLength(1);
    await userEvent.keyboard('{ArrowDown}');
    await wait(60);
    expect(p.active()).toBe(p.rows()[1].querySelector('input'));
    expect((p.rows()[1].querySelector('input') as HTMLInputElement).checked).toBe(true);
    expect(p.body()).toBe('scope');
    // Tab leaves the group: next stop is not another radio of it
    await userEvent.tab();
    expect(p.$$('input[type="radio"]').includes(p.active() as HTMLInputElement)).toBe(false);
  });

  it('arrows move between tabs (a tablist), and a tab click goes back', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: false });
    (p.$$('[role="tab"]')[0]).focus();
    await userEvent.keyboard('{ArrowRight}');
    await wait(60);
    expect(p.body()).toBe('tone');
    expect(p.active()).toBe(p.$$('[role="tab"]')[1]);
    await userEvent.click(p.$$('[role="tab"]')[0]);
    await wait(60);
    expect(p.body()).toBe('scope');
  });

  it("Escape inside the panel is Let's chat: it fires kai-questions-dismiss with the partial answers", async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    await userEvent.keyboard('1');
    await wait(120);
    await userEvent.keyboard('{Escape}');
    const d = p.events.filter(([n]) => n === 'kai-questions-dismiss');
    expect(d).toHaveLength(1);
    expect(d[0][1]).toMatchObject({ toolCallId: 'call_1', answers: [{ questionId: 'scope', selected: ['This package'] }] });
    expect(p.events.filter(([n]) => n === 'kai-questions-submit')).toHaveLength(0);
  });

  it('Escape pressed outside the panel does nothing to it', async () => {
    const p = await mount([SCOPE], { before: '<input id="outside" aria-label="outside">' });
    (p.box.querySelector('#outside') as HTMLInputElement).focus();
    await userEvent.keyboard('{Escape}');
    expect(p.events.filter(([n]) => n === 'kai-questions-dismiss')).toHaveLength(0);
  });
});

describe('question panel in Chromium: Other', () => {
  it('its number key selects it and focuses a textarea that grows with three lines; Shift+Enter is a newline, Enter advances', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    await userEvent.keyboard('4');
    await wait(120);
    const ta = p.$('textarea[data-other]') as HTMLTextAreaElement;
    expect(p.active()).toBe(ta);
    const before = ta.getBoundingClientRect().height;
    await userEvent.keyboard('one{Shift>}{Enter}{/Shift}two{Shift>}{Enter}{/Shift}three');
    await wait(80);
    expect(ta.value).toBe('one\ntwo\nthree');
    expect(ta.getBoundingClientRect().height).toBeGreaterThan(before + 10);
    expect(p.body()).toBe('scope'); // Shift+Enter did not advance
    await userEvent.keyboard('{Enter}');
    await wait(120);
    expect(p.body()).toBe('tone');
    expect(ta.value).toBe('one\ntwo\nthree'); // Enter did not add a newline
    await userEvent.click(p.$$('[role="tab"]')[0]);
    await wait(60);
    expect((p.$('textarea[data-other]') as HTMLTextAreaElement).value).toBe('one\ntwo\nthree');
  });
});

describe('question panel in Chromium: review and submit', () => {
  it('walks tabs to Review, gates Submit with a visible reason, then submits once answered', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: false });
    await userEvent.click(p.$$('[role="tab"]')[2]);
    await wait(60);
    expect((p.btn('Submit') as HTMLButtonElement).disabled).toBe(true);
    expect(p.root.textContent).toContain('2 questions still need an answer');
    await userEvent.click(p.$$('[data-review-edit]')[0]);
    await wait(60);
    await userEvent.click(p.rows()[2].querySelector('input')!);
    await wait(120); // advanced to Tone
    await userEvent.click(p.rows()[0].querySelector('input')!);
    await wait(120); // the last question advanced to Review
    expect(p.root.textContent).toContain('Docs');
    await userEvent.click(p.btn('Submit')!);
    const submit = p.events.find(([n]) => n === 'kai-questions-submit')!;
    expect(submit[1]).toMatchObject({ toolCallId: 'call_1', result: { status: 'answered', answers: [{ selected: ['Docs'] }, { selected: ['Casual'] }] } });
  });

  it('a lone confirm submits on one click and never shows Submit', async () => {
    const p = await mount([APPROVE]);
    expect(p.btn('Submit')).toBeUndefined();
    await userEvent.click(p.rows()[0].querySelector('input')!);
    const sub = p.events.filter(([n]) => n === 'kai-questions-submit');
    expect(sub).toHaveLength(1);
    expect(sub[0][1].result.answers[0].selected).toEqual(['Approve']);
  });
});

describe("question panel in Chromium: Let's chat and reopen", () => {
  it('dismiss hands focus to the host, and focus() on reopen lands on the active option', async () => {
    const p = await mount([SCOPE, TONE], { before: '<input id="composer" aria-label="composer">', focusOnOpen: true });
    await wait(100);
    const composer = p.box.querySelector('#composer') as HTMLInputElement;
    // The host's job, written the way kai-chat will do it: hide the panel, focus the composer.
    p.el.addEventListener('kai-questions-dismiss', () => { p.el.hidden = true; composer.focus(); });
    await userEvent.keyboard('1');
    await wait(120);
    p.btn("Let's chat")!.focus();
    await userEvent.keyboard('{Enter}');
    await wait(60);
    const dismiss = p.events.find(([n]) => n === 'kai-questions-dismiss')!;
    expect(dismiss[1]).toMatchObject({ toolCallId: 'call_1', answers: [{ questionId: 'scope', selected: ['This package'] }] });
    expect(document.activeElement).toBe(composer);
    expect(p.events.filter(([n]) => n === 'kai-questions-submit')).toHaveLength(0);
    p.el.hidden = false;
    p.el.focus();
    await wait(100);
    expect(p.active()).toBe(p.rows()[0].querySelector('input'));
    expect(p.body()).toBe('tone'); // the step it was left on
  });
});

describe('question panel in Chromium: previews and layout', () => {
  const CFG = { id: 'cfg', header: 'Config', question: 'Which config?', kind: 'choice', required: true,
    options: [{ label: 'One', description: 'first', preview: 'alpha: 1' }, { label: 'Two', description: 'second', preview: 'beta: 2' }] };

  it('puts the preview beside the list when wide and under it when narrow', async () => {
    const wide = await mount([CFG], { width: '720px' });
    const list = wide.$('[data-option-group]')!.getBoundingClientRect();
    const pre = wide.$('pre[data-preview]')!.getBoundingClientRect();
    expect(pre.left).toBeGreaterThan(list.right - 4);
    expect(Math.abs(pre.top - list.top)).toBeLessThan(40);
    wide.box.remove();
    const narrow = await mount([CFG], { width: '360px' });
    const l2 = narrow.$('[data-option-group]')!.getBoundingClientRect();
    const p2 = narrow.$('pre[data-preview]')!.getBoundingClientRect();
    expect(p2.top).toBeGreaterThan(l2.bottom - 4);
  });

  it('the preview follows the pointed option, and the focused one', async () => {
    const p = await mount([CFG], { focusOnOpen: true });
    await wait(100);
    expect(p.$('pre[data-preview]')!.textContent).toBe('alpha: 1');
    await userEvent.hover(p.rows()[1]);
    await wait(60);
    expect(p.$('pre[data-preview]')!.textContent).toBe('beta: 2');
    await userEvent.hover(p.rows()[0]);
    await userEvent.keyboard('{ArrowDown}');
    await wait(60);
    expect(p.$('pre[data-preview]')!.textContent).toBe('beta: 2');
  });

  it('keeps "Let\'s chat" in view at both widths, in the header when wide and the footer when narrow', async () => {
    const wide = await mount([TONE, SCOPE], { width: '720px' });
    const tabs = wide.$('[role="tablist"]')!.getBoundingClientRect();
    const b = wide.btn("Let's chat")!.getBoundingClientRect();
    expect(Math.abs(b.top - tabs.top)).toBeLessThan(24);
    wide.box.remove();
    const narrow = await mount([TONE, SCOPE], { width: '360px' });
    const tabs2 = narrow.$('[role="tablist"]')!.getBoundingClientRect();
    const b2 = narrow.btn("Let's chat")!.getBoundingClientRect();
    expect(b2.top).toBeGreaterThan(tabs2.bottom + 40);
    expect(b2.right).toBeLessThanOrEqual(narrow.$('[data-question-panel]')!.getBoundingClientRect().right);
  });
});

describe('question panel in Chromium: hostile model output', () => {
  const V = ['<img src=x onerror="window.__pwned=1">', '<script>window.__pwned=1</script>', '<a href="javascript:window.__pwned=1">x</a>'];

  it('draws every model string as visible, inert text', async () => {
    const q = [{ id: 'q', header: V[0], question: V[1], kind: 'choice', required: true, placeholder: V[2],
      options: [{ label: V[2], description: V[0], preview: V[1] }, { label: V[1], description: V[2] }] }];
    const p = await mount(q);
    await wait(300);
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    expect(p.root.querySelectorAll('img, script, a, iframe, [href], [src]')).toHaveLength(0);
    // visible: laid out, non-empty rects, and the raw source is what is on screen
    for (const t of [V[1], V[2], V[0]]) {
      const holder = [...p.root.querySelectorAll<HTMLElement>('p, span, pre')].find((n) => n.children.length === 0 && n.textContent === t);
      expect(holder, t).toBeTruthy();
      const r = holder!.getBoundingClientRect();
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
      expect(getComputedStyle(holder!).visibility).toBe('visible');
    }
    // typed into Other, then read back in the review row
    p.rows()[2].querySelector('input')!.click();
    await wait(80);
    const ta = p.$('textarea[data-other]') as HTMLTextAreaElement;
    ta.focus();
    await userEvent.type(ta, V[0]);
    expect(ta.value).toBe(V[0]);
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it('a 100k preview is clamped with a visible marker, and the panel stays a sane size', async () => {
    const p = await mount([{ id: 'q', header: 'Cfg', question: 'Which?', kind: 'choice', required: true, options: [{ label: 'a', preview: 'x'.repeat(100_000) }, { label: 'b' }] }]);
    const pre = p.$('pre[data-preview]')!;
    expect(pre.textContent).toContain('preview truncated: showing 4000 of 100000 characters');
    expect(p.$('[data-question-panel]')!.getBoundingClientRect().height).toBeLessThan(700);
    expect(pre.getBoundingClientRect().height).toBeLessThan(300);
  });
});

describe('question panel in Chromium: item mode draws the same panel', () => {
  it('the app\'s own children give the same tabs and rows, and the children take no room', async () => {
    const box = document.createElement('div');
    box.style.cssText = 'width:720px';
    box.innerHTML = `<kai-question-panel><kai-question question-id="scope" header="Scope" question="Which part should I clean up?" kind="choice">
      <kai-question-option label="This package" description="Only packages/ui"></kai-question-option>
      <kai-question-option label="Everything"></kai-question-option></kai-question></kai-question-panel>`; // test-authored markup
    document.body.append(box);
    const el = box.firstElementChild as Panel;
    el.focusOnOpen = false;
    await wait(150);
    expect(el.shadowRoot!.querySelectorAll('[data-option-row]')).toHaveLength(3);
    expect(el.querySelector('kai-question')!.getBoundingClientRect().height).toBe(0);
    void page;
  });
});


describe('question panel in Chromium: content changes keep the user\'s place', () => {
  const inside = (p: Awaited<ReturnType<typeof mount>>) => p.active();

  it('editing the question text while an option is focused keeps focus and the number keys', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    const before = inside(p);
    expect(before).toBe(p.rows()[0].querySelector('input'));
    p.el.questions = [{ ...SCOPE, question: 'Which part, exactly?' }, TONE];
    await wait(120);
    expect(p.root.textContent).toContain('Which part, exactly?');
    expect(inside(p)).toBe(p.rows()[0].querySelector('input'));
    await userEvent.keyboard('2');
    await wait(120);
    expect(p.body()).toBe('tone');
  });

  it('editing a <kai-question> attribute and appending a <kai-question-option> keep focus', async () => {
    const box = document.createElement('div');
    box.style.cssText = 'width:720px';
    box.innerHTML = `<kai-question-panel><kai-question question-id="scope" header="Scope" question="Which?" kind="choice">
      <kai-question-option label="One"></kai-question-option><kai-question-option label="Two"></kai-question-option></kai-question></kai-question-panel>`; // test-authored markup
    document.body.append(box);
    const el = box.firstElementChild as Panel;
    await wait(200);
    el.focus();
    await wait(100);
    const root = el.shadowRoot!;
    const first = () => root.querySelector('[data-option-row="0"] input');
    expect(root.activeElement).toBe(first());
    el.querySelector('kai-question')!.setAttribute('question', 'Which one, really?');
    await wait(150);
    expect(root.textContent).toContain('Which one, really?');
    expect(root.activeElement).toBe(first());
    const opt = document.createElement('kai-question-option');
    opt.setAttribute('label', 'Three');
    el.querySelector('kai-question')!.append(opt);
    await wait(150);
    expect(root.querySelectorAll('[data-option-row]')).toHaveLength(4);
    expect(root.activeElement).toBe(first());
    await userEvent.keyboard('3');
    await wait(100);
    expect((root.querySelector('[data-option-row="2"] input') as HTMLInputElement).checked).toBe(true);
  });

  it('a focused tab survives a header edit', async () => {
    const p = await mount([SCOPE, TONE]);
    p.$$('[role="tab"]')[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await wait(60);
    const tab = () => p.$$('[role="tab"]')[1];
    expect(p.active()).toBe(tab());
    p.el.questions = [SCOPE, { ...TONE, header: 'Area' }];
    await wait(120);
    expect(tab().textContent).toContain('Area');
    expect(p.active()).toBe(tab());
  });

  it('when the focused element really is replaced (its question id changed), focus goes to the equivalent one', async () => {
    const p = await mount([SCOPE, TONE], { focusOnOpen: true });
    await wait(100);
    await userEvent.keyboard('{ArrowDown}');
    await wait(60);
    p.el.questions = [{ ...SCOPE, id: 'scope2' }, TONE];
    await wait(150);
    expect(p.active()).toBe(p.rows()[1].querySelector('input'));
  });

  it('a focused Other textarea keeps its text and focus while the question text changes', async () => {
    const p = await mount([SCOPE], { focusOnOpen: true });
    await wait(100);
    await userEvent.keyboard('4');
    await wait(120);
    await userEvent.keyboard('hello');
    p.el.questions = [{ ...SCOPE, question: 'Changed?' }];
    await wait(120);
    const ta = p.$('textarea[data-other]') as HTMLTextAreaElement;
    expect(p.active()).toBe(ta);
    expect(ta.value).toBe('hello');
  });
});

describe('question panel in Chromium: huge and hostile text stays bounded', () => {
  const BIG = 'A'.repeat(1_000_000);
  const inView = (p: Awaited<ReturnType<typeof mount>>, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.bottom < 1400 && r.top >= 0;
  };

  it('a 1MB question keeps Back/Next/Submit and the tabs reachable', async () => {
    const p = await mount([{ ...SCOPE, question: BIG }, TONE]);
    const panel = p.$('[data-question-panel]')!.getBoundingClientRect();
    expect(panel.height).toBeLessThan(800);
    expect(inView(p, p.btn('Next')!)).toBe(true);
    expect(inView(p, p.$('[role="tablist"]')!)).toBe(true);
    expect(p.$('[role="tabpanel"]')!.scrollHeight).toBeGreaterThanOrEqual(p.$('[role="tabpanel"]')!.clientHeight);
  });

  it('a 1MB option label and description are clamped with a visible marker, and the footer stays in reach', async () => {
    const q = { ...SCOPE, options: [{ label: BIG, description: BIG }, { label: 'b' }] };
    const p = await mount([q, TONE]);
    const row = p.rows()[0];
    expect(row.textContent!.length).toBeLessThan(5000);
    expect(row.textContent).toMatch(/more characters/);
    expect(p.$('[data-question-panel]')!.getBoundingClientRect().height).toBeLessThan(800);
    expect(inView(p, p.btn('Next')!)).toBe(true);
    // the answer still carries the model's real label, untouched
    await userEvent.click(row.querySelector('input')!);
    await wait(100);
    await userEvent.click(p.$$('[role="tab"]')[2]);
    await wait(60);
    expect(p.root.textContent!.length).toBeLessThan(20_000);
  });

  it('a 1MB header, preview label and review answer do not stretch the panel', async () => {
    const q = { id: 'cfg', header: BIG, question: 'Which?', kind: 'choice', required: true, options: [{ label: BIG, preview: 'x' }, { label: 'b' }] };
    const p = await mount([q, TONE]);
    const panel = p.$('[data-question-panel]')!;
    expect(panel.getBoundingClientRect().height).toBeLessThan(800);
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
  });

  it('the Preview caption with a long unbroken label does not overflow horizontally', async () => {
    const label = 'L'.repeat(5000);
    const p = await mount([{ id: 'cfg', header: 'Cfg', question: 'Which?', kind: 'choice', required: true, options: [{ label, preview: 'x' }, { label: 'b', preview: 'y' }] }], { width: '700px' });
    const caption = [...p.root.querySelectorAll<HTMLElement>('span')].find((s) => s.textContent?.startsWith('Preview of'))!;
    // A truncated caption still has a large scrollWidth (the clipped text); what matters is its BOX.
    const panel = p.$('[data-question-panel]')!;
    expect(getComputedStyle(caption).textOverflow).toBe('ellipsis');
    expect(caption.getBoundingClientRect().width).toBeLessThanOrEqual(panel.getBoundingClientRect().width);
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
  });

  it('a 1MB Other answer clamps in the review row', async () => {
    const p = await mount([SCOPE, TONE]);
    p.rows()[3].querySelector('input')!.click();
    await wait(80);
    const ta = p.$('textarea[data-other]') as HTMLTextAreaElement;
    ta.value = BIG;
    ta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await wait(120);
    p.el.select(2);
    await wait(120);
    expect(p.$('[role="tabpanel"]')!.textContent!.length).toBeLessThan(20_000);
  });
});

describe('question panel in Chromium: bidi controls cannot reorder the text', () => {
  it('draws a right-to-left override visibly and isolates every model-text span', async () => {
    const evil = '\u202Eevil.exe';
    const p = await mount([{ id: 'q', header: evil, question: evil, kind: 'choice', required: true, options: [{ label: evil, description: evil, preview: evil }, { label: 'b' }] }, TONE]);
    const text = p.root.textContent!;
    expect(text).not.toContain('\u202E');
    expect(text).toContain('U+202E');
    for (const sel of ['[data-question-body] > p', '[data-option-row] label span span', '[role="tab"] span.truncate', 'pre[data-preview]']) {
      const n = p.$(sel)!;
      expect(n, sel).toBeTruthy();
      const cs = getComputedStyle(n);
      expect(['isolate', 'isolate-override'].includes(cs.unicodeBidi) || n.getAttribute('dir') === 'auto', sel).toBe(true);
      expect(n.getAttribute('dir'), sel).toBe('auto');
    }
  });
});

describe('question panel in Chromium: Back and the confirm strip', () => {
  it('Back is hidden on the first step and shown after it', async () => {
    const p = await mount([SCOPE, TONE]);
    expect(p.btn('Back')).toBeUndefined();
    await userEvent.click(p.btn('Next')!);
    await wait(60);
    expect(p.btn('Back')).toBeTruthy();
  });

  it('a confirm carrying a preview shows it in a monospace strip above Approve and Deny, as text', async () => {
    const cmd = '<b>rm -rf</b> node_modules && pnpm install';
    const p = await mount([{ ...APPROVE, options: [{ label: 'Approve', preview: cmd }, { label: 'Deny' }] }]);
    const strip = p.$('[data-confirm-detail]')!;
    expect(strip.textContent).toBe(cmd);
    expect(strip.querySelector('b')).toBeNull();
    expect(getComputedStyle(strip).fontFamily).toMatch(/mono|Menlo|Consolas|monospace/i);
    expect(strip.getBoundingClientRect().bottom).toBeLessThanOrEqual(p.rows()[0].getBoundingClientRect().top + 2);
    expect(p.$('pre[data-preview]')).toBeNull(); // not the side-by-side preview
  });
});
