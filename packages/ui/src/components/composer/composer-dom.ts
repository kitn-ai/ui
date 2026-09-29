import type { EntityRef, ComposerDoc } from '../../primitives/composer-model';
import { normalizeValue } from '../../primitives/composer-model';

export const ZWSP = '​';
export const ENTITY_ATTR = 'data-kai-entity';
export const entityStore = new WeakMap<HTMLElement, EntityRef>();

export function isEntityEl(node: Node | null): node is HTMLElement {
  return !!node && node.nodeType === 1 && (node as HTMLElement).hasAttribute(ENTITY_ATTR);
}

/**
 * A TreeWalker over the editable's text nodes that SKIPS text inside entity
 * pills. Pills are atomic and contribute nothing to the text model: their inner
 * label text must not pollute caret offsets, trigger detection, or highlight
 * ranges. (Without this, the text seen at a caret right after a pill is the
 * pill's label, so `/` reads as glued to the label instead of starting a token.)
 */
export function createTextWalker(root: HTMLElement): TreeWalker {
  return root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p = node.parentElement;
      while (p && p !== root) {
        if (p.hasAttribute(ENTITY_ATTR)) return NodeFilter.FILTER_REJECT;
        p = p.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
}

/**
 * The leading sigil shown on a "light" pill, by kind: skills `/`, agents `@`.
 * Skills and agents render as decorated inline text led by their sigil; this is
 * what makes them read like `/my-skill` / `@my-agent` rather than a chip.
 * Returns '' for kinds rendered as a richer CHIP (plugins, and any other/unknown
 * kind). Those carry an icon instead of a sigil. The sigil is visual only: it
 * never enters the text model (the entity is read from `entityStore`, and the
 * text walker skips pill-internal nodes).
 */
export function kindSigil(kind: string): string {
  switch (kind) {
    case 'skill':
      return '/';
    case 'agent':
      return '@';
    default:
      return '';
  }
}

/**
 * Default monochrome (currentColor) glyph per entity kind, for the richer CHIP
 * kinds shown in the trigger menu / on plugin pills: plugin = plug. (Skills and
 * agents are light sigil-text pills (see `kindSigil`) so they take no glyph on
 * the pill, though the menu may still show one.) Returns inline SVG markup
 * (trusted, no user input), or '' for kinds without a default. An item's own
 * `icon` always takes precedence over this.
 */
export function kindGlyph(kind: string): string {
  const svg = (inner: string) =>
    `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  switch (kind) {
    case 'agent':
      return svg('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4.5V8M9.5 13.5v1.5M14.5 13.5v1.5"/><circle cx="12" cy="3" r="1.2"/>');
    case 'plugin':
      return svg('<path d="M9 2v4M15 2v4M6 6h12v5a6 6 0 0 1-12 0zM12 17v5"/>');
    default:
      return ''; // skills + unknown kinds: no default glyph
  }
}

/**
 * What leads an entity: the RESULT of the resolution chain below. `null` means
 * "no glyph at all", which a caller renders as the label alone rather than as an
 * empty box that reads as a space.
 */
export type GlyphSpec =
  | { type: 'image'; src: string }
  | { type: 'svg'; markup: string }
  | { type: 'sigil'; text: string };

/**
 * Everything the glyph chain needs beyond the entity itself: the per-kind icon
 * defaults (a `Composer` prop), and the per-kind SIGIL: the trigger character
 * the caller creates that kind with (`{ command: '/', mention: '@' }`), derived
 * from the same `triggers` prop the trigger detection reads.
 */
export interface GlyphContext {
  kindIcons?: Record<string, string>;
  sigils?: Record<string, string>;
}

/**
 * True when a value is an ADDRESS an `<img>` can fetch, as opposed to a NAME.
 * `icon: 'file-text'` is a Lucide name, not a `src`: putting it in one renders a
 * broken image, which is a 1em hole where the glyph should be. That is the bug that made
 * an `@`-mention pill read as "a space before the word". Accepted: an absolute
 * URL whose scheme an `<img>` can fetch (`https:`, `data:`, `blob:`; a
 * `javascript:` src is an image that can never load, so it counts as absent), or
 * a path (`/x.png`, `./x.png`, `icons/x.png`, `x.png`).
 */
export function isUsableImageSrc(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const src = value.trim();
  if (src === '') return false;
  if (/^(https?|data|blob):/i.test(src)) return true;
  return src.includes('/') || /\.(svg|png|jpe?g|gif|webp|avif|ico)$/i.test(src);
}

/**
 * ONE resolution chain for what leads an entity, used by the pill
 * (`createEntityEl`) AND by the composer's trigger-menu row, so the two surfaces
 * cannot disagree about a kind:
 *
 *   the item's own icon -> the per-kind default (`kindIcons`) -> the kind's
 *   built-in glyph -> the kind's SIGIL (its trigger char)
 *
 * The last step is what keeps a kind the kit knows nothing about from rendering a
 * hole: a consumer's kind is reached by SOME trigger, and the character the user
 * typed to get the entity is the honest glyph for it. Only a kind with no
 * built-in glyph AND no trigger resolves to `null`. Every image candidate goes
 * through `isUsableImageSrc`, so a NAME is treated as absent and the chain falls
 * through instead of emitting a broken `<img>`.
 */
export function resolveGlyph(
  kind: string,
  icon: string | undefined,
  ctx?: GlyphContext,
): GlyphSpec | null {
  for (const candidate of [icon, ctx?.kindIcons?.[kind]]) {
    if (isUsableImageSrc(candidate)) return { type: 'image', src: candidate };
  }
  const markup = kindGlyph(kind);
  if (markup) return { type: 'svg', markup };
  const text = kindSigil(kind) || ctx?.sigils?.[kind];
  return text ? { type: 'sigil', text } : null;
}

export function createEntityEl(
  doc: Document,
  entity: EntityRef,
  ctx?: GlyphContext,
): HTMLElement {
  const el = doc.createElement('span');
  el.setAttribute(ENTITY_ATTR, '');
  el.setAttribute('contenteditable', 'false');
  el.dataset.kind = entity.kind;
  el.dataset.id = entity.id;
  el.className = 'kai-composer-pill';

  // Skills/agents: LIGHT pill — decorated inline text led by their built-in
  // sigil, and that sigil WINS over any icon, which is what the light style
  // means. (`/my-skill`, `@my-agent`.) Every other kind — plugins and any
  // consumer kind — resolves through the shared chain, which ends at the kind's
  // trigger character so no kind renders a hole where its glyph belongs.
  const builtinSigil = kindSigil(entity.kind);
  const spec: GlyphSpec | null = builtinSigil
    ? { type: 'sigil', text: builtinSigil }
    : resolveGlyph(entity.kind, entity.icon, ctx);

  if (spec?.type === 'image') {
    const img = doc.createElement('img');
    img.src = spec.src;
    img.alt = '';
    img.className = 'kai-composer-pill-icon';
    el.appendChild(img);
  } else if (spec?.type === 'svg') {
    const span = doc.createElement('span');
    span.className = 'kai-composer-pill-icon kai-composer-pill-glyph';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = spec.markup; // trusted SVG markup (not user input)
    el.appendChild(span);
  } else if (spec?.type === 'sigil') {
    const s = doc.createElement('span');
    s.className = 'kai-composer-pill-sigil';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = spec.text;
    el.appendChild(s);
  }
  el.appendChild(doc.createTextNode(entity.label));
  entityStore.set(el, entity);
  return el;
}

export function parseDom(root: HTMLElement): ComposerDoc {
  const segs: ComposerDoc = [];
  const nodes = root.childNodes;
  nodes.forEach((node, i) => {
    if (isEntityEl(node)) {
      const stored = entityStore.get(node as HTMLElement);
      const el = node as HTMLElement;
      segs.push({ type: 'entity', entity: stored ?? { kind: el.dataset.kind ?? '', id: el.dataset.id ?? '', label: el.textContent ?? '' } });
    } else if (node.nodeType === 1 && (node as HTMLElement).tagName === 'BR') {
      // Drop the browser's trailing filler <br> — contenteditable inserts one when
      // the field is cleared (or after a newline) to keep the line visible. Treating
      // it as content would leave the field "non-empty" (placeholder stuck hidden)
      // and serialize a phantom trailing "\n". A <br> BETWEEN content is a real
      // newline and is preserved.
      if (i === nodes.length - 1) return;
      segs.push({ type: 'text', text: '\n' });
    } else if (node.nodeType === 3) {
      segs.push({ type: 'text', text: (node.textContent ?? '').split(ZWSP).join('') });
    }
  });
  return normalizeValue(segs);
}

export function renderDoc(
  root: HTMLElement,
  doc: ComposerDoc,
  ownerDoc: Document = document,
  ctx?: GlyphContext,
): void {
  root.textContent = '';
  for (const seg of doc) {
    if (seg.type === 'text') root.appendChild(ownerDoc.createTextNode(seg.text));
    else {
      root.appendChild(createEntityEl(ownerDoc, seg.entity, ctx));
      root.appendChild(ownerDoc.createTextNode(ZWSP));
    }
  }
}
