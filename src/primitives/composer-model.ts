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
      if (last && last.type === 'text') last.text += seg.text;
      else out.push({ type: 'text', text: seg.text });
    } else {
      out.push({ type: 'entity', entity: seg.entity });
    }
  }
  return out;
}
