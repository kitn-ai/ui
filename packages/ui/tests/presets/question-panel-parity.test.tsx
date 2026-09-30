/**
 * Parity for `<kai-question-panel>`: the same questions from the `questions` property and from
 * `<kai-question>` / `<kai-question-option>` children. Both feed one renderer, so the two shadow
 * roots must be identical once generated ids and the radio group's generated `name` and `for` are stripped.
 * The children are data holders, so unlike a slotted body there is nothing to flatten.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-components/question/question-panel';
import '../../src/web-components/question/question';
import '../../src/web-components/question/question-option';
import { expectPresetParity } from '../helpers/preset-parity';
import type { KaiQuestionPanelElement } from '../../src/web-components/web-component-types';

afterEach(() => document.body.replaceChildren());

const GENERATED = /^(id|name|for|aria-controls|aria-labelledby|aria-describedby|data-solid.*)$/;

type Q = { id: string; header: string; question: string; kind: string; required?: boolean; multiSelect?: boolean; placeholder?: string; options?: { label: string; description?: string; preview?: string }[]; fields?: object };

const SETS: Record<string, Q[]> = {
  'choice with descriptions and previews': [
    { id: 'cfg', header: 'Config', question: 'Which config?', kind: 'choice', options: [{ label: 'One', description: 'first', preview: 'a: 1' }, { label: 'Two', description: 'second', preview: 'b: 2' }] },
  ],
  'two questions (tabs and Review)': [
    { id: 'a', header: 'Scope', question: 'Which part?', kind: 'choice', options: [{ label: 'X' }, { label: 'Y' }] },
    { id: 'b', header: 'Tone', question: 'How formal?', kind: 'choice', multiSelect: true, options: [{ label: 'Casual' }, { label: 'Formal' }] },
  ],
  'a lone confirm': [{ id: 'ok', header: 'Run', question: 'Run it?', kind: 'confirm' }],
  'tasks': [{ id: 't', header: 'Checks', question: 'Which?', kind: 'tasks', options: [{ label: 'lint' }, { label: 'types' }] }],
  'text with a placeholder, optional': [{ id: 'n', header: 'Note', question: 'Anything?', kind: 'text', placeholder: 'Type', required: false }],
  'form': [{ id: 'f', header: 'Who', question: 'Who?', kind: 'form', fields: { type: 'object', required: ['name'], properties: { name: { type: 'string', title: 'Name' } } } }],
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const preset = (qs: Q[]) => () => {
  const el = document.createElement('kai-question-panel') as KaiQuestionPanelElement;
  el.questions = qs as never;
  el.focusOnOpen = false;
  return el;
};

const composed = (qs: Q[]) => () => {
  const el = document.createElement('kai-question-panel') as KaiQuestionPanelElement;
  el.focusOnOpen = false;
  el.innerHTML = qs.map((q) => `<kai-question question-id="${q.id}" header="${esc(q.header)}" question="${esc(q.question)}" kind="${q.kind}"${q.multiSelect ? ' multi-select' : ''}${q.placeholder ? ` placeholder="${esc(q.placeholder)}"` : ''}${q.required === false ? ' required="false"' : ''}>${
    (q.options ?? []).map((o) => `<kai-question-option label="${esc(o.label)}"${o.description ? ` description="${esc(o.description)}"` : ''}${o.preview ? ` preview="${esc(o.preview)}"` : ''}></kai-question-option>`).join('')
  }</kai-question>`).join(''); // test-authored markup, not model output
  // `fields` is a JSON object: a property, never an attribute.
  [...el.querySelectorAll('kai-question')].forEach((c, i) => { if (qs[i].fields) (c as HTMLElement & { fields: object }).fields = qs[i].fields!; });
  return el;
};

describe('kai-question-panel: questions= vs <kai-question> children', () => {
  for (const [name, qs] of Object.entries(SETS)) {
    it(`renders the same shadow DOM: ${name}`, async () => {
      await expectPresetParity(preset(qs), composed(qs), GENERATED);
    });
  }

  it('the check can fail: a different option label is a different shadow DOM', async () => {
    const qs = SETS['choice with descriptions and previews'];
    const other = structuredClone(qs);
    other[0].options![0].label = 'Changed';
    await expect(expectPresetParity(preset(qs), composed(other), GENERATED)).rejects.toThrow();
  });
});
