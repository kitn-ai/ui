import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname_ = dirname(fileURLToPath(import.meta.url));

/**
 * `__KIT_VERSION__` for the unit suite: `src/doctor.ts` reports the kit the CLI was BUILT
 * against, substituted by `define` in config/vite/node.ts for the real bundle (see
 * types/globals.d.ts for why it is a build-time fact rather than a runtime read).
 *
 * Read from the SAME manifest the build reads, so a test can never pass against a hand-typed
 * value the shipped bundle would not carry.
 */
const kitVersion = (
  JSON.parse(readFileSync(resolve(dirname_, '../ui/package.json'), 'utf-8')) as { version?: unknown }
).version;
if (typeof kitVersion !== 'string') {
  throw new Error(
    `vitest.config.ts: ../ui/package.json has no string "version". The __KIT_VERSION__ define and ` +
      `the tests over it read that field, so its absence has to be loud here rather than an ` +
      `undefined the tests compare against themselves.`,
  );
}

export default defineConfig({
  define: {
    __KIT_VERSION__: JSON.stringify(kitVersion),
  },
  test: {
    environment: 'node',
    // The dispatch tests are .js (bin/ is outside tsc's typed sources on purpose: it owns the
    // process handling), and the doctor tests are .ts beside the module they drive.
    include: ['bin/**/*.test.js', 'src/**/*.test.ts'],
    globals: false,
  },
});
