// Sample data for <kc-prompt-input> non-scalar props.
//
// `suggestions`, `slashCommands`, `slashActiveIds`, and `attachments` are
// scalar:false — they must be seeded here so the Playground and Examples
// render meaningful content instead of an empty composer.
//
// `sample`  = default non-scalar prop data shown by the playground + bare examples
// `named`   = alternate sets referenced by <Example data="…">

function imgData(fill: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="12" fill="${fill}"/><text x="48" y="60" font-size="42" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const DEFAULT_SUGGESTIONS = [
  'Summarize this thread',
  'Draft a reply',
  'Explain like I am five',
];

const DEFAULT_SLASH_COMMANDS = [
  { id: 'summarize', label: '/summarize', description: 'Summarize the conversation', category: 'Actions' },
  { id: 'translate', label: '/translate', description: 'Translate the last message', category: 'Actions' },
  { id: 'image', label: '/image', description: 'Generate an image', category: 'Tools' },
];

const SAMPLE_ATTACHMENTS = [
  { id: 'a1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: imgData('#7c3aed', '◆') },
  { id: 'a2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
];

export default {
  // Default playground sample: suggestions only (most common starting point)
  sample: {
    suggestions: DEFAULT_SUGGESTIONS,
  },
  named: {
    // Starter suggestions only — fills the chip row above the input
    withSuggestions: {
      suggestions: DEFAULT_SUGGESTIONS,
    },
    // Slash-command palette — set slashCommands; type "/" to open
    withSlashCommands: {
      slashCommands: DEFAULT_SLASH_COMMANDS,
    },
    // Pre-populated attachments seeded via the attachments property
    withAttachments: {
      attachments: SAMPLE_ATTACHMENTS,
      suggestions: DEFAULT_SUGGESTIONS,
    },
    // Loading / streaming state with stoppable stop button
    loading: {
      suggestions: DEFAULT_SUGGESTIONS,
    },
  },
};
