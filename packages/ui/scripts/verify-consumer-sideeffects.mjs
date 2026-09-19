// End-to-end consumer packaging guard. This is the one that can actually fail.
//
// WHY IT EXISTS
// -------------
// dist/kai.es.js (the `@kitn.ai/ui/web-components` entry) is a small facade that loads
// the real ~650KB registration chunk (dist/register-impl-<hash>.js) with a
// dynamic import. Whether that chunk's `customElements.define` calls survive is
// decided by the CONSUMER's bundler, from package.json "sideEffects". In 0.19.0
// the glob list did not cover the hashed chunk, so Vite 8 / Rolldown shook it
// from ~650KB to a ~1.5KB stub with zero web-component registrations: blank page,
// silent console, customElements.whenDefined('kai-chat') hanging forever.
//
// The build-time guard (verify-web-components-bundle.mjs) checked only that OUR build
// kept the reference, which was true the whole time. Nothing checked the
// consumer side. So this script builds a real consumer app against a real
// tarball with a real bundler and asserts the registrations are still there.
//
// WHY VITE 8 SPECIFICALLY
// -----------------------
// Vite 8 bundles with Rolldown, which honours `sideEffects` far more
// aggressively than the Rollup-based Vite 6/7. The same broken package builds
// FINE under Vite 6 and 7 and blank under Vite 8, so 8 is the canary. It is also
// what `npm create vite@latest` installs today, i.e. what consumers actually get.
//
// Needs network (npm install into a temp dir). Runs in CI, not in `npm run build`.
//   node scripts/verify-consumer-sideeffects.mjs [--keep]
//
// WHY IT ALSO WEIGHS THE OUTPUT
// -----------------------------
// Surviving registrations say the package WORKS. They say nothing about what it
// COSTS, and the regression that matters most here keeps every registration: a
// re-aggregated build shakes nothing out, it just makes an import reach far more
// than it should. The `.`, `./solid`, `index.server` and `solid.server` targets
// emit one file per source module, which is what took an import of `cn` alone from
// 125,975 B to 28,353 B and `Button` alone from 126,253 B to 47,693 B under the
// `browser` condition — measured on the packed tarball by a bundler, before and
// after. EAGER_PROBES below is the ceiling on that, and it is the only
// consumer-side reading of what the kit costs.
//
// BOTH CONDITIONS, because the first version of this measured only `browser`. The
// client change left the server twins aggregate, so `exports["."].node` still
// resolved to a single 626,182 B `dist/index.server.js` and the same `cn` import
// cost 103,311 B there — 3.6x its 28,353 B client figure, eager, for code `cn`
// cannot reach. The twins are per-module now (`perModule` in config/vite/lib.ts)
// and the two readings land 35 B apart (28,353 B against 28,388 B), so a probe that
// quietly resolved the wrong build would report a number that looks right. Each
// probe's build therefore records what it actually resolved and that is asserted
// (see the resolution check below): the size alone can no longer tell them apart.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPackedFilename } from '../../../scripts/pack-listing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEEP = process.argv.includes('--keep');
const VITE = 'vite@^8';

