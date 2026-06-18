import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-scroll-button': JSX.HTMLAttributes<HTMLElement> & {
        for?: string;
        variant?: string;
        size?: string;
        'on:kai-scroll'?: (e: CustomEvent) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<div id="my-chat" style="height:300px; overflow-y:auto; border:1px solid #eee; padding:16px">
  <!-- scrollable content -->
</div>

<!-- Button targets the scroll container by id -->
<kai-scroll-button for="my-chat"></kai-scroll-button>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const btn = document.querySelector('kai-scroll-button');
  btn.addEventListener('kai-scroll', () => console.log('scrolled to bottom'));
</script>`;

const meta = {
  title: 'Components/ScrollButton',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-scroll-button'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-scroll-button', [
        '`<kai-scroll-button>` is the framework-agnostic **web component** for a floating "scroll to bottom" button — visible when the target container is scrolled up, hidden when already at the bottom. Isolated in **Shadow DOM**.',
        '**When to use:** placing a scroll-to-bottom affordance next to any long scrollable list or chat thread outside SolidJS. In SolidJS, use the `ScrollButton` primitive inside a `ChatContainerRoot`.',
        '**Wiring the scroll target:** set the `for` attribute to the `id` of the scrollable container (mirrors the `<label for="...">` convention). When `for` is omitted the element walks upward to the nearest scrollable ancestor — useful when it is nested inside the container.',
        '**Emitted events:** `kai-scroll` (no detail) fires each time the button is clicked and `scrollToBottom()` is called.',
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Scroll-to-bottom button controlled by a sibling scrollable container via `for`. */
export const Default: Story = {
  render: () => {
    const items = Array.from({ length: 30 }, (_, i) => `Message ${i + 1}`);
    return (
      <div style={{ padding: '24px', position: 'relative', width: '360px' }}>
        <div
          id="scroll-demo"
          tabindex="0"
          role="region"
          aria-label="Messages"
          style={{
            height: '300px',
            'overflow-y': 'auto',
            border: '1px solid var(--color-border, #e2e8f0)',
            'border-radius': '8px',
            padding: '12px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '8px',
          }}
        >
          {items.map((msg) => (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--color-muted, #f1f5f9)',
                'border-radius': '6px',
                'font-size': '14px',
              }}
            >
              {msg}
            </div>
          ))}
        </div>
        {/* Positioned overlay in the bottom-right of the container */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            right: '36px',
            'pointer-events': 'none',
          }}
        >
          <div style={{ 'pointer-events': 'auto' }}>
            <kai-scroll-button
              for="scroll-demo"
              on:kai-scroll={() => console.log('kai-scroll fired')}
            />
          </div>
        </div>
      </div>
    );
  },
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Nested inside the scroll container — no `for` needed; ancestor walk finds it. */
export const AncestorWalk: Story = {
  render: () => {
    const items = Array.from({ length: 30 }, (_, i) => `Entry ${i + 1}`);
    return (
      <div style={{ padding: '24px', width: '360px' }}>
        <div
          style={{
            height: '300px',
            'overflow-y': 'auto',
            border: '1px solid var(--color-border, #e2e8f0)',
            'border-radius': '8px',
            padding: '12px',
            position: 'relative',
          }}
        >
          {items.map((entry) => (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--color-muted, #f1f5f9)',
                'border-radius': '6px',
                'font-size': '14px',
                'margin-bottom': '8px',
              }}
            >
              {entry}
            </div>
          ))}
          {/* No `for` — element is a child of the scrollable container */}
          <div
            style={{
              position: 'sticky',
              bottom: '8px',
              display: 'flex',
              'justify-content': 'center',
            }}
          >
            <kai-scroll-button />
          </div>
        </div>
      </div>
    );
  },
};

/** Variant and size showcase. */
export const Variants: Story = {
  render: () => {
    const items = Array.from({ length: 20 }, (_, i) => `Row ${i + 1}`);
    return (
      <div
        style={{
          display: 'flex',
          gap: '32px',
          padding: '24px',
          'align-items': 'flex-start',
          'flex-wrap': 'wrap',
        }}
      >
        {(['outline', 'ghost', 'default'] as const).map((variant) => (
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', 'align-items': 'center' }}>
            <div
              tabindex="0"
              role="region"
              aria-label={`${variant} scroll demo`}
              style={{
                height: '200px',
                width: '200px',
                'overflow-y': 'auto',
                border: '1px solid var(--color-border, #e2e8f0)',
                'border-radius': '8px',
                padding: '8px',
                position: 'relative',
              }}
              id={`variant-demo-${variant}`}
            >
              {items.map((r) => (
                <div style={{ padding: '4px 8px', 'font-size': '13px' }}>{r}</div>
              ))}
            </div>
            <kai-scroll-button for={`variant-demo-${variant}`} variant={variant} />
            <code style={{ 'font-size': '11px', opacity: 0.6 }}>{variant}</code>
          </div>
        ))}
      </div>
    );
  },
};
