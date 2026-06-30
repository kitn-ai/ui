// Sample data for <kai-menu> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// kai-menu is driven by an `items` tree — set in JavaScript, never as an HTML
// attribute. Items can be plain actions (id/label/icon/shortcut), a heading, a
// separator, a checkbox (presence of `checked`), or a submenu (nested `items`).
//
// `sample` = default items for the Playground + a bare <Example> (no data="")
// `named`  = focused item sets a <Example data="…"> opts into

// An item is an action (id/label, optional icon/shortcut), a `heading`, a
// `separator`, a checkbox (presence of `checked`), or a submenu (nested `items`).

// The "+" composer menu from the design: a heading, two plain actions with an
// icon + shortcut, a Skills submenu, a separator, a checkbox, and a disabled row.
const PLUS_MENU = [
  { heading: true, label: 'Actions' },
  { id: 'add-files', label: 'Add files or photos', icon: 'paperclip', shortcut: '⌘U' },
  { id: 'add-github', label: 'Add from GitHub', icon: 'github' },
  {
    label: 'Skills',
    icon: 'sparkles',
    items: [
      { id: 'skill-creator', label: 'skill-creator', icon: 'sparkles' },
      { id: 'manage-skills', label: 'Manage skills', icon: 'settings' },
      { id: 'add-skill', label: 'Add skill', icon: 'file-text' },
    ],
  },
  { separator: true },
  { id: 'web-search', label: 'Web search', icon: 'globe', checked: true },
  { id: 'coming-soon', label: 'Coming soon', disabled: true },
];

// A flat action menu — what a row-level "more" (⋯) button opens.
const ROW_ACTIONS = [
  { id: 'copy', label: 'Copy', icon: 'copy', shortcut: '⌘C' },
  { id: 'rename', label: 'Rename', icon: 'pencil' },
  { id: 'duplicate', label: 'Duplicate', icon: 'files' },
  { separator: true },
  { id: 'delete', label: 'Delete', icon: 'trash-2' },
];

// A select-style menu: pick one reasoning effort. Pairs with a trigger that
// shows the current value (trigger-label) + a chevron (trigger-icon-trailing).
const EFFORT_OPTIONS = [
  { id: 'low', label: 'Low', icon: 'gauge' },
  { id: 'medium', label: 'Medium', icon: 'gauge' },
  { id: 'high', label: 'High', icon: 'gauge' },
];

export default {
  sample: { items: PLUS_MENU },
  named: {
    plus: { items: PLUS_MENU },
    actions: { items: ROW_ACTIONS },
    effort: { items: EFFORT_OPTIONS },
  },
};
