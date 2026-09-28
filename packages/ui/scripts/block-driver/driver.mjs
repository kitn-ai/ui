#!/usr/bin/env node
// The block driver (V-1) — the composition spike's fine-drive.mjs generalized
// into a reusable harness. A SCENARIO module declares pages, sequential UI
// STATES, user-level actions, behavioral PROBES, computed-STYLE probes and
// hard EXPECTations as data; the driver runs it against one or two pages in
// Playwright/Chromium, light + dark, and emits a JSON verdict plus a
// stable-named screenshot per state.
//
// Modes (chosen by flags, not subcommands):
//   record   --record <file>      run + write the verdict JSON (the baseline)
//   check    --baseline <file>    run + deep-diff probe/style values against a
//                                 previously recorded baseline (Task 2.2's
//                                 before/after gate)
//   parity   --pages a,b          run BOTH pages and diff them state-for-state
//                                 (the spike's facade-vs-fine comparison)
// Any mode also enforces each state's `expect` map and the zero-console-error
// rule on every run. Exit 1 on any red; the verdict JSON always says why.
//
// Usage (from packages/ui):
//   node scripts/block-driver/driver.mjs <scenario.mjs> [flags]
//     --pages <k[,k]>     page keys from scenario.pages (default: all)
//     --schemes <l[,d]>   default: light,dark
//     --base <url>        page server origin (default http://localhost:8952)
//     --serve <dir>       spawn serve.mjs on --port with this root, /kit ->
//                         --kit (default ../../dist relative to this file)
//     --port <n>          with --serve (default 8952; NEVER 4400/4401/8931)
//     --kit <dir>         with --serve: what /kit/ serves (the built dist)
//     --shots <dir>       screenshot dir — REQUIRED, no default. The old default
//                         was ./shots beside the scenario, which for a block is
//                         inside the authored source tree (packages/blocks/blocks/
//                         <block>/shots/), so a bare run left ~60 PNGs of debris
//                         there — deleted twice before this. The house path for a
//                         block is scripts/block-driver/baselines/screenshots-<block>/.
//     --record <file>     write the verdict JSON here
//     --baseline <file>   diff this run against a recorded verdict
//     --out <file>        also write the (non-baseline) verdict here
//
// PER-PAGE OVERRIDES on the page spec, beside `path` and the page-specific
// facts a scenario's probes read:
//   skipLayout: true       skip every probe this state named in `layoutProbes`,
//                          the `expect` entries over those probes, and every
//                          styleProbe. This is a PAGE'S DECLARATION, honoured as
//                          written and never inferred here: the driver cannot
//                          tell a document-relative probe from a self-relative
//                          one, so nothing but the page spec can say which is
//                          which. WHAT IT DOES NOT MEAN is that such a probe is
//                          unmeasurable there -- measured 2026-09-27 by running
//                          the react page with the skip off, support-widget's
//                          four geometry probes came back at the block page's own
//                          numbers, because each is a difference between two
//                          boxes of the block's OWN elements while the block's
//                          stylesheet is imported by the emitted tree. So a skip
//                          here is a claim the scenario makes; this driver reports
//                          every probe it skipped (verdict `skippedProbes` /
//                          `skippedStyles`, plus a SKIP line on stderr) so the
//                          claim is visible on every run instead of only in a
//                          comment. NO PAGE DECLARES IT TODAY: all three blocks'
//                          `react` specs measure their geometry, which is why the
//                          react runtime cell prints no SKIP line.
//   consoleIgnore: [re]    merged with the scenario's list rather than replacing
//                          it, so a page can tolerate its own host noise without
//                          relaxing the zero-console rule on every other page.
//
// Interaction ethic (inherited from fine-drive.mjs): actions are user-level —
// Playwright's shadow-piercing locators click what a person would click. A
// scenario that needs a programmatic step (e.g. landing a reply while a dock
// is CLOSED, where no user path exists by construction) declares it on the
// page spec and says why in a comment there.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { portHolders, formatPortHolders } from './port-holder.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- CLI parsing
const argv = process.argv.slice(2);
const scenarioPath = argv.find((a) => !a.startsWith('--'));
if (!scenarioPath) {
  console.error('usage: node driver.mjs <scenario.mjs> --shots <dir> [--pages k,k] [--schemes light,dark] [--base url] [--serve dir] [--port n] [--kit dir] [--record f] [--baseline f] [--out f]');
  process.exit(2);
}
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const scenario = (await import(pathToFileURL(resolve(scenarioPath)).href)).default;
const pageKeys = (flag('pages') ?? Object.keys(scenario.pages).join(',')).split(',');
const schemes = (flag('schemes') ?? (scenario.schemes ?? ['light', 'dark']).join(',')).split(',');
const PORT = Number(flag('port') ?? 8952);
const BASE = flag('base') ?? `http://localhost:${PORT}`;
// --shots is REQUIRED and has no default. The default used to be `./shots` beside
// the scenario, which for a block lands in the authored SOURCE tree
// (packages/blocks/blocks/<block>/shots/) — a bare record run filled it with ~60
// PNGs and it was deleted as debris twice. An explicit flag also means no run
// rewrites a committed screenshot set by accident: the block sets live under
// baselines/, which is a review artifact a person names on purpose.
const shotsFlag = flag('shots');
if (!shotsFlag) {
  // The path is looked up rather than typed: the facade's committed set is
  // `baselines/screenshots/`, a block's is `baselines/screenshots-<scenario>/`.
  const house = ['screenshots-' + scenario.name, 'screenshots']
    .map((d) => join(HERE, 'baselines', d))
    .find((d) => existsSync(d)) ?? join(HERE, 'baselines', `screenshots-${scenario.name}`);
  console.error(
    `--shots <dir> is required: the driver writes one screenshot per state per scheme, and it has no default.\n` +
    `The house path for "${scenario.name}" is ${relative(process.cwd(), house)} — or any scratch dir.`,
  );
  process.exit(2);
}
const SHOTS = resolve(shotsFlag);
mkdirSync(SHOTS, { recursive: true });

