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

/** Slots of `<kai-conversations>` (also used inside `<kai-chat>`'s `sidebar`).
 *  Names mirror `<kai-chat>`'s so the two compose with one vocabulary. */
export const CONVERSATIONS_SLOTS: SlotDef[] = [
  { name: 'header', mode: 'replace', doc: 'Full custom title bar; replaces the built-in toggle / "Chats" / New-chat row.' },
  { name: 'empty',  mode: 'replace', doc: 'Custom zero-state shown when there are no conversations; replaces the built-in "No conversations yet".' },
  { name: 'footer', mode: 'inject',  doc: 'A row below the list — account, settings, or usage.' },
];

/** Slots of `<kai-message>` — per-message composition seams. `before-body` and
 *  `after-body` are INJECT regions inside the message's body column; `avatar`
 *  REPLACES the built-in avatar rail (pair it with `avatar="none"` to omit the
 *  rail entirely). These are the keystone of compose-your-own message lists. */
export const MESSAGE_SLOTS: SlotDef[] = [
  { name: 'before-body', mode: 'inject',  doc: 'A per-message header at the TOP of the body, above reasoning/tools/content — a model-name label, a role + timestamp line.' },
  { name: 'after-body',  mode: 'inject',  doc: 'A row at the BOTTOM of the body, below the action bar — a citation/sources row, a token-cost/latency line.' },
  { name: 'avatar',      mode: 'replace', part: true, doc: 'Replaces the built-in avatar rail with your own node. Use `avatar="none"` to omit the rail and let the body span the full row.' },
];

/** Slots of `<kai-notice>`. The message is the default slot; these are the named seams. */
export const NOTICE_SLOTS: SlotDef[] = [
  { name: 'action', mode: 'inject',  doc: 'A trailing action beside the message — a link or button.' },
  { name: 'icon',   mode: 'replace', doc: 'A custom leading icon (any inline SVG, inherits `currentColor`). Overrides the severity default and the `icon` prop — the same escape hatch as `kai-button`.' },
];

/** Slots of `<kai-button>` (the label is the default slot). */
export const BUTTON_SLOTS: SlotDef[] = [
  { name: 'icon', mode: 'replace', doc: 'A custom leading icon (any inline SVG, inherits `currentColor`). Wins over the `icon` prop.' },
];

/** Slots of `<kai-hover-card>` (the trigger is the default slot). */
export const HOVER_CARD_SLOTS: SlotDef[] = [
  { name: 'card', mode: 'inject', doc: 'The rich content shown in the floating hover card.' },
];

/** Slots of `<kai-menu>` (the menu items come from the `items` prop). */
export const MENU_SLOTS: SlotDef[] = [
  { name: 'trigger', mode: 'replace', doc: 'Your own trigger element; replaces the built-in button driven by the `trigger-icon` / `trigger-label` props.' },
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

/** Styleable `::part`s of `<kai-chat>` (beyond the slot-backed `header`/`sidebar`/
 *  `footer` parts). */
export const CHAT_PARTS: PartDef[] = [
  {
    name: 'header-bar',
    doc: 'The built-in header bar (the title / model-switcher / context row that hosts the header-start/header-end inject slots). Restyle its height, padding, or gap from outside without replacing the whole header via the `header` slot.',
    recipe: 'kai-chat::part(header-bar) { height: 3.5rem; padding-inline: 1rem; gap: 0.5rem }',
  },
];

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

/** Styleable `::part`s of `<kai-separator>`. */
export const SEPARATOR_PARTS: PartDef[] = [
  {
    name: 'separator',
    doc: 'The divider line. Restyle its color, thickness, or inset from outside.',
    recipe: 'kai-separator::part(separator) { background: var(--color-border) }',
  },
];

/** Styleable `::part`s of `<kai-scroll-area>`. */
export const SCROLL_AREA_PARTS: PartDef[] = [
  {
    name: 'viewport',
    doc: 'The scrolling container. Add padding or a max-height from outside; the thin scrollbar follows `--color-scrollbar-thumb`.',
    recipe: 'kai-scroll-area::part(viewport) { padding-right: 0.5rem }',
  },
];

/** Styleable `::part`s of `<kai-skeleton>`. */
export const SKELETON_PARTS: PartDef[] = [
  {
    name: 'skeleton',
    doc: 'The shimmer block(s). Recolor or change the opacity from outside; the default is a low-contrast foreground tint that reads in both light and dark.',
    recipe: 'kai-skeleton::part(skeleton) { background: var(--color-primary); opacity: 0.15 }',
  },
];

/** Styleable `::part`s of `<kai-message>`. (The `avatar` part is contributed by
 *  the `avatar` slot's `part: true` flag, so it is not repeated here.) */
export const MESSAGE_PARTS: PartDef[] = [
  {
    name: 'row',
    doc: 'The message row wrapper (avatar rail + body column). Restyle its gap or alignment from outside.',
    recipe: 'kai-message::part(row) { gap: 0.75rem }',
  },
  {
    name: 'bubble',
    doc: 'The content bubble wrapper. Restyle its background, radius, or padding; for a user message this is the rounded chat bubble.',
    recipe: 'kai-message::part(bubble) { background: var(--color-primary); color: var(--color-primary-foreground) }',
  },
  {
    name: 'content',
    doc: 'The rendered message text/markdown region (same node as `bubble`). Target it to tune typography from outside.',
    recipe: 'kai-message::part(content) { font-size: 0.9375rem }',
  },
  {
    name: 'actions',
    doc: 'The action-bar row (copy / like / regenerate …). Restyle its spacing or hide it entirely from outside.',
    recipe: 'kai-message::part(actions) { gap: 0.25rem }',
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
  'kai-chat': { slots: CHAT_SLOTS, parts: CHAT_PARTS },
  'kai-conversations': { slots: CONVERSATIONS_SLOTS },
  'kai-message': { slots: MESSAGE_SLOTS, parts: MESSAGE_PARTS },
  'kai-prompt-input': { slots: PROMPT_INPUT_SLOTS, parts: PROMPT_INPUT_PARTS },
  'kai-button': { slots: BUTTON_SLOTS, parts: BUTTON_PARTS },
  'kai-badge': { parts: BADGE_PARTS },
  'kai-icon': { parts: ICON_PARTS },
  'kai-separator': { parts: SEPARATOR_PARTS },
  'kai-scroll-area': { parts: SCROLL_AREA_PARTS },
  'kai-notice': { slots: NOTICE_SLOTS },
  'kai-hover-card': { slots: HOVER_CARD_SLOTS },
  'kai-menu': { slots: MENU_SLOTS },
  'kai-skeleton': { parts: SKELETON_PARTS },
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
