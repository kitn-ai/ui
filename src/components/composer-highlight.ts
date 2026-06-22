import type { HighlightRule } from './composer';

export interface HighlightMatch {
  start: number;
  end: number;
  class: string | undefined;
}

/** Escape special regex metacharacters in a literal string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find all non-overlapping highlight ranges in `text` for the given rules.
 *
 * - A string rule is matched as a case-insensitive literal (regex metachars are escaped).
 * - An object rule uses `new RegExp(pattern, flags ?? 'gi')`.
 * - Overlapping ranges are resolved in earliest-start order; later ranges that
 *   overlap an already-claimed span are dropped.
 * - Zero-width matches are skipped to avoid infinite loops.
 * - Returns `[]` when nothing matches.
 */
export function findHighlightMatches(text: string, rules: HighlightRule[]): HighlightMatch[] {
  const candidates: HighlightMatch[] = [];

  for (const rule of rules) {
    let regex: RegExp;
    let cls: string | undefined;

    if (typeof rule === 'string') {
      regex = new RegExp(escapeRegex(rule), 'gi');
      cls = undefined;
    } else {
      regex = new RegExp(rule.pattern, rule.flags ?? 'gi');
      cls = rule.class;
    }

    // Reset lastIndex so we scan from the beginning regardless of flag state.
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Guard against zero-width matches to avoid infinite loops.
      if (end === start) {
        regex.lastIndex = start + 1;
        continue;
      }

      candidates.push({ start, end, class: cls });
    }
  }

  // Sort by start position (tie-break: earlier rule wins, which preserves insertion order).
  candidates.sort((a, b) => a.start - b.start);

  // Remove overlapping ranges (greedy earliest-start wins).
  const result: HighlightMatch[] = [];
  let frontier = -1; // end of the last accepted range
  for (const c of candidates) {
    if (c.start >= frontier) {
      result.push(c);
      frontier = c.end;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// CSS Custom Highlight API — ambient type declarations
// (jsdom does not ship these; they are defined here rather than in a lib to
// keep the footprint minimal and avoid tsconfig changes.)
// ---------------------------------------------------------------------------

declare global {
  // CSS.highlights is defined on the CSS namespace object.
  interface CSSNamespace {
    highlights?: HighlightRegistry;
  }
  interface HighlightRegistry {
    set(name: string, highlight: CSSHighlight): void;
    delete(name: string): boolean;
    has(name: string): boolean;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class CSSHighlight {
    constructor(...ranges: Range[]);
  }
}

/**
 * Feature-detect whether the CSS Custom Highlight API is available in the
 * current environment.  Returns false in jsdom (decoration no-op).
 */
export function supportsHighlightAPI(): boolean {
  try {
    return (
      typeof CSS !== 'undefined' &&
      typeof CSS.highlights !== 'undefined' &&
      typeof Highlight !== 'undefined'
    );
  } catch {
    return false;
  }
}

const HIGHLIGHT_NAME = 'kai-composer-highlight';

/**
 * Apply highlight matches to a contenteditable element using the CSS Custom
 * Highlight API.  Maps text offsets (ZWSP-stripped concatenated text) to DOM
 * Ranges spanning across text nodes, builds a `Highlight`, and registers it.
 *
 * If the API is unavailable (jsdom, older browsers), this is a strict no-op.
 *
 * @param root     The contenteditable element.
 * @param matches  Pre-computed non-overlapping `{start, end}` ranges.
 * @param zwsp     The ZWSP character used in the editable (passed to avoid
 *                 a circular import; callers pass ZWSP from composer-dom).
 */
export function applyHighlights(
  root: HTMLElement,
  matches: HighlightMatch[],
  zwsp: string,
  name = HIGHLIGHT_NAME,
): void {
  if (!supportsHighlightAPI()) return;

  const registry = CSS.highlights as HighlightRegistry;

  if (matches.length === 0) {
    registry.delete(name);
    return;
  }

  // Build a flat list of {node, rawStart, rawEnd} segments mirroring
  // how getFullText works, but retaining the raw (pre-stripped) offsets so
  // we can set Range.setStart/setEnd correctly.
  //
  // Each entry records:
  //   textNode   - the DOM Text node
  //   stripped   - the node's textContent with ZWSP removed
  //   rawOffset  - raw index in textContent where the stripped content starts
  //                at the node level (always 0 — we need per-char mapping when
  //                ZWSP chars are interspersed, so we build a per-node map)
  //   strippedStart - cumulative stripped-text offset at the start of this node
  //
  interface NodeEntry {
    node: Text;
    strippedStart: number; // cumulative stripped offset before this node
    // Maps stripped-relative index i → raw textContent index
    strippedToRaw: Int32Array;
  }

  const entries: NodeEntry[] = [];
  let cursor = 0; // cumulative stripped offset

  const ownerDoc = root.ownerDocument;
  const walker = ownerDoc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const raw = node.textContent ?? '';
    // Build stripped→raw index map for this node.
    const strippedIndices: number[] = [];
    for (let ri = 0; ri < raw.length; ri++) {
      if (raw[ri] !== zwsp) {
        strippedIndices.push(ri);
      }
    }
    if (strippedIndices.length > 0) {
      const map = new Int32Array(strippedIndices.length);
      for (let i = 0; i < strippedIndices.length; i++) map[i] = strippedIndices[i];
      entries.push({ node, strippedStart: cursor, strippedToRaw: map });
      cursor += strippedIndices.length;
    }
    node = walker.nextNode() as Text | null;
  }

  /**
   * Convert a stripped-text offset to a {node, rawOffset} pair for Range API.
   * Returns null if out of range.
   */
  function resolve(
    strippedOffset: number,
  ): { node: Text; rawOffset: number } | null {
    // Binary-search for the entry that contains strippedOffset.
    let lo = 0;
    let hi = entries.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const e = entries[mid];
      const eEnd = e.strippedStart + e.strippedToRaw.length;
      if (strippedOffset < e.strippedStart) {
        hi = mid - 1;
      } else if (strippedOffset >= eEnd) {
        lo = mid + 1;
      } else {
        const localIdx = strippedOffset - e.strippedStart;
        return { node: e.node, rawOffset: e.strippedToRaw[localIdx] };
      }
    }
    // strippedOffset is exactly at the end of the last entry — point after
    // the last raw character of the last node.
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      const localIdx = strippedOffset - last.strippedStart;
      if (localIdx === last.strippedToRaw.length) {
        // End position: raw offset is one past the last stripped char's raw index.
        return {
          node: last.node,
          rawOffset: last.strippedToRaw[last.strippedToRaw.length - 1] + 1,
        };
      }
    }
    return null;
  }

  const ranges: Range[] = [];
  for (const m of matches) {
    const startPos = resolve(m.start);
    const endPos = resolve(m.end);
    if (!startPos || !endPos) continue;

    const r = ownerDoc.createRange();
    r.setStart(startPos.node, startPos.rawOffset);
    r.setEnd(endPos.node, endPos.rawOffset);
    ranges.push(r);
  }

  if (ranges.length === 0) {
    registry.delete(name);
    return;
  }

  const hl = new Highlight(...ranges);
  registry.set(name, hl);
}
