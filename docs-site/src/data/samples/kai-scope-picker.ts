// Sample data for <kai-scope-picker>.
//
// Both `availableAuthors` and `availableTags` are scalar:false (JS properties),
// so they live here rather than in Example config={}.
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob.
//
// `sample`  = default data shown by the playground + bare <Example> calls
// `named`   = alternate data sets referenced by <Example data="…">

export default {
  // Default playground sample — authors and tags so the trigger menu is fully populated.
  sample: {
    availableAuthors: ['Alex Chen', 'Jordan Lee', 'Sam Rivera'],
    availableTags: ['design', 'engineering', 'product', 'research'],
  },
  named: {
    // Authors only — no tags section in the dropdown.
    authorsOnly: {
      availableAuthors: ['Maya Patel', 'Chris Nguyen', 'Taylor Brooks'],
      availableTags: [],
    },
    // Tags only — no authors section in the dropdown.
    tagsOnly: {
      availableAuthors: [],
      availableTags: ['api', 'frontend', 'backend', 'devops', 'docs'],
    },
    // Minimal — no filter options; only "All Content" is available.
    minimal: {
      availableAuthors: [],
      availableTags: [],
    },
    // Custom label — shows the trigger with a non-default active scope label.
    customLabel: {
      availableAuthors: ['Alex Chen', 'Jordan Lee'],
      availableTags: ['design', 'engineering'],
    },
  },
};
