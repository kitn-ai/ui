// Register every kai-* element. This is the one line a CDN install rewrites
// to a pinned URL.
import '@kitn.ai/ui/web-components';

const viewer = document.getElementById('viewer');
const back = document.getElementById('back');
const forward = document.getElementById('forward');
const reload = document.getElementById('reload');
const address = document.getElementById('address');
const open = document.getElementById('open');

/** Paint the toolbar from the viewer's read-only history state. */
function sync() {
  // Disabled is a property, not an attribute toggle: the attribute form would
  // need removing by hand, and the property is what the button reads.
  back.disabled = !viewer.canGoBack;
  forward.disabled = !viewer.canGoForward;
  // `url` is the raw url exactly as it arrived, so it is fine as display text
  // and never as a link target. The read-only field shows even a refused one.
  address.value = viewer.url;
  // Only a safe url makes the open button live; it is disabled otherwise.
  open.disabled = !viewer.urlSafe;
}

// kai-* events do not bubble, so the listener goes on the element itself.
// It fires once per navigation, back and forward included.
viewer.addEventListener('kai-history-change', sync);

back.addEventListener('kai-click', () => viewer.back());
forward.addEventListener('kai-click', () => viewer.forward());
reload.addEventListener('kai-click', () => viewer.reload());

open.addEventListener('kai-click', () => {
  // Read the flag again at click time: a disabled attribute is a hint to the
  // user, not the guard. `javascript:` in a new tab would run in this origin.
  if (!viewer.urlSafe) return;
  window.open(viewer.url, '_blank', 'noopener,noreferrer');
});

document.getElementById('page-one').addEventListener('kai-click', () => viewer.navigate('https://example.com/'));
document.getElementById('page-two').addEventListener('kai-click', () => viewer.navigate('https://example.org/'));

// The host's state getters exist once the element has upgraded.
customElements.whenDefined('kai-artifact').then(sync);
