import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-checkpoint': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

/** Render the actual `<kitn-checkpoint>` custom element configured by attributes. */
function CheckpointElement(props: { label?: string; tooltip?: string; variant?: string; size?: string }) {
  let el: HTMLElement | undefined;
  onMount(() => {
    if (!el) return;
    if (props.label) el.setAttribute('label', props.label);
    if (props.tooltip) el.setAttribute('tooltip', props.tooltip);
    if (props.variant) el.setAttribute('variant', props.variant);
    if (props.size) el.setAttribute('size', props.size);
    el.addEventListener('select', () => console.log('checkpoint selected'));
  });
  return <kitn-checkpoint ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '16px' }} />;
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-checkpoint label="Restore" tooltip="Restore this checkpoint" variant="outline" size="sm"></kitn-checkpoint>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const cp = document.querySelector('kitn-checkpoint');
  // events are CustomEvents on the element (they do not bubble)
  cp.addEventListener('select', () => console.log('restore checkpoint'));
</script>`;

const meta = {
  title: 'Web Components/kitn-checkpoint',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-checkpoint>` is the framework-agnostic **web component** for a bookmark/checkpoint button (with an optional tooltip and label), isolated in **Shadow DOM**.',
          '**When to use:** marking a restore point in a conversation in a non-Solid app. In SolidJS, compose the `Checkpoint` primitives.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set `label`, `tooltip`, `variant` (`ghost` | `default` | `outline`), and `size` via attributes, and listen for the `select` **CustomEvent** on click.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A labeled checkpoint button. (Add a `tooltip` attribute for a hover hint — see the Code tab.) */
export const Labeled: Story = {
  render: () => <CheckpointElement label="Restore" variant="outline" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Icon-only (no label), using an `icon` size. */
export const IconOnly: Story = {
  name: 'Icon Only',
  render: () => <CheckpointElement size="icon-sm" />,
};
