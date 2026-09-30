/** A map of CSS custom-property name → value, e.g. { '--color-primary': '#fff' }. */
export type Palette = Record<string, string>;

function block(selector: string, palette: Palette): string {
  const body = Object.keys(palette)
    .sort()
    .map((k) => `  ${k}: ${palette[k]};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/**
 * Build a paste-ready theme override block: ONE `:root` rule. A token whose dark value differs is
 * written `light-dark(<light>, <dark>)`, so it resolves against each element's own scheme: the page's
 * `.dark` / `--kai-color-scheme`, and equally a `theme="dark"` element on a light page, which a
 * separate `.dark { }` block could never reach (that selector only matches an ancestor). A key that
 * is the same in both schemes, or has no dark value (`--radius`), is written plain.
 */
export function buildThemeCss(light: Palette, dark: Palette): string {
  const merged: Palette = {};
  for (const [k, v] of Object.entries(light)) {
    merged[k] = k in dark && dark[k] !== v ? `light-dark(${v}, ${dark[k]})` : v;
  }
  for (const [k, v] of Object.entries(dark)) if (!(k in merged)) merged[k] = v;
  return block(':root', merged);
}
