import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

interface Step {
  label: string;
  content?: string;
}

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-chain-of-thought': JSX.HTMLAttributes<HTMLElement>;
      /** Light-DOM data carrier for declarative steps inside `<kc-chain-of-thought>`. */
      'kc-step': JSX.HTMLAttributes<HTMLElement> & { label?: string };
    }
  }
}

const steps: Step[] = [
  { label: 'Understand the request', content: 'The user wants a composable set of web components.' },
  { label: 'Design the API', content: 'Route 1: variant + flags + events; rich data via properties.' },
  { label: 'Build & verify' },
];

/** Render `<kc-chain-of-thought>` with the `steps` set as a JS property. */
function CotElement(props: { steps: Step[] }) {
  let el: (HTMLElement & { steps?: Step[] }) | undefined;
  onMount(() => {
    if (el) el.steps = props.steps;
  });
  return (
    <kc-chain-of-thought ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '24px', 'max-width': '560px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-chain-of-thought id="cot"></kc-chain-of-thought>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  document.getElementById('cot').steps = [
    { label: 'Understand the request', content: 'The user wants a composable set.' },
    { label: 'Design the API', content: 'Route 1: variant + flags + events.' },
    { label: 'Build & verify' },
  ];
</script>`;

const meta = {
  title: 'Components/ChainOfThought',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-chain-of-thought'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-chain-of-thought', [
        '`<kc-chain-of-thought>` is the framework-agnostic **web component** for step-by-step reasoning — a connected list of steps, each with optional collapsible detail — isolated in **Shadow DOM**. The compound primitive collapses to a single `steps` data model (Route 1).',
        '**When to use:** surfacing an agent\'s plan or reasoning trace in a non-Solid app. In SolidJS, compose the `ChainOfThought` primitives for finer control.',
        '**Placement:** as a block above or below a message, or in a dedicated reasoning panel; it is `display: block` and sizes to content height, so no fixed height is required.',
        "**How to use:** register once with `import '@kitn.ai/chat/elements'`. **Property API:** set the `steps` **property** — an array of `{ label, content? }` objects; steps with `content` become expandable. **Declarative API:** compose `<kc-step label=\"…\">…detail…</kc-step>` child elements directly in the HTML — the `label` attribute becomes the heading, `textContent` the optional expandable detail. Declarative children are merged after any prop steps.",
        'See the **Code** tab for HTML usage.',
      ]),
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

const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS property assignment needed -->
<kc-chain-of-thought>
  <kc-step label="Understand the request">The user wants a composable set of web components.</kc-step>
  <kc-step label="Design the API">Route 1: variant + flags + events; rich data via properties.</kc-step>
  <kc-step label="Build &amp; verify"></kc-step>
</kc-chain-of-thought>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements
</script>`;

/**
 * Declare each reasoning step as a `<kc-step>` child element — no `steps`
 * property or JS array wiring needed. The `label` attribute becomes the
 * step heading; `textContent` becomes the optional expandable detail.
 * Children are light-DOM data carriers hidden by the Shadow DOM — pure data,
 * no visible output of their own.
 * Mix with the `steps` prop: prop items render first, declarative children after.
 */
export const DeclarativeSteps: Story = {
  name: 'Declarative Steps (kc-step)',
  render: () => (
    <kc-chain-of-thought style={{ display: 'block', padding: '24px', 'max-width': '560px' }}>
      <kc-step label="Understand the request">The user wants a composable set of web components.</kc-step>
      <kc-step label="Design the API">Route 1: variant + flags + events; rich data via properties.</kc-step>
      <kc-step label="Build &amp; verify"></kc-step>
    </kc-chain-of-thought>
  ),
  parameters: {
    docs: {
      source: { code: DECLARATIVE_HTML_SNIPPET, language: 'html' },
    },
  },
};
