/**
 * Composition seams for `kai-*` elements. A seam is a named region a consumer
 * fills with their own markup. This registry is the SINGLE SOURCE OF TRUTH:
 * the facade derives its detection from it (and, later, docs are generated
 * from it). See docs/superpowers/specs/2026-06-23-kai-chat-composition-seams-design.md.
 */

/** `inject` = additive (the built-in region still renders, your markup is added
 *  in). `replace` = your markup stands in for the whole region — you own that
 *  region's data + events (a slotted light-DOM node can't read the component's
 *  reactive state). */
export type SeamMode = 'inject' | 'replace';

export interface SeamDef {
  /** Slot name (kebab-case). Also the `::part` name when `part` is true. */
  name: string;
  mode: SeamMode;
  /** Expose `::part(name)` on the region wrapper for consumer styling. */
  part?: boolean;
  /** One-line contract: what the consumer projects / owns. Feeds the docs. */
  doc: string;
}

/** Seams of `<kai-chat>`, in render order. */
export const CHAT_SEAMS: SeamDef[] = [
  { name: 'header-start',     mode: 'inject',  doc: 'Leading header controls, left of the title.' },
  { name: 'header-end',       mode: 'inject',  doc: 'Trailing header controls.' },
  { name: 'header',           mode: 'replace', part: true, doc: 'Full custom header; replaces the built-in title/model/context bar.' },
  { name: 'sidebar',          mode: 'inject',  part: true, doc: 'Left column (your nav / conversation list). Fixed width; use compose-your-own for resizable.' },
  { name: 'empty',            mode: 'replace', doc: 'Custom zero-state rendered in the message area while the thread is empty. Replaces the empty message list only — the composer and any suggestions still render.' },
  { name: 'composer',         mode: 'replace', doc: 'Full custom composer; you own submit + loading, drive the thread via messages.' },
  { name: 'composer-actions', mode: 'inject',  doc: 'Accessory row above the composer.' },
  { name: 'footer',           mode: 'inject',  part: true, doc: 'Row below the composer (disclaimers, token meter).' },
];

/** Seams of `<kai-prompt-input>` (and the default composer inside `<kai-chat>`). Native
 *  shadow slots — an empty seam renders nothing, so no facade flag-gating is required. */
export const PROMPT_INPUT_SEAMS: SeamDef[] = [
  { name: 'notice',        mode: 'inject', part: true, doc: 'Banner at the top of the input card (e.g. "model unavailable"). You own the copy + dismiss.' },
  { name: 'leading',       mode: 'inject', doc: 'Controls before the textarea.' },
  { name: 'toolbar-start', mode: 'inject', doc: 'Leading controls in the input toolbar — where a + menu goes.' },
  { name: 'trailing',      mode: 'inject', doc: 'Trailing controls in the toolbar, before the Send button (toolbar-end).' },
];

/**
 * Which seams have projected light-DOM content — a DIRECT child of `host`
 * carrying the matching `slot` attribute. Pure and synchronous; safe in jsdom
 * and SSR (returns all-false when `host` has no matching children). The facade
 * calls this on mount and on every childList mutation.
 */
export function readSeams(host: Element, defs: SeamDef[] = CHAT_SEAMS): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of defs) {
    out[def.name] = !!host.querySelector(`:scope > [slot="${def.name}"]`);
  }
  return out;
}
