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

// The Components/UI sibling of API_POINTER — same idea, component vocabulary
// (props/callbacks/slots rather than properties/events/attributes).
const COMPONENT_POINTER =
  '> **Full API reference** — every prop, callback, slot and token is on the **API** tab above.';

/**
 * Build a Storybook `docs.description` for a SolidJS/UI component story, with the
 * API-tab pointer prepended. The generated spec (props/callbacks/slots/tokens)
 * lives on the **API** tab (see `.storybook/api-tab.tsx`), from
 * `src/components/component-meta.json`.
 */
export function componentDescription(paragraphs: string[]): { component: string } {
  return { component: [COMPONENT_POINTER, ...paragraphs].join('\n\n') };
}

/**
 * Parse a type string from element-meta.json into meaningful parts.
 *
 * The meta generator writes types like:
 *   - `"undefined | false | true"` for booleans (NOT "boolean")
 *   - `"undefined | \"preview\" | \"code\""` for enums (double-quoted, with leading undefined)
 *
 * We normalise by splitting on `|`, trimming, and dropping `undefined` / `null`.
 */
const normaliseParts = (type: string): string[] =>
  type
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s !== 'undefined' && s !== 'null');

const enumValues = (parts: string[]): string[] | null => {
  // Accept both single-quoted ('foo') and double-quoted ("foo") string literals.
  if (parts.length > 0 && parts.every((p) => /^(['"])[^'"]*\1$/.test(p)))
    return parts.map((p) => p.slice(1, -1));
  return null;
};

const isBooleanParts = (parts: string[], rawType: string): boolean => {
  // Explicit boolean keyword (future-proof)
  if (/\bboolean\b/.test(rawType)) return true;
  // element-meta encodes booleans as "undefined | false | true"
  const sorted = [...parts].sort().join(',');
  return sorted === 'false,true';
};

/** Storybook argTypes for an element's scalar props (theme select, booleans, text, number). */
export function argTypesFor(tag: string): Record<string, unknown> {
  const el = all.find((e) => e.tag === tag);
  if (!el) return {};
  const out: Record<string, unknown> = {};
  for (const p of el.props) {
    if (!p.scalar) continue;
    const parts = normaliseParts(p.type);
    const values = enumValues(parts);
    if (values) out[p.name] = { control: { type: 'select' }, options: values };
    else if (isBooleanParts(parts, p.type)) out[p.name] = { control: 'boolean' };
    else if (/\bnumber\b/.test(p.type)) out[p.name] = { control: 'number' };
    else out[p.name] = { control: 'text' };
  }
  return out;
}
