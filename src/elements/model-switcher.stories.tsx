import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import type { ModelOption } from '../types';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-model-switcher': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'current-model'?: string };
      /** Light-DOM data carrier for declarative model options inside `<kai-model-switcher>`. */
      'kai-model': JSX.HTMLAttributes<HTMLElement> & {
        id?: string;
        provider?: string;
        description?: string;
        group?: string;
      };
    }
  }
}

const models: ModelOption[] = [
  { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'haiku', name: 'Claude Haiku', provider: 'Anthropic' },
];

/** Render `<kai-model-switcher>` with `models` set as a property; tracks selection. */
function SwitcherElement(props: { models: ModelOption[]; current?: string }) {
  let el: (HTMLElement & { models?: ModelOption[]; currentModel?: string }) | undefined;
  onMount(() => {
    if (!el) return;
    el.models = props.models;
    el.currentModel = props.current ?? props.models[0]?.id;
    // reflect the selection back so the trigger label updates
    el.addEventListener('kai-model-change', (e) => {
      const ev = e as CustomEvent<{ modelId: string }>;
      el!.currentModel = ev.detail.modelId;
    });
  });
  return (
    <kai-model-switcher ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-model-switcher id="ms"></kai-model-switcher>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const ms = document.getElementById('ms');
  ms.models = [
    { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
    { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  ];
  ms.currentModel = 'opus';
  ms.addEventListener('kai-model-change', (e) => { ms.currentModel = e.detail.modelId; });
</script>`;

const meta = {
  title: 'Components/ModelSwitcher',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-model-switcher'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-model-switcher', [
          '`<kai-model-switcher>` is the framework-agnostic **web component** for picking the active model — a dropdown showing each model\'s name and provider — isolated in **Shadow DOM**. It mirrors the switcher inside `<kai-chat>` as a standalone, composable piece.',
          '**When to use:** building your own chat header and want the model picker on its own. In SolidJS, use the `ModelSwitcher` primitive.',
          '**Placement:** inline in the chat header or toolbar, typically to the left of the context meter; it is a compact `inline-block` dropdown trigger that fits naturally beside other header controls.',
          "**How to use — property API:** register once with `import '@kitn.ai/ui/elements'`, set the `models` **property** (each item: `{ id, name, provider? }`) and optionally `currentModel`, and listen for the `kai-model-change` **CustomEvent** (payload: `{ modelId }`). Note: like the underlying primitive, it only renders when more than one model is provided.",
          "**How to use — declarative API:** compose `<kai-model>` light-DOM children instead of (or in addition to) setting the `models` property. Each `<kai-model id=\"gpt-4o\" provider=\"OpenAI\">GPT-4o</kai-model>` carries `id` (required), `provider` (optional), and a text label as its content. Children are hidden data carriers — no JS property assignment needed. Prop `models` items render first; `<kai-model>` children follow.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A three-model picker; selecting updates the trigger label. */
export const Default: Story = {
  render: () => <SwitcherElement models={models} current="opus" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Raw data — the `models` array shape that `<kai-model-switcher>` consumes. */
export const Data: Story = {
  name: 'Data',
  render: () => (
    <pre style={{ padding: '16px', 'font-size': '13px' }}>
      {JSON.stringify(
        [
          { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
          { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
          { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
        ],
        null,
        2,
      )}
    </pre>
  ),
};

const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS property assignment needed -->
<kai-model-switcher id="ms">
  <kai-model id="gpt-4o" provider="OpenAI">GPT-4o</kai-model>
  <kai-model id="gpt-4o-mini" provider="OpenAI">GPT-4o mini</kai-model>
  <kai-model id="claude-sonnet" provider="Anthropic">Claude Sonnet</kai-model>
</kai-model-switcher>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  document.getElementById('ms').addEventListener('kai-model-change', (e) => {
    console.log('selected model:', e.detail.modelId);
  });
</script>`;

/**
 * Declare each model option as a `<kai-model>` child element — no `models`
 * property or JS array wiring needed. The `id` attribute is the model identifier
 * emitted in `kai-model-change`; `provider` is optional; `textContent` is the
 * display label. Children are light-DOM data carriers hidden by the Shadow DOM.
 * Mix with the `models` prop: prop items render first, declarative children after.
 * Note: the switcher only renders when more than one model is provided.
 */
export const DeclarativeModels: Story = {
  name: 'Declarative Models (kai-model)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.addEventListener('kai-model-change', (e) =>
        console.log('kai-model-change', (e as CustomEvent<{ modelId: string }>).detail.modelId),
      );
    });
    return (
      <kai-model-switcher
        ref={(e) => (el = e as HTMLElement)}
        style={{ display: 'inline-block', padding: '40px' }}
      >
        <kai-model id="gpt-4o" provider="OpenAI">GPT-4o</kai-model>
        <kai-model id="gpt-4o-mini" provider="OpenAI">GPT-4o mini</kai-model>
        <kai-model id="claude-sonnet" provider="Anthropic">Claude Sonnet</kai-model>
      </kai-model-switcher>
    );
  },
  parameters: {
    docs: {
      source: { code: DECLARATIVE_HTML_SNIPPET, language: 'html' },
    },
  },
};

const GROUPED_HTML_SNIPPET = `<kai-model-switcher id="ms">
  <kai-model id="gpt-5.5" description="Flagship model">GPT-5.5</kai-model>
  <kai-model id="gpt-4o" group="Legacy models">GPT-4o</kai-model>
  <kai-model id="gpt-4.1" group="Legacy models">GPT-4.1</kai-model>
</kai-model-switcher>

<script type="module">
  import '@kitn.ai/ui/elements';
  document.getElementById('ms').addEventListener('kai-model-change', (e) => {
    console.log('selected model:', e.detail.modelId);
  });
</script>`;

/**
 * Rich rows + a collapsible group via `<kai-model>` attributes: `description`
 * renders as the row subtitle, and children sharing a `group` collect under a
 * collapsible section — the ChatGPT-style "Legacy models" pattern.
 */
export const GroupedModels: Story = {
  name: 'Grouped & Described (kai-model)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.addEventListener('kai-model-change', (e) =>
        console.log('kai-model-change', (e as CustomEvent<{ modelId: string }>).detail.modelId),
      );
    });
    return (
      <kai-model-switcher ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }}>
        <kai-model id="gpt-5.5" description="Flagship model">GPT-5.5</kai-model>
        <kai-model id="gpt-5.5-mini" description="Faster, lighter">GPT-5.5 mini</kai-model>
        <kai-model id="gpt-4o" group="Legacy models">GPT-4o</kai-model>
        <kai-model id="gpt-4.1" group="Legacy models">GPT-4.1</kai-model>
      </kai-model-switcher>
    );
  },
  parameters: { docs: { source: { code: GROUPED_HTML_SNIPPET, language: 'html' } } },
};
