// Shared sample data for the Examples/* web-component stories. Mirrors the data
// in examples/composable/main.js so the Storybook catalog matches the external
// showcase. Plain data only — no DOM wiring here.

export const models = [
  { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'haiku', name: 'Claude Haiku', provider: 'Anthropic' },
];

export const context = {
  usedTokens: 48200,
  maxTokens: 200000,
  inputTokens: 31000,
  outputTokens: 17200,
  estimatedCost: 0.42,
};

/** An inline SVG data-URL — handy for attachment thumbnails without a server. */
export function imgData(fill: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="12" fill="${fill}"/><text x="48" y="60" font-size="42" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const attachments = [
  { id: '1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: imgData('#7c3aed', '◆') },
  { id: '2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  { id: '3', type: 'source-document', title: 'kitn.dev/docs', filename: 'kitn.dev' },
];

export const conversations = [
  { id: 'c1', title: 'Web component architecture', scope: { type: 'document' }, messageCount: 12, lastMessageAt: '2026-06-11T10:00:00Z', updatedAt: '2026-06-11T10:00:00Z' },
  { id: 'c2', title: 'Theming & tokens', scope: { type: 'document' }, messageCount: 5, lastMessageAt: '2026-06-10T09:00:00Z', updatedAt: '2026-06-10T09:00:00Z' },
  { id: 'c3', title: 'Publishing pipeline', scope: { type: 'document' }, messageCount: 8, lastMessageAt: '2026-06-09T09:00:00Z', updatedAt: '2026-06-09T09:00:00Z' },
];

export const slashCommands = [
  { id: 'summarize', label: '/summarize', description: 'Summarize the conversation', category: 'Actions' },
  { id: 'translate', label: '/translate', description: 'Translate the last message', category: 'Actions' },
  { id: 'image', label: '/image', description: 'Generate an image', category: 'Tools' },
];

export const sources = [
  { href: 'https://kitn.dev', title: 'kitn — the kit', description: 'Composable SolidJS + web-component chat UI.', showFavicon: true },
  { href: 'https://solidjs.com', title: 'SolidJS', description: 'A reactive UI library.', showFavicon: true },
];

/** A rich assistant turn — reasoning + a tool call + an attachment + actions. */
export const assistantMessage = {
  id: 'm-a',
  role: 'assistant',
  content: "Here's the plan, with a quick code sample:\n```js\nconst kit = useKitn();\n```",
  reasoning: { text: 'The user wants X, so I should do Y then Z.', label: 'Reasoning' },
  tools: [{ type: 'search', state: 'output-available', input: { query: 'kitn docs' }, output: { hits: 3 } }],
  attachments: [attachments[0]],
  actions: ['copy', 'like', 'dislike', 'regenerate'],
};

export const userMessage = { id: 'm-u', role: 'user', content: 'How do I compose these myself?' };

export const cotSteps = [
  { label: 'Understand the request', content: 'The user wants a composable set.' },
  { label: 'Design the API', content: 'Route 1: variant + flags + events.' },
  { label: 'Build & verify' },
];

/** A short thread for the composed-shell + drop-in stories. */
export const thread = [
  { id: '1', role: 'user', content: 'Can you sketch a composable chat shell?' },
  {
    id: '2',
    role: 'assistant',
    content:
      'Sure. A shell is just a layout (`<kai-resizable>`) wrapping leaf components:\n\n```html\n<kai-conversations></kai-conversations>\n<kai-message></kai-message>\n<kai-prompt-input></kai-prompt-input>\n```\n\nYou own the data + events; the leaves render.',
    reasoning: { text: 'Lay out list | chat | artifact, then wire submit + select.', label: 'Reasoning' },
    tools: [{ type: 'plan_layout', state: 'output-available', input: { panels: 3 }, output: { ok: true } }],
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  },
];
