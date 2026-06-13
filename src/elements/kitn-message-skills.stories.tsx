import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-message-skills': JSX.HTMLAttributes<HTMLElement>;
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

/** Render the actual `<kitn-message-skills>` custom element with a `skills` property. */
function MessageSkillsElement(props: { skills: Skill[] }) {
  let el: (HTMLElement & { skills?: Skill[] }) | undefined;
  onMount(() => {
    if (el) el.skills = props.skills;
  });
  return (
    <kitn-message-skills ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-message-skills id="skills"></kitn-message-skills>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const skills = document.getElementById('skills');
  skills.skills = [
    { id: 's1', name: 'web-search' },
    { id: 's2', name: 'code' },
  ];
</script>`;

const meta = {
  title: 'Web Components/kitn-message-skills',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-message-skills'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kitn-message-skills', [
          '`<kitn-message-skills>` is the framework-agnostic **web component** that badges which skills were active for a message, isolated in **Shadow DOM**.',
          '**When to use:** annotating a message row with the skills/tools it used, in a non-Solid app. In SolidJS, use the `MessageSkills` primitive directly.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, then set the `skills` **property** to an array of `{ id, name }`.",
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