for (const k of pageKeys) {
  if (!scenario.pages[k]) {
    console.error(`unknown page key "${k}" — scenario declares: ${Object.keys(scenario.pages).join(', ')}`);
    process.exit(2);
  }
}

// ------------------------------------------------------- optional page server
// LIFECYCLE. Cleanup used to sit AFTER the run as two bare statements
// (`await browser.close(); server?.kill();`), and every throw above them skipped
// it. The paths that actually escaped are the ones OUTSIDE the per-state try —
// `chromium.launch()`, the `--serve` readiness wait, `browser.newContext()`,
// `page.goto()` and a scenario's `ready` hook. (A STATE that throws was already
// caught by that inner try and never leaked the server; the report of this defect
// said "a state throws", and the reproduced escape was `ready`.) Each escape left
// serve.mjs holding the port, so
// the NEXT run died on EADDRINUSE instead of on its own defect — orphans on
// 8952/8956/8957 were swept by hand three times in one session, and one round had
// to establish a stray process was not its own before killing it. The promise
// made now is three promises, not one:
//   * `finally` covers every IN-PROCESS unwind, from the spawn through the last
//     state — every throw and every rejected await. This is the load-bearing one.
//   * the signal guard covers what a `finally` cannot: SIGINT/SIGTERM end the
//     process without unwinding it, so no `finally` gets a chance to run. Ctrl-C
//     in a terminal reaches serve.mjs too (same process group), but `kill <pid>`
//     on the driver does not, and that orphans serve.mjs the same way. Its wait is
//     BOUNDED, so a wedged browser cannot turn Ctrl-C into an ignored signal.
//   * `process.on('exit')` cannot await anything, so it only re-sends the
//     synchronous kill — the belt for an exit that never reaches the `finally`
//     (`process.exit()` does not unwind the stack).
// shutdown() is idempotent, so an overlap between any two of those is harmless.
let server;
let browser;
async function shutdown() {
  // The page first, then the server it was reading from.
  try { await browser?.close(); } catch { /* already gone — the child kill below is the one that matters */ }
  browser = undefined;
  if (server) {
    const gone = once(server, 'exit').catch(() => {}); // `once` rejects on an 'error' emit; a dead child is not a failure here
    // `kill` is a SIGNAL, not a reap. Returning without waiting lets the child
    // outlive the driver for long enough to still hold the port, which hands
    // EADDRINUSE to the NEXT run. Bounded and unref'd: a serve.mjs that ignores
    // SIGTERM costs no more than the timeout, and cannot delay a finished run.
    server.kill();
    await Promise.race([gone, new Promise((r) => { setTimeout(r, 2000).unref(); })]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
    server = undefined;
  }
}
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.on(signal, () => {
    void Promise.race([shutdown(), new Promise((r) => { setTimeout(r, 3000); })]).finally(() => process.exit(code));
  });
}
process.on('exit', () => { server?.kill(); });

