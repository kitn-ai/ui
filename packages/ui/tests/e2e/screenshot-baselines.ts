// tests/e2e/screenshot-baselines.ts
/**
 * Where a screenshot-writing spec PUTS its capture, and what a plain run does
 * with the committed PNG it used to overwrite.
 *
 * THE DEFECT THIS REPLACES. These specs called `screenshot({ path:
 * 'tests/e2e/__screenshots__/…' })` — straight onto COMMITTED images — so
 * running a suite rewrote tracked files as a side effect of reading them. CI
 * dirtied its own checkout on every run, a test that writes into the repository
 * is a test whose pass means less than it looks like, and a baseline got
 * re-recorded by whoever happened to run the suite instead of by a decision to
 * re-record it. `input-mask-ivp.spec.ts` had the same shape aimed at the tracked
 * evidence PNGs under `docs/superpowers/research/2026-08-24-field-mask/`.
 *
 * THE SHAPE, AND WHY THIS ONE. There is no comparison machinery to reuse: no
 * `toHaveScreenshot`, no `snapshotDir`, no `updateSnapshots` anywhere in these
 * specs (checked, not assumed), so Playwright's own `--update-snapshots` opt-in
 * cannot express this — these are direct `locator.screenshot()` captures, and
 * three of the four specs that use it are capture-only by their own docblocks.
 * So the flag is ours, and it is an update opt-in:
 *
 *   default                  -> capture into EVIDENCE_ROOT (outside the repo,
 *                               overridable with KAI_SCREENSHOT_DIR), then
 *                               byte-compare the fresh capture against the
 *                               committed baseline and REPORT the verdict.
 *                               Nothing under the repo is written.
 *   KAI_SCREENSHOT_UPDATE=1  -> capture onto the committed path itself. That is
 *                               the deliberate re-record, and never a CI step.
 *
 * The report asserts nothing on purpose: a capture that no longer matches is a
 * re-record decision for a human, and these specs' own assertions are about
 * behavior, not pixels. Making drift FAIL would put a rendering decision in the
 * merge gate, which is the thing the noisy version of this guard always does.
 * Note what "the baseline" is for the `pill-skins` captures: that directory is
 * GITIGNORED, so the image a capture is compared against is whatever the last
 * run left there, not a committed file.
 *
 * THE PLATFORM PROBLEM. The committed baselines were rendered on darwin, so a
 * render on another platform is not the same image — a different font rasteriser
 * and a different GPU stack decide where the pixels land — and comparing there
 * would compare two different machines' output. So:
 *
 *   - the CAPTURE-ONLY specs skip visibly off darwin (a `test.skip`, which the
 *     reporter prints as `N skipped` — not a silent pass),
 *   - the specs that ALSO assert behavior (`composer-ivp`, `promptinput-pills`,
 *     `input-mask-ivp`) keep running everywhere and skip only the COMPARE, since
 *     the behavior is what those tests are for and a rendering reason must not
 *     take real assertions out of the gate.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Locator, Page } from '@playwright/test';

// `tests/e2e` -> the package root, so both the committed paths below and the
// spec-relative `tests/e2e/__screenshots__/…` they are given resolve the same
// way whether a suite is run from the package or the repo root.
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The platform whose rasteriser the committed baselines hold. */
export const BASELINE_PLATFORM = 'darwin';

export const BASELINE_SKIP_REASON =
  `committed screenshot baselines are ${BASELINE_PLATFORM}-rendered, so a capture on ` +
  `${process.platform} is not the same image and there is nothing here to compare it against`;

export const onBaselinePlatform = process.platform === BASELINE_PLATFORM;

export const UPDATE_BASELINES = process.env.KAI_SCREENSHOT_UPDATE === '1';

const EVIDENCE_ROOT = process.env.KAI_SCREENSHOT_DIR
  ? resolve(process.env.KAI_SCREENSHOT_DIR)
  : join(tmpdir(), 'kai-screenshot-evidence');

/**
 * A capture directory for `rel` (a repo-relative path). Used by the specs that
 * write a whole evidence tree rather than named baselines, so they can keep
 * their own layout while landing outside the repo.
 */
export function evidenceDir(rel: string): string {
  return join(EVIDENCE_ROOT, rel);
}

type Verdict = 'matches' | 'differs' | 'no-baseline' | 'not-compared';

const captures: Array<{ rel: string; verdict: Verdict }> = [];

/** Capture `target` at the committed path `rel`, or beside the evidence when
 *  this is a plain run, and compare it against the committed baseline. */
export async function captureBaseline(target: Locator | Page, rel: string): Promise<void> {
  const out = UPDATE_BASELINES ? join(PKG, rel) : evidenceDir(rel);
  mkdirSync(dirname(out), { recursive: true });
  await target.screenshot({ path: out });
  if (UPDATE_BASELINES) return;
  captures.push({ rel, verdict: compare(out, join(PKG, rel)) });
}

function compare(captured: string, committed: string): Verdict {
  if (!onBaselinePlatform) return 'not-compared';
  if (!existsSync(committed)) return 'no-baseline';
  return readFileSync(captured).equals(readFileSync(committed)) ? 'matches' : 'differs';
}

/** Call from `test.afterAll` in a spec that captured anything. */
export function reportBaselineCaptures(suite: string): void {
  const where = UPDATE_BASELINES
    ? 'the committed baseline paths (KAI_SCREENSHOT_UPDATE=1)'
    : EVIDENCE_ROOT;
  if (captures.length === 0) {
    console.log(`[${suite}] no screenshot capture this run (writes would go to ${where})`);
    return;
  }
  console.log(`[${suite}] ${captures.length} screenshot capture(s) -> ${where}`);
  for (const { rel, verdict } of captures) console.log(`[${suite}]   ${verdict.padEnd(13)} ${rel}`);
  if (!onBaselinePlatform) {
    console.log(
      `[${suite}] captures were NOT compared: the committed baselines are ${BASELINE_PLATFORM}-rendered. ` +
        `Re-record on ${BASELINE_PLATFORM} with KAI_SCREENSHOT_UPDATE=1.`,
    );
  } else if (captures.some((c) => c.verdict !== 'matches')) {
    console.log(
      `[${suite}] some captures do not match the image at that path. If the render change is intended, ` +
        `re-record deliberately with KAI_SCREENSHOT_UPDATE=1 — that writes the tracked PNGs.`,
    );
  }
}
