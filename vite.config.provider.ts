import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/remote/**'],
      outDir: 'dist',
      entryRoot: 'src/remote',
      // Rename the provider entry .d.ts to the published package name.
      // rollupTypes: true hits an api-extractor bug when package.json has
      // "types" pointing at a source file (src/index.ts) — the extractor
      // looks for that file in dist and fails. We emit flat .d.ts files
      // instead; the barrel (provider.ts) re-exports make this equivalent
      // for consumers, and the entry is renamed here to match exports map.
      beforeWriteFile(filePath, content) {
        const providerEntry = resolve('dist/provider.d.ts');
        if (filePath === providerEntry) {
          return { filePath: resolve('dist/kitn-chat-provider.d.ts'), content };
        }
        return undefined;
      },
    }),
  ],
  build: {
    emptyOutDir: false, // do NOT clobber dist/kitn-chat.es.js (main build runs first)
    lib: { entry: 'src/remote/provider.ts', formats: ['es'], fileName: () => 'kitn-chat-provider.es.js' },
    rollupOptions: { external: ['solid-js', 'solid-js/web'] },
  },
});
