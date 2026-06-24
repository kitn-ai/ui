import { describe, it, expect } from 'vitest';
import { CHAT_SLOTS, PROMPT_INPUT_SLOTS, readSlots } from './slots';

describe('CHAT_SLOTS registry', () => {
  it('lists the eight kai-chat slots, in order, with unique names', () => {
    expect(CHAT_SLOTS.map((s) => s.name)).toEqual([
      'header-start', 'header-end', 'header', 'sidebar',
      'empty', 'composer', 'composer-actions', 'footer',
    ]);
    const names = CHAT_SLOTS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks header, empty, and composer as replace slots', () => {
    expect(CHAT_SLOTS.filter((s) => s.mode === 'replace').map((s) => s.name))
      .toEqual(['header', 'empty', 'composer']);
  });

  it('every slot has a non-empty doc contract', () => {
    expect(CHAT_SLOTS.every((s) => s.doc.trim().length > 0)).toBe(true);
  });
});

describe('readSlots', () => {
  const host = (html: string): Element => {
    const el = document.createElement('kai-chat');
    el.innerHTML = html;
    return el;
  };

  it('reports false for every slot when nothing is projected', () => {
    const slots = readSlots(host(''));
    expect(Object.keys(slots)).toHaveLength(CHAT_SLOTS.length);
    expect(Object.values(slots).every((v) => v === false)).toBe(true);
  });

  it('detects direct children carrying a slot attribute', () => {
    const slots = readSlots(host('<nav slot="sidebar"></nav><footer slot="footer"></footer>'));
    expect(slots.sidebar).toBe(true);
    expect(slots.footer).toBe(true);
    expect(slots.header).toBe(false);
  });

  it('ignores nested (non-direct-child) slotted descendants', () => {
    const slots = readSlots(host('<div><span slot="sidebar"></span></div>'));
    expect(slots.sidebar).toBe(false);
  });
});

describe('PROMPT_INPUT_SLOTS registry', () => {
  it('lists the four prompt-input slots in order, with unique names', () => {
    expect(PROMPT_INPUT_SLOTS.map((s) => s.name)).toEqual([
      'notice', 'leading', 'toolbar-start', 'trailing',
    ]);
    const names = PROMPT_INPUT_SLOTS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks all slots as inject mode', () => {
    expect(PROMPT_INPUT_SLOTS.every((s) => s.mode === 'inject')).toBe(true);
  });

  it('every slot has a non-empty doc contract', () => {
    expect(PROMPT_INPUT_SLOTS.every((s) => s.doc.trim().length > 0)).toBe(true);
  });
});