/**
 * Minimal-import probes and their eager ceilings, one pair per exports
 * CONDITION. `browser` is the client resolution; `node` is what an SSR,
 * serverless or prerender consumer gets (`node` / `worker` / `deno` in the
 * exports map).
 *
 * WHAT THEY WEIGH. A consumer's bundler keeps only what an import statically
 * reaches, so the smallest honest import off the package root is the cheapest
 * reading of what the kit costs. Every probe imports from `@kitn.ai/ui` — the
 * `.` entry in package.json's `exports` map, the one every consumer resolves —
 * and the import is USED, so nothing can shake it out and leave the probe
 * measuring an empty bundle.
 *
 * WHAT THEY ARE SIZED TO CATCH. All four barrel targets (`.` and `./solid` with
 * their server twins) emit one file per source module, so importing the root
 * costs what the import reaches and no more. Before that build change the two
 * client probes measured 125,975 B and 126,253 B, because `.` emitted a single
 * 711 kB aggregate module and importing anything reached everything in it;
 * before the SERVER TWINS changed, the two node probes measured 103,311 B and
 * 105,024 B against the same kind of aggregate at `dist/index.server.js`
 * (629,598 B). Re-aggregating any of the four puts the matching figure back at
 * ~105-126 kB while leaving every `kai-*` tag registered, so the assertions above
 * stay green straight through it.
 *
 * THE NUMBERS. Measured by this script, minified, with the `vite@^8` it resolves
 * and prints on every run. The first figure of each pair is the build before `cn()`
 * stopped importing `tailwind-merge`; the second is the same probe after it (its runtime
 * replacement is `src/utils/cn-merge.ts`, and `tailwind-merge` stays in devDependencies as
 * the ORACLE in `cn-merge.drift.test.ts`).
 *
 *   cn-only, browser      28,353 B  ->  13,858 B measured -> 20 KiB ceiling
 *   Button-only, browser  47,693 B  ->  33,028 B measured -> 48 KiB ceiling
 *   cn-only, node         28,388 B  ->  13,892 B measured -> 20 KiB ceiling
 *   Button-only, node     37,992 B  ->  23,395 B measured -> 32 KiB ceiling
 *
 * Headroom is 1.40x-1.49x, tighter than the 1.55x-1.94x this file used before: hardening the
 * table (the validator/arbitrary families `stroke`/`outline`/`ring`/`shadow`/`scroll` were
 * misclassified, so `stroke-2` beside a consumer's `stroke-red-500` was deleted) added ~2.7 kB
 * to the measured `cn` probe. The ceilings were NOT raised for it — a re-aggregated `.` entry
 * is ~103-126 kB, still 5x-9x the ceilings — and they are still loose
 * enough that a minifier or a Vite minor does not trip one and demand a re-derivation for
 * nothing, tight enough that the regression each ceiling exists for still trips it by a
 * distance. A re-aggregated `.` entry puts the `cn` probes back at ~103-126 kB and the
 * `Button` probes back over 120 kB — 5x-6x the tightened `cn` ceilings and 2.5x-4x the
 * `Button` ones. The ceilings moved DOWN with the measurement on purpose: left at 48/72 KiB
 * they would have gone on passing had `cn` come back as large as `tailwind-merge` itself,
 * which is the one way these probes could stop meaning anything while staying green.
 *
 * THE NODE CEILINGS ARE NOT THE CLIENT ONES COPIED FOR SYMMETRY. Both conditions
 * resolve the same per-module source tree through the same bundler, so a probe
 * that regressed for client reasons (a dependency the `cn` import reaches getting
 * bigger) regresses here too, and one ceiling rule for the pair keeps it
 * explicable. What the node pair adds is the second failure mode: the twins are
 * separate build targets, so they can be re-aggregated on their own, and a
 * ceiling on the client pair alone cannot see that.
 *
 * `minEagerBytes` is NOT a budget. It is a vacuity tripwire: an import that got
 * shaken to nothing would pass a ceiling by being small, and that is the one way
 * a probe could quietly stop measuring anything while staying green.
 *
 * `onGrowth` is the same fact for the failure path: it names, per probe, the
 * build change whose absence produces the number this ceiling exists to stop.
 *
 * THE RESOLUTION CHECK IS THE OTHER HALF OF THE TRIPWIRE. Under per-module output
 * on all four barrels the `cn` probe's two readings are 28,353 B and 28,388 B — 35 B
 * apart, 0.1% — so a probe that resolved the WRONG build would report a plausible
 * number and a re-aggregated twin would go unnoticed. Each probe's build records what it
 * resolved (a Vite plugin, `enforce: 'pre'` — without that the resolver has
 * already answered and the hook never fires) and both facts are asserted against
 * CONDITION_EXPECTATIONS: the entry file, and that the Solid runtime beside it is
 * the matching half (`dist/web.js` under `browser`, `dist/server.js` under
 * `node`). A condition whose traces record no `solid-js/web` resolution at all is
 * a failure too, so the weaker half of this check cannot go vacuous in silence.
 */
