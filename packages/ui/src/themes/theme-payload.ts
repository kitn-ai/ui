/**
 * The theme wire payload shared by the theme studio and the builder host: the ONE type
 * both sides of the postMessage handshake import, so a key renamed on either side is a
 * compile error rather than a silently-empty seed.
 *
 * The CANONICAL wire shape is FLAT: `light` / `dark` / `radius` / `fonts` at the top
 * level, in every direction (kai-theme-init, kai-theme-change, kai-theme-apply). The
 * construct FILE nests the same four fields under `theme.tokens`; the builder owns the
 * fold in both directions (`initThemePayload`, `themeFromPayload`).
 *
 * Token keys are the `--kai-*` knob names. Root-scope knobs (`--kai-text-*` rungs,
 * `--kai-tracking`, `--kai-shadow-color`) ride in `light`, matching the exported CSS
 * where they sit on `:root`; `dark` carries the dark colors.
 */
export interface ThemePayload {
  light: Record<string, string>;
  dark: Record<string, string>;
  radius?: string;
  fonts?: Record<string, string>;
}
