import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import { playwright } from '@vitest/browser-playwright';

// The HOVER-CONTRAST probe's own browser config, split off vitest.browser.config.ts.
//
// It hovers every control of ~40 fixtures in real Chromium, in both colour schemes, and takes
// 4-6 minutes. Inside the `browser` job (already ~7.4 min against a 15 min cap) that made a
// timeout a matter of runner load, so it runs as its own required job, `hover-contrast`, in
// parallel, one matrix leg per scheme. `scripts/run-browser-suites.mjs` skips it by name (its
// OWN_JOB map) so the browser job does not run it a second time, while its config sweep still
// sees a script naming this file.
//
// HOVER_SCHEME = light | dark picks the scheme (default: both). A compile-time constant, since the
// browser cannot read process.env. Drives `src/`; needs `compiled.css` (build:css) and no kit build.
//
// Run: `npm run test:hover-contrast` inside packages/ui (HOVER_SCHEME=dark to run one).
export default defineConfig({
  plugins: [solidPlugin()],
  define: { __HOVER_SCHEMES__: JSON.stringify(process.env.HOVER_SCHEME ?? 'light,dark') },
  test: {
    name: 'hover-contrast',
    globals: true,
    include: ['tests/hover/**/*.browser.test.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
