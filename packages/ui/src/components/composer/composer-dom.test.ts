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

  it('skills/agents render a sigil (no icon); other kinds resolve an icon: item icon > kindIcons > glyph > nothing', () => {
    // Skills + agents are LIGHT sigil-led text — a sigil span, never an icon.
    const skillPill = createEntityEl(document, { kind: 'skill', id: 's', label: 'S' });
    expect(skillPill.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('/');
    expect(skillPill.querySelector('img')).toBeNull();
    expect(skillPill.querySelector('svg')).toBeNull();
    // kindIcons is ignored for a sigil kind (it still renders the sigil, no img).
    const agentPill = createEntityEl(document, { kind: 'agent', id: 'a', label: 'A' }, { agent: '/bot.svg' });
    expect(agentPill.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('@');
    expect(agentPill.querySelector('img')).toBeNull();

    // Chip kinds (plugins, etc.): the icon-resolution chain still applies.
    const plugin = { kind: 'plugin', id: 'p', label: 'P' };
    // kindIcons default for the kind → <img>
    const withKindIcon = createEntityEl(document, plugin, { plugin: '/plug.svg' });
    expect(withKindIcon.querySelector('img')?.getAttribute('src')).toBe('/plug.svg');
    // item's own icon wins over kindIcons
    const withOwn = createEntityEl(document, { ...plugin, icon: '/own.png' }, { plugin: '/plug.svg' });
    expect(withOwn.querySelector('img')?.getAttribute('src')).toBe('/own.png');
    // no icon + no kindIcons → built-in plugin glyph (svg, no img)
    const glyph = createEntityEl(document, plugin);
    expect(glyph.querySelector('img')).toBeNull();
    expect(glyph.querySelector('svg')).toBeTruthy();
    // an unknown chip kind with nothing → no icon element at all
    const bare = createEntityEl(document, { kind: 'file', id: 'f', label: 'F' });
    expect(bare.querySelector('img')).toBeNull();
    expect(bare.querySelector('svg')).toBeNull();
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
