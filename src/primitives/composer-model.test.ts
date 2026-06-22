import { describe, it, expect } from 'vitest';
import { normalizeValue, serializeToText, entitiesOf, docIsEmpty, type ComposerDoc } from './composer-model';

describe('normalizeValue', () => {
  it('returns [] for nullish/empty', () => {
    expect(normalizeValue(undefined)).toEqual([]);
    expect(normalizeValue(null)).toEqual([]);
    expect(normalizeValue('')).toEqual([]);
  });
  it('wraps a non-empty string in a single text segment', () => {
    expect(normalizeValue('hello')).toEqual([{ type: 'text', text: 'hello' }]);
  });
  it('merges adjacent text segments and drops empties', () => {
    const input: ComposerDoc = [
      { type: 'text', text: 'a' }, { type: 'text', text: '' }, { type: 'text', text: 'b' },
    ];
    expect(normalizeValue(input)).toEqual([{ type: 'text', text: 'ab' }]);
  });
  it('keeps entities in order and merges text around them', () => {
    const e = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
    const input: ComposerDoc = [
      { type: 'text', text: '' }, { type: 'entity', entity: e },
      { type: 'text', text: ' ' }, { type: 'text', text: 'go' },
    ];
    expect(normalizeValue(input)).toEqual([
      { type: 'entity', entity: e }, { type: 'text', text: ' go' },
    ]);
  });
  it('does not mutate the input array', () => {
    const input: ComposerDoc = [{ type: 'text', text: 'x' }];
    normalizeValue(input);
    expect(input).toEqual([{ type: 'text', text: 'x' }]);
  });
});

describe('serializeToText', () => {
  const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
  it('renders text verbatim', () => {
    expect(serializeToText([{ type: 'text', text: 'hi there' }])).toBe('hi there');
  });
  it('renders an entity as promptText ?? label, inline', () => {
    expect(serializeToText([
      { type: 'entity', entity: skill }, { type: 'text', text: " I'm going to show y" },
    ])).toBe("Record & Replay I'm going to show y");
  });
  it('prefers promptText when present', () => {
    const e = { ...skill, promptText: 'Use the Record & Replay skill.' };
    expect(serializeToText([{ type: 'entity', entity: e }])).toBe('Use the Record & Replay skill.');
  });
  it('honors a custom entity serializer', () => {
    expect(serializeToText([{ type: 'entity', entity: skill }], { entity: (e) => `@${e.id}` })).toBe('@rec');
  });
});

describe('entitiesOf / docIsEmpty', () => {
  const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
  it('collects entities in order', () => {
    expect(entitiesOf([{ type: 'text', text: 'a' }, { type: 'entity', entity: skill }])).toEqual([skill]);
  });
  it('docIsEmpty is true for [] and false when text or entity present', () => {
    expect(docIsEmpty([])).toBe(true);
    expect(docIsEmpty([{ type: 'text', text: '' }])).toBe(true);
    expect(docIsEmpty([{ type: 'entity', entity: skill }])).toBe(false);
    expect(docIsEmpty([{ type: 'text', text: 'x' }])).toBe(false);
  });
});
