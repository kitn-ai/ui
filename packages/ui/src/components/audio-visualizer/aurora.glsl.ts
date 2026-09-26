// lint-comment-references: reference -- docs/provenance/aurora-clean-room.md is this port's audit record
/**
 * Aurora ("veil") fragment shader. ORIGINAL WORK for @kitn.ai/ui, from the clean-room
 * fact sheet for LiveKit's public "aura" look plus the adopted prototype (mode 3, "veil"),
 * never from LiveKit's agent-audio-visualizer-aura.tsx or its inlined GLSL (Polyform
 * Non-Resale, never opened). docs/provenance/aurora-clean-room.md records what was checked.
 *
 * The construction: 36 phase-offset copies of one ring through the same 4-octave
 * directional-sine warp cascade, fused into soft veils by an analytic neighbour-distance
 * blur, written as TRUE premultiplied output where the fact sheet's own final write is
 * "hotter than premultiplied" and darkens translucent edges over a light page.
 *
 * Four departures from the fact sheet are marked inline: rotation sign (1), dark tonemap
 * (2), brightness curves (3), edge asymmetry (4), each measured on rendered output.
 *
 * Uniforms are declared by ShaderCanvas, never here. The contract (per-state table `auroraTargets`,
 * variant-aurora.tsx): `uIntensity`, `uSpeed`, `uComplexity`, `uAmplitude` and `uScale` carry the fact
 * sheet's columns at its ranges; `uTheme` (< 0.5 dark) is a real branch; `uRotation` is a parity-calibrated
 * trim (positive = clockwise, 0 under reduced motion); `uColor` is accent RGB, 0..1.
 */
