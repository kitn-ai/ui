import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

interface Step {
  label: string;
  content?: string;
}

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-chain-of-thought': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const steps: Step[] = [
  { label: 'Understand the request', content: 'The user wants a composable set of web components.' },
  { label: 'Design the API', content: 'Route 1: variant + flags + events; rich data via properties.' },
  { label: 'Build & verify' },
];

/** Render `<kitn-chain-of-thought>` with the `steps` set as a JS property. */
function CotElement(props: { steps: Step[] }) {
  let el: (HTMLElement & { steps?: Step[] }) | undefined;
  onMount(() => {
    if (el) el.steps = props.steps;
  });
  return (
    <kitn-chain-of-thought ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '24px', 'max-width': '560px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-chain-of-thought id="cot"></kitn-chain-of-thought>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  document.getElementById('cot').steps = [
    { label: 'Understand the request', content: 'The user wants a composable set.' },
    { label: 'Design the API', content: 'Route 1: variant + flags + events.' },
    { label: 'Build & verify' },
  ];
</script>`;

const meta = {
  title: 'Web Components/kitn-chain-of-thought',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-chain-of-thought>` is the framework-agnostic **web component** for step-by-step reasoning — a connected list of steps, each with optional collapsible detail — isolated in **Shadow DOM**. The compound primitive collapses to a single `steps` data model (Route 1).',
          '**When to use:** surfacing an agent\'s plan or reasoning trace in a non-Solid app. In SolidJS, compose the `ChainOfThought` primitives for finer control.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, then set the `steps` **property** — an array of `{ label, content? }`. Steps with `content` become expandable.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A three-step reasoning trace; the last step has no detail. */
export const Default: Story = {
  render: () => <CotElement steps={steps} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
