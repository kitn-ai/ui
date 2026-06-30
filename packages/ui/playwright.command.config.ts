import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone IVP config for the `<kai-command>` grouped filterable
 * command/mention palette. Drives the REAL MentionPicker story rendered by
 * Storybook (same-origin) in Chromium with native pointer/keyboard events —
 * proving grouping, search filtering, ArrowDown/Up+Enter keyboard nav, and
 * kai-select / kai-query-change CustomEvent emission that jsdom cannot simulate
 * inside a Shadow DOM.
 *
 * Self-contained: starts Storybook on :6006 (reusing an already-running one).
 * Run: `npx playwright test --config playwright.command.config.ts`
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /command-ivp\.spec\.ts/,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Storybook compiles each story on first load (Vite on-demand). A generous
  // ceiling tolerates the cold compile while returning quickly on warm runs.
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
