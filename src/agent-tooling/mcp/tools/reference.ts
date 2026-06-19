import { z } from 'zod';
import type { Tool } from './types';
import { getElement, listElements } from '../manifest';

/**
 * component_reference — look up AI/UI (kai-*) web components, their props,
 * events, attributes, and CSS custom properties from the live Custom Elements
 * Manifest (dist/custom-elements.json).
 *
 * Backed by manifest.ts which resolves the CEM in both the bundled bin
 * (dist/mcp.es.js sibling) and the Vitest source context (walks up to find
 * dist/custom-elements.json in the repo root).
 */

/** Types that warrant the JS-property contract note. */
const JS_ONLY_TYPE_PATTERNS = /\[\]|\{|Record</;

function isJsOnlyType(typeText: string | undefined): boolean {
  return typeText ? JS_ONLY_TYPE_PATTERNS.test(typeText) : false;
}

function formatReference(tag: string): string {
  const el = getElement(tag);

  if (!el) {
    const all = listElements();
    const sample = all.slice(0, 5).join(', ');
    return (
      `Unknown element: ${tag}\n\n` +
      `Valid tags include: ${sample} (and ${all.length - 5} more).\n` +
      `Call component_reference with no name (or name: "list") to list all ${all.length} elements.`
    );
  }

  const lines: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────────
  lines.push(`## <${tag}>`);
  if (el.description) {
    lines.push('', el.description.trim());
  }

  // ── Contract note ──────────────────────────────────────────────────────────
  lines.push(
    '',
    '### AI/UI contract',
    '`kai-*` elements accept **array and object data as JavaScript properties** ' +
      '(set in JavaScript via `el.property = value`, not as HTML attributes). ' +
      'Events are native CustomEvents — listen with `el.addEventListener("event-name", handler)` ' +
      'and read `event.detail` for the payload.',
  );

  // ── Public JS properties ───────────────────────────────────────────────────
  const publicFields = (el.members ?? []).filter(
    (m) => m.kind === 'field' && m.privacy === 'public',
  );

  if (publicFields.length > 0) {
    lines.push('', '### Props (JavaScript properties)');
    for (const field of publicFields) {
      const type = field.type?.text ?? 'unknown';
      const jsOnly = isJsOnlyType(type);
      const desc = field.description?.trim() ?? '';
      const note = jsOnly ? ' ⚑ set as a JS property, not an HTML attribute' : '';
      lines.push(`- **${field.name}** \`${type}\`${note}`);
      if (desc) {
        lines.push(`  ${desc}`);
      }
    }
  }

  // ── HTML attributes ────────────────────────────────────────────────────────
  const attrs = el.attributes ?? [];
  if (attrs.length > 0) {
    lines.push('', '### Attributes (HTML-safe)');
    for (const attr of attrs) {
      const type = attr.type?.text ?? 'unknown';
      const desc = attr.description?.trim() ?? '';
      lines.push(`- **${attr.name}** \`${type}\``);
      if (desc) {
        lines.push(`  ${desc}`);
      }
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────
  const events = el.events ?? [];
  if (events.length > 0) {
    lines.push('', '### Events (CustomEvent, listen via addEventListener)');
    for (const ev of events) {
      const desc = ev.description?.trim() ?? '';
      lines.push(`- **${ev.name}** — ${desc}`);
    }
  }

  // ── CSS custom properties ─────────────────────────────────────────────────
  const cssProps = el.cssProperties ?? [];
  if (cssProps.length > 0) {
    lines.push('', '### CSS custom properties');
    for (const prop of cssProps) {
      const desc = prop.description?.trim() ?? '';
      const def = prop.default ? ` (default: ${prop.default})` : '';
      lines.push(`- **${prop.name}**${def}${desc ? ` — ${desc}` : ''}`);
    }
  }

  return lines.join('\n');
}

export const reference: Tool = {
  name: 'component_reference',
  description:
    'Look up AI/UI (kai-*) web components: their tags, props, events, and usage examples.',
  inputSchema: z.object({ name: z.string().optional() }),
  handler: async (args: Record<string, unknown>) => {
    const name = typeof args.name === 'string' ? args.name.trim() : undefined;

    let text: string;

    if (!name || name === 'list') {
      const tags = listElements();
      text =
        `AI/UI elements (${tags.length} total):\n\n` +
        tags.map((t) => `  ${t}`).join('\n') +
        '\n\nCall component_reference with a specific name (e.g. { name: "kai-chat" }) for full API details.';
    } else {
      text = formatReference(name);
    }

    return { content: [{ type: 'text' as const, text }] };
  },
};
