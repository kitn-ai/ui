import meta from '../../elements/element-meta.json';

type Prop = { name: string; type: string; default?: string; scalar: boolean };
type ElementMeta = { tag: string; props: Prop[] };
const all = meta as unknown as ElementMeta[];

const enumValues = (type: string): string[] | null => {
  // string-literal unions like "'light' | 'dark' | 'auto'"
  const parts = type.split('|').map((s) => s.trim());
  if (parts.length > 1 && parts.every((p) => /^'[^']*'$/.test(p))) return parts.map((p) => p.slice(1, -1));
  return null;
};

/** Storybook argTypes for an element's scalar props (theme select, booleans, text, number). */
export function argTypesFor(tag: string): Record<string, unknown> {
  const el = all.find((e) => e.tag === tag);
  if (!el) return {};
  const out: Record<string, unknown> = {};
  for (const p of el.props) {
    if (!p.scalar) continue;
    const values = enumValues(p.type);
    if (values) out[p.name] = { control: 'select', options: values };
    else if (/boolean/.test(p.type)) out[p.name] = { control: 'boolean' };
    else if (/number/.test(p.type)) out[p.name] = { control: 'number' };
    else out[p.name] = { control: 'text' };
  }
  return out;
}
