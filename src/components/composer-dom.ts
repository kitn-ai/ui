import type { EntityRef, ComposerDoc } from '../primitives/composer-model';
import { normalizeValue } from '../primitives/composer-model';

export const ZWSP = '​';
export const ENTITY_ATTR = 'data-kai-entity';
export const entityStore = new WeakMap<HTMLElement, EntityRef>();

export function isEntityEl(node: Node | null): node is HTMLElement {
  return !!node && node.nodeType === 1 && (node as HTMLElement).hasAttribute(ENTITY_ATTR);
}

/**
 * A TreeWalker over the editable's text nodes that SKIPS text inside entity
 * pills. Pills are atomic and contribute nothing to the text model — their inner
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

export function createEntityEl(doc: Document, entity: EntityRef): HTMLElement {
  const el = doc.createElement('span');
  el.setAttribute(ENTITY_ATTR, '');
  el.setAttribute('contenteditable', 'false');
  el.dataset.kind = entity.kind;
  el.dataset.id = entity.id;
  el.className = 'kai-composer-pill';
  if (entity.icon) {
    const img = doc.createElement('img');
    img.src = entity.icon;
    img.alt = '';
    img.className = 'kai-composer-pill-icon';
    el.appendChild(img);
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

export function renderDoc(root: HTMLElement, doc: ComposerDoc, ownerDoc: Document = document): void {
  root.textContent = '';
  for (const seg of doc) {
    if (seg.type === 'text') root.appendChild(ownerDoc.createTextNode(seg.text));
    else {
      root.appendChild(createEntityEl(ownerDoc, seg.entity));
      root.appendChild(ownerDoc.createTextNode(ZWSP));
    }
  }
}
