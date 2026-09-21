import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/postcss';
import { resolve } from 'node:path';

// The two prebuilt dev-tool pages the CLI serves: the construct builder and the
// standalone theme studio. They are built HERE, into this package's dist, because
// serving them is the CLI's job -- a consumer who only renders chat must not carry
// 600 KB of dev pages. The SOURCES stay in packages/ui/apps, for the same reason the
// MCP's do (see config/vite/node.ts): the docs site imports
// `packages/ui/apps/theme-studio/ThemeStudio` by relative path.
//
// base './' on both, because dev.ts serves each from an arbitrary port: the builder at
// the root, the theme studio under /theme-studio/.
//
// Each page has its own vite `root`, which is why these are two INVOCATIONS of one
// config rather than one build.
const UI_PKG = resolve(__dirname, '../../../ui');
const KAI_PKG = resolve(__dirname, '../..');

interface Page {
  /** App root, relative to packages/ui. */
  root: string;
  /** Output directory, relative to this package. */
  outDir: string;
  external?: string[];
  paths?: Record<string, string>;
}

const TARGETS: Record<string, Page> = {
  builder: {
    root: 'apps/builder',
    outDir: 'dist/builder-page',
  },
  // The theme studio is iframed by the builder page. The kai-* bundle is NOT
  // re-bundled into it: the one dynamic `import('@kitn.ai/ui/web-components')` is
  // external and rewritten to the /theme-studio/kit/kai.es.js route, which dev.ts maps
  // onto the kit package's own dist/ -- zero duplication, and this build stays
  // ordering-independent of the kit's web-components build.
  'theme-studio': {
    root: 'apps/theme-studio',
    outDir: 'dist/theme-studio',
    external: ['@kitn.ai/ui/web-components'],
    paths: { '@kitn.ai/ui/web-components': '/theme-studio/kit/kai.es.js' },
  },
};

const requested = process.env.KAI_BUILD ?? '';
if (!Object.hasOwn(TARGETS, requested)) {
  throw new Error(
    `config/vite/page.ts: KAI_BUILD must be one of [${Object.keys(TARGETS).join(', ')}], got ${JSON.stringify(process.env.KAI_BUILD)}`,
  );
}
const page = TARGETS[requested];

export default defineConfig({
  root: resolve(UI_PKG, page.root),
  base: './',
  plugins: [solid()],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: resolve(KAI_PKG, page.outDir),
    // Each page owns its own subdirectory, so this clobbers only itself.
    emptyOutDir: true,
    ...(page.external
      ? { rollupOptions: { external: page.external, output: { paths: page.paths } } }
      : {}),
  },
});
