import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [solidPlugin()],
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
