// Sample data for <kc-skills> non-scalar props.
//
// `skills` is scalar:false — it must be set as a JS property (array).
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob,
// so adding this file is all that's needed — no shared file edits.
//
// `sample`  = default data used by the Playground + bare <Example> calls
// `named`   = per-example alternate sets referenced by <Example data="…">

export default {
  sample: {
    skills: [
      { id: 'web-search', name: 'Web Search' },
      { id: 'code', name: 'Code' },
      { id: 'memory', name: 'Memory' },
    ],
  },
  named: {
    twoSkills: {
      skills: [
        { id: 'web-search', name: 'Web Search' },
        { id: 'code', name: 'Code' },
      ],
    },
    richSkills: {
      skills: [
        { id: 'web-search', name: 'Web Search' },
        { id: 'code', name: 'Code' },
        { id: 'memory', name: 'Memory' },
        { id: 'browse', name: 'Browse' },
        { id: 'files', name: 'File Access' },
      ],
    },
  },
};
