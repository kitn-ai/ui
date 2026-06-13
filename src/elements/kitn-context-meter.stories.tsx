import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { ElementSpec } from '../stories/docs/element-spec';
import { argTypesFor } from '../stories/docs/element-controls';

interface ContextUsage {
  usedTokens: number;
  maxTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCost?: number;
}

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-context-meter': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const usage: ContextUsage = {
  usedTokens: 48200,
  maxTokens: 200000,
  inputTokens: 31000,
  outputTokens: 17200,
  reasoningTokens: 4200,
  cacheTokens: 8000,
  estimatedCost: 0.42,
};

/** Render `<kitn-context-meter>` with the `context` set as a JS property. */
function MeterElement(props: { context: ContextUsage }) {
  let el: (HTMLElement & { context?: ContextUsage }) | undefined;
  onMount(() => {
    if (el) el.context = props.context;
  });
  return (
    <kitn-context-meter ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-context-meter id="ctx"></kitn-context-meter>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  document.getElementById('ctx').context = {
    usedTokens: 48200, maxTokens: 200000,
    inputTokens: 31000, outputTokens: 17200,
    reasoningTokens: 4200, cacheTokens: 8000,
    estimatedCost: 0.42,
  };
</script>`;

const meta = {
  title: 'Web Components/kitn-context-meter',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-context-meter'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-context-meter>` is the framework-agnostic **web component** for a token/context-window usage meter — a compact gauge with a hover-card breakdown (input / output / reasoning / cache + estimated cost) — isolated in **Shadow DOM**.',
          '**When to use:** showing how much of the context window a conversation is using, typically in a chat header. In SolidJS, compose the `Context` primitives.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, then set the `context` **property** with the usage object. Hover the meter to reveal the breakdown.",
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
  render: () => <ElementSpec tag="kitn-context-meter" />,
  parameters: { layout: 'padded' },
};

/** A meter at ~24% usage; hover to reveal the full breakdown. */
export const Default: Story = {
  render: () => <MeterElement context={usage} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
