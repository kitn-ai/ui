// Sample data for <kai-card>.
//
// The presentational card (WebAwesome model): structural slots (media / header /
// header-actions / footer / footer-actions; body is the default slot) plus the
// appearance + orientation variants, set as scalar attributes. The title and
// description are slot/body content you mark up — they are not props.
//
// Each set carries `html`, injected as the element's innerHTML (light-DOM slot
// content) BEFORE upgrade so the named slots render. `sample` is the default for
// the Playground + bare <Example>; `named` sets back a focused <Example data="…">.
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob.

// A local sample image (served from docs-site/public). Doubles as the video poster.
const MEDIA_IMG = '/card-media.jpg';

// Lucide "sparkles" as inline SVG (currentColor) — a kit-style icon for the promo
// illustration, instead of an emoji.
const SPARKLES_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>' +
  '<path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

const TITLE = 'margin:0;font-weight:600;font-size:0.9375rem';
const DESC = 'margin:0.25rem 0 0;font-size:0.8125rem;color:var(--color-muted-foreground,#71717a)';
const BTN = 'padding:0.375rem 0.75rem;border-radius:0.5rem;border:1px solid var(--color-border,#e4e4e7);background:transparent;cursor:pointer;font-size:0.8125rem';
const BTN_SOLID = 'padding:0.5rem;border-radius:0.5rem;border:none;cursor:pointer;font-weight:500;background:var(--color-foreground,#18181b);color:var(--color-background,#fff)';

export default {
  // Default: a header title + body, the common case.
  sample: {
    html: `<h3 slot="header" style="${TITLE}">Workspace summary</h3><p style="margin:0">Your repository has 3 open pull requests and 12 passing checks.</p>`,
  },

  named: {
    // Full-bleed media at the top, body below.
    media: {
      html: `<img slot="media" src="${MEDIA_IMG}" alt="Report preview" style="display:block;width:100%;height:160px;object-fit:cover" /><p style="margin:0">Your Q2 numbers are ready to review.</p>`,
    },

    // Header with an end-aligned action + a footer actions cluster.
    headerFooter: {
      html:
        `<h3 slot="header" style="${TITLE}">Q2 financial summary</h3>` +
        `<span slot="header-actions" style="font-size:12px;color:var(--color-muted-foreground,#71717a)">PDF</span>` +
        `<p style="margin:0">Four charts generated from your latest data.</p>` +
        `<button slot="footer-actions" style="${BTN}">Dismiss</button>` +
        `<button slot="footer-actions" style="${BTN_SOLID};font-weight:600">Open</button>`,
    },

    // The promo card: an inset illustration + title + description + full-width CTA,
    // all body content (set appearance="filled" dismissible on the element).
    promo: {
      html:
        `<div style="display:flex;flex-direction:column;gap:0.75rem">` +
        `<div style="height:80px;display:flex;align-items:center;justify-content:center;border-radius:0.5rem;background:var(--color-muted,#f4f4f5);color:var(--color-primary,#6d28d9)">${SPARKLES_SVG}</div>` +
        `<div><strong style="${TITLE};display:block">2× usage for Cowork</strong>` +
        `<p style="${DESC}">Do more with a higher session limit, now through July 5.</p></div>` +
        `<button style="${BTN_SOLID};width:100%">Start task</button>` +
        `</div>`,
    },
  },
};
