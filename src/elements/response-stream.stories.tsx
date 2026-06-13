import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-response-stream': JSX.HTMLAttributes<HTMLElement> & {
        mode?: string;
        speed?: number;
      };
    }
  }
}

const STREAM_TEXT =
  "This text reveals with a typewriter animation, streamed character by character — exactly how you'd render a live assistant reply.";

/** Render `<kc-response-stream>` with the `text` set as a JS property. */
function StreamElement(props: { text: string; mode?: string; speed?: number }) {
  let el: (HTMLElement & { text?: string }) | undefined;
  onMount(() => {
    if (el) el.text = props.text;
  });
  return (
    <kc-response-stream
      ref={(e) => (el = e as HTMLElement)}
      mode={props.mode}
      speed={props.speed}
      style={{ display: 'block', padding: '24px', 'max-width': '640px', 'line-height': 1.6 }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-response-stream id="stream" mode="typewriter" speed="20"></kc-response-stream>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const stream = document.getElementById('stream');
  // text can be a string, or an AsyncIterable<string> for live streaming
  stream.text = "Hello, this reveals one character at a time…";
  stream.addEventListener('complete', () => console.log('done'));
</script>`;

const meta = {
  title: 'Web Components/kc-response-stream',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-response-stream'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-response-stream', [
          '`<kc-response-stream>` is the framework-agnostic **web component** that reveals text with a typewriter or fade animation — the building block for streamed assistant replies, isolated in **Shadow DOM**.',
          '**When to use:** animating a response as it arrives. Pass a finished string to replay an animation, or an `AsyncIterable<string>` to drive it from a live stream. In SolidJS, use the `ResponseStream` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the `text` **property** (string or async iterable), tune `mode` (`typewriter` / `fade`) and `speed`, and listen for the `complete` **CustomEvent**.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Typewriter reveal (the default). */
export const Typewriter: Story = {
  render: () => <StreamElement text={STREAM_TEXT} mode="typewriter" speed={20} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Fade-in reveal, segment by segment. */
export const Fade: Story = {
  render: () => <StreamElement text={STREAM_TEXT} mode="fade" speed={10} />,
};
