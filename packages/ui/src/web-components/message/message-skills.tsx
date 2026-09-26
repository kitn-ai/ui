import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from '../define/define';
// The badge shape is the Solid component's own `Skill` — one declaration, so the
// element and `<MessageSkills>` cannot drift, and the ROOT entry re-exports it.
import { MessageSkills, type Skill } from '../../components/message/message-skills';


interface Props extends Record<string, unknown> {
  // When both this property and light-DOM children are present, the property's skills
  // come first. Nothing renders when there are none.
  /** The active skills to badge. JS property (array); omit to pass `<kai-skill>` light-DOM children instead. */
  skills?: Skill[];
}

/**
 * Parse a single light-DOM `<kai-skill>` element into a `Skill` descriptor.
 *
 * Attribute / content mapping:
 * - `id`          → Skill.id   (falls back to `name` when absent)
 * - `textContent` → Skill.name (the human-readable badge label)
 *
 * Example: `<kai-skill id="web-search">Web Search</kai-skill>`
 */
export function parseKaiSkillElement(n: Element): Skill {
  const name = n.textContent?.trim() ?? '';
  const id = n.getAttribute('id') ?? name;
  return { id, name };
}

/**
 * Badges showing which skills were active for a message.
 */
defineWebComponent<Props>('kai-skills', {
  skills: [],
}, (props, { element }) => {
  // Read declarative <kai-skill> children from light DOM.
  // The shadow root has no <slot>, so they are invisible — pure data carriers.
  const [slottedSkills, setSlottedSkills] = createSignal<Skill[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kai-skill')];
      setSlottedSkills(nodes.map(parseKaiSkillElement));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, attributes: true, subtree: true });
    onCleanup(() => observer.disconnect());
  });

  // Prop skills (first) merged with declarative children (after).
  const allSkills = () => [...(props.skills ?? []), ...slottedSkills()];

  return <MessageSkills skills={allSkills()} />;
});
