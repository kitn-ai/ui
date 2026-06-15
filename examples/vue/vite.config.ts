import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

// Resolve `@kitn.ai/chat/*` against the LOCAL source/build of this repo so the
// example exercises the elements we're developing (no publish needed):
//   - `@kitn.ai/chat/elements`  → the built bundle that registers the elements
//   - `@kitn.ai/chat/theme.css` → the kit's theme stylesheet
const repoRoot = resolve(__dirname, '..', '..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Tell Vue's compiler that kc-* tags are native custom elements,
          // not Vue components — prevents "Unknown custom element" warnings
          // and ensures Vue sets DOM *properties* (not attributes) via .prop.
          isCustomElement: (tag) => tag.startsWith('kc-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@kitn.ai/chat/elements': resolve(repoRoot, 'dist/kitn-chat.es.js'),
      '@kitn.ai/chat/theme.css': resolve(repoRoot, 'theme.css'),
    },
    mainFields: ['module'],
  },
});
