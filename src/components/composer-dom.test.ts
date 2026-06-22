import { describe, it, expect } from 'vitest';
import { ZWSP, createEntityEl, isEntityEl, parseDom, renderDoc } from './composer-dom';

const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };

describe('composer-dom', () => {
  it('createEntityEl carries kind/id and is non-editable, isEntityEl recognizes it', () => {
    const el = createEntityEl(document, skill);
    expect(isEntityEl(el)).toBe(true);
    expect(el.getAttribute('contenteditable')).toBe('false');
    expect(el.dataset.kind).toBe('skill');
    expect(el.dataset.id).toBe('rec');
    expect(el.textContent).toContain('Record & Replay');
    expect(isEntityEl(document.createTextNode('x'))).toBe(false);
  });

  it('parseDom turns text + entity + ZWSP into a normalized doc', () => {
    const root = document.createElement('div');
    const pill = createEntityEl(document, skill);
    root.appendChild(pill);
    root.appendChild(document.createTextNode(ZWSP + " I'm going to show y"));
    expect(parseDom(root)).toEqual([
      { type: 'entity', entity: skill },
      { type: 'text', text: " I'm going to show y" },
    ]);
  });

  it('parseDom maps <br> to a newline', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('a'));
    root.appendChild(document.createElement('br'));
    root.appendChild(document.createTextNode('b'));
    expect(parseDom(root)).toEqual([{ type: 'text', text: 'a\nb' }]);
  });

  it('renderDoc round-trips through parseDom', () => {
    const root = document.createElement('div');
    const doc = [{ type: 'text', text: 'hi ' }, { type: 'entity', entity: skill }, { type: 'text', text: ' end' }] as const;
    renderDoc(root, doc as any);
    expect(parseDom(root)).toEqual(doc);
  });
});
