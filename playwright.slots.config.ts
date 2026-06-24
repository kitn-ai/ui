import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone IVP config for the SPIKE <kai-chat> slotted-shell composition slots. Drives the
 * REAL element rendered by Storybook (same-origin) in Chromium, asserting that
 * consumer light-DOM is assigned to the shadow slots and screenshotting each
 * composition pattern (inject / replace / data-flow wall).
 *
 * Self-contained: starts Storybook on :6006 (reusing an already-running one).
 * Run: `npx playwright test --config playwright.slots.config.ts`
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /(chat|promptinput)-slots-ivp\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
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
