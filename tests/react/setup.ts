// React-test setup: registers the kitn custom elements (from the prebuilt
// bundle, via the alias in vitest.react.config.ts) once for the whole suite,
// and pulls in jest-dom matchers.
import '@testing-library/jest-dom/vitest';
import '@kitn.ai/chat/elements';