if (flag('serve')) {
  // PRE-FLIGHT, driver-side, and ONLY when this driver is the one about to bind.
  // Without `--serve` the port belongs to whoever `--base` points at and a busy
  // port there is the normal case, so this must not fire. With `--serve` the bind
  // is ours, and a busy port is nearly always the previous invocation's serve.mjs
  // still alive — so the driver names the holder and stops, instead of letting the
  // child die on EADDRINUSE and reporting the misleading "serve.mjs exited before
  // listening". Nothing is spawned: the message arrives before the work.
  const holders = portHolders(PORT);
  if (holders.length) {
    console.error(
      `port ${PORT} is already held — refusing to start a second page server on it.\n` +
      `${formatPortHolders(holders)}\n` +
      `A held port with no other run in progress is almost always a STALE block-driver run: a run that threw before its cleanup — a navigation or a scenario's 'ready' hook, or a serve that never came up — used to leave serve.mjs alive holding the port. If the pid above is a serve.mjs or driver.mjs you do not recognise as yours, it is stale — kill it. If it belongs to another round's run, leave it and pass --port with a free one.`,
    );
    process.exit(2);
  }
  server = spawn(process.execPath, [join(HERE, 'serve.mjs')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      ROOT: resolve(flag('serve')),
      KIT: resolve(flag('kit') ?? join(HERE, '..', '..', 'dist')),
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('listening')) res(); });
    server.on('exit', (code) => rej(new Error(`serve.mjs exited ${code} before listening`)));
    setTimeout(() => rej(new Error('serve.mjs never came up')), 5000);
  });
}

