import { describe, it, expect } from 'vitest';
import { CHAT_SEAMS, PROMPT_INPUT_SEAMS, readSeams } from './seams';

describe('CHAT_SEAMS registry', () => {
  it('lists the eight kai-chat seams, in order, with unique names', () => {
    expect(CHAT_SEAMS.map((s) => s.name)).toEqual([
      'header-start', 'header-end', 'header', 'sidebar',
      'empty', 'composer', 'composer-actions', 'footer',
    ]);
    const names = CHAT_SEAMS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks header, empty, and composer as replace seams', () => {
    expect(CHAT_SEAMS.filter((s) => s.mode === 'replace').map((s) => s.name))
      .toEqual(['header', 'empty', 'composer']);
  });

  it('every seam has a non-empty doc contract', () => {
    expect(CHAT_SEAMS.every((s) => s.doc.trim().length > 0)).toBe(true);
  });
});

describe('readSeams', () => {
  const host = (html: string): Element => {
    const el = document.createElement('kai-chat');
    el.innerHTML = html;
    return el;
  };

  it('reports false for every seam when nothing is projected', () => {
    const seams = readSeams(host(''));
    expect(Object.keys(seams)).toHaveLength(CHAT_SEAMS.length);
    expect(Object.values(seams).every((v) => v === false)).toBe(true);
  });

  it('detects direct children carrying a seam slot attribute', () => {
    const seams = readSeams(host('<nav slot="sidebar"></nav><footer slot="footer"></footer>'));
    expect(seams.sidebar).toBe(true);
    expect(seams.footer).toBe(true);
    expect(seams.header).toBe(false);
  });

  it('ignores nested (non-direct-child) slotted descendants', () => {
    const seams = readSeams(host('<div><span slot="sidebar"></span></div>'));
    expect(seams.sidebar).toBe(false);
  });
});

describe('PROMPT_INPUT_SEAMS registry', () => {
  it('lists the four prompt-input seams in order, with unique names', () => {
    expect(PROMPT_INPUT_SEAMS.map((s) => s.name)).toEqual([
      'notice', 'leading', 'toolbar-start', 'trailing',
    ]);
    const names = PROMPT_INPUT_SEAMS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks all seams as inject mode', () => {
    expect(PROMPT_INPUT_SEAMS.every((s) => s.mode === 'inject')).toBe(true);
  });

  it('every seam has a non-empty doc contract', () => {
    expect(PROMPT_INPUT_SEAMS.every((s) => s.doc.trim().length > 0)).toBe(true);
  });
});
