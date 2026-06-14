import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-code-block': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleCode = `export function add(a: number, b: number): number {
  return a + b;
}`;

const pythonCode = `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`;

/** Render the actual `<kc-code-block>` custom element with a `code` property. */
function CodeBlockElement(props: { code: string; language?: string }) {
  let el: (HTMLElement & { code?: string }) | undefined;
  onMount(() => {
    if (el) {
      el.code = props.code;
      if (props.language) el.setAttribute('language', props.language);
    }
  });
  return (
    <kc-code-block
      ref={(e) => (el = e as HTMLElement)}
      style={{ display: 'block', padding: '16px', 'max-width': '720px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-code-block id="code" language="ts" code-theme="github-dark-dimmed"></kc-code-block>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const code = document.getElementById('code');
  code.code = 'export function add(a, b) {\\n  return a + b;\\n}';
</script>`;

const meta = {
  title: 'Web Components/kc-code-block',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-code-block'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-code-block', [
          '`<kc-code-block>` is the framework-agnostic **web component** for a single syntax-highlighted code block, complete with a copy button, isolated in **Shadow DOM**.',
          '**When to use:** dropping a highlighted snippet into a non-Solid app. In SolidJS, compose `CodeBlock` + `CodeBlockCode` directly.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the source via the `code` **property** (`el.code = '...'`), and pick a grammar with the `language` attribute (defaults to `tsx`). Tune highlighting with `code-theme` / `code-highlight`.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A TypeScript snippet (the default `tsx` grammar). */
export const TypeScript: Story = {
  render: () => <CodeBlockElement code={sampleCode} language="ts" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A different grammar via the `language` attribute. */
export const Python: Story = {
  render: () => <CodeBlockElement code={pythonCode} language="python" />,
};
