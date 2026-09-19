import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// AMENDED 2026-09-18: a fifth project joined (the geometry guard, port 6214). The
// counts above were measured at four; read the real set from `lint-gate-parity.mjs --list`.

// NOT `__dirname`. The vite configs next door use it and get away with it
// because Vite transpiles a config to CJS before running it; Playwright's TS
// loader keeps this an ES module (packages/ui is "type": "module"), so
// `__dirname` is undefined and the config throws before a single test runs.
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const CHROMIUM = {
  ...devices['Desktop Chrome'],
  launchOptions: { args: ['--disable-dev-shm-usage', '--no-sandbox'] },
};

/**
 * The bare harness server, one instance per port.
 *
 * `focus-ring-harness-server.mjs` reads `FOCUS_RING_PORT` and defaults to 6210,
 * which is why the deleted focus-ring config passed no `env` at all. It is
 * passed explicitly for all three here so the port a project waits on and the
 * port its server binds are one literal rather than two.
 */
const harness = (port: number) => ({
  // cwd is REQUIRED: Playwright defaults webServer.cwd to the config file's own
  // directory, and tests/e2e/ is not under config/playwright/.
  cwd: PKG,
  command: 'node tests/e2e/focus-ring-harness-server.mjs',
  url: `http://localhost:${port}/`,
  reuseExistingServer: !process.env.CI,
  timeout: 30_000,
  env: { FOCUS_RING_PORT: String(port) },
});

