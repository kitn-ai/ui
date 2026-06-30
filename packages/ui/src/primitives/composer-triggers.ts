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

/**
 * Wraps detectTrigger with a list of trigger definitions.
 * Returns { def, query, start } when a trigger is active, else null.
 * Accepts generic defs so it does not import from composer.tsx (no cycle).
 */
export function activeTriggerFor<T extends { char: string; kind: string }>(
  text: string,
  caret: number,
  defs: T[],
): { def: T; query: string; start: number } | null {
  if (!defs.length) return null;
  const chars = defs.map((d) => d.char);
  const hit = detectTrigger(text, caret, chars);
  if (!hit) return null;
  const def = defs.find((d) => d.char === hit.char);
  if (!def) return null;
  return { def, query: hit.query, start: hit.start };
}
