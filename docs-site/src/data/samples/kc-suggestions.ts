// Sample data for <kc-suggestions>.
//
// `suggestions` is scalar:false — it is a JS property (array) and cannot be
// set as an HTML attribute. Seed it here so the Playground and every bare
// <Example> render real content instead of an empty strip.
//
// `sample`  = default data for the Playground + bare examples
// `named`   = alternate sets referenced by <Example data="…">

const DEFAULT_SUGGESTIONS = [
  'Explain the architecture',
  'Show me a code example',
  "What's deferred?",
];

// Suggestions for the search-highlight example — a realistic autocomplete list.
const SEARCH_SUGGESTIONS = [
  'How does SolidJS handle reactivity?',
  'What makes SolidJS fast?',
  'SolidJS vs Svelte comparison',
];

// { label, value } form — displayed text differs from emitted value.
const LABELED_SUGGESTIONS = [
  { label: 'Explain the architecture', value: 'explain' },
  { label: 'Show me a code example', value: 'code-example' },
  { label: "What's deferred?", value: 'deferred' },
];

export default {
  sample: {
    suggestions: DEFAULT_SUGGESTIONS,
  },
  named: {
    search: {
      suggestions: SEARCH_SUGGESTIONS,
    },
    labeled: {
      suggestions: LABELED_SUGGESTIONS,
    },
  },
};
