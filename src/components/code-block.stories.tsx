import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from './code-block';
import { Button } from '../ui/button';

const meta: Meta = {
  title: 'Components/CodeBlock',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

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

export const TypeScript: Story = {
  render: () => (
    <div class="max-w-lg">
      <CodeBlock>
        <CodeBlockCode code={tsCode} language="typescript" />
      </CodeBlock>
    </div>
  ),
};

export const Python: Story = {
  render: () => (
    <div class="max-w-lg">
      <CodeBlock>
        <CodeBlockCode code={pythonCode} language="python" />
      </CodeBlock>
    </div>
  ),
};

export const CSS: Story = {
  render: () => (
    <div class="max-w-lg">
      <CodeBlock>
        <CodeBlockCode code={cssCode} language="css" />
      </CodeBlock>
    </div>
  ),
};

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
};
