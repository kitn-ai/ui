import { createSignal, createEffect, onCleanup, type Accessor } from 'solid-js';
import { reduceToBands, reduceToVolume } from './audio-bands';

export interface AudioAnalysisOptions {
  // Default 5. An accessor is resolved INSIDE the analysis effect, so a change to
  // whatever signal backs it (a caller's variant or size switching) rebuilds the
  // analyser at the new bucket count instead of silently leaving `bands()` padded or
  // truncated to a stale size.
  /** Number of frequency buckets to produce, or an accessor for a live count. Default 5. */
  bands?: number | (() => number);
  /** Low bin index of the pass window. NOT a frequency. Default 100. */
  loPass?: number;
  // Legitimately input-dependent, unlike `fftSize`/`smoothingTimeConstant`:
  // the default window expects PROCESSED speech (an agent's TTS track, or a mic
  // captured with AGC/noise suppression on). For raw, unprocessed input (an un-gained
  // recording, music, ambience) a wide low window such as `loPass: 4, hiPass: 120`
  // reads energy the default deliberately gates out; see DEFAULTS below for the trade
  // both ways.
  /** High bin index of the pass window. NOT a frequency. Default 200. */
  hiPass?: number;
  /** Minimum ms between updates. Default 32 (about 30fps). */
  updateInterval?: number;
}

/**
 * The default window is upstream's COMPONENT window, bins 100-200: every shipped
 * agents-ui visualizer passes `{ loPass: 100, hiPass: 200 }`, while their hook's own
 * default (100-600) is used by no shipped component, so parity means matching the
 * components.
 *
 * At fftSize 2048 that is roughly 2.3-4.7kHz, the sibilance band above where a room's
 * noise floor lives. Everything at or below -100dB normalizes to 0, and a room's tone
 * measures well below that floor across this window while sitting well above it lower
 * down. The narrow window plus the hard floor IS upstream's noise gate, which is what
 * keeps their idle bars still where a wide window would show the room breathing.
 *
 * The trade, measured on a real un-processed recording: through 100-200, quiet speech
 * frames read all-zero (54% of that clip's frames). Upstream lives with it because its
 * input is conditioned first, and the mic stories here request the same constraints. For
 * RAW input (un-gained recordings, music) `loPass: 4, hiPass: 120` remains the measured
 * opt-in.
 */
export const DEFAULTS = {
  bands: 5,
  loPass: 100,
  hiPass: 200,
  updateInterval: 32,
} as const;

/**
 * `fftSize`/`smoothingTimeConstant` are deliberately NOT caller-configurable
 * options, unlike everything above. They exist in two different, non-tunable
 * shapes below instead: one AnalyserNode per reduction, each matching
 * upstream LiveKit's own hook for that reduction. A single flat
 * `smoothingTimeConstant` option (this hook's original design) is exactly
 * the bug that made bars snap back to rest instead of easing like upstream's
 * do: one value silently applied to both a fast reduction and a slow one.
 * Hard-coding removes the only way a caller (or a future edit here) could
 * reintroduce that.
 *
 * These analyser shapes (and DEFAULTS above) are EXPORTED as the kit's
 * analysis-settings contract: external instrumentation -- the
 * examples/internal/livekit-parity probe -- imports them instead of
 * restating the numbers, so a change here propagates instead of drifting.
 */

/**
 * Matches upstream's `useMultibandTrackVolume`, which drives the DOM
 * bar/grid/radial variants: `{ fftSize: 2048 }`, no `smoothingTimeConstant`
 * given, so the AnalyserNode uses the Web Audio spec default of 0.8. That
 * slow decay (roughly 330ms to fall to 10% of a peak, at this hook's 32ms
 * sample interval) is what makes bars ease back to rest after speech stops
 * instead of snapping.
 */
export const BANDS_ANALYSER = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
} as const;

/**
 * The wave/aura settings, matched to upstream's `useTrackVolume`: a faster decay
 * (about 123ms to 10% of peak) keeps the shaders' reactivity inside the ~33ms lag the
 * aurora variant is tuned against, where the bands' slower 0.8 would make them look
 * sluggish.
 *
 * `minDecibels`/`maxDecibels` are upstream's defaults, not the Web Audio spec's
 * -100/-30. They rescale `getByteFrequencyData`, this analyser's whole output, over a
 * 20dB window saturating at -80dB, which is what makes the volume scalar run hot
 * (speech ~0.5-0.9). On the spec scale the same speech reads about 3x colder, leaving
 * the shaders under-reacting. The BANDS analyser gets no such pair: it is read with
 * `getFloatFrequencyData`, where the two properties do nothing.
 */
