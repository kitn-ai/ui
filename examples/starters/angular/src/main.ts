// Registers only the kai-* elements this app places: one dynamic import per entry, so each
// one is its own chunk and the entry bundle stays small. Add a line when you place another
// <kai-*> tag; the whenDefined gate below is what waits for the registration to land.
void import('@kitn.ai/ui/web-components/resizable');
void import('@kitn.ai/ui/web-components/conversation-list');
void import('@kitn.ai/ui/web-components/thread');
void import('@kitn.ai/ui/web-components/prompt-input');
void import('@kitn.ai/ui/web-components/button');
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// The dynamic imports above register their elements one microtask after this module
// runs, so the wait below is load-bearing: Angular sets array/object DOM properties ([conversations], [messages], [triggers],
// …) the moment it stamps a
// <kai-*> tag; if that happens before the element upgrades, the property write hits
// a plain, not-yet-upgraded node and is clobbered by the element's empty defaults on
// upgrade. Raw web-component consumers have no upgrade-race guard (unlike the React
// wrappers), so we gate bootstrap on `whenDefined` for every tag we use — Angular
// then binds against UPGRADED elements. Attributes survive upgrade; properties do not.
const TAGS = ['kai-resizable', 'kai-resizable-item', 'kai-conversations', 'kai-thread', 'kai-prompt-input', 'kai-button'];

// Nothing ties `TAGS` to the entry imports above: a tag listed here with no import
// never defines, the wait below never settles, and the app renders nothing at all
// with no error to show for it. Name the missing tags instead of hanging.
const unregistered = TAGS.filter((tag) => !customElements.get(tag));
if (unregistered.length > 0)
  throw new Error(`no entry import above registers: ${unregistered.join(', ')}`);

Promise.all(TAGS.map((t) => customElements.whenDefined(t)))
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
