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
  index: resolve(__dirname, 'src/elements/register.ts'),
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
    // Unified elements build (runs FIRST in the chain; owns the dist clean). The
    // register-all `index` entry emits to the historical dist/kitn-chat.es.js path
    // (so @kitn.ai/ui/elements + every existing reference is unchanged), while the
    // per-element + autoloader entries emit to dist/elements/ and ALL entries share
    // dist/elements/chunks/ — one build, no dep duplication.
    outDir: 'dist',
    emptyOutDir: true,
    lib: { entry, formats: ['es'] },
    rollupOptions: {
      output: {
        entryFileNames: (c) => (c.name === 'index' ? 'kitn-chat.es.js' : `elements/${c.name}.js`),
        chunkFileNames: 'elements/chunks/[name]-[hash].js',
      },
    },
  },
});
