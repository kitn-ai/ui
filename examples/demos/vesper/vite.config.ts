import { fileRoutes } from 'filesystem-routing/vite';
import { defineConfig } from 'vitest/config';
import solid from '@solidjs/vite-plugin';

// Solid 2 start mode: no index.html and no entry files. The plugin generates
// the entries around src/App.tsx, wrapped in src/Document.tsx, and serves SSR
// on the dev server itself. `vite build` emits dist/client + dist/server;
// server.js runs the built handler.
//
// Do NOT reach for @solidjs/start: the package on npm is the Solid 1 line
// (solid-js ^1.9.15, @solidjs/router <2). Start is this plugin's `start` mode.
export default defineConfig({
  plugins: [
    // `extensions` is load-bearing: fileRoutes emits route module ids ending
    // in a `?pick=` query string, and the Solid plugin skips them without it.
    solid({ start: true, ssr: true, extensions: ['.jsx', '.tsx'] }),
    fileRoutes({ types: true }),
  ],
  server: { port: 4330 },
  build: {
    target: 'esnext',
    // Keep photography as asset files rather than inlining it into the bundle.
    assetsInlineLimit: 0,
  },
  // jsdom, not node: an `environment: 'node'` project gets the framework's
  // SERVER build, where stores are read-only by design (the server renders an
  // empty cart and never mutates it). Testing the cart there tests a stub.
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
