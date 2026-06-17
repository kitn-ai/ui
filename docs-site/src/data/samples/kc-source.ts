// Sample data for <kc-source> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// `sample`  = default non-scalar prop data (the playground + bare examples use it)
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// kc-source has ZERO non-scalar props — every prop is a scalar string or boolean.
// The playground and examples drive content entirely through `config` attributes.

export default {
  sample: {},
};
