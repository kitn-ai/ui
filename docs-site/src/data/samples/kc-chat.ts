// Sample data for <kc-chat> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// `sample`  = default non-scalar prop data (the playground + bare examples use it)
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// Non-scalar props:
//   messages        — the full thread array (the central prop for every example)
//   suggestions     — starter prompts (shown when thread is empty)
//   models          — model list for the header switcher
//   context         — token-usage meter in the header
//   slashCommands   — command-palette entries
//   slashActiveIds  — currently-active command ids

// ── shared message fixture ────────────────────────────────────────────────────

const BASE_MESSAGES = [
  {
    id: '1',
    role: 'user',
    content: 'How do I center a div?',
  },
  {
    id: '2',
    role: 'assistant',
    content:
      'The modern way is a one-liner:\n\n```css\n.box {\n  display: grid;\n  place-items: center;\n}\n```\n\nThat centers the child on both axes. For flex, use `display: flex; align-items: center; justify-content: center;` on the parent.',
    actions: ['copy', 'like', 'dislike'],
  },
];

// ── loading state ─────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  {
    id: '1',
    role: 'user',
    content: 'Explain async/await in JavaScript.',
  },
];

// ── suggestions (empty thread) ────────────────────────────────────────────────

const SUGGESTION_LIST = [
  'Summarise this document',
  'Write a unit test for this function',
  'Explain this error message',
  'Refactor this code for readability',
];

// ── model switcher ────────────────────────────────────────────────────────────

const MODEL_LIST = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
];

const MODEL_MESSAGES = [
  {
    id: '1',
    role: 'user',
    content: 'Compare the three available models for code generation.',
  },
  {
    id: '2',
    role: 'assistant',
    content:
      'All three handle code well, but each has a different strength:\n\n- **GPT-4o** — fast, broad language coverage, strong at refactoring.\n- **Claude 3.5 Sonnet** — excellent at following long instructions and nuanced edits.\n- **Gemini 1.5 Pro** — large context window, good at repo-wide analysis.',
    actions: ['copy', 'like', 'dislike'],
  },
];

// ── slash commands ────────────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { id: 'summarise', label: 'Summarise', description: 'Summarise the current document', category: 'Document' },
  { id: 'translate', label: 'Translate', description: 'Translate selected text to another language', category: 'Document' },
  { id: 'fix', label: 'Fix', description: 'Fix errors in the selected code', category: 'Code' },
  { id: 'explain', label: 'Explain', description: 'Explain what this code does', category: 'Code' },
  { id: 'test', label: 'Write tests', description: 'Generate unit tests for this function', category: 'Code' },
];

const SLASH_MESSAGES = [
  {
    id: '1',
    role: 'user',
    content: '/explain',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Type `/` in the input below to open the command palette and select a slash command.',
    actions: ['copy'],
  },
];

// ── context token meter ───────────────────────────────────────────────────────

const CONTEXT_DATA = {
  usedTokens: 18500,
  maxTokens: 32000,
  inputTokens: 14200,
  outputTokens: 4300,
  estimatedCost: 0.074,
};

// ── exports ───────────────────────────────────────────────────────────────────

export default {
  sample: {
    messages: BASE_MESSAGES,
  },
  named: {
    loading: {
      messages: LOADING_MESSAGES,
    },
    withSuggestions: {
      messages: [],
      suggestions: SUGGESTION_LIST,
    },
    withModels: {
      messages: MODEL_MESSAGES,
      models: MODEL_LIST,
      currentModel: 'claude-3-5-sonnet',
    },
    withSlash: {
      messages: SLASH_MESSAGES,
      slashCommands: SLASH_COMMANDS,
    },
    withContext: {
      messages: MODEL_MESSAGES,
      models: MODEL_LIST,
      currentModel: 'gpt-4o',
      context: CONTEXT_DATA,
    },
  },
};
