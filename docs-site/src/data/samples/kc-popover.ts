// Sample data for <kc-popover> — a slotted trigger + panel content, injected as
// light DOM via `html`. Inline styles keep the preview self-contained (the panel
// chrome — surface, radius, shadow — comes from the element's own Shadow DOM).
const btn = 'padding:6px 12px;border-radius:8px;border:1px solid var(--kc-line,#e4e4e7);background:transparent;color:inherit;cursor:pointer;font:inherit;';
const row = 'display:block;width:100%;text-align:left;padding:6px 8px;border-radius:6px;border:none;background:transparent;color:inherit;cursor:pointer;font:inherit;';

export default {
  sample: {
    previewHeight: '320px',
    html: `<button slot="trigger" style="${btn}">GPT-5.5 &#9662;</button><div style="width:15rem"><button style="${row}"><strong>GPT-5.5</strong> &mdash; Flagship</button><button style="${row}">Legacy models &#9662;</button><button style="${row}">Settings&hellip;</button></div>`,
  },
};
