import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-loader': JSX.HTMLAttributes<HTMLElement> & {
        variant?: string;
        size?: string;
        text?: string;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-loader variant="dots" size="md"></kitn-loader>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements
</script>`;

const meta = {
  title: 'Web Components/kitn-loader',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-loader>` is the framework-agnostic **web component** for an animated busy indicator — a dozen styles (circular, dots, wave, bars, text-shimmer, …) selected via the `variant` attribute, isolated in **Shadow DOM**.',
          '**When to use:** showing a small "working" indicator anywhere outside the chat thread (toolbars, buttons, panels). In SolidJS, use the `Loader` primitive directly.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, then set `variant`, `size`, and (for text variants) `text` as plain HTML attributes.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const VARIANTS = [
  'circular', 'classic', 'pulse', 'pulse-dot', 'dots', 'typing',
  'wave', 'bars', 'terminal', 'text-blink', 'text-shimmer', 'loading-dots',
];

/** The default circular spinner. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <kitn-loader variant="circular" size="md" />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Every variant at the medium size, side by side. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '32px', 'align-items': 'center', padding: '24px' }}>
      {VARIANTS.map((v) => (
        <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '8px', 'min-width': '90px' }}>
          <kitn-loader variant={v} size="md" text="Loading" />
          <code style={{ 'font-size': '11px', opacity: 0.6 }}>{v}</code>
        </div>
      ))}
    </div>
  ),
};

/** The three sizes (`sm` / `md` / `lg`) of the dots variant. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', 'align-items': 'center', padding: '24px' }}>
      {['sm', 'md', 'lg'].map((s) => (
        <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '8px' }}>
          <kitn-loader variant="dots" size={s} />
          <code style={{ 'font-size': '11px', opacity: 0.6 }}>{s}</code>
        </div>
      ))}
    </div>
  ),
};
