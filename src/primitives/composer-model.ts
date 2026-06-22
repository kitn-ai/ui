export interface EntityRef {
  kind: string;
  id: string;
  label: string;
  icon?: string;
  promptText?: string;
  data?: Record<string, unknown>;
}
export type Segment =
  | { type: 'text'; text: string }
  | { type: 'entity'; entity: EntityRef };
export type ComposerDoc = Segment[];

export function normalizeValue(value: string | ComposerDoc | null | undefined): ComposerDoc {
  if (value == null) return [];
  if (typeof value === 'string') return value.length ? [{ type: 'text', text: value }] : [];
  const out: ComposerDoc = [];
  for (const seg of value) {
    if (seg.type === 'text') {
      if (!seg.text) continue;
      const last = out[out.length - 1];
      // Replace (don't mutate) the prior segment so every object in the returned
      // doc is freshly built and never an aliased/held reference.
      if (last && last.type === 'text') out[out.length - 1] = { type: 'text', text: last.text + seg.text };
      else out.push({ type: 'text', text: seg.text });
    } else {
      out.push({ type: 'entity', entity: seg.entity });
    }
  }
  return out;
}

export function serializeToText(
  doc: ComposerDoc,
  opts?: { entity?: (e: EntityRef) => string },
): string {
  let out = '';
  for (const seg of doc) {
    if (seg.type === 'text') out += seg.text;
    else out += opts?.entity ? opts.entity(seg.entity) : (seg.entity.promptText ?? seg.entity.label);
  }
  return out;
}
export function entitiesOf(doc: ComposerDoc): EntityRef[] {
  return doc.filter((s): s is Extract<Segment, { type: 'entity' }> => s.type === 'entity').map((s) => s.entity);
}
export function docIsEmpty(doc: ComposerDoc): boolean {
  return doc.every((s) => s.type === 'text' && s.text.length === 0);
}
