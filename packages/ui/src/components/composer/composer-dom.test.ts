import { describe, it, expect } from 'vitest';
import { ZWSP, createEntityEl, createTextWalker, isUsableImageSrc, isEntityEl, parseDom, renderDoc } from './composer-dom';

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

  it('skills/agents render their built-in sigil, which wins over any icon', () => {
    // Skills + agents are LIGHT sigil-led text — a sigil span, never an icon.
    const skillPill = createEntityEl(document, { kind: 'skill', id: 's', label: 'S' });
    expect(skillPill.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('/');
    expect(skillPill.querySelector('img')).toBeNull();
    expect(skillPill.querySelector('svg')).toBeNull();
    // kindIcons is ignored for a sigil kind (it still renders the sigil, no img).
    const agentPill = createEntityEl(document, { kind: 'agent', id: 'a', label: 'A' }, { kindIcons: { agent: '/bot.svg' } });
    expect(agentPill.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('@');
    expect(agentPill.querySelector('img')).toBeNull();
  });

  it('other kinds resolve one chain: own icon > kindIcons > built-in glyph > the kind’s trigger char', () => {
    const plugin = { kind: 'plugin', id: 'p', label: 'P' };
    // kindIcons default for the kind → <img>
    const withKindIcon = createEntityEl(document, plugin, { kindIcons: { plugin: '/plug.svg' } });
    expect(withKindIcon.querySelector('img')?.getAttribute('src')).toBe('/plug.svg');
    // item's own icon wins over kindIcons
    const withOwn = createEntityEl(document, { ...plugin, icon: '/own.png' }, { kindIcons: { plugin: '/plug.svg' } });
    expect(withOwn.querySelector('img')?.getAttribute('src')).toBe('/own.png');
    // an icon NAME (`file-text` is a Lucide name, not a src) is treated as absent
    // and the chain falls through instead of emitting a broken <img>.
    const named = createEntityEl(document, { ...plugin, icon: 'file-text' }, { kindIcons: { plugin: '/plug.svg' } });
    expect(named.querySelector('img')?.getAttribute('src')).toBe('/plug.svg');
    // no icon + no kindIcons → built-in plugin glyph (svg, no img)
    const glyph = createEntityEl(document, plugin);
    expect(glyph.querySelector('img')).toBeNull();
    expect(glyph.querySelector('svg')).toBeTruthy();
    // LAST step: a kind with no built-in glyph leads with the character that
    // triggers it — the whole point, since a consumer's kind is reached by a
    // trigger and would otherwise render a hole where a glyph belongs.
    const mention = createEntityEl(
      document,
      { kind: 'mention', id: 'm', label: 'q3.pdf', icon: 'file-text' },
      { sigils: { mention: '@' } },
    );
    expect(mention.querySelector('img')).toBeNull();
    expect(mention.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('@');
    // No built-in glyph AND no trigger → no glyph element at all (never an empty box).
    const bare = createEntityEl(document, { kind: 'file', id: 'f', label: 'F' });
    expect(bare.querySelector('img')).toBeNull();
    expect(bare.querySelector('svg')).toBeNull();
    expect(bare.querySelector('.kai-composer-pill-sigil')).toBeNull();
  });

  it('covers the tree’s second instance of the class: the builder’s `/` rows', () => {
    // `builder-composer-triggers.tsx` maps `/` → kind `command`, and its default
    // rows carry `icon: 'sparkles'` — a name, so the same defect rendered a broken
    // <img> in the `/` menu too. Same class, same chain, no second fix.
    const pill = createEntityEl(
      document,
      { kind: 'command', id: 'c', label: 'summarize', icon: 'sparkles' },
      { sigils: { command: '/' } },
    );
    expect(pill.querySelector('img')).toBeNull();
    expect(pill.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('/');
  });

  it('isUsableImageSrc accepts addresses and rejects names', () => {
    for (const src of ['https://x/y.png', 'data:image/svg+xml,<svg/>', 'blob:abc', '/x.png', './x.png', 'icons/x.png', 'x.png']) {
      expect(isUsableImageSrc(src)).toBe(true);
    }
    // A name in an <img src> is a broken image — and a scheme an <img> cannot
    // fetch is one that can never load, so neither counts as an address.
    for (const name of ['file-text', 'sparkles', '', '   ', 'javascript:alert(1)', undefined, null, 42]) {
      expect(isUsableImageSrc(name)).toBe(false);
    }
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
