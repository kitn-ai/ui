import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

// Resolve `@kitnai/chat/*` against the LOCAL source/build of this repo so the
// example exercises the elements we're developing (no publish needed):
//   - `@kitnai/chat/elements`  → the built bundle that registers the elements
//   - `@kitnai/chat/theme.css` → the kit's theme stylesheet
const repoRoot = resolve(__dirname, '..', '..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@kitnai/chat/elements': resolve(repoRoot, 'dist/kitn-chat.es.js'),
      '@kitnai/chat/theme.css': resolve(repoRoot, 'theme.css'),
    },
    mainFields: ['module'],
  },
});
