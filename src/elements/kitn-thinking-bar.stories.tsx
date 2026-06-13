import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements
import { ElementSpec } from '../stories/docs/element-spec';
import { argTypesFor } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-thinking-bar': JSX.HTMLAttributes<HTMLElement> & {
        text?: string;
        stoppable?: boolean | string;
        'stop-label'?: string;
        'on:stop'?: (e: CustomEvent) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-thinking-bar text="Thinking" stoppable stop-label="Answer now"></kitn-thinking-bar>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  document.querySelector('kitn-thinking-bar')
    .addEventListener('stop', () => console.log('user asked to stop'));
</script>`;

const meta = {
  title: 'Web Components/kitn-thinking-bar',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-thinking-bar'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-thinking-bar>` is the framework-agnostic **web component** for an animated "thinking" indicator with an optional stop affordance — a pure leaf element isolated in **Shadow DOM**. (`<kitn-chat>` does not surface this; compose it yourself.)',
          '**When to use:** showing that the assistant is reasoning, optionally letting the user interrupt with "Answer now". In SolidJS, use the `ThinkingBar` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the `text`/`stop-label` attributes, add the `stoppable` flag to show the stop button, and listen for the `stop` **CustomEvent**.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Full generated API reference — properties, events, tokens, and composed-from. */
export const API: Story = {
  render: () => <ElementSpec tag="kitn-thinking-bar" />,
  parameters: { layout: 'padded' },
};

/** A plain thinking indicator. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <kitn-thinking-bar text="Thinking" />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Stoppable — shows an "Answer now" affordance that fires a `stop` event. */
export const Stoppable: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <kitn-thinking-bar
        text="Reasoning"
        stoppable
        stop-label="Answer now"
        on:stop={() => console.log('stop')}
      />
    </div>
  ),
};
