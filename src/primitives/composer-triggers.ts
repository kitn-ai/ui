export interface ActiveTrigger { char: string; query: string; start: number; }

export function detectTrigger(text: string, caret: number, chars: string[]): ActiveTrigger | null {
  // Caret is a position within `text` (0..text.length). Out-of-range = no trigger.
  if (caret < 0 || caret > text.length) return null;
  for (let i = caret - 1; i >= 0; i--) {
    const c = text[i];
    if (/\s/.test(c)) return null; // hit whitespace before any trigger char
    if (chars.includes(c)) {
      const boundaryOk = i === 0 || /\s/.test(text[i - 1]);
      if (!boundaryOk) return null;
      return { char: c, query: text.slice(i + 1, caret), start: i };
    }
  }
  return null;
}