const EAGER_PROBES = [
  {
    name: 'minimal-cn',
    condition: 'browser',
    subject: 'a single utility (`cn`) from the package root, and the clsx + cn-merge it reaches',
    source:
      `import { cn } from '@kitn.ai/ui';\n` +
      `document.body.className = cn('p-2', 'font-bold', String(Math.random()));\n`,
    minEagerBytes: 8 * 1024,
    maxEagerBytes: 20 * 1024,
    onGrowth:
      'the `.` entry is one aggregate module again — this probe measured 125,975 B '
      + 'against the pre-per-module build',
  },
  {
    name: 'minimal-button',
    condition: 'browser',
    subject: 'a single component (`Button`) from the package root',
    source:
      `import { Button } from '@kitn.ai/ui';\n` +
      `if (typeof Button !== 'function') throw new Error('Button is not exported');\n` +
      `document.body.dataset.button = Button.name;\n`,
    minEagerBytes: 8 * 1024,
    // 40 KiB, NOT 48. This ceiling has to separate TWO regressions, and it sat
    // above one of them: a re-aggregated `.` reads 126,253 B here, but a revert
    // of the `cn` merger (back to `tailwind-merge`) reads 47,693 B — so at 48 KiB
    // a cn revert would have passed this probe while three of its four siblings
    // tripped. 40 KiB keeps 1.24x headroom over the measured 33,028 B and still
    // fires on a revert, 6,733 B below it. Placed between the two known values
    // rather than chosen as a round multiple.
    maxEagerBytes: 40 * 1024,
    onGrowth:
      'the `.` entry is one aggregate module again — this probe measured 126,253 B '
      + 'against the pre-per-module build; a revert of the `cn` merger reads 47,693 B '
      + 'here, which this ceiling also sits below',
  },
  {
    name: 'node-cn',
    condition: 'node',
    subject: 'the same `cn` import, resolved under the `node` / `worker` / `deno` conditions',
    source:
      `import { cn } from '@kitn.ai/ui';\n` +
      `if (typeof cn !== 'function') throw new Error('cn is not exported');\n` +
      `console.log(cn('p-2', 'font-bold'));\n`,
    minEagerBytes: 8 * 1024,
    maxEagerBytes: 20 * 1024,
    onGrowth:
      '`perModule` is gone from `index.server` in config/vite/lib.ts, so the `node` condition '
      + 'resolves one self-contained aggregate again — this probe measured 103,311 B against a fresh build of it',
  },
  {
    name: 'node-button',
    condition: 'node',
    subject: 'the same `Button` import, resolved under the `node` / `worker` / `deno` conditions',
    source:
      `import { Button } from '@kitn.ai/ui';\n` +
      `if (typeof Button !== 'function') throw new Error('Button is not exported');\n` +
      `console.log(Button.name);\n`,
    minEagerBytes: 8 * 1024,
    maxEagerBytes: 32 * 1024,
    onGrowth:
      '`perModule` is gone from `index.server` in config/vite/lib.ts, so the `node` condition '
      + 'resolves one self-contained aggregate again — this probe measured 105,024 B against a fresh build of it',
  },
];

/** What each condition's build must be seen resolving, per probe. */
const CONDITION_EXPECTATIONS = {
  browser: { entry: 'dist/index.js', solidRuntime: 'solid-js/web/dist/web.js' },
  node: { entry: 'dist/index.server.js', solidRuntime: 'solid-js/web/dist/server.js' },
};

/** Named in every pack-shape failure; it is the fact that explains them. */
const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();

const fail = (msg) => {
  console.error(`\n✗ verify-consumer-sideeffects: ${msg}\n`);
  process.exit(1);
};
const step = (msg) => console.log(`  · ${msg}`);
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Every `.js` under `dir`, concatenated, with its total emitted byte count. */
function readEmittedJs(dir) {
  let bytes = 0;
  let code = '';
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js')) {
        const src = readFileSync(p, 'utf8');
        bytes += Buffer.byteLength(src);
        code += src;
      }
    }
  };
  walk(dir);
  return { bytes, code };
}

/** Static import specifiers in one emitted module: `import`/`export ... from
 *  "x"` and side-effect imports. `import("x")` is deliberately NOT matched —
 *  see readEagerJs for why that distinction is the whole point. */
function staticImports(source) {
  const specs = [];
  for (const pattern of [
    /(?:^|[;}\n])\s*(?:import|export)\s+[^'"()]*?from\s*(['"])([^'"]+)\1/g,
    /(?:^|[;}\n])\s*import\s*(['"])([^'"]+)\1/g,
  ]) {
    for (const m of source.matchAll(pattern)) specs.push(m[2]);
  }
  return specs;
}

