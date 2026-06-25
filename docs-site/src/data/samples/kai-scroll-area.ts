// Sample data for <kai-scroll-area>.
//
// kai-scroll-area has no props — the scrollable content is the default slot,
// injected as innerHTML BEFORE upgrade so it's present on the first paint. The
// element needs a bounded height to scroll, so every set carries `previewHeight`
// (applied to the preview box; the element fills it) plus enough `html` filler to
// overflow that height and surface the themed thin scrollbar.
//
// `sample` = default content for the Playground + a bare <Example> (no data="")
// `named`  = alternate content sets a focused <Example data="…"> opts into
//
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// this file is picked up automatically — no shared-file edits needed.

// A tall column of paragraphs — comfortably taller than `previewHeight`, so the
// content overflows and the thin scrollbar appears.
const PARAGRAPHS = [
  'AI/UI ships framework-agnostic web components, so the same scroll container works in React, Vue, Svelte, Angular, or plain HTML.',
  'Give the element a bounded height and the content scrolls inside it — no wrapper div, no overflow utilities, no per-browser scrollbar CSS.',
  'The scrollbar is thin and themed: it follows the --color-scrollbar-thumb token and matches your light or dark surface automatically.',
  'The viewport is keyboard-reachable, so a long region stays navigable with the arrow keys and Page Up / Page Down.',
  'Restyle the inner padding or max-height from outside via ::part(viewport) — the behavior stays in the component, the look stays yours.',
  'Drop a message thread, a settings panel, a long changelog, or a list of search results in here and let it carry the overflow.',
  'Because it is a plain block box, it composes anywhere a div would — inside a card, a sidebar, a popover, or a split pane.',
  'Nothing here is CSS-pierced or shadow-hacked; the contract is the default slot in, the viewport part out.',
]
  .map((line) => `<p style="margin:0 0 0.85rem">${line}</p>`)
  .join('');

export default {
  // Default playground injection: a tall column that overflows the box.
  sample: {
    html: PARAGRAPHS,
    previewHeight: '14rem',
  },

  named: {
    // A long, scrollable column of prose.
    paragraphs: {
      html: PARAGRAPHS,
      previewHeight: '14rem',
    },

    // A long scrollable list — the other common overflowing region.
    list: {
      html:
        '<ul style="margin:0;padding-left:1.1rem;display:grid;gap:0.5rem">' +
        Array.from({ length: 24 }, (_, i) => `<li>Workspace file ${i + 1}.ts</li>`).join('') +
        '</ul>',
      previewHeight: '12rem',
    },
  },
};
