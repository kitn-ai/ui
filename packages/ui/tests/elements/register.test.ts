// Statically import the registration implementation FIRST. register.ts is now
// SSR-import-safe: in a DOM context (jsdom HAS window) it registers the kai-*
// elements via a gated dynamic `import('./register-impl')`, so registration
// completes on a microtask AFTER the entry imports — not synchronously. Pulling
// register-impl in statically here both (a) runs the registration during the
// test file's import phase and (b) means vitest transforms the 44 element
// modules up front rather than on-demand inside the test body (which, under
// full-suite parallel contention, can exceed the test timeout).
import '../../src/elements/register-impl';
// Import the public entry too, to assert it loads without throwing (its gated
// dynamic import is a no-op re-resolve once register-impl is already in cache).
import '../../src/elements/register';

test('all three custom elements are defined', async () => {
  // whenDefined mirrors how the React runtime waits for the async upgrade.
  await Promise.all([
    customElements.whenDefined('kai-chat'),
    customElements.whenDefined('kai-conversations'),
    customElements.whenDefined('kai-prompt-input'),
  ]);
  expect(customElements.get('kai-chat')).toBeTruthy();
  expect(customElements.get('kai-conversations')).toBeTruthy();
  expect(customElements.get('kai-prompt-input')).toBeTruthy();
});
