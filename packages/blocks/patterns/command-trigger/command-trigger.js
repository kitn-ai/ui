// Register every kai-* element. This is the one line a CDN install rewrites.
import '@kitn.ai/ui/web-components';

const trigger = document.getElementById('open-search');
const palette = document.getElementById('palette');
const cmd = document.getElementById('cmd');
const picked = document.getElementById('picked');

// The app owns the list. Replace this with whatever your store holds. `preview`
// is text the palette does not show, but the app can search.
const all = [
  { id: 'c1', label: 'Wiring the fetch route', description: 'Assistant UI', preview: 'proxy the model stream through your own route' },
  { id: 'c2', label: 'Streaming reasoning parts', description: 'Assistant UI', preview: 'append each delta to the thread' },
  { id: 'c3', label: 'Board columns', description: 'Kanban board', preview: 'split into backlog, doing, review and done' },
  { id: 'c4', label: 'Naming the export', description: 'Recents', preview: 'call it createThread' },
];

// Items are a property, and each change assigns a NEW array; setting the same
// array back would not re-render.
function openPalette() {
  cmd.items = all;
  palette.show();
  // A shadow-DOM input cannot autofocus, so the element is asked to.
  requestAnimationFrame(() => cmd.focus());
}

// kai-* events do not bubble, so the listeners go on the elements themselves.
trigger.addEventListener('kai-click', openPalette);
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); // Mod+K is the browser's own search shortcut in some browsers.
    openPalette();
  }
});

// The element reports each keystroke, and it matches label and description on its
// own. Searching text it never sees is the app's job: a result found in `preview`
// is shown with that text as its description, which is also what lets it pass
// the element's own match.
cmd.addEventListener('kai-query-change', (e) => {
  const q = e.detail.value.trim().toLowerCase();
  const has = (text) => text.toLowerCase().includes(q);
  cmd.items = all
    .filter((c) => has(c.label) || has(c.description) || has(c.preview))
    .map(({ id, label, description, preview }) => ({ id, label, description: has(label) || has(description) ? description : preview }));
});

cmd.addEventListener('kai-select', (e) => {
  picked.textContent = `Selected: ${all.find((c) => c.id === e.detail.id)?.label}`;
  palette.hide();
});

// Escape closes the dialog itself; the app sends focus back to the trigger.
palette.addEventListener('kai-open-change', (e) => {
  if (!e.detail.open) trigger.focus();
});
