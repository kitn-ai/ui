import { defineConfig, devices } from '@playwright/test';

/** Screenshot harness for the kai-prompt-input swap (textarea → composer).
 *  Run: SHOT=baseline|after npx playwright test --config playwright.promptinput.config.ts */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /promptinput-(shot|behavior|pills)\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  expect: { timeout: 30_000 },
  use: { baseURL: 'http://localhost:6006', trace: 'off' },
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
