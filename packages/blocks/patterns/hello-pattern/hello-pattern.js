// Register every kai-* element. A pattern imports the kit once, at the top;
// this is the one line a CDN install rewrites to a pinned URL.
import '@kitn.ai/ui/web-components';

const button = document.getElementById('hello');
const greeting = document.getElementById('greeting');

// kai-* events do not bubble, so the listener goes on the element itself.
// kai-click carries no payload, which is why there is nothing to read here.
button?.addEventListener('kai-click', () => {
  if (greeting) greeting.textContent = 'Hello from a pattern.';
});
