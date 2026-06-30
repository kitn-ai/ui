import { describe, it, expect } from 'vitest';
import { parseKaiTriggerItemElement } from './composer';

describe('parseKaiTriggerItemElement', () => {
  it('maps id/label/icon attrs + textContent', () => {
    const el = document.createElement('kai-trigger-item');
    el.setAttribute('item-id', 'rec');
    el.setAttribute('icon', '/rec.png');
    el.textContent = 'Record & Replay';
    expect(parseKaiTriggerItemElement(el, '/', 'skill')).toEqual({
      id: 'rec',
      label: 'Record & Replay',
      icon: '/rec.png',
      promptText: undefined,
      data: undefined,
    });
  });

  it('uses label attr as fallback when textContent is empty', () => {
    const el = document.createElement('kai-trigger-item');
    el.setAttribute('item-id', 'foo');
    el.setAttribute('label', 'Foo Label');
    expect(parseKaiTriggerItemElement(el, '@', 'mention')).toEqual({
      id: 'foo',
      label: 'Foo Label',
      icon: undefined,
      promptText: undefined,
      data: undefined,
    });
  });

  it('maps prompt-text attr to promptText', () => {
    const el = document.createElement('kai-trigger-item');
    el.setAttribute('item-id', 'bar');
    el.textContent = 'Bar';
    el.setAttribute('prompt-text', 'Use the Bar tool to do things.');
    expect(parseKaiTriggerItemElement(el, '/', 'skill')).toEqual({
      id: 'bar',
      label: 'Bar',
      icon: undefined,
      promptText: 'Use the Bar tool to do things.',
      data: undefined,
    });
  });

  it('returns undefined for absent optional attrs', () => {
    const el = document.createElement('kai-trigger-item');
    el.setAttribute('item-id', 'min');
    el.textContent = 'Minimal';
    const result = parseKaiTriggerItemElement(el, '/', 'skill');
    expect(result.icon).toBeUndefined();
    expect(result.promptText).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('falls back id to item-id attr for label when both textContent and label attr are absent', () => {
    const el = document.createElement('kai-trigger-item');
    el.setAttribute('item-id', 'fallback-id');
    const result = parseKaiTriggerItemElement(el, '/', 'skill');
    expect(result.id).toBe('fallback-id');
    expect(result.label).toBe('fallback-id');
  });
});