/**
 * The EAGER reading of one probe's build: the entry chunk plus its STATIC import
 * closure. Anything reached only through `import(...)` is reported separately as
 * LAZY and is not counted.
 *
 * WHY NOT "sum every .js the build wrote", which is what this did for the client
 * probes before the node pair existed: that is the worst-case total, not the
 * first load, and it stops meaning the same thing across conditions. An SSR build
 * emits a chunk per dynamic `import()` it walks — 11 of them, 757 kB, for the `cn`
 * probe against the aggregate `dist/index.server.js` — where the client build
 * emits none, so a summed figure compares a first load against a first load plus
 * everything that is lazy by construction.
 *
 * A missing entry chunk returns 0 bytes, which the vacuity floor below rejects.
 */
function readEagerJs(dir, stem) {
  const files = new Map();
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js')) files.set(p.slice(dir.length + 1), readFileSync(p, 'utf8'));
    }
  };
  walk(dir);

  const entry = [...files.keys()].find((f) => f.split('/').pop().startsWith(stem));
  if (!entry) return { bytes: 0, entry: null, lazyChunkCount: files.size, lazyBytes: 0 };

  const seen = new Set();
  const stack = [entry];
  while (stack.length > 0) {
    const f = stack.pop();
    if (seen.has(f) || !files.has(f)) continue;
    seen.add(f);
    for (const spec of staticImports(files.get(f))) {
      if (spec.startsWith('.')) stack.push(join(dirname(f), spec).replace(/\\/g, '/'));
    }
  }
  const lazy = [...files.keys()].filter((f) => !seen.has(f));
  return {
    bytes: [...seen].reduce((sum, f) => sum + Buffer.byteLength(files.get(f)), 0),
    entry,
    lazyChunkCount: lazy.length,
    lazyBytes: lazy.reduce((sum, f) => sum + Buffer.byteLength(files.get(f)), 0),
  };
}

/**
 * Records what a probe's build actually resolved, so its ceiling cannot pass
 * while measuring the OTHER condition's build (see EAGER_PROBES).
 *
 * `enforce: 'pre'` is load-bearing: Vite's own resolver is a core plugin, so a
 * normal user plugin's `resolveId` is never consulted for a bare specifier. The
 * trace file is truncated by this script before each build, so the plugin only
 * ever appends.
 */
const resolveTracePlugin = (traceFile) =>
  `{\n` +
  `  name: 'kai-resolve-trace',\n` +
  `  enforce: 'pre',\n` +
  `  async resolveId(source, importer, opts) {\n` +
  `    if (source === '@kitn.ai/ui' || source === 'solid-js/web') {\n` +
  `      const resolved = await this.resolve(source, importer, { ...opts, skipSelf: true });\n` +
  `      fs.appendFileSync(${JSON.stringify(traceFile)}, JSON.stringify({ source, id: resolved && resolved.id }) + '\\n');\n` +
  `    }\n` +
  `    return null;\n` +
  `  },\n` +
  `}`;

/**
 * One config per probe, shaped by its condition.
 *
 * `node` probes build with `build.ssr`, which is what drives Vite's SSR
 * resolution and therefore selects the `node` condition in the exports map
 * (`@kitn.ai/ui` -> dist/index.server.js, `solid-js/web` -> its server build).
 * `ssr.noExternal` because an externalized dependency would leave a ~4 kB stub
 * whose only import is `@kitn.ai/ui` — the probe would measure nothing and pass.
 * `minify` is explicit because an SSR build does NOT minify by default and an
 * unminified figure is not comparable with the browser probes.
 */
function probeConfig(appDir, probe) {
  const trace = join(appDir, `trace-${probe.name}.jsonl`);
  const header = `import fs from 'node:fs';\nexport default { logLevel: 'error', plugins: [${resolveTracePlugin(trace)}], `;
  if (probe.condition === 'node') {
    return (
      header +
      `build: { ssr: 'src/${probe.name}.ts', outDir: 'out-${probe.name}', emptyOutDir: true, minify: true }, ` +
      `ssr: { noExternal: true } };\n`
    );
  }
  return (
    header +
    `build: { outDir: 'out-${probe.name}', emptyOutDir: true, ` +
    `rollupOptions: { input: 'src/${probe.name}.ts' } } };\n`
  );
}

