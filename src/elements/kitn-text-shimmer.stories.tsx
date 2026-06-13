import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-text-shimmer': JSX.HTMLAttributes<HTMLElement> & {
        text?: string;
        duration?: number;
        spread?: number;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-text-shimmer text="Thinking…" duration="3" spread="20"></kitn-text-shimmer>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements
</script>`;

const meta = {
  title: 'Web Components/kitn-text-shimmer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-text-shimmer>` is the framework-agnostic **web component** for animated shimmering text — a gradient sweep across a label, isolated in **Shadow DOM**.',
          '**When to use:** signalling a quiet, in-progress state ("Thinking…", "Generating…") inline. In SolidJS, use the `TextShimmer` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the `text` attribute, and tune `duration` (seconds) and `spread` (gradient width, 5–45).",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Default shimmer. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px', 'font-size': '18px' }}>
      <kitn-text-shimmer text="Thinking…" />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Faster sweep with a wider gradient spread. */
export const Tuned: Story = {
  render: () => (
    <div style={{ padding: '24px', 'font-size': '18px' }}>
      <kitn-text-shimmer text="Generating response…" duration={2} spread={35} />
    </div>
  ),
};
