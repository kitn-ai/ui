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
      formats: ['es', 'umd'],
    },
    emptyOutDir: true,
  },
});
