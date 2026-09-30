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
 *                               compare the fresh capture against the
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
 * THE TOLERANCE IS A MEASUREMENT, NOT A PICK, because a byte-wise verdict was
 * actively misleading its reader. Recorded across two independent re-records of
 * the block driver's screenshot set (2026-09-27/28): one run differed from the
 * previous one in 35 of 100 images, in up to 18,816 pixels, and every one of
 * those differing pixels was within a per-channel delta of 1 to 2; a later run
 * saw 1 to 9 differing pixels per image at a worst-case per-channel delta of 5,
 * and one of those images came back BYTE-IDENTICAL on the next pass. So the same
 * two renders of the same code land on either side of a byte comparison, and the
 * round that measured it reported nearly attributing that noise to its own
 * change. NOISE_CHANNEL_DELTA below is the worst per-channel delta any of those
 * recorded runs produced.
 *
 * What that buys, and what it does not: a pixel counts as changed only when a
 * channel differs by MORE than NOISE_CHANNEL_DELTA, and every line the report
 * prints carries the changed-pixel count and the worst channel delta, so the
 * magnitude is never hidden behind a boolean. `differs` therefore still means
 * something worth reading -- pixels that moved further than any noise anyone has
 * recorded here, or a changed image size -- and it still is not a gate: nothing
 * asserts, and re-recording stays a deliberate KAI_SCREENSHOT_UPDATE=1.
 * A real visual regression is a moved or recoloured element, which repaints edge
 * pixels by far more than 5 per channel -- and it arrives as a count in the
 * thousands beside a noise count in the single digits. Do NOT widen this
 * constant until a run reads the way you want: an intended change is re-recorded
 * with KAI_SCREENSHOT_UPDATE=1, and every widening done to make a capture pass is
 * how a real regression gets blessed. Widen it only with a new measurement of
 * this same shape, recorded here.
 *
 * Alpha is not compared: every one of these captures is a full-opacity render,
 * so an alpha difference is a screenshot bug rather than a visual one.
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
import { PNG } from 'pngjs';
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

/**
 * The per-channel delta a pixel must EXCEED to count as changed. Derived, not
 * picked: 5 is the worst per-channel delta measured between two renders of
 * identical code in the block driver's recorded re-records (see the docblock).
 */
export const NOISE_CHANNEL_DELTA = 5;

type Verdict = 'same-bytes' | 'within-noise' | 'differs' | 'no-baseline' | 'not-compared';

type Comparison = {
  verdict: Verdict;
  /** Pixels past NOISE_CHANNEL_DELTA, or -1 when the two images are not
   *  comparable at all (different sizes, or nothing to compare against). */
  changedPixels: number;
  /** The worst single-channel difference anywhere in the image, or -1. */
  maxChannelDelta: number;
};

const captures: Array<{ rel: string } & Comparison> = [];

/** Capture `target` at the committed path `rel`, or beside the evidence when
 *  this is a plain run, and compare it against the committed baseline. */
export async function captureBaseline(target: Locator | Page, rel: string): Promise<void> {
  const out = UPDATE_BASELINES ? join(PKG, rel) : evidenceDir(rel);
  mkdirSync(dirname(out), { recursive: true });
  await target.screenshot({ path: out });
  if (UPDATE_BASELINES) return;
  captures.push({ rel, ...compare(out, join(PKG, rel)) });
}

const notComparable = (verdict: Verdict): Comparison => ({ verdict, changedPixels: -1, maxChannelDelta: -1 });

/**
 * The comparison itself, over two encoded PNGs. Exported so the tolerance can be
 * exercised without a browser: a decision this easy to misread should be one a
 * reader can re-measure in a few lines rather than re-pick from the prose.
 */
export function compareImages(fresh: Buffer, baseline: Buffer): Comparison {
  // The fast path, and the only verdict here that needs no decoding.
  if (fresh.equals(baseline)) return { verdict: 'same-bytes', changedPixels: 0, maxChannelDelta: 0 };

  const a = PNG.sync.read(fresh);
  const b = PNG.sync.read(baseline);
  // A size change is not a pixel-delta question, and counting it as one would
  // report a handful of pixels for an image that became a different shape.
  if (a.width !== b.width || a.height !== b.height) return notComparable('differs');

  let changedPixels = 0;
  let maxChannelDelta = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    let worst = 0;
    for (let c = 0; c < 3; c++) {
      const delta = Math.abs(a.data[i + c] - b.data[i + c]);
      if (delta > worst) worst = delta;
    }
    if (worst > maxChannelDelta) maxChannelDelta = worst;
    if (worst > NOISE_CHANNEL_DELTA) changedPixels += 1;
  }
  return {
    verdict: changedPixels === 0 ? 'within-noise' : 'differs',
    changedPixels,
    maxChannelDelta,
  };
}

function compare(captured: string, committed: string): Comparison {
  if (!onBaselinePlatform) return notComparable('not-compared');
  if (!existsSync(committed)) return notComparable('no-baseline');
  return compareImages(readFileSync(captured), readFileSync(committed));
}

/** The magnitude, printed beside every verdict. A verdict word on its own is
 *  what made a reader take run-to-run noise for their own change. */
function magnitude({ changedPixels, maxChannelDelta }: Comparison): string {
  if (changedPixels < 0) return 'dimensions differ';
  return `${changedPixels} px past delta ${NOISE_CHANNEL_DELTA}, worst delta ${maxChannelDelta}`;
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
  for (const capture of captures) {
    console.log(
      `[${suite}]   ${capture.verdict.padEnd(13)} ${capture.rel} (${magnitude(capture)})`,
    );
  }
  if (!onBaselinePlatform) {
    console.log(
      `[${suite}] captures were NOT compared: the committed baselines are ${BASELINE_PLATFORM}-rendered. ` +
        `Re-record on ${BASELINE_PLATFORM} with KAI_SCREENSHOT_UPDATE=1.`,
    );
  } else if (captures.some((c) => c.verdict === 'differs' || c.verdict === 'no-baseline')) {
    console.log(
      `[${suite}] the captures marked above changed by more than the recorded run-to-run noise ` +
        `(delta ${NOISE_CHANNEL_DELTA}), or have no image at that path to compare against. Read the ` +
        `counts: single digits is the noise these baselines are known to carry. If the render change ` +
        `is intended, re-record deliberately with KAI_SCREENSHOT_UPDATE=1 — that writes the tracked PNGs.`,
    );
  }
}
