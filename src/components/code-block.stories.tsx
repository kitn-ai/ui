import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from './code-block';
import { Button } from '../ui/button';

const tsCode = `interface User {
  id: string;
  name: string;
  email: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}`;

const pythonCode = `def fibonacci(n: int) -> list[int]:
    """Generate fibonacci sequence up to n numbers."""
    if n <= 0:
        return []
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

print(fibonacci(10))`;

const cssCode = `:root {
  --primary: hsl(240 5.9% 10%);
  --background: hsl(0 0% 100%);
}

.button {
  background: var(--color-primary);
  color: white;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}`;

/**
 * Story for the compound `CodeBlock` family. The root `CodeBlock` is a bordered
 * card container; `CodeBlockCode` does the (on-demand, Shiki) syntax
 * highlighting; `CodeBlockGroup` is a flex header/footer row. The controllable
 * props live on `CodeBlockCode`, so `Playground` drives that piece directly.
 */
const meta = {
  title: 'Components/CodeBlock',
  component: CodeBlockCode,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'A bordered code card with optional syntax highlighting. `CodeBlock` is the container, `CodeBlockCode` renders the (Shiki-)highlighted source, and `CodeBlockGroup` is a flex row for a header/footer (filename + copy button).',
          '**When to use:** to display code snippets in chat messages, documentation, or anywhere fenced code appears — typically emitted by the Markdown renderer for ``` blocks.',
          '**How to use:** wrap one or more children in `<CodeBlock>`. Pass the source string and a `language` to `<CodeBlockCode>`; optionally override the `theme`. Add a `<CodeBlockGroup>` for a filename row and copy action.',
          '**Placement:** inside assistant message content, README/docs panes, and tool-output views.',
        ].join('\n\n'),
      },
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    code: {
      control: 'text',
      description: 'The source code string to render.',
    },
    language: {
      control: 'text',
      description: 'Language id for syntax highlighting (e.g. `typescript`, `python`, `css`).',
      table: { defaultValue: { summary: 'tsx' } },
    },
    theme: {
      control: 'text',
      description: 'Shiki theme id. Falls back to the active ChatConfig `codeTheme`.',
    },
  },
  args: {
    code: tsCode,
    language: 'typescript',
  },
  render: (args) => (
    <div class="max-w-lg">
      <CodeBlock>
        <CodeBlockCode {...args} />
      </CodeBlock>
    </div>
  ),
} satisfies Meta<typeof CodeBlockCode>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { CodeBlock, CodeBlockCode, CodeBlockGroup } from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — edit the code, language, or theme via controls. */
export const Playground: Story = {
  ...src(`<CodeBlock>
  <CodeBlockCode code={tsCode} language="typescript" />
</CodeBlock>`),
};

export const TypeScript: Story = {
  args: { code: tsCode, language: 'typescript' },
  ...src(`<CodeBlock>
  <CodeBlockCode code={tsCode} language="typescript" />
</CodeBlock>`),
};

export const Python: Story = {
  args: { code: pythonCode, language: 'python' },
  ...src(`<CodeBlock>
  <CodeBlockCode code={pythonCode} language="python" />
</CodeBlock>`),
};

export const CSS: Story = {
  args: { code: cssCode, language: 'css' },
  ...src(`<CodeBlock>
  <CodeBlockCode code={cssCode} language="css" />
</CodeBlock>`),
};

/** A header row (`CodeBlockGroup`) with a filename and a copy button — showcase. */
export const WithHeader: Story = {
  render: () => (
    <div class="max-w-lg">
      <CodeBlock>
        <CodeBlockGroup class="border-b border-border px-4 py-2">
          <span class="text-xs text-muted-foreground font-mono">user.ts</span>
          <Button variant="ghost" size="icon-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </Button>
        </CodeBlockGroup>
        <CodeBlockCode code={tsCode} language="typescript" />
      </CodeBlock>
    </div>
  ),
  ...src(`<CodeBlock>
  <CodeBlockGroup class="border-b border-border px-4 py-2">
    <span class="text-xs text-muted-foreground font-mono">user.ts</span>
    <Button variant="ghost" size="icon-sm">{/* copy icon */}</Button>
  </CodeBlockGroup>
  <CodeBlockCode code={tsCode} language="typescript" />
</CodeBlock>`),
};
