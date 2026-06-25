import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Makes `*.css?raw` and `*.css?inline` imports return real file content in vitest.
// Vitest has a built-in "vitest:css-empty-post" (enforce: post) that converts all
// CSS imports to `export default ""` in non-browser environments.  We bypass it by:
//   1. Adding css.include for compiled.css so vitest skips its CSS interception for it.
//   2. Adding this post-enforce plugin that reads the file and injects the raw content.
function cssRawPlugin() {
  return {
    name: 'css-raw-for-vitest',
    enforce: 'post' as const,
    transform(_code: string, id: string) {
      if (/\.css\?(raw|inline)(&|$)/.test(id)) {
        const filePath = id.replace(/\?(raw|inline).*$/, '');
        const content = readFileSync(filePath, 'utf-8');
        return { code: `export default ${JSON.stringify(content)};`, map: null };
      }
    },
  };
}

// Two Vitest projects:
//   • (default) jsdom unit tests
//   • `storybook` — every *.stories.tsx runs as a browser test (play functions,
//     smoke render, and axe a11y) via @storybook/addon-vitest + Playwright.
//
// Run them:
//   npm test               # all projects (unit + storybook)
//   npm run test:storybook # stories-as-tests only (vitest run --project=storybook)
//
// a11y-in-test: @storybook/addon-a11y is registered in .storybook/main.ts and
// the default `a11y.test` is set in .storybook/preview.ts (currently 'error' =
// a11y violations FAIL the run; 'todo' would make them non-failing warnings).
//
// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [cssRawPlugin(), solidPlugin()],
  test: {
    // Allow ?raw / ?inline imports of compiled.css to pass through vitest's CSS interception.
    // vitest:css-disable and vitest:css-empty-post skip files matched by css.include.
    css: {
      include: [/compiled\.css/],
    },
    projects: [{
      extends: true,
      test: {
        environment: 'jsdom',
        globals: true,
        // React wrapper tests run under @vitejs/plugin-react via the separate
        // vitest.react.config.ts (`npm run test:react`). They MUST be excluded
        // here, or the global Solid JSX transform would mis-compile their React
        // JSX ("Comp is not a function").
        // `.claude/**` holds throwaway agent git worktrees (full repo copies);
        // their duplicated test files must never be collected by the main run.
        // `tests/e2e/**` are standalone Playwright specs (`npm run test:e2e`), NOT
        // vitest tests — collecting them throws "test() called here" under vitest.
        exclude: ['**/node_modules/**', '**/.claude/**', 'tests/react/**', '**/tests/react/**', 'tests/e2e/**', '**/tests/e2e/**']
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        // Browser-runner CI flake mitigation: under parallel load the Vite dev
        // server occasionally drops a dynamic module ("Failed to fetch
        // dynamically imported module") or a chromium instance blips. These are
        // transient — retry the story before failing the run. Scoped to this
        // project only; the jsdom unit project stays retry-free (deterministic).
        retry: 2,
        // The deeper flake is a WHOLE-RUNNER crash, not a per-test failure: the
        // single chromium instance gets overwhelmed running ~118 story files in
        // parallel and the connection drops mid-suite ("[birpc] rpc is closed",
        // "Browser connection was closed") — `retry` can't recover that. Run the
        // story files SEQUENTIALLY so only one file's worth of render + play +
        // axe work hits the browser at a time. Slower, but it keeps chromium
        // under its memory/concurrency ceiling on GitHub runners. Scoped to this
        // project; the jsdom unit project keeps its default parallelism.
        fileParallelism: false,
        // NOTE: we deliberately do NOT set a custom `setupFiles` with
        // `setProjectAnnotations` here. Since Storybook 10.3, @storybook/addon-vitest
        // auto-provisions the project annotations from `.storybook/main.ts` +
        // `.storybook/preview` via a virtual module — and that path is the only one
        // that also wires the SolidJS renderer's `renderToCanvas`. Supplying our own
        // `setProjectAnnotations` (which the framework package can't fully reconstruct)
        // breaks rendering. The a11y addon is registered in `main.ts` addons, so its
        // annotations are picked up by the same auto-provisioning — axe runs per-story.
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium',
            // CI hardening: chromium crashes ("Browser connection was closed /
            // rpc is closed") partway through the story suite when it exhausts the
            // tiny default /dev/shm on GitHub runners. Route shared memory to /tmp
            // and disable the sandbox. No-op locally; required on CI.
            launchOptions: { args: ['--disable-dev-shm-usage', '--no-sandbox'] },
          }]
        }
      }
    }]
  }
});
