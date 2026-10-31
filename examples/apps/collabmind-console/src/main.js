// Registers every kai-* element the kit ships, then boots the console.
import '@kitn.ai/ui/web-components';
import '@kitn.ai/ui/theme.tokens.css';
import './styles.css';
import { $, esc, state, loadSpecs, loadLive, onLive, bindToasts, STATUS } from './lib.js';
import { renderOverview } from './overview.js';
import { renderExplorer } from './explorer.js';
import { renderChat } from './chat.js';
import { renderConnections } from './connections.js';

// Every tag the views place. Registration is async, so properties set before upgrade
// are lost: wait until each one is defined before rendering anything.
const TAGS = [
  'kai-nav', 'kai-toast-region', 'kai-notice', 'kai-status', 'kai-badge', 'kai-card', 'kai-button', 'kai-progress-bar',
  'kai-row', 'kai-row-group', 'kai-code-block', 'kai-skeleton', 'kai-resizable', 'kai-resizable-item', 'kai-search',
  'kai-segmented', 'kai-tabs', 'kai-file-tree', 'kai-input', 'kai-select', 'kai-switch', 'kai-markdown', 'kai-kbd',
  'kai-empty', 'kai-text-shimmer', 'kai-thread', 'kai-prompt-input', 'kai-conversations', 'kai-model-switcher',
  'kai-thinking-bar', 'kai-settings-group', 'kai-setting-item',
];

const dark = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => document.documentElement.classList.toggle('dark', dark.matches);
dark.addEventListener('change', applyTheme);
applyTheme();

const VIEWS = { overview: renderOverview, chat: renderChat, explore: renderExplorer, connections: renderConnections };
let current = '';

function route() {
  const [, tab, ...rest] = (location.hash || '#/overview').split('/');
  const name = VIEWS[tab] ? tab : 'overview';
  const nav = $('#nav');
  nav.value = name;
  const view = $('#view');
  if (name !== current) { view.replaceChildren(); current = name; }
  VIEWS[name](view, decodeURIComponent(rest.join('/')));
}

function renderNav() {
  const d = state.derived;
  $('#nav').items = [
    { id: 'overview', label: 'Overview', icon: 'home', badge: d?.alerts.length ? String(d.alerts.length) : undefined },
    { id: 'chat', label: 'Chat', icon: 'message-square' },
    { id: 'explore', label: 'API explorer', icon: 'search', meta: `${state.ops.length}` },
    { id: 'connections', label: 'Connections', icon: 'settings' },
  ];
  $('#railFoot').innerHTML = state.services.map((s) => `<div class="rail-svc"><kai-status status="${d ? STATUS[d.svc[s.id].level] : 'offline'}" size="sm"></kai-status><span><strong>${esc(s.name)}</strong><small>${esc(d ? d.svc[s.id].short : 'checking…')}</small></span></div>`).join('');
}

async function boot() {
  await Promise.all(TAGS.map((t) => customElements.whenDefined(t)));
  bindToasts(document.querySelector('kai-toast-region'));
  $('#nav').addEventListener('kai-nav-select', (e) => { location.hash = `#/${e.detail.id}`; });
  await loadSpecs();
  renderNav();
  onLive(renderNav);
  window.addEventListener('hashchange', route);
  route();
  loadLive();
  setInterval(loadLive, 60000);
}

boot().catch((e) => {
  $('#view').innerHTML = `<div class="pad"><kai-notice severity="error">The console could not start: ${e.message}. Check that the wrapper (server/server.mjs) is running.</kai-notice></div>`;
});
