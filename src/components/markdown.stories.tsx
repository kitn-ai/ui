import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Markdown } from './markdown';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Elements/Markdown',
  component: Markdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'Renders a Markdown string to styled HTML (GFM enabled — tables, lists, blockquotes), splitting fenced code into highlighted `CodeBlock`s.',
        '**When to use:** to display assistant message content, documentation, or any rich text authored in Markdown.',
        '**How to use:** pass the Markdown string as `content`; optionally set `codeTheme` for code fences and `class` for the prose container. Prose sizing follows the surrounding `ChatConfig`.',
        '**Placement:** inside `MessageContent`, response panels, or anywhere formatted text is shown.',
      ]),
    },
  },
  argTypes: {
    content: {
      control: 'text',
      description: 'The Markdown source string to render.',
    },
    id: {
      control: 'text',
      description: 'Optional stable id used for block keys (auto-generated if omitted).',
    },
    codeTheme: {
      control: 'text',
      description: 'Shiki theme name applied to fenced code blocks (falls back to the chat config theme).',
    },
    class: {
      control: 'text',
      description: 'Additional CSS classes for the prose container.',
    },
  },
  args: {
    content: 'This is a simple paragraph of text rendered through the **Markdown** component.',
  },
  render: (args) => <Markdown {...args} />,
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Markdown } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — edit the `content` control to render any Markdown. */
export const Playground: Story = {
  ...src(`<Markdown content="This is a simple paragraph of **Markdown** text." />`),
};

export const PlainText: Story = {
  args: {
    content: 'This is a simple paragraph of text rendered through the Markdown component.',
  },
  ...src(`<Markdown content="This is a simple paragraph of text rendered through the Markdown component." />`),
};

export const Headings: Story = {
  args: {
    content: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4

Some text below the headings.`,
  },
  ...src(`<Markdown content={\`# Heading 1
## Heading 2
### Heading 3

Some text below the headings.\`} />`),
};

export const CodeBlocks: Story = {
  args: {
    content: `Here is some inline \`code\` in a paragraph.

\`\`\`typescript
const x: number = 42;
console.log(x);
\`\`\`

And another block:

\`\`\`python
print("hello world")
\`\`\``,
  },
  ...src(`<Markdown content={\`Here is some inline \\\`code\\\` in a paragraph.

\\\`\\\`\\\`typescript
const x: number = 42;
console.log(x);
\\\`\\\`\\\`\`} />`),
};

export const Lists: Story = {
  args: {
    content: `### Unordered List
- First item
- Second item
  - Nested item
  - Another nested
- Third item

### Ordered List
1. Step one
2. Step two
3. Step three`,
  },
  ...src(`<Markdown content={\`### Unordered List
- First item
- Second item
  - Nested item

### Ordered List
1. Step one
2. Step two\`} />`),
};

export const GFMTable: Story = {
  args: {
    content: `### Comparison Table

| Feature | SolidJS | React | Svelte |
|---------|---------|-------|--------|
| Reactivity | Fine-grained | Virtual DOM | Compiler |
| Bundle Size | ~7KB | ~40KB | ~2KB |
| Performance | Excellent | Good | Excellent |
| Learning Curve | Moderate | Moderate | Easy |`,
  },
  ...src(`<Markdown content={\`| Feature | SolidJS | React |
|---------|---------|-------|
| Reactivity | Fine-grained | Virtual DOM |
| Bundle Size | ~7KB | ~40KB |\`} />`),
};

export const RichContent: Story = {
  args: {
    class: 'max-w-2xl',
    content: `# Project Overview

This is a **comprehensive** guide to building modern web applications.

## Key Technologies

- **SolidJS** -- Reactive UI framework
- **TypeScript** -- Type-safe JavaScript
- **Tailwind CSS** -- Utility-first styling

## Getting Started

\`\`\`bash
pnpm create solid
cd my-app
pnpm install
pnpm dev
\`\`\`

> **Note:** Make sure you have Node.js 18+ installed.

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI | SolidJS | Components |
| State | Signals | Reactivity |
| Styling | Tailwind | Design |

For more info, visit [solidjs.com](https://solidjs.com).`,
  },
  ...src(`<Markdown class="max-w-2xl" content={richMarkdown} />`),
};
