import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone IVP config for the cascading-menu primitives (Dropdown + submenu,
 * separator, checkbox item, label). Drives the REAL story rendered by Storybook
 * (same-origin) in Chromium with native pointer/keyboard events — proving the
 * portal positioning, submenu open/close, and checkbox toggle that jsdom cannot.
 *
 * Self-contained: starts Storybook on :6006 (reusing an already-running one).
 * Run: `npx playwright test --config playwright.menu.config.ts`
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /menu-ivp\.spec\.ts/,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Storybook compiles each story on first load (Vite on-demand). The first test
  // to hit a story can exceed the default 5s; a generous ceiling tolerates the
  // cold compile while returning as soon as the assertion passes on warm runs.
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://localhost:6006',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--disable-dev-shm-usage', '--no-sandbox'] },
      },
    },
  ],
  webServer: {
    command: 'npm run storybook -- --ci --quiet',
    url: 'http://localhost:6006/iframe.html',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
