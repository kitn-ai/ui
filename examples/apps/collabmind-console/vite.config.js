import { defineConfig } from 'vite';

// The browser only ever talks to the wrapper (server/server.mjs). In dev, Vite serves the
// UI and forwards the wrapper's routes to it; in `npm start` the wrapper serves dist/ itself.
const WRAPPER = `http://127.0.0.1:${process.env.PORT || 8790}`;

export default defineConfig({
  server: {
    port: 5190,
    proxy: {
      '/svc': { target: WRAPPER, changeOrigin: true },
      '/api': { target: WRAPPER, changeOrigin: true },
      '/openapi.json': { target: WRAPPER, changeOrigin: true },
    },
  },
});
