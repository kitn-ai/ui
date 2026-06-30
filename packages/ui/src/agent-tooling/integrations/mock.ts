import type { Integration } from '../types';

/**
 * mock — the zero-config first-win.
 *
 * Not a real backend: there's no provider, no API key, no `/api` route. The
 * scaffolder special-cases `integration === 'mock'` and emits a front-end whose
 * `onSubmit` SIMULATES a streamed assistant reply CLIENT-SIDE (token-by-token,
 * a new array/object reference per chunk — honouring the messages contract).
 *
 * This lets `scaffold(useCase, integration: 'mock', framework: 'react')` run with
 * zero config so a developer sees a live, streaming chat before wiring a model.
 * Swap `integration` for a real provider (openrouter, ollama, …) when ready.
 *
 * It carries an empty `routeTemplates` on purpose: there is no server route to
 * emit. `category: 'mock'` keeps it out of the real provider/gateway/framework/
 * harness catalogs.
 */
const mock: Integration = {
  id: 'mock',
  title: 'Mock (local preview)',
  category: 'mock',
  language: 'ts',
  streamFormat: 'native',
  envVars: [],
  routeTemplates: {},
  streamMapping:
    'No backend. onSubmit streams a canned assistant reply client-side, one token at a time, reassigning messages (new array/object reference) per chunk so kai-chat re-renders. Swap integration for a real provider when ready.',
  runNote:
    'No backend or API key needed — replies stream locally for preview. Run the front-end as-is; swap `integration` for a real provider (e.g. openrouter, ollama) when ready.',
  docsSlug: 'integrations/mock',
};

export default mock;
