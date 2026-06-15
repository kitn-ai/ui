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
  import '@kitn.ai/chat/elements';   // registers the custom elements

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
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, then set the `skills` **property** to an array of `{ id, name }`.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Two active-skill badges. */
export const Default: Story = {
  render: () => <MessageSkillsElement skills={sampleSkills} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
