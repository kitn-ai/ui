import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshot-artifact config: runs any `*.shot.spec.ts` against the REAL
 * Storybook-rendered elements to capture PNGs for visual review (NOT assertions).
 * Self-contained: starts Storybook on :6006 (reusing a running one).
 * Run: `npx playwright test --config playwright.shot.config.ts`
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /\.shot\.spec\.ts$/,
  fullyParallel: false,
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
