// Sample data for <kai-sources> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// `sample`  = default non-scalar prop data (the playground + bare examples use it)
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// kai-sources has one non-scalar prop: `sources` — an array of SourceItem objects
// ({ href, title?, description?, label?, showFavicon? }).

// Default playground sample — a realistic set of citation links with favicons.
const DEFAULT_SOURCES = [
  {
    href: 'https://kitn.dev',
    title: 'kitn — the kit',
    description: 'Composable SolidJS + web-component chat UI kit.',
    showFavicon: true,
  },
  {
    href: 'https://solidjs.com',
    title: 'SolidJS',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    showFavicon: true,
  },
  {
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_components',
    title: 'Web Components — MDN',
    description: 'Official MDN documentation for the Web Components standard.',
    showFavicon: true,
  },
];

// Numbered variant — same sources; the `numbered` boolean attribute labels each
// chip [1], [2], [3] instead of the domain fallback.
const NUMBERED_SOURCES = [
  {
    href: 'https://arxiv.org/abs/2303.08774',
    title: 'GPT-4 Technical Report',
    description: 'OpenAI\'s technical overview of GPT-4 capabilities and safety evaluations.',
  },
  {
    href: 'https://lilianweng.github.io/posts/2023-06-23-agent/',
    title: 'LLM Powered Autonomous Agents',
    description: 'A deep-dive into the components of LLM-powered autonomous agent systems.',
  },
  {
    href: 'https://huggingface.co/docs/transformers/index',
    title: 'Hugging Face Transformers',
    description: 'Documentation for the Transformers library — pre-trained models and pipelines.',
  },
  {
    href: 'https://docs.anthropic.com/en/docs/about-claude/models/overview',
    title: 'Claude models overview',
    description: 'Anthropic\'s guide to the available Claude model families and their capabilities.',
  },
];

// Minimal sources without favicons — illustrates the fallback domain-label chip.
const NO_FAVICON_SOURCES = [
  {
    href: 'https://www.typescriptlang.org/docs/',
    title: 'TypeScript Handbook',
    description: 'Official handbook for the TypeScript language.',
  },
  {
    href: 'https://vitejs.dev/guide/',
    title: 'Vite — Getting Started',
    description: 'Fast build tooling for modern web projects.',
  },
];

export default {
  sample: {
    sources: DEFAULT_SOURCES,
  },
  named: {
    numbered: {
      sources: NUMBERED_SOURCES,
    },
    noFavicon: {
      sources: NO_FAVICON_SOURCES,
    },
  },
};
