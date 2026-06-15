import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-reasoning': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleText =
  'First I parse the request, then I plan the steps, then I execute and verify each one before responding.';

/** Render the actual `<kc-reasoning>` custom element with a `text` property. */
function ReasoningElement(props: { text: string; streaming?: boolean }) {
  let el: (HTMLElement & { text?: string; streaming?: boolean }) | undefined;
  onMount(() => {
    if (el) {
      el.text = props.text;
      if (props.streaming) el.streaming = true;
    }
  });
  return (
    <kc-reasoning ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-reasoning id="reason" label="Reasoning"></kc-reasoning>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  const reason = document.getElementById('reason');
  reason.text = 'First I parse the request, then I plan the steps, then I execute.';
  // reason.streaming = true;  // auto-expands while a thought streams in

  // events are CustomEvents on the element (they do not bubble)
  reason.addEventListener('openchange', (e) => console.log('open:', e.detail.open));
</script>`;

const meta = {
  title: 'Components/Reasoning',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-reasoning'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-reasoning', [
          '`<kc-reasoning>` is the framework-agnostic **web component** for a collapsible reasoning/thinking block that auto-expands while a thought is `streaming`, isolated in **Shadow DOM**.',
          '**When to use:** surfacing model chain-of-thought in a non-Solid app. In SolidJS, compose the `Reasoning` primitives directly.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set the body via the `text` **property**, set the `streaming` flag while it streams in, optionally drive the controlled `open` property, and listen for the `openchange` **CustomEvent**.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A collapsed reasoning block (the trigger toggles it). */
export const Default: Story = {
  render: () => <ReasoningElement text={sampleText} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** With `streaming` set, the block auto-expands. */
export const Streaming: Story = {
  render: () => <ReasoningElement text={sampleText} streaming />,
};