export const VOLUME_ANALYSER = {
  fftSize: 512,
  smoothingTimeConstant: 0.55,
  minDecibels: -100,
  maxDecibels: -80,
} as const;

/** `bands` accepts a plain number or a live accessor; read whichever was given. */
function resolveBandCount(bands: number | (() => number)): number {
  return typeof bands === 'function' ? bands() : bands;
}

/**
 * One AudioContext for the whole page. Contexts are expensive and browsers cap
 * how many can exist, so a per-mount context would break a page with several
 * visualizers on it.
 */
let sharedContext: AudioContext | undefined;

function getContext(): AudioContext | undefined {
  if (typeof AudioContext === 'undefined') return undefined;
  sharedContext ??= new AudioContext();
  return sharedContext;
}

/**
 * `createMediaElementSource` THROWS if called twice for the same element, and
 * there is no API to ask whether an element already has a source node. Cache
 * them. A WeakMap so a removed <audio> can still be collected.
 */
const webComponentSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

/**
 * `createMediaStreamSource` does NOT throw on a second call for the same
 * stream, unlike the element API above -- it is legal per spec to build
 * several independent source nodes from one MediaStream. In practice several
 * simultaneous nodes reading the same stream is a known source of
 * intermittent silent data loss in Chromium (observed here as `volume`
 * sticking at 0 for several seconds with three or more visualizers on one
 * live microphone). Cache and share one node per stream, exactly like the
 * element path, so N consumers is one node with N analyser taps rather than
 * N nodes racing each other.
 */
const streamSources = new WeakMap<MediaStream, MediaStreamAudioSourceNode>();

/**
 * `instanceof MediaStream` is not usable here: that global does not exist in
 * every environment (jsdom included), and referencing it throws a
 * ReferenceError instead of returning false. Every DOM element carries a
 * `tagName`; a MediaStream never does, so it is a safe, environment-agnostic
 * discriminator between the two accepted source types.
 */
function isMediaElement(src: MediaStream | HTMLMediaElement): src is HTMLMediaElement {
  return 'tagName' in src;
}

/** Resume a context parked by the autoplay policy, on the first user gesture. */
function resumeOnGesture(ctx: AudioContext): () => void {
  if (ctx.state !== 'suspended') return () => {};
  if (typeof document === 'undefined') return () => {};

  const resume = () => void ctx.resume().catch(() => {});
  const events = ['pointerdown', 'keydown', 'touchstart'] as const;
  events.forEach((e) => document.addEventListener(e, resume, { once: true, passive: true }));
  return () => events.forEach((e) => document.removeEventListener(e, resume));
}

/**
 * Turn a live audio source into numbers a visualizer can draw.
 *
 * Runs TWO analysers off one source node: `bands` for the DOM variants and a
 * scalar `volume` for the shader ones, each with its own `fftSize` and
 * `smoothingTimeConstant` matching upstream's two separate hooks (see
 * BANDS_ANALYSER / VOLUME_ANALYSER above). An earlier version of this hook
 * shared a single analyser between both reductions as an optimization; that
 * silently forced one smoothing behavior onto both and made bars snap back
 * to rest instead of easing like upstream's do. What this still saves over
 * upstream: one shared, cached source node per element/stream (see
 * webComponentSources/streamSources below) instead of a fresh one per hook
 * instance, and one requestAnimationFrame loop reading both analysers each
 * tick instead of two independent timers.
 *
 * Safe to call with no source: it emits zeros and never constructs a context,
 * which is what makes the state-driven (no audio) mode work.
 */
