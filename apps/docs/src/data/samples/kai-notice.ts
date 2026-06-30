// Sample data for <kai-notice>.
//
// kai-notice has only scalar props (severity, icon, dismissible). Its message is
// light-DOM default-slot text and an optional slot="action" carries a link, so
// the sample/named sets only ever carry `html` (injected as innerHTML BEFORE
// upgrade so the default + named slots render on the first paint).
//
// `sample` = default content for the Playground + a bare <Example> (no data="")
// `named`  = per-severity copy a focused <Example data="…"> opts into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

export default {
  // Default (neutral) playground content.
  sample: {
    html: 'Responses may be slower than usual while we scale up capacity.',
  },

  named: {
    info: {
      html: 'A new model, Claude Fable 5, is now available in the model picker.',
    },
    warning: {
      html: 'Claude Fable 5 is temporarily unavailable — requests will fall back to Opus 4.8.',
    },
    error: {
      html: "We couldn't reach the model. Check your connection and try again.",
    },
    success: {
      html: 'Your changes were saved to the workspace.',
    },
    // A trailing action link in slot="action".
    withAction: {
      html: 'Claude Fable 5 is temporarily unavailable. <a slot="action" href="#">Learn more</a>',
    },
  },
};
