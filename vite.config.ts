import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { transform } from 'esbuild';
import type { Plugin, OutputBundle, OutputChunk } from 'vite';

/**
 * Vite 6 intentionally skips minification for `build.lib` + ES format builds:
 *
 *   1. `vite:esbuild-transpile` (renderChunk): when `isEsLibBuild` it forces
 *      `minifyWhitespace: false` even when `build.minify: 'esbuild'` is set.
 *   2. `vite:terser` (renderChunk): explicitly returns null (skips) when
 *      `config.build.lib && outputOptions.format === "es"`.
 *
 * Crucially, both of these are in `buildPlugins.post`, which runs AFTER all
 * user `enforce: 'post'` plugins — so a renderChunk-based workaround will
 * have its work overwritten by `vite:esbuild-transpile`.
 *
 * The fix: use a `generateBundle` hook, which fires after ALL `renderChunk`
 * hooks (including Vite's internal ones) have completed. At that point we
 * call esbuild's `transform` with full minification on every JS chunk.
 */
function libMinifyPlugin(): Plugin {
  return {
    name: 'lib-minify',
    enforce: 'post',
    apply: 'build',
    async generateBundle(_outputOptions, bundle: OutputBundle) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          const result = await transform((chunk as OutputChunk).code, {
            minify: true,
            legalComments: 'none',
          });
          (chunk as OutputChunk).code = result.code;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [solidPlugin(), libMinifyPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/elements/register.ts'),
      name: 'KitnChat',
      fileName: (format) => `kitn-chat.${format}.js`,
      // ESM only. UMD/IIFE can't code-split, so it would inline every lazy
      // chunk (Shiki languages, etc.) into one multi-MB file. Modern hosts load
      // the ESM build via `<script type="module">`, which keeps on-demand chunks lazy.
      formats: ['es'],
    },
    emptyOutDir: true,
  },
});
