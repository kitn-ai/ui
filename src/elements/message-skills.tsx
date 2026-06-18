import { createSignal, onCleanup, onMount } from 'solid-js';
import { defineWebComponent } from './define';
import { MessageSkills } from '../components/message-skills';

interface Skill {
  /** Stable identifier for the skill. */
  id: string;
  /** Human-readable skill name shown on the badge. */
  name: string;
}

interface Props extends Record<string, unknown> {
  /** The active skills to badge. Set as a JS property. */
  skills: Skill[];
}

/**
 * Parse a single light-DOM `<kc-skill>` element into a `Skill` descriptor.
 *
 * Attribute / content mapping:
 * - `id`          → Skill.id   (falls back to `name` when absent)
 * - `textContent` → Skill.name (the human-readable badge label)
 *
 * Example: `<kc-skill id="web-search">Web Search</kc-skill>`
 */
export function parseKcSkillElement(n: Element): Skill {
  const name = n.textContent?.trim() ?? '';
  const id = n.getAttribute('id') ?? name;
  return { id, name };
}

/**
 * `<kc-skills>` — badges showing which skills were active for a
 * message. Data via the `skills` property **or** declarative `<kc-skill>`
 * children.
 *
 * **Property API** — set a JS array on the element:
 * ```html
 * <kc-skills id="skills"></kc-skills>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 *   document.getElementById('skills').skills = [
 *     { id: 'web-search', name: 'Web Search' },
 *     { id: 'code',       name: 'Code' },
 *   ];
 * </script>
 * ```
 *
 * **Declarative API** — compose `<kc-skill>` children (light-DOM data
 * carriers hidden by Shadow DOM — no visible output of their own):
 * ```html
 * <kc-skills>
 *   <kc-skill id="web-search">Web Search</kc-skill>
 *   <kc-skill id="code">Code</kc-skill>
 * </kc-skills>
 * <script type="module">
 *   import '@kitn.ai/ui/elements';
 * </script>
 * ```
 *
 * When both are provided, `skills` prop items render first and declarative
 * children are appended after.
 */
defineWebComponent<Props>('kc-skills', {
  skills: [],
}, (props, { element }) => {
  // Read declarative <kc-skill> children from light DOM.
  // The shadow root has no <slot>, so they are invisible — pure data carriers.
  const [slottedSkills, setSlottedSkills] = createSignal<Skill[]>([]);
  onMount(() => {
    const read = () => {
      const nodes = [...element.querySelectorAll('kc-skill')];
      setSlottedSkills(nodes.map(parseKcSkillElement));
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
