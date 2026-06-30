// Sample data for <kai-hover-card>.
//
// kai-hover-card has only scalar props (openDelay, closeDelay, placement). The
// content lives entirely in light-DOM slots: the DEFAULT slot is the trigger
// (the thing you hover/focus) and slot="card" is the rich floating panel. So the
// sample/named sets only carry `html`, injected as the element's innerHTML BEFORE
// upgrade so both slots are present on the first paint.
//
// `sample` = default content for the Playground + a bare <Example> (no data="")
// `named`  = alternate triggers a focused <Example data="…"> opts into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

// A small avatar placeholder as an inline SVG data-URI — avoids depending on a
// real image file in the docs site.
const AVATAR_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect width="64" height="64" rx="32" fill="#e4e4e7"/>' +
      '<text x="32" y="40" font-family="sans-serif" font-size="24" fill="#71717a" text-anchor="middle">JL</text>' +
      '</svg>',
  );

const CARD_STYLE = 'display:grid;gap:6px;max-width:240px';

export default {
  // Default playground content: a username link that reveals a user card.
  sample: {
    html:
      '<a href="#" style="color:var(--color-link,#9333ea);font-weight:600;text-decoration:none">@jordan</a>' +
      `<div slot="card" style="${CARD_STYLE}">` +
      '<strong style="font-size:15px">Jordan Lee</strong>' +
      '<span style="font-size:13px;color:var(--color-muted-foreground,#71717a)">Staff engineer · Platform</span>' +
      '<span style="font-size:13px">Maintains the streaming pipeline. Usually online 9–5 PT.</span>' +
      '</div>',
  },

  named: {
    // An avatar trigger with a profile card.
    profile: {
      html:
        `<kai-avatar src="${AVATAR_SVG}" alt="Jordan Lee" size="md"></kai-avatar>` +
        `<div slot="card" style="${CARD_STYLE}">` +
        '<strong style="font-size:15px">Jordan Lee</strong>' +
        '<span style="font-size:13px;color:var(--color-muted-foreground,#71717a)">Staff engineer · Platform</span>' +
        '<span style="font-size:13px">Maintains the streaming pipeline. Usually online 9–5 PT.</span>' +
        '</div>',
    },

    // A badge trigger that explains what the label means.
    badge: {
      html:
        '<kai-badge variant="secondary">Beta</kai-badge>' +
        `<div slot="card" style="${CARD_STYLE}">` +
        '<strong style="font-size:14px">Beta feature</strong>' +
        '<span style="font-size:13px;color:var(--color-muted-foreground,#71717a)">Available to all workspaces. Behavior may change before general release.</span>' +
        '</div>',
    },

    // An inline link preview — a title, a short summary, and the URL.
    link: {
      html:
        '<a href="#" style="color:var(--color-link,#9333ea);text-decoration:underline">the streaming guide</a>' +
        `<div slot="card" style="${CARD_STYLE}">` +
        '<strong style="font-size:14px">Streaming responses</strong>' +
        '<span style="font-size:13px;color:var(--color-muted-foreground,#71717a)">How to push a new array reference per chunk so the thread re-renders as tokens arrive.</span>' +
        '<span style="font-size:12px;color:var(--color-muted-foreground,#71717a)">ui.kitn.ai/guides/streaming</span>' +
        '</div>',
    },
  },
};
