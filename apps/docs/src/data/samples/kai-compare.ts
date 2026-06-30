// Sample data for <kai-compare>.
//
// `data` is scalar:false — the comparison definition (prompt + exactly two
// candidates), set as a JS property (`el.data = { … }`). The playground's `layout`
// control (auto / columns / tabs) and the Console (kai-compare-select) work off it.

const COMPARE = {
  prompt: 'Fix the N+1 query when loading a cart.',
  candidates: [
    {
      id: 'a',
      label: 'Response A',
      content:
        'Batch the per-item lookups into **one query** (`WHERE id IN (…)`) and hydrate the cart from the result — one round-trip instead of N.',
    },
    {
      id: 'b',
      label: 'Response B',
      content:
        'Add a cache in front of the per-item lookup so repeat hits are fast, and let the slow path warm it.',
    },
  ],
};

export default { sample: { data: COMPARE } };
