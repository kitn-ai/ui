// Register every kai-* element. A pattern imports the kit once, at the top;
// this is the one line a CDN install rewrites to a pinned URL.
import '@kitn.ai/ui/web-components';

/**
 * @typedef {'working' | 'idle' | 'done' | 'error' | 'blocked'} AgentTone
 * @typedef {{ name: string, tone: AgentTone, label?: string, pulse?: boolean, needsYou?: boolean }} Agent
 */

/** @type {Agent[]} */
const AGENTS = [
  { name: 'Planner', tone: 'working', label: 'Working', pulse: true },
  { name: 'Reviewer', tone: 'idle', label: 'Idle' },
  { name: 'Builder', tone: 'done', label: 'Done' },
  { name: 'Tester', tone: 'error', label: 'Failed' },
  { name: 'Deployer', tone: 'blocked', label: 'Blocked on you', needsYou: true },
];

// Menu items are an array, so they go on as a JS property, never an attribute.
const MENU_ITEMS = [
  { id: 'rename', label: 'Rename' },
  { id: 'pause', label: 'Pause' },
  { id: 'remove', label: 'Remove' },
];

const template = /** @type {HTMLTemplateElement} */ (document.getElementById('agent-card'));
const list = /** @type {HTMLElement} */ (document.getElementById('agents'));
const log = /** @type {HTMLElement} */ (document.getElementById('log'));

/** Build one card from the template and wire it to `agent`. */
function createAgentCard(/** @type {Agent} */ agent) {
  // importNode, not cloneNode: a clone stays in the template's inert document,
  // so its elements are never upgraded and `menu.items` below would be lost.
  const card = /** @type {HTMLElement} */ (document.importNode(template.content, true).firstElementChild);
  const row = card.querySelector('kai-row');
  const menu = card.querySelector('kai-menu');
  const status = card.querySelector('kai-status');
  const text = agent.label ?? agent.tone;

  // The dot's accessible name is the visible word beside it, so a screen
  // reader hears "Blocked on you, Deployer, Needs you" and not the colour.
  status.setAttribute('status', agent.tone);
  status.setAttribute('label', text);
  if (agent.pulse) status.setAttribute('pulse', '');
  card.dataset.tone = agent.tone;
  card.querySelector('.agent-status-label').textContent = text;
  card.querySelector('.agent-name').textContent = agent.name;
  card.querySelector('kai-badge').hidden = !agent.needsYou;
  if (agent.needsYou) card.dataset.needsAttention = '';

  menu.setAttribute('label', `More actions for ${agent.name}`);
  menu.items = MENU_ITEMS;

  // kai-* events do not bubble, so both listeners sit on their own elements.
  row.addEventListener('kai-click', () => {
    for (const other of list.children) delete other.dataset.active;
    card.dataset.active = '';
    log.textContent = `${agent.name} is focused.`;
  });
  menu.addEventListener('kai-select', (event) => {
    log.textContent = `${event.detail.id} ${agent.name}`;
  });
  return card;
}

// A property set on an element that is not defined yet is lost, so wait for
// the definitions before building the cards.
await Promise.all(['kai-row', 'kai-status', 'kai-badge', 'kai-menu'].map((tag) => customElements.whenDefined(tag)));
list.replaceChildren(...AGENTS.map(createAgentCard));