export default `
const float PI = 3.14159265359;
// Strand phase span: 0.5 + pi (the fact sheet's "sigma", the
// midpoint of the interval [1, 2*pi] with the interpolation knob fixed
// at 0.5).
const float STRAND_SIGMA = 0.5 + PI;
const int STRAND_COUNT = 36;

// 4-octave directional-sine warp cascade. M0 and the per-octave rotation B
// (cos 0.6, sin 0.8, an exact ~53.13 degree rotation) are the fact sheet's
// stated matrices; M1/M2/M3 = B composed with the previous
// octave's matrix, and each v_k is the first row of M_k. Hand-derived and
// checked against the fact sheet's own listed v_0..v_3 below, not copied
// from any source.
const mat2 WARP_M0 = mat2(0.6, 0.25, -0.25, 0.9);
const mat2 WARP_M1 = mat2(0.16, 0.63, -0.87, 0.34);
const mat2 WARP_M2 = mat2(-0.408, 0.506, -0.794, -0.492);
const mat2 WARP_M3 = mat2(-0.6496, -0.0228, -0.0828, -0.9304);
const vec2 WARP_V0 = vec2(0.600, -0.250);
const vec2 WARP_V1 = vec2(0.160, -0.870);
const vec2 WARP_V2 = vec2(-0.408, -0.794);
const vec2 WARP_V3 = vec2(-0.650, -0.083);

// Displaces p through all 4 octaves. Octave k's phase carries k*tau, so
// octave 0 is static in time and octave 3 moves fastest -- fine
// corrugation slides across coarse folds, which reads as flowing wind
// (the fact sheet, "Mechanism of the fold / wind").
vec2 auroraWarp(vec2 p, float phi, float tau, float freq, float amp) {
  vec2 x = p;
  float f = freq;
  float a = amp;

  vec2 q = WARP_M0 * x;
  vec2 w = sin(f * q + vec2(phi));
  x += (a / f) * WARP_V0 * w;
  f *= 1.4;
  a *= 1.0 + 0.1 * (max(w.x, w.y) - 1.0);

  q = WARP_M1 * x;
  w = sin(f * q + vec2(tau + phi));
  x += (a / f) * WARP_V1 * w;
  f *= 1.4;
  a *= 1.0 + 0.1 * (max(w.x, w.y) - 1.0);

  q = WARP_M2 * x;
  w = sin(f * q + vec2(2.0 * tau + phi));
  x += (a / f) * WARP_V2 * w;
  f *= 1.4;
  a *= 1.0 + 0.1 * (max(w.x, w.y) - 1.0);

  q = WARP_M3 * x;
  w = sin(f * q + vec2(3.0 * tau + phi));
  x += (a / f) * WARP_V3 * w;

  return x;
}

vec3 auroraRgb2Hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1.0e-10)), d / (q.x + 1.0e-10), q.x);
}

vec3 auroraHsv2Rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Fact sheet: u in [0,1]^2, centered point p = u - 0.5, no
  // aspect correction -- the element is forced square by CSS, so this is
  // only correct on a square canvas (true for every audio-visualizer size).
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = uv - 0.5;

  // Solid-body rotation of the sampling frame (module doc, departure 1).
  // gl_FragCoord's y-up frame is mirrored against the screen's y-down one,
  // so the sign here is what makes positive uRotation read CLOCKWISE on
  // screen -- verified empirically against the audit's estimator (which
  // measures +10 for uRotation = +10 deg/s with the wind frozen).
  float rotA = -uRotation * iTime;
  float rc = cos(rotA);
  float rs = sin(rotA);
  p = mat2(rc, -rs, rs, rc) * p;

  // Negative tau: time-reversing the octave phases flips the wind's
  // emergent angular drift from counter-clockwise (measured on the original)
  // to the reference's clockwise, without touching any static property --
  // lobes, radii, spectra are distribution-identical (module doc,
  // departure 1).
  float tau = -iTime * uSpeed;
  float freq = max(2.0 + 13.0 * uComplexity, 1.0);
  float amp = uAmplitude;
  float ringRadius = uScale;

  vec3 hsv = auroraRgb2Hsv(uColor);
  // Chain-seed strand, phase -1/36 NOT scaled by STRAND_SIGMA (fact sheet),
  // so inter-strand spacing is defined for strand 1 too.
  vec2 prevStrand = auroraWarp(p, -1.0 / float(STRAND_COUNT), tau, freq, amp);

  vec3 accum = vec3(0.0);
  for (int j = 1; j <= STRAND_COUNT; j++) {
    float frac = float(j) / float(STRAND_COUNT);
    float phi = frac * STRAND_SIGMA;
    vec2 strand = auroraWarp(p, phi, tau, freq, amp);

    // Signed distance to the (warped) ring, per strand: negative inside,
    // positive outside -- the sign feeds the asymmetric edge width below.
    float sd = length(strand) - ringRadius;
    float dist = abs(sd);
    // Inter-strand spacing through the chain: an analytic blur exactly
    // proportional to how far this strand's warp has drifted from its
    // neighbour's. Fanned regions (large spacing) fuse into soft veils;
    // bunched regions (small spacing) stay crisp -- this is what turns 36
    // discrete rings into an aurora (the fact sheet). The 2.3 growth
    // rate (fact sheet's own is 2.0) and the 0.66x outer-side factor are
    // the parity edge calibration: the reference holds a 10-90% rise of
    // ~6-10px(2x) with the OUTER edge always the sharper of the two
    // (module doc, departure 4).
    float spacing = length(strand - prevStrand);
    float edgeWidth = 0.01 + max(exp(2.3 * spacing) - 1.0, 0.001);
    edgeWidth *= mix(1.0, 0.66, step(0.0, sd));
    float coverage = 1.0 - smoothstep(0.0, 1.0, dist / edgeWidth);

    // Fixed hue drift across the strand fan, matching the fact sheet's
    // documented colorShift default (0.05 turns at weight 0.3, i.e. 0.015
    // turns end to end); earliest strand shifts most.
    vec3 strandColor = auroraHsv2Rgb(vec3(fract(hsv.x + (1.0 - frac) * 0.015), hsv.y, hsv.z));
    accum += coverage * strandColor;
    prevStrand = strand;
  }

  // Mean soft coverage across all 36 strands (the fact sheet's image
  // accumulator I). The inverse-distance glow accumulator G is omitted: the
  // fact sheet states its gain ships as 0, so it contributes nothing.
  vec3 image = accum / float(STRAND_COUNT);

  // Deterministic per-pixel dither, +/- 1/510, identical on all channels
  // (the fact sheet). Kept as a plain vec3 offset, not pre-mixed into
  // the image accumulator, so each branch can add it at the point the fact
  // sheet actually specifies (see the dark branch below).
  float n = fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 dither = vec3((n - 0.5) / 255.0);

  float brightness = uIntensity;
  vec3 rgb;
  float alpha;

  if (uTheme < 0.5) {
    // Dark pipeline, parity-calibrated (module doc, departures 2 + 3).
    // RGB1 = 1.2 * I, THEN add dither (fact sheet order: pre-gain first so
    // the dither's written amplitude stays +/- 1/510), then floor at 0 --
    // a negative dither on a near-black pixel would otherwise be blown up
    // by the chroma-preserving rescale's division right below.
    vec3 x1 = max(1.2 * image + dither, 0.0);

    // Chroma-preserving tonemap: knee the MAX channel (11x/(1+11x) -- a
    // steeper knee than the fact sheet's per-channel 4x/(1+4x)) and rescale
    // the vector, so ribbon cores land on a stable brightness level largely
    // independent of how thin the veils have fanned (the audit measured the
    // per-channel map crushing spread-out states to ~half the reference's
    // rendered brightness) while hue and saturation pass through untouched
    // for the HSV shape-up to own.
    float mxc = max(x1.r, max(x1.g, x1.b));
    float tmMax = 11.0 * mxc / (1.0 + 11.0 * mxc);
    vec3 tm = x1 * (tmMax / max(mxc, 1.0e-5));

    // Rendered-colour calibration: hue +0.013 turns (audit target
    // ~197.5deg for the default accent), saturation proportional to the
    // caller's own (a desaturated accent stays desaturated) but rising
    // with the pixel's value and capped at 0.98 -- Rob's reference:
    // saturation RISES with brightness, and nothing is ever white.
    vec3 hv = auroraRgb2Hsv(tm);
    hv.x = fract(hv.x + 0.013);
    hv.y = min(hv.y * (1.02 + 0.35 * hv.z), 0.98);
    tm = auroraHsv2Rgb(hv);

    // Brightness compression (departure 3): uIntensity DRIVES 0.5..2.5 at
    // the thinking/connecting pulse but must RENDER inside roughly
    // 0.5..0.65 mean brightness, never dropping the ring below visibility.
    // Two compressive powers (colour flatter than alpha) plus a smoothstep
    // alpha knee that lifts ribbon cores to full opacity while cutting the
    // dim tails -- which is also what keeps the centre transparent and the
    // edges crisp. max(brightness, 0.05) only guards pow() against a
    // (contractually impossible) zero or negative uniform.
    float bVal = pow(max(brightness, 0.05) / 1.5, 0.07);
    float bAlpha = 0.97 * pow(max(brightness, 0.05) / 1.5, 0.09);
    float luma = dot(tm, vec3(0.299, 0.587, 0.114));
    // Clamped to [0,1] before the premultiply below, mirroring the light
    // branch, so rgb * alpha <= alpha stays enforced for every input.
    rgb = clamp(tm * bVal, 0.0, 1.0);
    alpha = clamp(smoothstep(0.0, 0.50, luma) * bAlpha, 0.0, 1.0);
  } else {
    // Light pipeline (the fact sheet): RGB1 = I, then add dither;
    // brightness curve on vector length, hue direction kept, saturation
    // extrapolated 3x about gray.
    vec3 x1 = image + dither;
    float mag = length(x1);
    vec3 dir = x1 / max(mag, 1.0e-5);
    float mag2 = 2.0 * mag / (1.0 + 2.0 * mag);
    vec3 x2 = dir * mag2;
    float gray = dot(x2, vec3(0.2, 0.5, 0.1));
    rgb = clamp(vec3(gray) + 3.0 * (x2 - vec3(gray)), 0.0, 1.0);
    alpha = clamp(mag2 * clamp(brightness, 1.0, 2.0), 0.0, 1.0);
  }

  // PREMULTIPLIED output. Both branches above clamp their natural rgb to
  // [0,1] before this line, which is what makes rgb * alpha <= alpha
  // (componentwise) a property the code enforces unconditionally, not one
  // that happens to hold for the inputs this was tested against. See the
  // module doc above for why this departs from the fact sheet's own
  // (deliberately non-premultiplied) pipeline.
  fragColor = vec4(rgb * alpha, alpha);
}
`;
