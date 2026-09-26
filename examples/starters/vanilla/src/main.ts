// Registers only the kai-* elements this app places: one dynamic import per entry, so each
// one is its own chunk and the entry bundle stays small. Add a line when you place another
// <kai-*> tag; the whenDefined gate below is what waits for the registration to land.
void import('@kitn.ai/ui/web-components/resizable');
void import('@kitn.ai/ui/web-components/conversation-list');
void import('@kitn.ai/ui/web-components/thread');
void import('@kitn.ai/ui/web-components/prompt-input');
void import('@kitn.ai/ui/web-components/button');
import '@kitn.ai/ui/theme.tokens.css'; // plain --color-* tokens for the shell
import './index.css';
import { readOpenAIStream } from '@kitn.ai/ui/wire';
import { createStore } from './state';
import { createView } from './view';
import { mockResponse, newId } from './chat-data';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

// The dynamic imports at the top register their elements one microtask after this
// module runs, so a property set before upgrade is lost (gotcha 1: the upgrade race),
// and raw web-component consumers have no upgrade-race guard (unlike the React
// wrappers). That makes the wait below load-bearing: it holds until every tag we use
// is defined, so every element createView() creates is already upgraded and our
// property sets land.
const TAGS = ['kai-resizable', 'kai-resizable-item', 'kai-conversations', 'kai-thread', 'kai-prompt-input', 'kai-button'];

async function boot(host: HTMLElement): Promise<void> {
  // Nothing ties `TAGS` to the entry imports at the top: a tag listed here with no
  // import never defines, the wait on the next line never settles, and the app
  // renders a blank page with no error to show for it. Say so instead of hanging.
  const unregistered = TAGS.filter((tag) => !customElements.get(tag));
  if (unregistered.length > 0)
    throw new Error(`no entry import above registers: ${unregistered.join(', ')}`);

  await Promise.all(TAGS.map((tag) => customElements.whenDefined(tag)));

  const store = createStore();

  // Append the user turn, then stream the (mock) assistant reply.
  async function send(raw: string): Promise<void> {
    const text = raw.trim();
    if (!text) return;
    store.append({ id: newId(), role: 'user', parts: [{ type: 'text', text }] });
    const stream = store.streamAssistant();
    // NO BACKEND AND NO PROVIDER. mockResponse() yields canned SSE frames that go
    // through the SAME reader a real model's response would, so this preview
    // exercises the real path. To go live, only this one expression changes —
    // `mockResponse(text)` becomes a POST to your route, with
    // toOpenAIMessages(store.state.messages) as the body. The line below stays.
    await readOpenAIStream(mockResponse(text), stream);
    stream.done();
  }

  const view = createView(host, {
    onConversationSelect: (id) => store.selectConversation(id),
    onNewChat: () => store.newChat(),
    onToggleSidebar: () => store.toggleCollapsed(),
    onShowSidebar: () => store.setCollapsed(false),
    onToggleTheme: () => store.toggleTheme(),
    onSubmit: (value) => void send(value),
    onSuggestion: (value) => void send(value),
  });

  store.subscribe(() => view.render(store.state));
  view.render(store.state);
}

void boot(root);
