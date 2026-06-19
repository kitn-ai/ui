import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

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
      'kai-context': JSX.HTMLAttributes<HTMLElement>;
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

interface MeterElementProps {
  context: ContextUsage;
  warnThreshold?: number;
  dangerThreshold?: number;
  onThresholdChange?: (level: string) => void;
}

/** Render `<kai-context>` with the `context` set as a JS property. */
function MeterElement(props: MeterElementProps) {
  let el: (HTMLElement & { context?: ContextUsage; warnThreshold?: number; dangerThreshold?: number }) | undefined;
  onMount(() => {
    if (!el) return;
    el.context = props.context;
    if (props.warnThreshold !== undefined) el.warnThreshold = props.warnThreshold;
    if (props.dangerThreshold !== undefined) el.dangerThreshold = props.dangerThreshold;
    if (props.onThresholdChange) {
      el.addEventListener('kai-threshold-change', (e) => {
        props.onThresholdChange!((e as CustomEvent<{ level: string }>).detail.level);
      });
    }
  });
  return (
    <kai-context ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-context id="ctx"></kai-context>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  document.getElementById('ctx').context = {
    usedTokens: 48200, maxTokens: 200000,
    inputTokens: 31000, outputTokens: 17200,
    reasoningTokens: 4200, cacheTokens: 8000,
    estimatedCost: 0.42,
  };
</script>`;

const CUSTOM_THRESHOLDS_SNIPPET = `<!-- Custom thresholds: warn at 50%, danger at 75% -->
<kai-context id="ctx"></kai-context>

<script type="module">
  import '@kitn.ai/ui/elements';

  const el = document.getElementById('ctx');
  el.context = {
    usedTokens: 110000,  // 55% of 200 000 -> warn (> 50%)
    maxTokens: 200000,
    inputTokens: 70000,
    outputTokens: 40000,
    estimatedCost: 0.65,
  };

  // Lower the thresholds so the indicator warns earlier.
  el.warnThreshold = 0.5;    // default 0.7
  el.dangerThreshold = 0.75; // default 0.9

  // Listen for severity changes.
  el.addEventListener('kai-threshold-change', (e) => {
    console.log('severity changed to', e.detail.level); // 'ok' | 'warn' | 'danger'
  });
</script>`;

const meta = {
  title: 'Components/Context',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-context'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-context', [
          '`<kai-context>` is the framework-agnostic **web component** for a token/context-window usage meter — a compact gauge with a hover-card breakdown (input / output / reasoning / cache + estimated cost) — isolated in **Shadow DOM**.',
          '**When to use:** showing how much of the context window a conversation is using, typically in a chat header. In SolidJS, compose the `Context` primitives.',
          '**Placement:** inline in the chat header or toolbar, beside the model switcher or other header controls; it is a compact `inline-block` element and does not need a dedicated row.',
          "**How to use:** register once with `import '@kitn.ai/ui/elements'`, then set the `context` **property** with the usage object. Hover the meter to reveal the breakdown.",
          '**Color thresholds** are configurable via `warnThreshold` (default `0.7`) and `dangerThreshold` (default `0.9`) number properties. When the computed severity level changes, the element fires a **`kai-threshold-change`** event with `detail.level` set to `\'ok\'`, `\'warn\'`, or `\'danger\'`.',
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A meter at ~24% usage; hover to reveal the full breakdown. */
export const Default: Story = {
  render: () => <MeterElement context={usage} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/**
 * Custom thresholds — `warnThreshold=0.5` and `dangerThreshold=0.75` so the
 * meter turns yellow at 50% and red at 75%. At ~55% (110 000 / 200 000) the
 * meter renders yellow. Open the browser console to see `kai-threshold-change`
 * events as the property changes.
 */
export const CustomThresholds: Story = {
  render: () => (
    <MeterElement
      context={{
        usedTokens: 110000,
        maxTokens: 200000,
        inputTokens: 70000,
        outputTokens: 40000,
        estimatedCost: 0.65,
      }}
      warnThreshold={0.5}
      dangerThreshold={0.75}
      onThresholdChange={(level) => console.log('kai-threshold-change', { level })}
    />
  ),
  parameters: { docs: { source: { code: CUSTOM_THRESHOLDS_SNIPPET, language: 'html' } } },
};
