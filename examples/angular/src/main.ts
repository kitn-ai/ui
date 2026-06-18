import 'zone.js';
// Register the kit's custom elements as a SIDE EFFECT *before* Angular bootstraps.
// This MUST happen before the app renders: Angular sets the [groups]/[conversations]/
// [messages]/… DOM properties when it stamps the `<kc-*>` tags, so the elements
// have to be defined (upgraded) by then — otherwise the property writes hit a plain,
// not-yet-upgraded element and are clobbered by the element's empty defaults on upgrade.
import '@kitn.ai/ui/elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
