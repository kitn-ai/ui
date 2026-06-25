/**
 * Composition slots for `kai-*` elements. A slot is a named region a consumer
 * fills with their own markup. This registry is the SINGLE SOURCE OF TRUTH:
 * the facade derives its detection from it (and, later, docs are generated
 * from it). See docs/superpowers/specs/2026-06-23-kai-chat-composition-seams-design.md.
 */

/** `inject` = additive (the built-in region still renders, your markup is added
 *  in). `replace` = your markup stands in for the whole region — you own that
 *  region's data + events (a slotted light-DOM node can't read the component's
 *  reactive state). */
export type SlotMode = 'inject' | 'replace';

export interface SlotDef {
  /** Slot name (kebab-case). Also the `::part` name when `part` is true. */
  name: string;
  mode: SlotMode;
  /** Expose `::part(name)` on the region wrapper for consumer styling. */
  part?: boolean;
  /** One-line contract: what the consumer projects / owns. Feeds the docs. */
  doc: string;
}

/** Slots of `<kai-chat>`, in render order. */
export const CHAT_SLOTS: SlotDef[] = [
  { name: 'header-start',     mode: 'inject',  doc: 'Leading header controls, left of the title.' },
  { name: 'header-end',       mode: 'inject',  doc: 'Trailing header controls.' },
  { name: 'header',           mode: 'replace', part: true, doc: 'Full custom header; replaces the built-in title/model/context bar.' },
  { name: 'sidebar',          mode: 'inject',  part: true, doc: 'Left column (your nav / conversation list). Fixed width; use compose-your-own for resizable.' },
  { name: 'empty',            mode: 'replace', doc: 'Custom zero-state rendered in the message area while the thread is empty. Replaces the empty message list only — the composer and any suggestions still render.' },
  { name: 'composer',         mode: 'replace', doc: 'Full custom composer; you own submit + loading, drive the thread via messages.' },
  { name: 'composer-actions', mode: 'inject',  doc: 'Accessory row above the composer.' },
  { name: 'footer',           mode: 'inject',  part: true, doc: 'Row below the composer (disclaimers, token meter).' },
];

/** Slots of `<kai-prompt-input>` (and the default composer inside `<kai-chat>`). Native
 *  shadow slots — an empty slot renders nothing, so no facade flag-gating is required.
 *
 *  These are ONLY positions inside the card's shadow boundary — places a consumer
 *  cannot reach from their own DOM. Content ABOVE/BELOW the whole card is the
 *  consumer's own light-DOM layout (a sibling element), so there is intentionally
 *  no outer block slot here. (When the input is nested inside `<kai-chat>`'s shadow,
 *  that surrounding hole belongs to `kai-chat` — see `composer-actions`/`footer`.) */
export const PROMPT_INPUT_SLOTS: SlotDef[] = [
  { name: 'input-top',     mode: 'inject', doc: 'Inside the card, above the textarea (e.g. an inline status strip). For content above/below the whole card, use your own layout — that is light DOM you control.' },
  { name: 'toolbar-start', mode: 'inject', doc: 'Leading controls in the input toolbar — where a + menu goes.' },
  { name: 'toolbar-end',   mode: 'inject', doc: 'Trailing controls in the toolbar, before the Send button.' },
];

/** A styleable `::part` the kit renders (NOT a slot — you don't project into it;
 *  you restyle it from outside via `::part(name)`). This registry is the source
 *  of truth so the styling surface is discoverable: docs + the `kai` MCP
 *  component reference are generated from it, the same way slots are. The
 *  `recipe` is a copy-pasteable example — including the "just hide it" case that
 *  is pure CSS and therefore intentionally NOT a prop. */
export interface PartDef {
  /** `::part(name)` exposed for consumer styling. */
  name: string;
  /** One-line contract: what the part is. */
  doc: string;
  /** A copy-pasteable styling example for docs / the MCP reference. */
  recipe?: string;
}

/** Styleable `::part`s of `<kai-prompt-input>`. */
export const PROMPT_INPUT_PARTS: PartDef[] = [
  {
    name: 'send',
    doc: 'The send button. Restyle from outside, or hide it entirely (Enter-only) — hiding is pure CSS, which is why there is no `submit="never"`.',
    recipe: 'kai-prompt-input::part(send) { display: none } /* Enter-only; or restyle: background, border-radius, … */',
  },
];

/** Styleable `::part`s of `<kai-button>`. */
export const BUTTON_PARTS: PartDef[] = [
  {
    name: 'button',
    doc: 'The button element. Restyle radius, padding, colors, or weight from outside; the `variant`/`size` props set the defaults.',
    recipe: 'kai-button::part(button) { border-radius: 9999px; font-weight: 600 }',
  },
];

/** Styleable `::part`s of `<kai-badge>`. */
export const BADGE_PARTS: PartDef[] = [
  {
    name: 'badge',
    doc: 'The badge pill. Restyle its background, color, or shape; the `variant` prop (default/count/citation) sets the defaults.',
    recipe: 'kai-badge::part(badge) { background: var(--color-primary); color: var(--color-primary-foreground) }',
  },
];

/** Styleable `::part`s of `<kai-icon>`. */
export const ICON_PARTS: PartDef[] = [
  {
    name: 'icon',
    doc: 'The icon wrapper. Inherits `currentColor` and the `size` prop by default; recolor or resize it from outside.',
    recipe: 'kai-icon::part(icon) { color: var(--color-primary) }',
  },
];

/**
 * Per-element composition surface — the SINGLE registry the build extracts
 * (`scripts/gen-element-api.mjs`) into `element-meta.json`, the Custom Elements
 * Manifest (`cssParts`/`slots`), `docs/web-components.md`, and the `kai` MCP
 * `component_reference`. Each entry maps a `kai-*` tag to the slots it projects
 * and the `::part`s it exposes for styling. Slots flagged `part: true` are ALSO
 * styleable parts, so they surface in both places.
 *
 * Adding a `part="…"` in a facade/component without registering it here fails the
 * `slots.test.ts` drift guard — keep this in sync with the source.
 */
export interface ElementComposition {
  slots?: SlotDef[];
  parts?: PartDef[];
}

export const ELEMENT_COMPOSITION: Record<string, ElementComposition> = {
  'kai-chat': { slots: CHAT_SLOTS },
  'kai-prompt-input': { slots: PROMPT_INPUT_SLOTS, parts: PROMPT_INPUT_PARTS },
  'kai-button': { parts: BUTTON_PARTS },
  'kai-badge': { parts: BADGE_PARTS },
  'kai-icon': { parts: ICON_PARTS },
};

/**
 * Which slots have projected light-DOM content — a DIRECT child of `host`
 * carrying the matching `slot` attribute. Pure and synchronous; safe in jsdom
 * and SSR (returns all-false when `host` has no matching children). The facade
 * calls this on mount and on every childList mutation.
 */
export function readSlots(host: Element, defs: SlotDef[] = CHAT_SLOTS): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of defs) {
    out[def.name] = !!host.querySelector(`:scope > [slot="${def.name}"]`);
  }
  return out;
}
