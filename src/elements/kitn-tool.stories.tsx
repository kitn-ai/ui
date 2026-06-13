import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import type { ToolPart } from '../components/tool';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-tool': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const completedTool: ToolPart = {
  type: 'database_query',
  state: 'output-available',
  input: { table: 'users', limit: 10 },
  output: { rows: 10, ms: 42 },
};

const runningTool: ToolPart = {
  type: 'search',
  state: 'input-available',
  input: { query: 'kitn docs' },
};

/** Render the actual `<kitn-tool>` custom element with a `tool` property. */
function ToolElement(props: { tool: ToolPart; open?: boolean }) {
  let el: (HTMLElement & { tool?: ToolPart; open?: boolean }) | undefined;
  onMount(() => {
    if (el) {
      el.tool = props.tool;
      if (props.open) el.open = true;
    }
  });
  return (
    <kitn-tool ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-tool id="tool" open></kitn-tool>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const tool = document.getElementById('tool');
  tool.tool = {
    type: 'database_query',
    state: 'output-available',
    input: { table: 'users', limit: 10 },
    output: { rows: 10, ms: 42 },
  };
</script>`;

const meta = {
  title: 'Web Components/kitn-tool',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-tool>` is the framework-agnostic **web component** for a single tool-call panel — a collapsible input/output inspector with a state badge — isolated in **Shadow DOM**.',
          '**When to use:** rendering an agent/tool-call trace in a non-Solid app. In SolidJS, use the `Tool` primitive directly.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the call via the `tool` **property** (`el.tool = {...}`), and add the `open` flag to start it expanded.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A completed call with input and output, started expanded. */
export const Completed: Story = {
  render: () => <ToolElement tool={completedTool} open />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A call still awaiting output (collapsed). */
export const Running: Story = {
  render: () => <ToolElement tool={runningTool} />,
};
