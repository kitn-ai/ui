// Per-element elements build. Emits, into dist/elements/, with code-splitting so
// shared code (Solid runtime, defineWebComponent, compiled CSS, marked, …) lands
// in dist/elements/chunks/ and is shared across entries:
//   - index.js      — registers ALL elements (the SSR-safe register.ts; the
//                     default @kitn.ai/ui/elements behavior, unchanged)
//   - <file>.js     — one self-registering module per element (@kitn.ai/ui/elements/<file>)
//   - autoloader.js — the opt-in DOM autoloader (@kitn.ai/ui/autoloader)
//
// Everything is bundled (self-contained) so the modules work BOTH for bundler
// tree-shaking (import one element → bundler includes only its chunks) AND for the
// CDN autoloader (no import map needed). Deps are shared across entries, so there
// is no per-element duplication of Solid/CSS/marked.
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { transform } from 'esbuild';
import type { Plugin, OutputBundle, OutputChunk } from 'vite';

function libMinifyPlugin(): Plugin {
  return {
    name: 'lib-minify', enforce: 'post', apply: 'build',
    async generateBundle(_o, bundle: OutputBundle) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          const r = await transform((chunk as OutputChunk).code, { minify: true, legalComments: 'none' });
          (chunk as OutputChunk).code = r.code;
        }
      }
    },
  };
}

const manifest = JSON.parse(readFileSync(resolve(__dirname, 'src/elements/element-manifest.json'), 'utf8'));

const entry: Record<string, string> = {
  autoloader: resolve(__dirname, 'src/elements/autoloader.ts'),
};
for (const file of Object.keys(manifest.files)) {
  for (const ext of ['tsx', 'ts']) {
    const p = resolve(__dirname, `src/elements/${file}.${ext}`);
    if (existsSync(p)) { entry[file] = p; break; }
  }
}

export default defineConfig({
  plugins: [solidPlugin(), libMinifyPlugin()],
  build: {
    // The per-element + autoloader SPLIT build → dist/elements/ (one self-registering
    // module per element + the autoloader, with shared chunks in dist/elements/chunks/).
    // Runs AFTER the coarse register-all build (vite.config.ts), so emptyOutDir only
    // clears dist/elements, never the register-all output at the dist root.
    outDir: 'dist/elements',
    emptyOutDir: true,
    lib: { entry, formats: ['es'] },
    rollupOptions: {
      output: { entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
});
