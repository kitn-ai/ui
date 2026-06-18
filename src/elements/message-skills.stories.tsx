import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-skills': JSX.HTMLAttributes<HTMLElement>;
      /** Light-DOM data carrier for declarative skill badges inside `<kc-skills>`. */
      'kc-skill': JSX.HTMLAttributes<HTMLElement> & {
        id?: string;
      };
    }
  }
}

interface Skill {
  id: string;
  name: string;
}

const sampleSkills: Skill[] = [
  { id: 's1', name: 'web-search' },
  { id: 's2', name: 'code' },
];

/** Render the actual `<kc-skills>` custom element with a `skills` property. */
function MessageSkillsElement(props: { skills: Skill[] }) {
  let el: (HTMLElement & { skills?: Skill[] }) | undefined;
  onMount(() => {
    if (el) el.skills = props.skills;
  });
  return (
    <kc-skills ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-skills id="skills"></kc-skills>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const skills = document.getElementById('skills');
  skills.skills = [
    { id: 's1', name: 'web-search' },
    { id: 's2', name: 'code' },
  ];
</script>`;

const meta = {
  title: 'Components/Skills',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-skills'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-skills', [
          '`<kc-skills>` is the framework-agnostic **web component** that badges which skills were active for a message, isolated in **Shadow DOM**.',
          '**When to use:** annotating a message row with the skills/tools it used, in a non-Solid app. In SolidJS, use the `MessageSkills` primitive directly.',
          '**Placement:** beneath or inline with the message content, typically in the footer of a message row alongside action buttons; it is `display: block` and wraps badges horizontally.',
          "**How to use:** register once with `import '@kitn.ai/ui/elements'`. Then either (a) set the `skills` **property** to an array of `{ id, name }` objects, or (b) compose `<kc-skill>` child elements — light-DOM data carriers hidden by the Shadow DOM — where the tag's text content is the badge label and the optional `id` attribute is the stable identifier. When both are provided, prop items render first and declarative children are appended after.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Two active-skill badges set via the `skills` JS property. */
export const Default: Story = {
  render: () => <MessageSkillsElement skills={sampleSkills} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS property assignment needed -->
<kc-skills>
  <kc-skill id="web-search">Web Search</kc-skill>
  <kc-skill id="code">Code</kc-skill>
  <kc-skill id="memory">Memory</kc-skill>
</kc-skills>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements
</script>`;

/**
 * Declare each skill badge as a `<kc-skill>` child element — no `skills`
 * property or JS array wiring needed. The tag's text content is the badge
 * label; the optional `id` attribute is the stable identifier (falls back to
 * the label when absent). Children are light-DOM data carriers hidden by the
 * Shadow DOM — pure data, no visible output of their own.
 * Mix with the `skills` prop: prop items render first, declarative children after.
 */
export const DeclarativeSkills: Story = {
  name: 'Declarative Skills (kc-skill)',
  render: () => (
    <kc-skills style={{ display: 'block', padding: '16px' }}>
      <kc-skill id="web-search">Web Search</kc-skill>
      <kc-skill id="code">Code</kc-skill>
      <kc-skill id="memory">Memory</kc-skill>
    </kc-skills>
  ),
  parameters: {
    docs: {
      source: { code: DECLARATIVE_HTML_SNIPPET, language: 'html' },
    },
  },
};
