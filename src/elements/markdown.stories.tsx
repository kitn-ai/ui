import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-markdown': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleMarkdown = `### Markdown
Renders **bold**, _italic_, \`code\`, and lists:
- one
- two

> and blockquotes.

\`\`\`ts
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\``;

/** Render the actual `<kc-markdown>` custom element with a `content` property. */
function MarkdownElement(props: { content: string }) {
  let el: (HTMLElement & { content?: string }) | undefined;
  onMount(() => {
    if (el) el.content = props.content;
  });
  return (
    <kc-markdown ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-markdown id="md" code-theme="github-dark-dimmed"></kc-markdown>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  const md = document.getElementById('md');
  md.content = '### Hello\\nRenders **bold**, _italic_, and \\\`code\\\`.';
  // md.setAttribute('code-highlight', 'false'); // skip Shiki entirely
</script>`;

const meta = {
  title: 'Components/Markdown',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-markdown'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-markdown', [
          '`<kc-markdown>` is the framework-agnostic **web component** that renders a markdown string (with fenced-code syntax highlighting via Shiki) as a standalone element, isolated in **Shadow DOM**.',
          '**When to use:** showing model output or any markdown in a non-Solid app without pulling in a markdown stack. In SolidJS, use the `Markdown` primitive directly.',
          '**Placement:** as a block inside a message row, doc viewer, or standalone content pane; it is `display: block` and expands to fill its container width, so constrain width on the parent.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set the source via the `content` **property** (`el.content = '...'`), and tune rendering with the `prose-size`, `code-theme`, and `code-highlight` attributes.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Headings, emphasis, lists, a blockquote, and a highlighted code fence. */
export const Default: Story = {
  render: () => <MarkdownElement content={sampleMarkdown} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
