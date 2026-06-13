import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import type { ModelOption } from '../types';
import { ElementSpec } from '../stories/docs/element-spec';
import { argTypesFor } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-model-switcher': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const models: ModelOption[] = [
  { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'haiku', name: 'Claude Haiku', provider: 'Anthropic' },
];

/** Render `<kitn-model-switcher>` with `models` set as a property; tracks selection. */
function SwitcherElement(props: { models: ModelOption[]; current?: string }) {
  let el: (HTMLElement & { models?: ModelOption[]; currentModel?: string }) | undefined;
  onMount(() => {
    if (!el) return;
    el.models = props.models;
    el.currentModel = props.current ?? props.models[0]?.id;
    // reflect the selection back so the trigger label updates
    el.addEventListener('modelchange', (e) => {
      const ev = e as CustomEvent<{ modelId: string }>;
      el!.currentModel = ev.detail.modelId;
    });
  });
  return (
    <kitn-model-switcher ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-model-switcher id="ms"></kitn-model-switcher>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const ms = document.getElementById('ms');
  ms.models = [
    { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
    { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  ];
  ms.currentModel = 'opus';
  ms.addEventListener('modelchange', (e) => { ms.currentModel = e.detail.modelId; });
</script>`;

const meta = {
  title: 'Web Components/kitn-model-switcher',
  tags: ['autodocs'],
  argTypes: argTypesFor('kitn-model-switcher'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-model-switcher>` is the framework-agnostic **web component** for picking the active model — a dropdown showing each model\'s name and provider — isolated in **Shadow DOM**. It mirrors the switcher inside `<kitn-chat>` as a standalone, composable piece.',
          '**When to use:** building your own chat header and want the model picker on its own. In SolidJS, use the `ModelSwitcher` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the `models` **property** (and optionally `currentModel`), and listen for the `modelchange` **CustomEvent**. Note: like the underlying primitive, it only renders when more than one model is provided.",
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
  render: () => <ElementSpec tag="kitn-model-switcher" />,
  parameters: { layout: 'padded' },
};

/** A three-model picker; selecting updates the trigger label. */
export const Default: Story = {
  render: () => <SwitcherElement models={models} current="opus" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