export default defineConfig({
  // Relative to THIS FILE: Playwright resolves testDir and globalSetup against
  // the config's own directory, not the cwd.
  testDir: '../../tests/e2e',
  globalSetup: '../../tests/e2e/hover-card-global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // The three paint guards each hardcoded `'list'`; hover-card already spelled
  // this conditional. Config-wide now, matching config/playwright/storybook.config.ts.
  // Only CI log formatting changes -- but it changes for three more REQUIRED
  // gates, not for nothing: all four projects here are steps in the `browser`
  // leg. An earlier note here said none of the three was a CI gate. That was
  // wrong; they have been gates since the focus-ring round.
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {
      /**
       * Standalone config for the focus-ring PAINT guard (`focus-ring-paints.spec.ts`).
       *
       * Deliberately does NOT use Storybook as its server, unlike every other IVP
       * config in this package. Storybook loads Tailwind at DOCUMENT level, which
       * registers the `--tw-*` custom properties globally and makes shadow-root rings
       * paint — the precise condition that hid this defect. This suite runs against a
       * bare harness that serves only the built element bundle, which is what a real
       * consumer app looks like, and the spec asserts that absence before it measures
       * anything.
       *
       * Needs a build first (`nx build ui`) — it drives `dist/`, not source.
       * Run: `npm run test:focus-ring` inside packages/ui.
       *
       * NEWLY TRUE after the move: "needs a build first" is no longer only advice.
       * The config-wide globalSetup refuses to run against a stale dist/.
       */
      name: 'focus-ring',
      testMatch: /focus-ring-paints\.spec\.ts/,
      timeout: 180_000,
      use: {
        ...CHROMIUM,
        baseURL: 'http://localhost:6210',
        trace: 'off',
        // After the spread on purpose. Unlike the two audio projects in
        // storybook.config.ts, this viewport was on the PROJECT `use` in the
        // deleted config, so it really was in effect (measured: 1100x900 @ 1x).
        viewport: { width: 1100, height: 900 },
      },
    },
    {
      /**
       * Standalone config for the user-message TEXT color guard
       * (`message-text-token.spec.ts`).
       *
       * Reuses `focus-ring-harness-server.mjs` verbatim: a bare page that loads only
       * the built `dist/kai.es.js` element bundle with NO document-level Tailwind, on
       * its own port. That is exactly the condition this spec needs too — the same
       * reason `focus-ring-paints.spec.ts` cannot run under Storybook applies here:
       * this guard is about what CSS CUSTOM PROPERTIES resolve to inside a shadow
       * root for a real consumer (who never loads Tailwind at document level), not
       * about Storybook's own environment.
       *
       * Needs a build first (`nx build ui`) — it drives `dist/`, not source.
       * Run: `npm run test:message-text-token` inside packages/ui.
       *
       * NEWLY TRUE after the move: the config-wide globalSetup enforces that build.
       */
      name: 'message-text-token',
      testMatch: /message-text-token\.spec\.ts/,
      timeout: 60_000,
      use: {
        ...CHROMIUM,
        baseURL: 'http://localhost:6211',
        trace: 'off',
        // Measured in effect on main: 900x700 @ 1x.
        viewport: { width: 900, height: 700 },
      },
    },
    {
      /**
       * Standalone config for the content/chrome brand-bleed guard
       * (`content-brand-bleed.spec.ts`) — the sweep that closed reasoning.tsx,
       * loader.tsx (terminal + loading-dots), prompt-suggestion.tsx, file-tree.tsx,
       * and source.tsx's hardcoded `text-primary` (the same class of defect as the
       * user-message-text fix in `message-text-token.spec.ts`).
       *
       * Reuses `focus-ring-harness-server.mjs` verbatim, own port: a bare page that
       * loads only the built `dist/kai.es.js` bundle with NO document-level
       * Tailwind, because only the real cascade proves what a branded
       * `--kai-color-primary` resolves to inside a shadow root — same reasoning as
       * every other guard in this family.
       *
       * Needs a build first (`nx build ui`) — it drives `dist/`, not source.
       * Run: `npm run test:content-brand-bleed` inside packages/ui.
       *
       * NEWLY TRUE after the move: the config-wide globalSetup enforces that build.
       */
      name: 'content-brand-bleed',
      testMatch: /content-brand-bleed\.spec\.ts/,
      timeout: 60_000,
      use: {
        ...CHROMIUM,
        baseURL: 'http://localhost:6212',
        trace: 'off',
        // Measured in effect on main: 900x800 @ 1x.
        viewport: { width: 900, height: 800 },
      },
    },
    {
            /**
       * Geometry/shape/elevation tokens through the real cascade (does a consumer's
       * `--kai-density` actually move geometry inside a shadow root?). Bare harness,
       * built bundle, own port. Needs a build first.
       * Run: `npm run test:geometry-token`.
       */
      name: 'geometry-token',
      testMatch: /geometry-token\.spec\.ts/,
      timeout: 60_000,
      use: {
        ...CHROMIUM,
        baseURL: 'http://localhost:6214',
        trace: 'off',
        viewport: { width: 900, height: 700 },
      },
    },
    {
      /**
       * Standalone config for the hover-card TAB-STOP + focus-open matrix.
       *
       * Why it exists at all: jsdom has no tab-order engine, so it can never press
       * Tab, and two defects in this component slipped through unit tests that
       * verified a keyboard claim with a non-keyboard mechanism (a synthetic
       * `focusIn`, then a programmatic `.focus()`). This suite presses the real key.
       *
       * Deliberately self-contained and Storybook-free: it serves the built
       * `dist/kai.es.js` and one static fixture, so it exercises the SHIPPED bundle
       * and shares no setup with the other e2e configs.
       *
       * `globalSetup` ENFORCES that the bundle is fresh rather than asking politely in
       * a comment. Driving `dist` is the value of this suite and also its failure
       * mode: run it without rebuilding and it passes against yesterday's code — which
       * happened for real, when a deliberately broken fix produced a green run until
       * the bundle was rebuilt.
       *
       * The server is the workspace's own vite via `pnpm exec` — never bare `npx`,
       * for the hermetic-CI reason `playwright.config.ts` documents. `pnpm exec`
       * rather than a path because pnpm hoists vite to the workspace root and
       * `packages/ui/node_modules/.bin/vite` does not exist; rather than an npm
       * script so this config adds nothing to package.json that a concurrent branch
       * could conflict on.
       *
       * Port 6013: away from Storybook (6006), the remote-card host/provider
       * (6006/6007) and the docs site (4321).
       *
       * Run: `npx playwright test --config playwright.hovercard.config.ts`
       *
       * NEWLY TRUE after the move, and it contradicts two lines above:
       * `Run:` is now `npm run test:hovercard`; "shares no setup with the other e2e
       * configs" is no longer true (it shares this file and its globalSetup with the
       * three paint guards, which was the point of the move); and a `test:hovercard`
       * npm script now exists, so "adds nothing to package.json" no longer holds
       * either. It has to: `classifyCommand` in scripts/lint-gate-parity.mjs returns
       * `unknown` for `exec playwright test` without a `--config`, so the CI step
       * cannot spell `--project=hovercard` directly and must route through a script.
       * The "hermetic-CI reason `playwright.config.ts` documents" is now
       * documented in `config/playwright/cross-origin.config.ts`, which is that
       * file moved and renamed; nothing sits at the package root any more.
       *
       * No `timeout` here on purpose: the deleted config set none either, so this
       * project keeps Playwright's 30s default rather than inheriting a neighbour's.
       */
      name: 'hovercard',
      testMatch: /hover-card-tabstops\.spec\.ts$/,
      expect: { timeout: 15_000 },
      use: {
        ...CHROMIUM,
        baseURL: 'http://localhost:6013',
        trace: 'on-first-retry',
        // No viewport: the deleted config set none, so `devices['Desktop Chrome']`
        // supplies it. Measured in effect on main: 1280x720 @ 1x.
      },
    },
  ],
  webServer: [
    harness(6210),
    harness(6211),
    harness(6212),
    harness(6214),
    {
      // The workspace's own vite via pnpm exec, never bare npx, for hermetic
      // CI. pnpm exec rather than a path because pnpm hoists vite to the
      // workspace root and packages/ui/node_modules/.bin/vite does not exist.
      cwd: PKG,
      command: 'pnpm exec vite --port 6013 --strictPort',
      url: 'http://localhost:6013/tests/e2e/fixtures/hover-card-tabstops.html',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
