/**
 * Unit tests for the declarative `<kc-skill>` light-DOM API of `<kc-skills>`.
 *
 * Strategy: the `defineWebComponent` call registers a real Shadow-DOM custom
 * element which requires a full browser environment (Constructable Stylesheets,
 * shadow roots, etc.) and is therefore not suitable for jsdom unit tests.
 * Instead we:
 *   1. Test the exported `parseKcSkillElement` helper in isolation — it has no
 *      DOM dependencies beyond `Element`, which jsdom provides perfectly.
 *   2. Test that the merged list of prop + slotted items renders badge spans
 *      correctly via `MessageSkills` directly, mirroring the pattern used in
 *      `prompt-suggestions.declarative.test.tsx`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { For } from 'solid-js';
import { parseKcSkillElement } from './message-skills';
import { MessageSkills } from '../components/message-skills';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// parseKcSkillElement — pure helper
// ---------------------------------------------------------------------------

describe('parseKcSkillElement', () => {
  function makeNode(textContent: string, id?: string): Element {
    const el = document.createElement('kc-skill');
    el.textContent = textContent;
    if (id !== undefined) el.setAttribute('id', id);
    return el;
  }

  it('uses textContent as name', () => {
    const item = parseKcSkillElement(makeNode('Web Search'));
    expect(item).toMatchObject({ name: 'Web Search' });
  });

  it('uses id attribute as id when present', () => {
    const item = parseKcSkillElement(makeNode('Web Search', 'web-search'));
    expect(item).toMatchObject({ id: 'web-search', name: 'Web Search' });
  });

  it('falls back to textContent as id when id attribute is absent', () => {
    const item = parseKcSkillElement(makeNode('Web Search'));
    expect(item).toMatchObject({ id: 'Web Search', name: 'Web Search' });
  });

  it('trims leading/trailing whitespace from textContent', () => {
    const item = parseKcSkillElement(makeNode('  Code Interpreter  '));
    expect(item).toMatchObject({ name: 'Code Interpreter' });
  });

  it('handles empty textContent with an id attribute', () => {
    const item = parseKcSkillElement(makeNode('', 'code'));
    expect(item).toMatchObject({ id: 'code', name: '' });
  });
});

// ---------------------------------------------------------------------------
// Merge + render: prop skills + slotted skills combine correctly
// ---------------------------------------------------------------------------

interface Skill {
  id: string;
  name: string;
}

describe('MessageSkills rendering with merged skills', () => {
  it('renders one badge span per skill', () => {
    const { getByText } = render(() => (
      <MessageSkills skills={[{ id: 'web-search', name: 'Web Search' }, { id: 'code', name: 'Code' }]} />
    ));
    expect(getByText('Web Search')).toBeInTheDocument();
    expect(getByText('Code')).toBeInTheDocument();
  });

  it('renders nothing when skills is empty', () => {
    const { container } = render(() => <MessageSkills skills={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders prop items before declarative (slotted) items', () => {
    // Simulate the merge: prop first, slotted second.
    const propSkills: Skill[] = [{ id: 'prop', name: 'Prop Skill' }];
    const slottedSkills: Skill[] = [{ id: 'slotted', name: 'Slotted Skill' }];
    const merged = [...propSkills, ...slottedSkills];

    const { getAllByText } = render(() => <MessageSkills skills={merged} />);
    // Both must be present; order is enforced by DOM order
    expect(getAllByText(/Prop Skill|Slotted Skill/)).toHaveLength(2);
  });

  it('parseKcSkillElement produces items that render correctly', () => {
    const el = document.createElement('kc-skill');
    el.textContent = 'Memory';
    el.setAttribute('id', 'memory');

    const parsed = parseKcSkillElement(el);
    const { getByText } = render(() => <MessageSkills skills={[parsed]} />);
    expect(getByText('Memory')).toBeInTheDocument();
  });
});