if (!existsSync(resolve(ROOT, 'dist/kai.es.js'))) {
  fail('dist/kai.es.js not found — run `nx build ui` first.');
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'src/web-components/web-component-manifest.json'), 'utf8'));
const ALL_TAGS = Object.keys(manifest.tags);
const CHAT_TAGS = manifest.files.chat ?? ['kai-chat'];
if (ALL_TAGS.length === 0) fail('src/web-components/web-component-manifest.json lists no tags.');

// Temp dir deliberately OUTSIDE the repo: a consumer resolves @kitn.ai/ui from
// its own node_modules, with no workspace links or repo tsconfig in scope.
const tmp = mkdtempSync(join(tmpdir(), 'kai-sideeffects-'));
const app = join(tmp, 'app');
let failure = null;

try {
  console.log(`\nverify-consumer-sideeffects — ${tmp}`);

  step('npm pack');
  // Shape-normalised: npm 12 made the top level an object keyed by package name,
  // so `JSON.parse(raw)[0]` — what stood here — is `undefined` under it. See
  // <repo>/scripts/pack-listing.mjs.
  const { filename } = readPackedFilename(
    run('npm', ['pack', '--json', '--pack-destination', tmp], ROOT),
    { npmVersion },
  );
  const tarball = join(tmp, filename);

  mkdirSync(join(app, 'src'), { recursive: true });
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name: 'kai-consumer-guard', private: true, version: '0.0.0', type: 'module' }, null, 2),
  );

  // Entry A: the register-all path — a bare side-effect import, exactly what the
  // docs and every vanilla/plain-HTML consumer writes.
  writeFileSync(
    join(app, 'src/register-all.ts'),
    `import '@kitn.ai/ui/web-components';\ncustomElements.whenDefined('kai-chat').then(() => console.log('ready'));\n`,
  );
  // Entry B: the per-web-component path (@kitn.ai/ui/web-components/*), which the React
  // wrappers and footprint-conscious consumers use.
  writeFileSync(
    join(app, 'src/per-web-component.ts'),
    `import '@kitn.ai/ui/web-components/chat';\ncustomElements.whenDefined('kai-chat').then(() => console.log('ready'));\n`,
  );

  // Separate builds, separate outDirs: one shared build would let entry A's
  // chunks satisfy an assertion entry B had actually failed.
  for (const name of ['register-all', 'per-web-component']) {
    writeFileSync(
      join(app, `vite.${name}.config.js`),
      `export default { logLevel: 'error', build: { outDir: 'out-${name}', emptyOutDir: true, ` +
        `rollupOptions: { input: 'src/${name}.ts' } } };\n`,
    );
  }

  // Entries C-F: the minimal-import probes, one pair per exports condition. See
  // EAGER_PROBES — they exist to weigh what a bundler keeps for the smallest
  // possible import off the package root, which is where a re-aggregated build
  // shows up and where the tag count above cannot see it.
  for (const probe of EAGER_PROBES) {
    writeFileSync(join(app, `src/${probe.name}.ts`), probe.source);
    writeFileSync(join(app, `vite.${probe.name}.config.js`), probeConfig(app, probe));
  }

  step(`npm install ${VITE} + the packed tarball`);
  try {
    run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', tarball, VITE], app);
  } catch (e) {
    fail(`npm install failed (network?):\n${e.stderr || e.message}`);
  }
  const viteVersion = run('npx', ['vite', '--version'], app).trim();
  step(viteVersion);

  const results = [];
  const eager = [];
  for (const [name, required] of [
    ['register-all', ALL_TAGS],
    ['per-web-component', CHAT_TAGS],
  ]) {
    step(`vite build — ${name}`);
    try {
      run('npx', ['vite', 'build', '--config', `vite.${name}.config.js`], app);
    } catch (e) {
      fail(`consumer \`vite build\` failed for ${name}:\n${e.stdout || ''}${e.stderr || e.message}`);
    }

    const outDir = join(app, `out-${name}`);
    const { bytes, code } = readEmittedJs(outDir);

    // Tag literals are the honest signal: minifiers rewrite `customElements.define`
    // into an aliased member call (solid-element does `customElements.define(...)`
    // through a local binding), but they can never rewrite a string literal. Zero
    // tags in the emitted output IS the blank-page bug.
    const missing = required.filter((tag) => !code.includes(tag));
    results.push({ name, required: required.length, missing, bytes });
  }

  for (const probe of EAGER_PROBES) {
    step(`vite build — ${probe.name} (${probe.condition})`);
    const traceFile = join(app, `trace-${probe.name}.jsonl`);
    writeFileSync(traceFile, '');
    try {
      run('npx', ['vite', 'build', '--config', `vite.${probe.name}.config.js`], app);
    } catch (e) {
      fail(`consumer \`vite build\` failed for ${probe.name}:\n${e.stdout || ''}${e.stderr || e.message}`);
    }
    const resolved = readFileSync(traceFile, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    eager.push({
      ...probe,
      ...readEagerJs(join(app, `out-${probe.name}`), probe.name),
      resolvedKit: resolved.find((r) => r.source === '@kitn.ai/ui')?.id ?? null,
      resolvedSolid: resolved.find((r) => r.source === 'solid-js/web')?.id ?? null,
    });
  }

  // See EAGER_PROBES — the size alone cannot say whether a probe measured the
  // build its condition resolves, so the resolutions are asserted here.
  const misresolved = [];
  const shown = (id) => (id ? id.slice(id.indexOf('node_modules/')) : 'never resolved');
  for (const p of eager) {
    const want = CONDITION_EXPECTATIONS[p.condition];
    if (!p.resolvedKit?.endsWith(want.entry)) {
      misresolved.push(
        `  ${p.name} [${p.condition}]: @kitn.ai/ui -> ${shown(p.resolvedKit)}, expected ${want.entry}`,
      );
    }
    if (p.resolvedSolid && !p.resolvedSolid.endsWith(want.solidRuntime)) {
      misresolved.push(
        `  ${p.name} [${p.condition}]: solid-js/web -> ${shown(p.resolvedSolid)}, expected ${want.solidRuntime}`,
      );
    }
  }
  for (const condition of ['browser', 'node']) {
    if (!eager.some((p) => p.condition === condition && p.resolvedSolid)) {
      misresolved.push(
        `  no [${condition}] probe recorded a solid-js/web resolution, so the runtime half of ` +
          `this check asserted nothing — the trace plugin's hook has stopped firing.`,
      );
    }
  }

  console.log('');
  for (const r of results) {
    const kb = (r.bytes / 1024).toFixed(1);
    const ok = r.missing.length === 0;
    console.log(
      `  ${ok ? '✓' : '✗'} ${r.name.padEnd(16)} ${String(r.required - r.missing.length).padStart(3)}/${r.required} tags · ${kb} kB emitted JS`,
    );
  }
  for (const p of eager) {
    const ok = p.bytes >= p.minEagerBytes && p.bytes <= p.maxEagerBytes;
    const lazy = p.lazyChunkCount
      ? ` · ${p.lazyChunkCount} lazy chunk(s), ${p.lazyBytes.toLocaleString('en-US')} B not counted`
      : '';
    console.log(
      `  ${ok ? '✓' : '✗'} ${p.name.padEnd(16)} ${String(p.bytes.toLocaleString('en-US')).padStart(9)} B eager ` +
        `[${p.condition}] (ceiling ${p.maxEagerBytes.toLocaleString('en-US')} B, floor ` +
        `${p.minEagerBytes.toLocaleString('en-US')} B)${lazy} · ${p.subject}`,
    );
  }

  const broken = results.filter((r) => r.missing.length > 0);
  const overBudget = eager.filter((p) => p.bytes > p.maxEagerBytes);
  const vacuous = eager.filter((p) => p.bytes < p.minEagerBytes);
  const reasons = [];

  if (broken.length > 0) {
    reasons.push(
      `a real consumer build DROPPED web-component registrations.\n\n` +
        broken
          .map(
            (r) =>
              `  entry: import '@kitn.ai/ui/web-components${r.name === 'per-web-component' ? '/chat' : ''}'\n` +
              `    ${r.missing.length}/${r.required} kai-* tags missing from the emitted bundle\n` +
              `    (${(r.bytes / 1024).toFixed(1)} kB of JS emitted; e.g. ${r.missing.slice(0, 6).join(', ')})`,
          )
          .join('\n') +
        `\n\n  ${viteVersion} treated the registration chunk as side-effect free and shook\n` +
        `  the customElements.define calls out of it. Consumers get a blank page and a\n` +
        `  SILENT console — whenDefined() just never resolves.\n\n` +
        `  Fix: package.json "sideEffects" must match every emitted chunk that carries\n` +
        `  registrations. The chunk hash changes every build, so match the stem:\n` +
        `    "./dist/register-impl-*.js"\n` +
        `  Current value:\n` +
        JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
          .sideEffects.map((s) => `    ${s}`)
          .join('\n'),
    );
  }

  if (overBudget.length > 0) {
    reasons.push(
      `a minimal import off the package root got bigger than its ceiling.\n\n` +
        overBudget
          .map(
            (p) =>
              `  entry: import from '@kitn.ai/ui' under the ${p.condition} condition — ${p.subject}\n` +
              `    ${p.bytes.toLocaleString('en-US')} B eager against a ` +
              `${p.maxEagerBytes.toLocaleString('en-US')} B ceiling — over by ` +
              `${(p.bytes - p.maxEagerBytes).toLocaleString('en-US')} B ` +
              `(+${(((p.bytes - p.maxEagerBytes) / p.maxEagerBytes) * 100).toFixed(0)}% of the ceiling, ` +
              `${(p.bytes / p.maxEagerBytes).toFixed(1)}x the ceiling itself)\n` +
              `    what that size means here: ${p.onGrowth}`,
          )
          .join('\n') +
        `\n\n  EAGER is what the bundler keeps for this entry with nothing loaded\n` +
        `  dynamically — i.e. what a consumer downloads to use that one name.\n\n` +
        `  A re-aggregated build is the regression these ceilings exist for, and it\n` +
        `  keeps every kai-* registration, so the tag assertions above stay green\n` +
        `  through it. The 'browser' probes weigh the \".\" entry; the 'node' probes\n` +
        `  weigh the same entry under the node/worker/deno conditions, which resolve\n` +
        `  dist/index.server.js — a SEPARATE build target, so it can be re-aggregated\n` +
        `  on its own and the client pair cannot see it. If the growth is in the\n` +
        `  package rather than in the probe's own source, config/vite/lib.ts decides\n` +
        `  which targets emit per-module output.\n\n` +
        `  If the growth is deliberate, record the new measurement beside the old one\n` +
        `  in EAGER_PROBES (scripts/verify-consumer-sideeffects.mjs) and raise the\n` +
        `  ceiling there — including what grew, how much, and why it has to ship.`,
    );
  }

  if (misresolved.length > 0) {
    reasons.push(
      `a probe did not resolve the build its condition names, so its ceiling is not\n` +
        `  measuring what it claims to.\n\n` +
        misresolved.join('\n') +
        `\n\n  Each probe weighs ONE of the conditions in package.json's exports map, and\n` +
        `  the two readings are close enough in size that a probe measuring the wrong\n` +
        `  one reports a plausible number. That is how a per-module server twin could\n` +
        `  be re-aggregated with the node probe still green, or the browser probe\n` +
        `  could quietly start weighing the server build.\n\n` +
        `  A never-resolving specifier usually means the exports map lost a condition;\n` +
        `  a wrong runtime means the build resolved the other half. See\n` +
        `  CONDITION_EXPECTATIONS and probeConfig — the node probes' build shape is\n` +
        `  what selects the node condition.`,
    );
  }

  if (vacuous.length > 0) {
    reasons.push(
      `a probe emitted LESS than its floor, so its import was shaken out and its\n` +
        `  ceiling above is now passing vacuously.\n\n` +
        vacuous
          .map(
            (p) =>
              `  ${p.name}: ${p.bytes.toLocaleString('en-US')} B emitted, floor ` +
              `${p.minEagerBytes.toLocaleString('en-US')} B — ${p.subject}`,
          )
          .join('\n') +
        `\n\n  A ceiling that passes because nothing shipped is not a guard. Check that the\n` +
        `  probe's own source still USES the import, and that package.json\n` +
        `  "sideEffects" still lets a bundler keep the module it reaches.`,
    );
  }

  if (reasons.length > 0) failure = reasons.join('\n\n');
} finally {
  if (KEEP) console.log(`\n  (--keep) temp app left at ${app}`);
  else rmSync(tmp, { recursive: true, force: true });
}

if (failure) fail(failure);
console.log(
  '\n✓ verify-consumer-sideeffects — registrations survive a real consumer bundle, ' +
    'and the minimal-import ceilings hold.\n',
);
