// Sample data for <kai-response-stream>.
//
// `text` is scalar:false (set as a JS property — it accepts a string or
// AsyncIterable<string>). Seed it here so the Playground and Examples display
// meaningful animated content instead of an empty block.
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob.
//
// `sample`  = default text shown by the playground + bare examples
// `named`   = alternate texts referenced by <Example data="…">

const TYPEWRITER_TEXT =
  "This text reveals with a typewriter animation, streamed character by character — exactly how you'd render a live assistant reply.";

const FADE_TEXT =
  "Each segment of this response fades in one by one, creating a smooth reveal that feels natural for longer assistant answers.";

const ASSISTANT_REPLY =
  "I've reviewed your codebase and found three areas worth addressing: the auth middleware is missing rate-limiting, the database queries in `/api/search` aren't indexed, and the client bundle hasn't been code-split yet. I can walk through each fix with you — just let me know where to start.";

export default {
  sample: {
    text: TYPEWRITER_TEXT,
  },
  named: {
    fade: {
      text: FADE_TEXT,
    },
    assistantReply: {
      text: ASSISTANT_REPLY,
    },
  },
};
