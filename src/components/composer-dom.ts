import type { EntityRef, ComposerDoc } from '../primitives/composer-model';
import { normalizeValue } from '../primitives/composer-model';

export const ZWSP = '​';
export const ENTITY_ATTR = 'data-kai-entity';
export const entityStore = new WeakMap<HTMLElement, EntityRef>();

export function isEntityEl(node: Node | null): node is HTMLElement {
  return !!node && node.nodeType === 1 && (node as HTMLElement).hasAttribute(ENTITY_ATTR);
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
  root.childNodes.forEach((node) => {
    if (isEntityEl(node)) {
      const stored = entityStore.get(node as HTMLElement);
      const el = node as HTMLElement;
      segs.push({ type: 'entity', entity: stored ?? { kind: el.dataset.kind ?? '', id: el.dataset.id ?? '', label: el.textContent ?? '' } });
    } else if (node.nodeType === 1 && (node as HTMLElement).tagName === 'BR') {
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
