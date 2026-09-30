// Register every kai-* element. This is the one line a CDN install rewrites.
import '@kitn.ai/ui/web-components';

const workspace = document.querySelector('kai-workspace');
const rail = document.getElementById('rail');
const search = document.getElementById('search');
const palette = document.getElementById('palette');
const cmd = document.getElementById('cmd');
const heading = document.getElementById('heading');
const status = document.getElementById('status');

// The app owns the data. Here the chat list is read once from the rail's own
// rows; in a real app it is whatever your store holds.
const chats = [...rail.querySelectorAll('kai-conversation-item')].map((el) => ({
  id: el.getAttribute('conversation-id'),
  label: el.textContent.trim(),
  // The element matches a query against label and description alike.
  description: el.closest('details')?.querySelector('summary').textContent.trim() ?? 'Recents',
}));

// Selection is app state too: the rail reports it, the app decides what it means.
function openChat(id) {
  rail.activeId = id;
  heading.textContent = chats.find((c) => c.id === id)?.label ?? '';
  status.textContent = 'Your chat goes here.';
}
rail.addEventListener('kai-conversation-select', (e) => openChat(e.detail.id));

// kai-* events do not bubble, so each control gets its own listener. The
// rail's own buttons and rows only report; what they do is decided here.
document.getElementById('collapse').addEventListener('kai-click', () => workspace.collapseAside('start'));
for (const row of document.querySelectorAll('#actions kai-row')) {
  row.addEventListener('kai-click', () => {
    heading.textContent = row.textContent.trim();
    status.textContent = `The app handles "${row.id}" here.`;
  });
}

// The palette. Items are set as a property, and every change assigns a NEW
// array: the same array set back again would not re-render.
const show = (items) => { cmd.items = items; };
function openPalette() {
  show(chats);
  palette.show();
  // A shadow-DOM input cannot autofocus, so the element is asked to.
  requestAnimationFrame(() => cmd.focus());
}
search.addEventListener('kai-click', openPalette);
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
  }
});

// The element reports each keystroke. It narrows the list itself, so this is
// where an app that searches elsewhere (message text, a server) swaps in its results.
cmd.addEventListener('kai-query-change', (e) => {
  const q = e.detail.value.trim().toLowerCase();
  show(chats.filter((c) => `${c.label} ${c.description}`.toLowerCase().includes(q)));
});
cmd.addEventListener('kai-select', (e) => {
  openChat(e.detail.id);
  palette.hide();
});

// Escape closes the dialog itself; the app sends focus back to where it started.
palette.addEventListener('kai-open-change', (e) => {
  if (!e.detail.open) search.focus();
});
