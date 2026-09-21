import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// This package's two Node bundles, both with sources in packages/ui:
//
//   dist/doctor.es.js        -- `kai doctor`: reads ONE project (its package.json,
//                               node_modules/@kitn.ai/ui, kai.json, its source tree) and
//                               reports. No kit import at runtime, so the version the CLI
//                               was built against is a build-time FACT (`__KIT_VERSION__`
//                               below), which is what makes a skew report possible without
//                               depending on the kit.
//   dist/construct-cli.es.js -- dev/compile/eject/validate. vite + vite-plugin-solid are
//                               NOT bundled: the CLI runs them inside the GENERATED project
//                               through that project's own npm scripts.
//
// WHY THE SOURCES STAY IN packages/ui AND ONLY THE BUILD LIVES HERE. `mcp/construct/**`
// cannot move: it is the source of the kit's PUBLIC `./construct` export, and
// `src/primitives/construct-form-paths.ts` imports it (a declared lint:layer-direction
// exception). So this package owns the PUBLISHING of bundles whose entry points are the
// kit's, and builds them from `../ui`.
//
// CONSEQUENCE, stated rather than discovered later: this build needs the monorepo
// checkout, exactly as every other workspace package's does. `packages/cli` alone is not
// buildable. It is why `@kitn.ai/ui` is a real devDependency here (a BUILD input, with a
// `workspace:` range) and NOT a runtime dependency with a published range: measured,
// `dist/construct-cli.es.js` imports nothing from the kit at runtime, and declaring
// otherwise is what made the old package resolve the kit from the REGISTRY instead of the
// tree. The one package that does resolve the kit at runtime is @kitn.ai/mcp.
const UI_PKG = resolve(__dirname, '../../../ui');
const CLI_PKG = resolve(__dirname, '../..');

function packageVersion(dir: string): string {
  const manifest = join(dir, 'package.json');
  const { version } = JSON.parse(readFileSync(manifest, 'utf-8'));
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(`config/vite/node.ts: ${manifest} has no string "version" to substitute.`);
  }
  return version;
}

/** The kit THIS CHECKOUT builds against. A build-time fact, used only by `kai doctor`. */
const KIT_VERSION = packageVersion(UI_PKG);

const NODE_BUILTINS = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

interface Target {
  /** the package the entry lives in (the kit's sources, or this package's) */
  from: string;
  entry: string;
  out: string;
  external: (string | RegExp)[];
}

const TARGETS: Record<string, Target> = {
  doctor: {
    // This package's OWN source: `doctor` has no ui-side consumer, so it lives here.
    from: CLI_PKG,
    entry: 'src/doctor-entry.ts',
    out: 'doctor.es.js',
    external: [...NODE_BUILTINS],
  },
  'construct-cli': {
    // The kit's source: mcp/construct/** cannot move (the public `./construct` export).
    from: UI_PKG,
    entry: 'mcp/construct/cli-entry.ts',
    out: 'construct-cli.es.js',
    external: ['zod', ...NODE_BUILTINS],
  },
};

const FIRST_TARGET = 'doctor';

const requested = process.env.KAI_BUILD ?? '';
if (!Object.hasOwn(TARGETS, requested)) {
  throw new Error(
    `config/vite/node.ts: KAI_BUILD must be one of [${Object.keys(TARGETS).join(', ')}], got ${JSON.stringify(process.env.KAI_BUILD)}`,
  );
}
const target: Target = TARGETS[requested];

export default defineConfig({
  root: CLI_PKG,
  define: {
    __KIT_VERSION__: JSON.stringify(KIT_VERSION),
  },
  build: {
    // The first target in `npm run build` owns the clean, so the later one (which writes
    // into the same dist/) cannot wipe its output. The ordering is in package.json's
    // `build` script, and this is the only place that knows it.
    emptyOutDir: requested === FIRST_TARGET,
    // build.ssr rather than lib mode: lib is a browser build and would pull browser
    // polyfills into a tool that only ever runs under Node.
    ssr: resolve(target.from, target.entry),
    target: 'node18',
    rollupOptions: {
      external: target.external,
      output: { entryFileNames: target.out },
    },
  },
});
