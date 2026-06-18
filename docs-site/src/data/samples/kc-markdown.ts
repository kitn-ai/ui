// Sample data for <kc-markdown>.
//
// `content` is scalar:true but multiline — seed it here so the Playground and
// Examples display a meaningful snippet instead of an empty element.
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob.
//
// `sample`  = default content shown by the playground + bare examples
// `named`   = per-example sets referenced by <Example data="…">

const PROSE_CONTENT = `### Getting started

Welcome to **kitn-chat** — a suite of framework-agnostic web components for building AI-powered chat interfaces.

Here is what you can do in minutes:

- Drop in \`<kc-chat>\` for a full conversational UI
- Use \`<kc-markdown>\` to render model output anywhere
- Compose with \`<kc-code-block>\` for highlighted snippets

> Tip: every element registers itself from a single import, so you only need one line to get started.

\`\`\`ts
import '@kitn.ai/ui/elements';

const md = document.querySelector('kc-markdown') as HTMLElement & { content: string };
md.content = '### Hello\\nRenders **bold**, _italic_, and \`code\`.';
\`\`\``;

const RICH_CONTENT = `## Markdown feature tour

Render headings, **bold**, _italic_, and \`inline code\` with zero configuration.

### Lists

Ordered and unordered:

1. Parse the markdown string
2. Apply Shiki syntax highlighting
3. Render into Shadow DOM

- No framework dependency
- Works in plain HTML, React, Vue, Angular, or Svelte

### Blockquotes

> This is how the model's response appears when streamed in — formatted and ready for the user.

### Code fences

\`\`\`ts
import '@kitn.ai/ui/elements';

const md = document.querySelector('kc-markdown') as HTMLElement & { content: string };
md.content = '### Hello\\nRenders **bold**, _italic_, and \\\`code\\\`.';
\`\`\`

Tables and other GFM extensions are also supported.`;

const SHORT_CONTENT = `A short paragraph ideal for tight spaces — \`prose-size="xs"\` keeps the font compact so it sits comfortably inside cards, tooltips, or sidebar panels.`;

const PLAIN_CONTENT = `No syntax highlighting here.

This is plain text rendered without Shiki — useful for raw log output, terminal traces, or any content where coloured tokens would be distracting.

\`\`\`
GET /api/chat 200 OK  (142 ms)
POST /api/chat 200 OK (338 ms)
POST /api/chat 500 ERR (timeout)
\`\`\``;

export default {
  sample: {
    content: PROSE_CONTENT,
  },
  named: {
    rich: {
      content: RICH_CONTENT,
    },
    short: {
      content: SHORT_CONTENT,
    },
    plain: {
      content: PLAIN_CONTENT,
    },
  },
};
