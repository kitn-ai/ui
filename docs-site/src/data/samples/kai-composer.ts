// Sample data for <kai-composer> non-scalar props.
//
// `triggers`, `value` (when a ComposerDoc), and `highlights` are objects/arrays —
// they must be set as JS properties, so they're seeded here for the Playground +
// Examples instead of an empty composer.
//
// `sample` = default playground data; `named` = sets referenced by <Example data="…">.

function tile(fill: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="10" fill="${fill}"/><text x="32" y="42" font-size="30" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// `/` → skills (actions you invoke). `@` → agents + plugins as one Codex-style
// sectioned menu (per-item `kind` overrides the trigger default).
const TRIGGERS = [
  {
    char: '/',
    kind: 'skill',
    items: [
      { id: 'summarize', label: 'Summarize', description: 'Summarize the thread', promptText: 'Summarize the thread.' },
      { id: 'translate', label: 'Translate', description: 'Translate to English', promptText: 'Translate to English.' },
      { id: 'rewrite', label: 'Rewrite', description: 'Rewrite for clarity', promptText: 'Rewrite this for clarity.' },
    ],
  },
  {
    char: '@',
    kind: 'agent',
    items: [
      { id: 'record-replay', label: 'Record & Replay', kind: 'plugin', group: 'Plugins', icon: tile('#dc2626', '●'), description: 'Capture and replay a session', data: { plugin: 'record-replay' } },
      { id: 'documents', label: 'Documents', kind: 'plugin', group: 'Plugins', icon: tile('#2563eb', 'D'), description: 'Create and edit documents', data: { plugin: 'documents' } },
      { id: 'code-reviewer', label: 'Code Reviewer', group: 'Agents', description: 'Reviews diffs for bugs', promptText: 'Hand this to the Code Reviewer agent.' },
      { id: 'researcher', label: 'Researcher', group: 'Agents', description: 'Deep multi-source research' },
    ],
  },
];

export default {
  // Default playground sample: working triggers so `/` and `@` open menus, plus a
  // helpful placeholder so the empty composer isn't blank.
  sample: {
    placeholder: 'Type / for a skill or @ for an agent…',
    triggers: TRIGGERS,
  },
  named: {
    // Entity pills — type `/` for a skill or `@` for an agent/plugin.
    pills: {
      placeholder: 'Type / for a skill or @ for an agent…',
      triggers: TRIGGERS,
    },
    // Pre-populated pills seeded via `value` as a ComposerDoc.
    prefilled: {
      triggers: TRIGGERS,
      value: [
        { type: 'text', text: 'Review ' },
        { type: 'entity', entity: { kind: 'skill', id: 'summarize', label: 'Summarize', promptText: 'Summarize the thread.' } },
        { type: 'text', text: ' then ask ' },
        { type: 'entity', entity: { kind: 'agent', id: 'code-reviewer', label: 'Code Reviewer' } },
        { type: 'text', text: ' to use ' },
        { type: 'entity', entity: { kind: 'plugin', id: 'documents', label: 'Documents', icon: tile('#2563eb', 'D'), data: { plugin: 'documents' } } },
        { type: 'text', text: '.' },
      ],
    },
    // Decoration-only keyword highlighting via the CSS Custom Highlight API.
    highlighted: {
      value: 'Deploy TICKET-123 and TICKET-456 before the review.',
      highlights: ['deploy', { pattern: 'TICKET-\\d+' }],
    },
  },
};
