// Sample data for <kai-command> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// kai-command is driven by a FLAT `items` array (set as a JS property, not an
// attribute) — each item carries an `id`, `label`, optional `icon`/`description`,
// and an optional `group` that buckets it under a section header. The element
// does the grouping + filtering for you.
//
// `sample`  = default item set (the Playground + bare examples use it)
// `named`   = alternate sets a focused <Example data="…"> can opt into

// An @-mention / command palette across apps, chats, and files — modeled on the
// Storybook "MentionPicker" story.
const MENTION_ITEMS = [
  // Mac apps
  { id: 'ss', label: 'Screen Studio', icon: 'monitor', description: 'Computer use', group: 'Mac apps' },
  { id: 'ssb', label: 'Screen Studio Beta', icon: 'monitor', description: 'Computer use', group: 'Mac apps' },
  // Chats
  { id: 'rs', label: 'Record screen', icon: 'message-circle', description: 'Building ScreenOverlay', group: 'Chats' },
  { id: 'bso', label: 'Building ScreenOverlay', icon: 'message-circle', group: 'Chats' },
  // Files
  { id: 'screens', label: 'screens', icon: 'folder', group: 'Files' },
  { id: 'screen9', label: 'screen9.py', icon: 'file-text', description: '/Users/rob/screen9.py', group: 'Files' },
  { id: 'screenrec', label: 'screenrec.py', icon: 'file-text', description: '/Users/rob/screenrec.py', group: 'Files' },
];

// A slash-command menu — actions grouped by section, no descriptions.
const COMMAND_ITEMS = [
  { id: 'new', label: 'New chat', icon: 'plus', group: 'Actions' },
  { id: 'clear', label: 'Clear conversation', icon: 'trash', group: 'Actions' },
  { id: 'rename', label: 'Rename thread', icon: 'pencil', group: 'Actions' },
  { id: 'model', label: 'Switch model', icon: 'sparkles', group: 'Settings' },
  { id: 'theme', label: 'Toggle theme', icon: 'sun', group: 'Settings' },
  { id: 'export', label: 'Export as Markdown', icon: 'download', group: 'Settings' },
];

// A flat list with no `group` — every item renders in one ungrouped section.
const FLAT_ITEMS = [
  { id: 'opus', label: 'Claude Opus 4.8', icon: 'sparkles', description: 'Most capable' },
  { id: 'sonnet', label: 'Claude Sonnet 4.5', icon: 'zap', description: 'Fast and balanced' },
  { id: 'haiku', label: 'Claude Haiku 4', icon: 'feather', description: 'Fastest, lightest' },
];

export default {
  sample: { items: MENTION_ITEMS },
  named: {
    mention: { items: MENTION_ITEMS },
    commands: { items: COMMAND_ITEMS },
    flat: { items: FLAT_ITEMS },
  },
};
