import { describe, it, expect } from 'vitest';
import { ZWSP, createEntityEl, createTextWalker, isEntityEl, parseDom, renderDoc } from './composer-dom';

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

  it('icon resolution: item icon > kindIcons[kind] > built-in glyph > nothing', () => {
    const agent = { kind: 'agent', id: 'a', label: 'A' };
    // kindIcons default for the kind → <img>
    const withKindIcon = createEntityEl(document, agent, { agent: '/bot.svg' });
    expect(withKindIcon.querySelector('img')?.getAttribute('src')).toBe('/bot.svg');
    // item's own icon wins over kindIcons
    const withOwn = createEntityEl(document, { ...agent, icon: '/own.png' }, { agent: '/bot.svg' });
    expect(withOwn.querySelector('img')?.getAttribute('src')).toBe('/own.png');
    // no icon + no kindIcons → built-in agent glyph (svg, no img)
    const glyph = createEntityEl(document, agent);
    expect(glyph.querySelector('img')).toBeNull();
    expect(glyph.querySelector('svg')).toBeTruthy();
    // skills have no built-in glyph and no kindIcons → no icon element at all
    const skill = createEntityEl(document, { kind: 'skill', id: 's', label: 'S' });
    expect(skill.querySelector('img')).toBeNull();
    expect(skill.querySelector('svg')).toBeNull();
  });

  it('createTextWalker skips text inside entity pills (pill label not in the text model)', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('hi '));
    root.appendChild(createEntityEl(document, skill)); // contains label "Record & Replay"
    root.appendChild(document.createTextNode(ZWSP + '/'));
    const walker = createTextWalker(root);
    let collected = '';
    let n = walker.nextNode();
    while (n) { collected += n.textContent ?? ''; n = walker.nextNode(); }
    // The pill's "Record & Replay" label must NOT appear; only the outer text.
    expect(collected).toBe('hi ' + ZWSP + '/');
    expect(collected).not.toContain('Record & Replay');
  });

  it('parseDom treats a lone trailing <br> (cleared contenteditable) as empty', () => {
    const root = document.createElement('div');
    root.appendChild(document.createElement('br'));
    expect(parseDom(root)).toEqual([]);
  });

  it('parseDom drops a trailing filler <br> but keeps a mid-content <br>', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('a'));
    root.appendChild(document.createElement('br')); // real newline (mid)
    root.appendChild(document.createTextNode('b'));
    root.appendChild(document.createElement('br')); // trailing filler
    expect(parseDom(root)).toEqual([{ type: 'text', text: 'a\nb' }]);
  });

  it('renderDoc round-trips through parseDom', () => {
    const root = document.createElement('div');
    const doc = [{ type: 'text', text: 'hi ' }, { type: 'entity', entity: skill }, { type: 'text', text: ' end' }] as const;
    renderDoc(root, doc as any);
    expect(parseDom(root)).toEqual(doc);
  });
});
