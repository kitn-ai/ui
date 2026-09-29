import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import { playwright } from '@vitest/browser-playwright';

// SEPARATE browser config — deliberately NOT the root vitest.config.ts.
//
// The `unit` project is jsdom, which has NO LAYOUT: every `getBoundingClientRect`
// is zeros, `window.innerHeight` is a constant, and `overflow` does nothing. That is
// exactly the right environment for "does this handler fire", and the wrong one for
// "does this box fit inside the window" — the class of claim that produced a menu
// hanging 10.5px past the bottom edge while a jsdom assertion on the mechanism's
// SHAPE stayed green. Only a browser settles a box against a viewport, so the guard
// for that lives here, on its own config for the same reason `vitest.react.config.ts`
// exists: a different runner, not a different assertion style.
//
// `page.viewport(w, h)` (from `vitest/browser`) is why this is a vitest project rather
// than a Playwright spec: the same suite measures SEVERAL viewport heights, which the
// Playwright configs in `config/playwright/` pin per PROJECT at config level.
//
// It drives `src/`, so it needs no build — unlike the `bare` Playwright projects,
// whose globalSetup refuses to run against a stale `dist/kai.es.js`.
//
// Run: `npm run test:containment` inside packages/ui.
export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    name: 'browser',
    globals: true,
    include: ['tests/browser/**/*.browser.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