export function useAudioAnalysis(
  source: () => MediaStream | HTMLMediaElement | undefined,
  options: AudioAnalysisOptions = {},
): { bands: Accessor<number[]>; volume: Accessor<number> } {
  const opts = { ...DEFAULTS, ...options };
  const [bands, setBands] = createSignal<number[]>(new Array(resolveBandCount(opts.bands)).fill(0));
  const [volume, setVolume] = createSignal(0);

  createEffect(() => {
    const src = source();
    // Read INSIDE the effect, not from the outer `opts.bands` closure: when
    // this is an accessor, calling it here is what makes the effect track it,
    // so a later change reruns this whole setup (new analyser, right-sized
    // arrays) instead of leaving the old bucket count wired up forever.
    const bandCount = resolveBandCount(opts.bands);

    // Reset to a correctly-sized zero array whenever the source or the band
    // count changes, so a stale picture never lingers after the mic stops or
    // the requested resolution changes.
    setBands(new Array(bandCount).fill(0));
    setVolume(0);

    if (!src) return;

    const ctx = getContext();
    if (!ctx) return; // SSR, or a browser without Web Audio.
    if (typeof requestAnimationFrame === 'undefined') return;
    if (typeof cancelAnimationFrame === 'undefined') return;

    // Captured at SETUP and closed over, never re-resolved as a global inside
    // `onCleanup`: cleanup can run after the host removed the DOM globals (a
    // `kai-*` release is deferred one microtask past detachment, so an
    // environment teardown gets in between), and a bare `cancelAnimationFrame`
    // there throws -- from a promise nobody holds, so it lands as an unhandled
    // rejection that fails the run while every test passes.
    // See tests/components/teardown-without-dom-globals.test.tsx.
    //
    // The FUNCTION, not the view. The `const win = window` capture that fixes a
    // bare `document` does nothing here: `window === globalThis` -- measured, in
    // jsdom and in real Chromium/WebKit alike -- and the teardown deletes these
    // keys off that very object, so `win.cancelAnimationFrame` is undefined by
    // the time cleanup runs. It only trades the ReferenceError for a TypeError.
    // `.bind` pins the receiver the WebIDL operation is specified on; Chromium
    // and WebKit both accept a detached call (measured), so the bind is belt and
    // braces against an engine that does not, at zero cost.
    const cancelFrame = cancelAnimationFrame.bind(globalThis);

    const stopResume = resumeOnGesture(ctx);

    let node: AudioNode;
    if (!isMediaElement(src)) {
      let streamNode = streamSources.get(src);
      if (!streamNode) {
        streamNode = ctx.createMediaStreamSource(src);
        streamSources.set(src, streamNode);
      }
      node = streamNode;
      // Deliberately NOT connected to destination: that would echo the mic.
      // Unlike the element path below, a stream source NEVER reaches
      // destination, cached or not.
    } else {
      const el = src;
      let elNode = webComponentSources.get(el);
      if (!elNode) {
        elNode = ctx.createMediaElementSource(el);
        // Connect to destination exactly once, right here at creation, so the
        // audio path does not depend on how many visualizers attach. Both
        // analysers below are terminal side-taps: an AnalyserNode still
        // receives data with nothing connected downstream of it, so neither
        // one also connects to destination. If either did, N consumers on
        // one element would sum to N times the amplitude.
        elNode.connect(ctx.destination);
        webComponentSources.set(el, elNode);
      }
      node = elNode;
    }

    // Two analysers off the same source node, not one: see BANDS_ANALYSER /
    // VOLUME_ANALYSER above for why they cannot share a smoothingTimeConstant.
    const bandsAnalyser = ctx.createAnalyser();
    bandsAnalyser.fftSize = BANDS_ANALYSER.fftSize;
    bandsAnalyser.smoothingTimeConstant = BANDS_ANALYSER.smoothingTimeConstant;

    const volumeAnalyser = ctx.createAnalyser();
    volumeAnalyser.fftSize = VOLUME_ANALYSER.fftSize;
    volumeAnalyser.smoothingTimeConstant = VOLUME_ANALYSER.smoothingTimeConstant;
    // Byte-scale rescale, volume analyser ONLY -- see VOLUME_ANALYSER above.
    volumeAnalyser.minDecibels = VOLUME_ANALYSER.minDecibels;
    volumeAnalyser.maxDecibels = VOLUME_ANALYSER.maxDecibels;

    node.connect(bandsAnalyser);
    node.connect(volumeAnalyser);

    const freq = new Float32Array(bandsAnalyser.frequencyBinCount);
    const bytes = new Uint8Array(volumeAnalyser.frequencyBinCount);

    let raf = 0;
    let last = 0;
    const step = (now: number) => {
      if (now - last >= opts.updateInterval) {
        bandsAnalyser.getFloatFrequencyData(freq);
        volumeAnalyser.getByteFrequencyData(bytes);
        setBands(reduceToBands(freq, bandCount, opts.loPass, opts.hiPass));
        setVolume(reduceToVolume(bytes));
        last = now;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    onCleanup(() => {
      cancelFrame(raf);
      stopResume();
      bandsAnalyser.disconnect();
      volumeAnalyser.disconnect();
      // Both the element and stream source nodes above are cached and shared
      // across every consumer of the same element/stream: another consumer
      // may still be using this one, and it can never be recreated. Drop
      // only this consumer's own taps into it (the two-argument form, once
      // per analyser), never the no-argument node.disconnect() -- that would
      // tear the source down for everyone still using it.
      node.disconnect(bandsAnalyser);
      node.disconnect(volumeAnalyser);
    });
  });

  return { bands, volume };
}
