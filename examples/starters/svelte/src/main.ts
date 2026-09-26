import { mount } from 'svelte';
// Registers only the kai-* elements this app places: one dynamic import per entry, so each
// one is its own chunk and the entry bundle stays small. Add a line when you place another
// <kai-*> tag; the whenDefined gate below is what waits for the registration to land.
void import('@kitn.ai/ui/web-components/resizable');
void import('@kitn.ai/ui/web-components/conversation-list');
void import('@kitn.ai/ui/web-components/thread');
void import('@kitn.ai/ui/web-components/prompt-input');
void import('@kitn.ai/ui/web-components/button');
import '@kitn.ai/ui/theme.tokens.css'; // plain --color-* tokens for the shell (NOT the tailwind source)
import './index.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Root element not found');

// The dynamic imports above register their elements one microtask after this module
// runs, so the gate below is load-bearing: it waits for the tags we use before
// mounting, and Svelte's `bind:this` + `$effect` property writes then land on
// UPGRADED elements. Raw web-component consumers have no upgrade-race guard (unlike
// the React wrappers), so a property set before upgrade is lost and static seed data
// never re-applies. Attributes survive upgrade; array/object properties do not.
const TAGS = ['kai-resizable', 'kai-resizable-item', 'kai-conversations', 'kai-thread', 'kai-prompt-input', 'kai-button'];

// Nothing ties `TAGS` to the entry imports above: a tag listed here with no import
// never defines, the wait below never settles, and the app mounts nothing at all
// with no error to show for it. Name the missing tags instead of hanging.
const unregistered = TAGS.filter((tag) => !customElements.get(tag));
if (unregistered.length > 0)
  throw new Error(`no entry import above registers: ${unregistered.join(', ')}`);

Promise.all(TAGS.map((t) => customElements.whenDefined(t))).then(() => {
  mount(App, { target });
});
