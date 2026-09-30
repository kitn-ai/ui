import { describe, it, expect } from 'vitest';
import type { Answer } from '../../primitives/questions';
import {
  optionsOf, allowsOther, isMulti, rowCount, isAnswered, answerFromDraft, draftFromAnswer, emptyDraft,
  missingQuestions, unansweredCount, answerLine, clampPreview, PREVIEW_MAX, isOneClick, clampText, showText, confirmDetail,
  type PanelQuestion,
} from './question-state';

const choice: PanelQuestion = {
  id: 'tone', header: 'Tone', question: 'How formal?', kind: 'choice', required: true,
  options: [{ label: 'Casual' }, { label: 'Formal' }],
};
const multi: PanelQuestion = { ...choice, id: 'scope', multiSelect: true };
const tasks: PanelQuestion = { ...choice, id: 'todo', kind: 'tasks', options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] };
const confirm: PanelQuestion = { id: 'ok', header: 'Run', question: 'Run it?', kind: 'confirm', required: true };
const text: PanelQuestion = { id: 't', header: 'Note', question: 'Anything else?', kind: 'text', required: true };

describe('question-state', () => {
  it('confirm without options gets the Approve / Deny pair; a model pair overrides it', () => {
    expect(optionsOf(confirm).map((o) => o.label)).toEqual(['Approve', 'Deny']);
    expect(optionsOf({ ...confirm, options: [{ label: 'Ship' }, { label: 'Hold' }] }).map((o) => o.label)).toEqual(['Ship', 'Hold']);
  });

  it('Other is the last numbered row on choice, confirm and tasks, and only there', () => {
    expect(rowCount(choice)).toBe(3);
    expect(rowCount(confirm)).toBe(3);
    expect(rowCount(tasks)).toBe(4);
    expect(allowsOther(text)).toBe(false);
    expect(allowsOther({ ...choice, allowOther: false })).toBe(false);
    expect(rowCount({ ...choice, allowOther: false })).toBe(2);
    expect(isMulti(multi)).toBe(true);
    expect(isMulti(tasks)).toBe(true);
    expect(isMulti(choice)).toBe(false);
  });

  it('single-select Other replaces the selection: text set, selected empty', () => {
    const a = answerFromDraft(choice, { ...emptyDraft(), selected: [], otherOn: true, other: '  Somewhere between  ' })!;
    expect(a.selected).toEqual([]);
    expect(a.text).toBe('Somewhere between');
  });

  it('multi-select Other adds text beside the ticked options, in option order', () => {
    const a = answerFromDraft(multi, { ...emptyDraft(), selected: ['Formal', 'Casual'], otherOn: true, other: 'Plus this' })!;
    expect(a.selected).toEqual(['Casual', 'Formal']);
    expect(a.text).toBe('Plus this');
  });

  it('Other selected but blank is not an answer', () => {
    expect(isAnswered(choice, { ...emptyDraft(), otherOn: true, other: '   ' })).toBe(false);
    expect(answerFromDraft(choice, { ...emptyDraft(), otherOn: true, other: '' })).toBeUndefined();
  });

  it('text and form kinds record text and values', () => {
    expect(answerFromDraft(text, { ...emptyDraft(), text: ' hi ' })).toMatchObject({ kind: 'text', text: 'hi' });
    const form: PanelQuestion = { id: 'f', header: 'Who', question: 'Who?', kind: 'form', required: true, fields: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, age: { type: 'number' } } } };
    expect(isAnswered(form, { ...emptyDraft(), values: { age: 3 } })).toBe(false);
    expect(answerFromDraft(form, { ...emptyDraft(), values: { name: 'Ada', age: 3 } })).toMatchObject({ kind: 'form', values: { name: 'Ada', age: 3 } });
  });

  it('echoes header, question and kind into the answer', () => {
    expect(answerFromDraft(choice, { ...emptyDraft(), selected: ['Casual'] })).toEqual({
      questionId: 'tone', header: 'Tone', question: 'How formal?', kind: 'choice', selected: ['Casual'],
    });
  });

  it('draftFromAnswer is the inverse: Other text comes back as an open Other row', () => {
    const answer: Answer = { questionId: 'scope', header: 'Scope', question: 'q', kind: 'choice', selected: ['Casual'], text: 'more' };
    expect(draftFromAnswer(multi, answer)).toMatchObject({ selected: ['Casual'], otherOn: true, other: 'more' });
    expect(draftFromAnswer(text, { questionId: 't', header: 'x', question: 'q', kind: 'text', text: 'yo' })).toMatchObject({ text: 'yo', otherOn: false });
  });

  it('missingQuestions only counts REQUIRED questions with no answer', () => {
    const optional: PanelQuestion = { ...text, id: 'opt', required: false };
    const drafts = { tone: { ...emptyDraft(), selected: ['Casual'] } };
    expect(missingQuestions([choice, text, optional], drafts).map((q) => q.id)).toEqual(['t']);
  });

  it('unansweredCount reads the public answers, for the waiting line', () => {
    const answers: Answer[] = [{ questionId: 'tone', header: 'Tone', question: 'q', kind: 'choice', selected: ['Casual'] }];
    expect(unansweredCount([choice, text, multi], answers)).toBe(2);
    expect(unansweredCount([choice], [])).toBe(1);
    expect(unansweredCount([], [])).toBe(0);
  });

  it('answerLine reads an answer as one line, Other text included', () => {
    expect(answerLine(multi, { ...emptyDraft(), selected: ['Casual'], otherOn: true, other: 'and more' })).toBe('Casual, and more');
    expect(answerLine(choice, emptyDraft())).toBeUndefined();
  });

  it('isOneClick is the single rule: a lone confirm', () => {
    expect(isOneClick([confirm])).toBe(true);
    expect(isOneClick([confirm, choice])).toBe(false);
  });

  it('clampPreview keeps short text and marks a long one visibly', () => {
    expect(clampPreview('short')).toBe('short');
    const clamped = clampPreview('x'.repeat(100_000));
    expect(clamped.startsWith('x'.repeat(PREVIEW_MAX))).toBe(true);
    expect(clamped.length).toBeLessThan(PREVIEW_MAX + 200);
    expect(clamped).toMatch(/100000 characters/);
  });

  it('clampText keeps short text and marks a cut with the number of characters lost', () => {
    expect(clampText('short', 10)).toBe('short');
    expect(clampText('x'.repeat(1_000_000), 300)).toMatch(/^x{300}\u2026 \[\+999700 more characters\]$/);
  });

  it('showText draws a bidi override as a visible code point and leaves the rest alone', () => {
    expect(showText('\u202Eevil.exe')).toBe('[U+202E]evil.exe');
    expect(showText('\u202Bx\u202C')).toBe('[U+202B]x[U+202C]');
    // marks real RTL text carries are left alone
    expect(showText('\u05E9\u05DC\u05D5\u05DD\u200F')).toBe('\u05E9\u05DC\u05D5\u05DD\u200F');
    expect(showText('a\u200Eb \u2066x\u2069')).toBe('a\u200Eb \u2066x\u2069');
    expect(showText('plain <b>text</b>')).toBe('plain <b>text</b>');
    expect(showText('y'.repeat(50), 10)).toMatch(/more characters/);
  });

  it('confirmDetail is the first option preview of a confirm, and nothing for other kinds', () => {
    expect(confirmDetail({ kind: 'confirm', options: [{ label: 'Approve', preview: 'rm -rf x' }, { label: 'Deny' }] })).toBe('rm -rf x');
    expect(confirmDetail({ kind: 'confirm' })).toBeUndefined();
    expect(confirmDetail({ kind: 'choice', options: [{ label: 'a', preview: 'p' }] })).toBeUndefined();
  });
});
