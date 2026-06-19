import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-thinking-bar': JSX.HTMLAttributes<HTMLElement> & {
        text?: string;
        stoppable?: boolean | string;
        'stop-label'?: string;
        'on:kai-stop'?: (e: CustomEvent) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-thinking-bar text="Thinking" stoppable stop-label="Answer now"></kai-thinking-bar>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  document.querySelector('kai-thinking-bar')
    .addEventListener('kai-stop', () => console.log('user asked to stop'));
</script>`;

const meta = {
  title: 'Components/ThinkingBar',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-thinking-bar'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-thinking-bar', [
          '`<kai-thinking-bar>` is the framework-agnostic **web component** for an animated "thinking" indicator with an optional stop affordance — a pure leaf element isolated in **Shadow DOM**. (`<kai-chat>` does not surface this; compose it yourself.)',
          '**When to use:** showing that the assistant is reasoning, optionally letting the user interrupt with "Answer now". In SolidJS, use the `ThinkingBar` primitive.',
          "**How to use:** register once with `import '@kitn.ai/ui/elements'`, set the `text`/`stop-label` attributes, add the `stoppable` flag to show the stop button, and listen for the `kai-stop` **CustomEvent**.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A plain thinking indicator. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <kai-thinking-bar text="Thinking" />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Stoppable — shows an "Answer now" affordance that fires a `stop` event. */
export const Stoppable: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <kai-thinking-bar
        text="Reasoning"
        stoppable
        stop-label="Answer now"
        on:kai-stop={() => console.log('stop')}
      />
    </div>
  ),
};
