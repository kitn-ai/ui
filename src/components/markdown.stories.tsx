import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Markdown } from './markdown';

const meta: Meta = {
  title: 'Components/Markdown',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const PlainText: Story = {
  render: () => (
    <Markdown content="This is a simple paragraph of text rendered through the Markdown component." />
  ),
};

export const Headings: Story = {
  render: () => (
    <Markdown
      content={`# Heading 1
## Heading 2
### Heading 3
#### Heading 4

Some text below the headings.`}
    />
  ),
};

export const CodeBlocks: Story = {
  render: () => (
    <Markdown
      content={`Here is some inline \`code\` in a paragraph.

\`\`\`typescript
const x: number = 42;
console.log(x);
\`\`\`

And another block:

\`\`\`python
print("hello world")
\`\`\``}
    />
  ),
};

export const Lists: Story = {
  render: () => (
    <Markdown
      content={`### Unordered List
- First item
- Second item
  - Nested item
  - Another nested
- Third item

### Ordered List
1. Step one
2. Step two
3. Step three`}
    />
  ),
};

export const GFMTable: Story = {
  render: () => (
    <Markdown
      content={`### Comparison Table

| Feature | SolidJS | React | Svelte |
|---------|---------|-------|--------|
| Reactivity | Fine-grained | Virtual DOM | Compiler |
| Bundle Size | ~7KB | ~40KB | ~2KB |
| Performance | Excellent | Good | Excellent |
| Learning Curve | Moderate | Moderate | Easy |`}
    />
  ),
};

export const RichContent: Story = {
  render: () => (
    <Markdown
      class="max-w-2xl"
      content={`# Project Overview

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

For more info, visit [solidjs.com](https://solidjs.com).`}
    />
  ),
};
