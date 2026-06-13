import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements
import { ElementSpec } from '../stories/docs/element-spec';
import { argTypesFor } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-feedback-bar': JSX.HTMLAttributes<HTMLElement> & {
        'bar-title'?: string;
        'on:helpful'?: (e: CustomEvent) => void;
        'on:nothelpful'?: (e: CustomEvent) => void;
        'on:close'?: (e: CustomEvent) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-feedback-bar bar-title="Was this helpful?"></kitn-feedback-bar>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const bar = document.querySelector('kitn-feedback-bar');
  bar.addEventListener('helpful', () => console.log('👍'));
  bar.addEventListener('nothelpful', () => console.log('👎'));
  bar.addEventListener('close', () => bar.remove());
</script>`;

const meta = {
  title: 'Web Components/kitn-feedback-bar',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-feedback-bar'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-feedback-bar>` is the framework-agnostic **web component** for an inline thumbs up/down feedback banner with a dismiss button — isolated in **Shadow DOM**.',
          '**When to use:** collecting a quick reaction after an answer or a completed task. In SolidJS, use the `FeedbackBar` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the label via the `bar-title` attribute (`title` is avoided — it's a global HTML attribute), and listen for the `helpful` / `nothelpful` / `close` **CustomEvents**.",
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
  render: () => <ElementSpec tag="kitn-feedback-bar" />,
  parameters: { layout: 'padded' },
};

/** The default feedback prompt. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kitn-feedback-bar
        on:helpful={() => console.log('helpful')}
        on:nothelpful={() => console.log('not helpful')}
        on:close={() => console.log('closed')}
      />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A custom label via the `bar-title` attribute. */
export const CustomTitle: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kitn-feedback-bar bar-title="Did this answer your question?" />
    </div>
  ),
};
