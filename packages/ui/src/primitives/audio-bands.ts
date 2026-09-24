/**
 * Pure reductions from AnalyserNode output to the numbers a visualizer draws.
 *
 * Ported from livekit/components-js `packages/react/src/hooks/useTrackVolume.ts`
 * (Apache License 2.0). Both the dB normalization curve AND the band split are
 * carried over so our output matches theirs frame for frame: the split is
 * upstream's linear-proportional chunking. An interim revision here spaced the
 * buckets geometrically to serve a wide raw-mic window (bins 4-120); the spacing
 * and that window were reverted together.
 */

/** dB floor of the normalization curve. Below this reads as silence. */
const MIN_DB = -100;
/** dB ceiling. Above this saturates. */
const MAX_DB = -10;

/**
 * Map one `getFloatFrequencyData` decibel value to 0..1.
 *
 * The `sqrt` at the end is a perceptual curve, not a normalization step: it
 * lifts quiet detail so low-level audio still moves the bars visibly.
 */
export function normalizeDb(value: number): number {
  if (value === -Infinity) return 0;
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, value));
  return Math.sqrt(1 - (clamped * -1) / 100);
}

/**
 * Average a slice of the frequency spectrum into `bands` buckets.
 *
 * `loPass` / `hiPass` are BIN INDICES relative to `fftSize`, not frequencies.
 * Upstream's naming is misleading; the behavior is a plain array slice.
 *
 * Bucket edges are LINEAR-PROPORTIONAL across `[loPass, hiPass]`, upstream
 * LiveKit's own distribution (`useMultibandTrackVolume`): each band averages an
 * equal consecutive run of bins, `floor(i * total / bands)` to
 * `floor((i + 1) * total / bands)`, and a run that comes out empty reads 0. With
 * the default window's 100 bins and 5 bands, that is 20 bins averaged per band,
 * which is part of upstream's idle stillness: any single flickering bin is
 * diluted 20:1.
 *
 * An interim revision spaced these buckets geometrically so that a wide
 * raw-microphone window (bins 4-120) kept its upper buckets alive. That concentrated
 * the noisiest few low bins into band 0 undiluted, which the centre-out mirror below
 * then promoted to the CENTRE element: the measured core of the "white noise when the
 * mic is on" defect. Reverted to upstream's split; the mirror stays, orthogonal.
 */
export function reduceToBands(
  freq: Float32Array,
  bands: number,
  loPass: number,
  hiPass: number,
): number[] {
  // `slice` clamps both ends into the buffer and yields an empty window when
  // hiPass <= loPass -- every bucket then reads 0 below, no special case.
  const window = freq.slice(Math.max(0, loPass), Math.max(0, hiPass));
  const total = window.length;
  const out: number[] = [];

  for (let i = 0; i < bands; i++) {
    const start = Math.floor((i * total) / bands);
    const end = Math.floor(((i + 1) * total) / bands);
    if (end <= start) {
      out.push(0);
      continue;
    }
    let sum = 0;
    for (let j = start; j < end; j++) sum += normalizeDb(window[j] as number);
    out.push(sum / (end - start));
  }

  return out;
}

/** Root-mean-square of `getByteFrequencyData`, scaled to 0..1. */
export function reduceToVolume(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) {
    const a = bytes[i] as number;
    sum += a * a;
  }
  return Math.sqrt(sum / bytes.length) / 255;
}

/**
 * Resize a caller-supplied band array to exactly `count` entries. Extra values
 * are dropped; a short array repeats its last value (0 when empty) so a
 * consumer passing the wrong length gets a sane picture instead of holes.
 */
export function normalizeVolumeBands(bands: number[], count: number): number[] {
  if (bands.length === count) return bands;
  if (bands.length > count) return bands.slice(0, count);
  const last = bands[bands.length - 1] ?? 0;
  return [...bands, ...new Array(count - bands.length).fill(last)];
}

/**
 * Maps a smaller, ordered set of "half" band values (index 0 = loudest,
 * typically lowest frequency) onto `count` positions laid out in a straight
 * line -- a row of bars, or a row of grid columns -- centre-outward and
 * mirrored: band 0 lands on the centre (an odd `count`) or the centre PAIR
 * (an even one, both positions sharing band 0), band 1 on the pair either
 * side of that, and so on outward to the two ends.
 *
 * Every scripted state in this component is already centre-oriented, and
 * `speaking` fed the analyser's raw band order straight across, which was the
 * one state inconsistent with that. This closes that gap.
 *
 * `halfBands` should have exactly `Math.ceil(count / 2)` entries: match the
 * counts rather than leaning on `normalizeVolumeBands`'s
 * pad-by-repeating-the-last-value, which would produce a subtly wrong (not
 * obviously broken) shape here. A shorter input still degrades sanely, the
 * outermost positions repeating the last value available.
 */
export function mirrorBandsCenterOut(halfBands: number[], count: number): number[] {
  const center = (count - 1) / 2;
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const ring = Math.floor(Math.abs(i - center));
    out[i] = halfBands[Math.min(ring, halfBands.length - 1)] ?? 0;
  }
  return out;
}

/**
 * Maps a smaller, ordered set of "half" band values onto `count` positions arranged
 * around a RING (radial's spokes), mirrored left-right across a single vertical axis
 * rather than fanned from a linear centre: index 0 and, for an even `count`, index
 * `count / 2` are each their own fixed point of the reflection and both land band 0, and
 * every other index pairs with its mirror partner at `count - i` (radial only renders `count`
 * divisible by 4, so the even case is the common one).
 *
 * Radial's own geometry (`variant-radial.tsx`) places index 0 at the BOTTOM of the ring,
 * so band 0 reads at the bottom, fading toward the top. A true 4-fold symmetry would need
 * a second, horizontal mirror axis; this reuses the same `Math.ceil(count / 2)` band
 * request as the linear mirror above, one rule for every variant.
 *
 * For an even `count` the antipodal index needs one more distinct band than the linear
 * mirror does, so with only `Math.ceil(count / 2)` bands available it clamps to the same
 * value as its nearest neighbour. Deliberate, for the same one-rule reason.
 */
export function mirrorBandsAroundRing(halfBands: number[], count: number): number[] {
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const ring = Math.min(i, count - i);
    out[i] = halfBands[Math.min(ring, halfBands.length - 1)] ?? 0;
  }
  return out;
}
