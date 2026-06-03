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
        globals: true
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
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});
