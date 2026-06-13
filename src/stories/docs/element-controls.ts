import meta from '../../elements/element-meta.json';

type Prop = { name: string; type: string; default?: string; scalar: boolean };
type ElementMeta = { tag: string; props: Prop[] };
const all = meta as unknown as ElementMeta[];

// A small, consistent pointer at the top of every Web Component's Docs tab,
// directing readers to the dedicated API tab (which holds the full generated
// spec). Keeps the Docs tab focused on examples while keeping the spec one click
// away — and discoverable, since everyone reads the description first.
const API_POINTER =
  '> **Full API reference** — every property, event, default and token is on the **API** tab above.';

/**
 * Build a Storybook `docs.description` from an element's intro paragraphs, with
 * the API-tab pointer prepended. The generated spec itself lives in the **API**
 * tab (see `.storybook/api-tab.tsx`), not inline here.
 * (`tag` is kept in the signature so callers don't churn if we re-inline later.)
 */
export function specDescription(_tag: string, paragraphs: string[]): { component: string } {
  return { component: [API_POINTER, ...paragraphs].join('\n\n') };
}

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
