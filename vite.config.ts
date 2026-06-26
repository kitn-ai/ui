// Coarse register-all build → dist/kai.es.js (the default `@kitn.ai/ui/elements`).
//
// This is a SINGLE-entry build, so register-impl + all elements land in ONE coarse
// chunk that loads fast — registration completes quickly. (The per-element / autoloader
// SPLIT build is separate, in vite.config.elements.ts → dist/elements/. We deliberately
// keep the two builds apart: a unified build forced register-all to use the per-element
// chunk granularity — ~41 element chunks — which made registration slow enough to expose
// prop-before-upgrade races in consumers. The default path must stay coarse + fast.)
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { transform } from 'esbuild';
import type { Plugin, OutputBundle, OutputChunk } from 'vite';

// Vite 6 skips minification for `build.lib` + ES builds; re-minify every chunk in
// generateBundle (after all renderChunk hooks) with esbuild.
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
      name: 'Kai',
      fileName: (format) => `kai.${format}.js`,
      formats: ['es'],
    },
    emptyOutDir: true,
  },
});
