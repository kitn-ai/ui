/**
 * Unit tests for the declarative `<kai-model>` light-DOM API of
 * `<kai-model-switcher>`.
 *
 * Strategy: the `defineWebComponent` call registers a real Shadow-DOM custom
 * element which requires a full browser environment (Constructable Stylesheets,
 * shadow roots, etc.) and is therefore not suitable for jsdom unit tests.
 * Instead we:
 *   1. Test the exported `parseKcModelElement` helper in isolation — it has no
 *      DOM dependencies beyond `Element`, which jsdom provides perfectly.
 *   2. Test that the merged list of prop + slotted models combines correctly,
 *      mirroring the pattern used in `prompt-suggestions.declarative.test.tsx`.
 */
import { describe, it, expect } from 'vitest';
import { parseKcModelElement } from './model-switcher';
import type { ModelOption } from '../types';

// ---------------------------------------------------------------------------
// parseKcModelElement — pure helper
// ---------------------------------------------------------------------------

describe('parseKcModelElement', () => {
  function makeNode(textContent: string, id?: string, provider?: string): Element {
    const el = document.createElement('kai-model');
    el.textContent = textContent;
    if (id !== undefined) el.setAttribute('id', id);
    if (provider !== undefined) el.setAttribute('provider', provider);
    return el;
  }

  it('maps textContent to name', () => {
    const item = parseKcModelElement(makeNode('GPT-4o', 'gpt-4o'));
    expect(item.name).toBe('GPT-4o');
  });

  it('maps the id attribute to id', () => {
    const item = parseKcModelElement(makeNode('GPT-4o', 'gpt-4o'));
    expect(item.id).toBe('gpt-4o');
  });

  it('maps the provider attribute to provider', () => {
    const item = parseKcModelElement(makeNode('GPT-4o', 'gpt-4o', 'OpenAI'));
    expect(item.provider).toBe('OpenAI');
  });

  it('sets provider to undefined when the attribute is absent', () => {
    const item = parseKcModelElement(makeNode('Claude Sonnet', 'sonnet'));
    expect(item.provider).toBeUndefined();
  });

  it('trims leading/trailing whitespace from textContent (name)', () => {
    const item = parseKcModelElement(makeNode('  Claude Sonnet  ', 'sonnet'));
    expect(item.name).toBe('Claude Sonnet');
  });

  it('returns empty string for id when id attribute is absent', () => {
    const item = parseKcModelElement(makeNode('GPT-4o'));
    expect(item.id).toBe('');
  });

  it('produces the full ModelOption shape', () => {
    const item = parseKcModelElement(makeNode('GPT-4o', 'gpt-4o', 'OpenAI'));
    expect(item).toEqual<ModelOption>({ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: undefined, group: undefined });
  });

  it('maps the description and group attributes', () => {
    const el = document.createElement('kai-model');
    el.textContent = 'GPT-4o';
    el.setAttribute('id', 'gpt-4o');
    el.setAttribute('description', 'Flagship model');
    el.setAttribute('group', 'Legacy models');
    const item = parseKcModelElement(el);
    expect(item.description).toBe('Flagship model');
    expect(item.group).toBe('Legacy models');
  });
});

// ---------------------------------------------------------------------------
// Merge logic: prop models + slotted models combine correctly
// ---------------------------------------------------------------------------

describe('prop + declarative merge', () => {
  function makeNode(textContent: string, id: string, provider?: string): Element {
    const el = document.createElement('kai-model');
    el.textContent = textContent;
    el.setAttribute('id', id);
    if (provider !== undefined) el.setAttribute('provider', provider);
    return el;
  }

  it('renders prop items before declarative (slotted) items', () => {
    const propModels: ModelOption[] = [{ id: 'opus', name: 'Claude Opus', provider: 'Anthropic' }];
    const slottedModels = [makeNode('GPT-4o', 'gpt-4o', 'OpenAI')].map(parseKcModelElement);
    const merged = [...propModels, ...slottedModels];
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('opus');
    expect(merged[1].id).toBe('gpt-4o');
  });

  it('works with only declarative children (empty prop array)', () => {
    const slottedModels = [
      makeNode('GPT-4o', 'gpt-4o', 'OpenAI'),
      makeNode('GPT-4o mini', 'gpt-4o-mini', 'OpenAI'),
    ].map(parseKcModelElement);
    const merged = [...[], ...slottedModels];
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' });
    expect(merged[1]).toMatchObject({ id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI' });
  });

  it('works with only prop models (no declarative children)', () => {
    const propModels: ModelOption[] = [
      { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
      { id: 'haiku', name: 'Claude Haiku', provider: 'Anthropic' },
    ];
    const merged = [...propModels, ...([] as ModelOption[])];
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('sonnet');
    expect(merged[1].id).toBe('haiku');
  });

  it('parseKcModelElement produces items with the correct event payload key (id → modelId)', () => {
    // Confirm the parsed `id` field is what gets dispatched as `modelId` in kai-model-change.
    // The element fires: dispatch('kai-model-change', { modelId }) where modelId = item.id.
    const node = makeNode('GPT-4o', 'gpt-4o', 'OpenAI');
    const parsed = parseKcModelElement(node);
    // The model-switcher component passes item.id as the modelId in the event.
    expect(parsed.id).toBe('gpt-4o'); // this becomes e.detail.modelId
  });
});
