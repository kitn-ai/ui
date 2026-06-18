// Register the kit's custom elements as a SIDE EFFECT *before* Vue mounts.
// This MUST happen before createApp().mount(): Vue sets the [groups]/[conversations]/
// [messages]/… DOM properties when it stamps the `<kc-*>` tags, so the elements
// have to be defined (upgraded) by then — otherwise the property writes hit a plain,
// not-yet-upgraded element and are clobbered by the element's empty defaults on
// upgrade → the sidebar/chat render BLANK.
import '@kitn.ai/ui/elements';
import '@kitn.ai/ui/theme.css';

import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
