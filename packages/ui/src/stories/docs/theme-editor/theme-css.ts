/** A map of CSS custom-property name → value, e.g. { '--color-primary': '#fff' }. */
export type Palette = Record<string, string>;

function block(selector: string, palette: Palette): string {
  const body = Object.keys(palette)
    .sort()
    .map((k) => `  ${k}: ${palette[k]};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/** Build a paste-ready theme override block: full light set on :root, dark set on .dark. */
export function buildThemeCss(light: Palette, dark: Palette): string {
  return `${block(':root', light)}\n\n${block('.dark', dark)}`;
}
