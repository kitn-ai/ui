// React-test setup: registers the kitn custom elements (from the prebuilt
// bundle, via the alias in vitest.react.config.ts) once for the whole suite,
// and pulls in jest-dom matchers.
import '@testing-library/jest-dom/vitest';
import '@kitn.ai/ui/elements';

// jsdom does not implement element scrolling. The real <kai-chat> element runs
// its stick-to-bottom primitive on mount (requestAnimationFrame → scrollTo),
// which otherwise throws "Not implemented" asynchronously during teardown and
// dirties the test output. Stub the scroll APIs to no-ops so rendering a live
// element stays pristine.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