// ------------------------------------------------------------------ execution
// Everything from the browser launch to the printed verdict sits inside this one
// `try`, and the exit code is RETURNED rather than passed to `process.exit()`
// inside it: `process.exit()` ends the process without unwinding, so a `finally`
// never runs and even the success path would rely on the 'exit' belt alone.
let exitCode = 0;
try {
  browser = await chromium.launch();

  async function runStory(pageKey, colorScheme) {
    const spec = scenario.pages[pageKey];
    const ctx = await browser.newContext({
      colorScheme,
      viewport: scenario.viewport ?? { width: 1100, height: 760 },
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(`[${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));

    const run = { page: pageKey, colorScheme, states: [], consoleErrors, failures: [], skippedProbes: [], skippedStyles: [] };
    const sctx = { pageKey, spec, colorScheme, scenario };

    await page.goto(`${BASE}${spec.path}`, { waitUntil: 'load' });
    if (scenario.ready) await scenario.ready(page, sctx);

    // LAYOUT SKIP (spec 5.3 ruling, amended in execution): a page that mounts the
    // same block in a different document MAY declare `skipLayout: true` on its
    // spec, and each state names the probes that are geometry in `layoutProbes`.
    // Such a page skips those probes, their `expect` entries, and every
    // styleProbe, and asserts state, navigation and console-cleanliness instead.
    // It is supported and never inferred, but no page declares it today: the
    // react host carries the probes, because each is a comparison among the
    // block's own boxes and the emitted tree imports the block's stylesheet. The
    // SKIP is recorded rather than dropped: see the SKIPPED SKIPS report below,
    // which names every probe a run that DOES declare it did not measure.
    const skipLayout = spec.skipLayout === true;

    for (const state of scenario.states) {
      const layout = new Set(state.layoutProbes ?? []);
      const rec = { name: state.name, probes: {}, styles: {} };
      try {
        if (state.act) await state.act(page, sctx);
        await page.screenshot({ path: join(SHOTS, `${pageKey}-${colorScheme}-${state.name}.png`) });
        for (const [key, probe] of Object.entries(state.probes ?? {})) {
          if (skipLayout && layout.has(key)) { run.skippedProbes.push(`${state.name}/${key}`); continue; }
          rec.probes[key] = await probe(page, sctx);
        }
        if (skipLayout) {
          // Named as well as counted: a count says a measurement is missing, a name
          // says WHICH claim is not being made, which is what a reader needs to
          // decide whether the page spec is still telling the truth.
          for (const sp of state.styleProbes ?? []) run.skippedStyles.push(`${state.name}/${sp.name}`);
        }
        for (const sp of skipLayout ? [] : state.styleProbes ?? []) {
          const values = await sp.target(page, sctx).evaluate(
            (el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])),
            sp.props,
          );
          rec.styles[sp.name] = values;
        }
        for (const [key, want] of Object.entries(state.expect ?? {})) {
          // An expectation over a probe that was SKIPPED is not an expectation
          // this run took a measurement for. Comparing it anyway fails on
          // `undefined`; passing it silently would be worse, which is why the
          // skip is keyed off the same `layoutProbes` list rather than off the
          // value being absent.
          if (skipLayout && layout.has(key)) continue;
          const got = rec.probes[key];
          if (JSON.stringify(got) !== JSON.stringify(want)) {
            run.failures.push(`${pageKey}/${colorScheme}/${state.name}: probe "${key}" expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
          }
        }
      } catch (err) {
        rec.error = String(err).slice(0, 400);
        run.failures.push(`${pageKey}/${colorScheme}/${state.name}: state errored — ${rec.error}`);
        run.states.push(rec);
        break; // states are sequential; later states are meaningless now
      }
      run.states.push(rec);
    }

    // MERGED, page patterns first: a page can carry noise the scenario's other
    // pages must not be allowed to carry. The react host is a different document
    // with a different dev-time runtime in it, and widening the SCENARIO's list
    // to cover a host warning would quietly relax the `block` page too.
    const ignore = [...(spec.consoleIgnore ?? []), ...(scenario.consoleIgnore ?? [])];
    const realErrors = consoleErrors.filter((e) => !ignore.some((re) => re.test(e)));
    if (realErrors.length) run.failures.push(`${pageKey}/${colorScheme}: console not clean — ${realErrors.join(' | ')}`);

    await ctx.close();
    return run;
  }

  const verdict = { scenario: scenario.name, base: BASE, runs: [], failures: [] };
  for (const pageKey of pageKeys) {
    for (const scheme of schemes) {
      const run = await runStory(pageKey, scheme);
      verdict.runs.push(run);
      verdict.failures.push(...run.failures);
    }
  }
  // -------------------------------------------------------------------- diffing
  // Deep-diff two probe/style trees; returns human-readable mismatch lines.
  function diffStates(labelA, statesA, labelB, statesB, prefix) {
    const out = [];
    const byName = new Map(statesB.map((s) => [s.name, s]));
    for (const a of statesA) {
      const b = byName.get(a.name);
      if (!b) { out.push(`${prefix}: state "${a.name}" present in ${labelA} but missing from ${labelB}`); continue; }
      for (const bucket of ['probes', 'styles']) {
        const keys = new Set([...Object.keys(a[bucket] ?? {}), ...Object.keys(b[bucket] ?? {})]);
        for (const k of keys) {
          const av = JSON.stringify(a[bucket]?.[k]);
          const bv = JSON.stringify(b[bucket]?.[k]);
          if (av !== bv) out.push(`${prefix}/${a.name}: ${bucket.slice(0, -1)} "${k}" — ${labelA}=${av} vs ${labelB}=${bv}`);
        }
      }
    }
    for (const b of statesB) if (!statesA.some((s) => s.name === b.name)) out.push(`${prefix}: state "${b.name}" present in ${labelB} but missing from ${labelA}`);
    return out;
  }

  // Parity mode: two pages requested -> compare them state-for-state per scheme.
  if (pageKeys.length === 2) {
    const [a, b] = pageKeys;
    for (const scheme of schemes) {
      const ra = verdict.runs.find((r) => r.page === a && r.colorScheme === scheme);
      const rb = verdict.runs.find((r) => r.page === b && r.colorScheme === scheme);
      const skip = scenario.parityIgnore ?? [];
      const diffs = diffStates(a, ra.states, b, rb.states, `parity/${scheme}`)
        .filter((d) => !skip.some((re) => re.test(d)));
      verdict.failures.push(...diffs);
    }
  }

  // Check mode: diff this run against a recorded baseline verdict.
  const baselinePath = flag('baseline');
  if (baselinePath) {
    const baseline = JSON.parse(readFileSync(resolve(baselinePath), 'utf8'));
    for (const run of verdict.runs) {
      const ref = baseline.runs.find((r) => r.page === run.page && r.colorScheme === run.colorScheme);
      if (!ref) { verdict.failures.push(`baseline has no run for ${run.page}/${run.colorScheme}`); continue; }
      verdict.failures.push(...diffStates('baseline', ref.states, 'current', run.states, `baseline/${run.page}/${run.colorScheme}`));
    }
  }

  // ------------------------------------------------------------- skipped skips
  // DECIDED LOUDLY. A probe this run did not take a measurement for is a claim the
  // page spec withheld, and the one thing such an omission must never be is quiet:
  // a green run over a page that skipped its geometry reads exactly like a green
  // run that measured it. Every skip is named here and in the verdict JSON, so a
  // reader of the gate's output learns it from the tool rather than from history.
  for (const run of verdict.runs) {
    const skips = [
      ...(run.skippedProbes.length ? [`${run.skippedProbes.length} layout probe(s) NOT measured (${run.skippedProbes.join(', ')})`] : []),
      ...(run.skippedStyles.length ? [`${run.skippedStyles.length} style probe(s) NOT measured (${run.skippedStyles.join(', ')})`] : []),
    ];
    if (skips.length) console.error(`SKIP ${run.page}/${run.colorScheme} -- skipLayout is declared on this page: ${skips.join('; ')}`);
  }

  // --------------------------------------------------------------------- output
  verdict.pass = verdict.failures.length === 0;
  const json = JSON.stringify(verdict, null, 2) + '\n';
  if (flag('record')) {
    mkdirSync(dirname(resolve(flag('record'))), { recursive: true });
    writeFileSync(resolve(flag('record')), json);
  }
  if (flag('out')) {
    mkdirSync(dirname(resolve(flag('out'))), { recursive: true });
    writeFileSync(resolve(flag('out')), json);
  }
  console.log(json);
  console.error(verdict.pass ? `PASS — ${verdict.runs.length} runs, 0 failures` : `FAIL — ${verdict.failures.length} failure(s):\n${verdict.failures.map((f) => `  RED ${f}`).join('\n')}`);
  exitCode = verdict.pass ? 0 : 1;
} finally {
  // Runs on the success path and on every throw above. A throwing body rethrows
  // after this, so a failed run still exits non-zero with its stack.
  await shutdown();
}
process.exit(exitCode);
