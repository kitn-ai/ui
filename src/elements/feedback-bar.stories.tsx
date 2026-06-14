import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-feedback-bar': JSX.HTMLAttributes<HTMLElement> & {
        'bar-title'?: string;
        'on:feedback'?: (e: CustomEvent<{ value: 'helpful' | 'not-helpful' }>) => void;
        'on:close'?: (e: CustomEvent) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-feedback-bar bar-title="Was this helpful?"></kc-feedback-bar>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  const bar = document.querySelector('kc-feedback-bar');
  bar.addEventListener('feedback', (e) => console.log('feedback:', e.detail.value)); // 'helpful' | 'not-helpful'
  bar.addEventListener('close', () => bar.remove());
</script>`;

const meta = {
  title: 'Web Components/kc-feedback-bar',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-feedback-bar'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-feedback-bar', [
          '`<kc-feedback-bar>` is the framework-agnostic **web component** for an inline thumbs up/down feedback banner with a dismiss button — isolated in **Shadow DOM**.',
          '**When to use:** collecting a quick reaction after an answer or a completed task. In SolidJS, use the `FeedbackBar` primitive.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set the label via the `bar-title` attribute (`title` is avoided — it's a global HTML attribute), and listen for the `feedback` / `close` **CustomEvents**. The `feedback` event carries `{ value: 'helpful' | 'not-helpful' }` in its `detail`.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The default feedback prompt. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kc-feedback-bar
        on:feedback={(e) => console.log('feedback:', e.detail.value)}
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
      <kc-feedback-bar bar-title="Did this answer your question?" />
    </div>
  ),
};
